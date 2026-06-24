// current-user.ts — resolves the signed-in user from the Cloudflare Access identity.
//
// Cloudflare Access authenticates the user at the edge (restricted to the allowed domains)
// and forwards their identity to the origin in request headers:
//   • Cf-Access-Authenticated-User-Email  — the verified email
//   • Cf-Access-Jwt-Assertion             — a signed JWT (verify against the team JWKS in prod)
//
// We read the email, enforce the allowed domains as defence-in-depth, and map it to the user
// database. Unknown users from an allowed domain get least-privilege (read-only) access.
//
// Local dev (no Access in front) falls back to DEV_USER_EMAIL or Tony Hammond.

import { headers } from "next/headers";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthUser, RoleKey } from "./rbac";
import { listUsers, type ManagedUser } from "../data/users";

export const ALLOWED_EMAIL_DOMAINS = ["bakerhughes.com", "hexagon.com"];
const DEV_FALLBACK_EMAIL = (process.env.DEV_USER_EMAIL || "tony.hammond@bakerhughes.com").toLowerCase();

// Application-specific Cloudflare Access verification.
//   CF_ACCESS_TEAM_DOMAIN = https://<team>.cloudflareaccess.com
//   CF_ACCESS_AUD         = this application's Audience (AUD) tag (Access app → Overview)
// When both are set, the Cf-Access-Jwt-Assertion JWT is verified against the team JWKS and
// the `aud` claim MUST match THIS app's tag — tokens for other Access apps are rejected.
const CF_TEAM = process.env.CF_ACCESS_TEAM_DOMAIN?.replace(/\/$/, "");
const CF_AUD = process.env.CF_ACCESS_AUD;
const JWKS = CF_TEAM ? createRemoteJWKSet(new URL(`${CF_TEAM}/cdn-cgi/access/certs`)) : null;

export interface CurrentUser extends AuthUser {
  email: string;
  name: string;
  title: string;
  authorised: boolean;
}

async function resolveEmail(): Promise<string> {
  let h: Awaited<ReturnType<typeof headers>>;
  try { h = await headers(); } catch { return DEV_FALLBACK_EMAIL; } // build/no-request scope

  // app-specific: verify the Access JWT and require this app's AUD
  if (JWKS && CF_AUD) {
    const token = h.get("cf-access-jwt-assertion");
    if (token) {
      try {
        const { payload } = await jwtVerify(token, JWKS, { issuer: CF_TEAM!, audience: CF_AUD });
        const email = (payload.email || payload.identity) as string | undefined;
        if (email) return email.toLowerCase();
      } catch {
        // invalid / wrong-audience token — fall through to deny
      }
    }
    return "denied@invalid"; // configured but no valid token for THIS app
  }

  // not configured (dev / behind Access without JWT verification): trust the email header
  const email = h.get("cf-access-authenticated-user-email");
  return (email || DEV_FALLBACK_EMAIL).toLowerCase();
}

export function domainAllowed(email: string): boolean {
  const domain = email.split("@")[1] ?? "";
  return ALLOWED_EMAIL_DOMAINS.includes(domain.toLowerCase());
}

function toAuthUser(u: ManagedUser): AuthUser {
  return {
    id: u.id,
    organisationId: "waygate",
    role: u.role as RoleKey,
    scopeType: u.scopeType,
    regionIds: u.scopeType === "REGION" ? u.scope : [],
    siteIds: u.scopeType === "SITE" ? u.scope : [],
  };
}

function titleCaseFromEmail(email: string): string {
  return email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const email = await resolveEmail();
  const allowed = domainAllowed(email);

  // known user → use their role and scope from the user database
  const users = await listUsers();
  const match = users.find((x) => x.email.toLowerCase() === email);
  if (match && allowed) {
    return { ...toAuthUser(match), email, name: match.name, title: match.title, authorised: true };
  }

  // authenticated by Access from an allowed domain but not in the database → least privilege
  if (allowed) {
    return {
      id: `ext:${email}`, organisationId: "waygate", role: "READONLY_EXECUTIVE" as RoleKey,
      scopeType: "GLOBAL", regionIds: [], siteIds: [],
      email, name: titleCaseFromEmail(email), title: "Authenticated user", authorised: true,
    };
  }

  // domain not permitted (Access should already block this — belt and braces)
  return {
    id: `denied:${email}`, organisationId: "waygate", role: "READONLY_EXECUTIVE" as RoleKey,
    scopeType: "SITE", regionIds: [], siteIds: ["__none__"],
    email, name: "Unauthorised", title: "Access denied", authorised: false,
  };
}

export function initialsOf(name: string): string {
  return name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "U";
}

export async function getCurrentUserDisplay() {
  const u = await getCurrentUser();
  return { name: u.name, title: u.title, initials: initialsOf(u.name), email: u.email, authorised: u.authorised };
}
