// /api/whoami — diagnostic for Cloudflare Access identity resolution.
// Shows what the origin actually receives so you can tell whether Access is in front
// and forwarding identity, vs. the app falling back to the dev default user.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const h = await headers();
  const cfEmail = h.get("cf-access-authenticated-user-email");
  const hasJwt = !!h.get("cf-access-jwt-assertion");
  const cfConfigured = !!(process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD);

  let resolved: Record<string, unknown> = {};
  try {
    const u = await getCurrentUser();
    resolved = { email: u.email, name: u.name, title: u.title, role: u.role, authorised: u.authorised };
  } catch (e) {
    resolved = { error: String(e) };
  }

  return NextResponse.json({
    accessHeaderEmail: cfEmail ?? null,        // what Cloudflare Access forwarded (null = Access not in front / not forwarding)
    accessJwtPresent: hasJwt,                  // is the signed assertion present?
    jwtVerificationConfigured: cfConfigured,   // are CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD set?
    devFallbackEmail: (process.env.DEV_USER_EMAIL || "tony.hammond@bakerhughes.com").toLowerCase(),
    resolvedUser: resolved,                     // who the app thinks you are
    diagnosis: !cfEmail && !hasJwt
      ? "No Access identity reached the origin — app used the dev fallback user. Put Cloudflare Access in front of THIS hostname (or set DEV_USER_EMAIL for local testing)."
      : !cfConfigured
      ? "Reading the Access email header (JWT not verified). Set CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD to verify the token for this app."
      : "Verifying the Access JWT against this app's audience.",
  });
}
