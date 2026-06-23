// lib/data/users.ts — the user database (in-memory for this build).
//
// Manages who has access, their email, role and scope. Headed by Tony Hammond, Group HS&E
// Director. The admin UI reads/writes through these functions.
//
// PRODUCTION: back with Prisma (User + Role + UserSiteScope/UserRegionScope), and send a real
// invite email via the EmailProvider when status === "INVITED".

import type { RoleKey } from "../auth/rbac";

export type UserStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
export type ScopeType = "GLOBAL" | "REGION" | "SITE";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  title: string;
  role: RoleKey;
  scopeType: ScopeType;
  scope: string[];        // region names or site ids when scopeType !== GLOBAL
  status: UserStatus;
  createdAt: string;
}

let USERS: ManagedUser[] = [
  { id: "u-hammond", name: "Tony Hammond", email: "thammond@vassalenterprises.com", title: "Group HS&E Director", role: "PLATFORM_ADMIN", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-04" },
  { id: "u-vogel", name: "Sabine Vogel", email: "s.vogel@waygate.example", title: "Corporate Compliance Director", role: "COMPLIANCE_DIRECTOR", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-06" },
  { id: "u-curtis", name: "Helen Curtis", email: "h.curtis@waygate.example", title: "General Counsel / Legal Policy Lead", role: "LEGAL_LEAD", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-06" },
  { id: "u-keller", name: "Martin Keller", email: "m.keller@waygate.example", title: "Regional HS&E Manager — DACH", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["Europe (DACH)"], status: "ACTIVE", createdAt: "2026-01-08" },
  { id: "u-maddox", name: "Ray Maddox", email: "r.maddox@waygate.example", title: "Regional HS&E Manager — Americas", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["Americas"], status: "ACTIVE", createdAt: "2026-01-08" },
  { id: "u-tan", name: "Lena Tan", email: "l.tan@waygate.example", title: "Regional HS&E Manager — APAC", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["APAC / MENAT"], status: "ACTIVE", createdAt: "2026-01-09" },
  { id: "u-brandt", name: "Anika Brandt", email: "a.brandt@waygate.example", title: "Regulatory Analyst — Radiation", role: "REGULATORY_ANALYST", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-10" },
  { id: "u-li", name: "Wei Li", email: "w.li@waygate.example", title: "Site Manager — Changzhou", role: "SITE_MANAGER", scopeType: "SITE", scope: ["changzhou"], status: "ACTIVE", createdAt: "2026-01-12" },
  { id: "u-whitfield", name: "James Whitfield", email: "j.whitfield@waygate.example", title: "Site Manager — Coventry", role: "SITE_MANAGER", scopeType: "SITE", scope: ["coventry"], status: "ACTIVE", createdAt: "2026-01-12" },
  { id: "u-rao", name: "Arjun Rao", email: "a.rao@waygate.example", title: "Business Line Leader — Digital & AI", role: "BUSINESS_LINE_LEADER", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-14" },
  { id: "u-sutton", name: "Greg Sutton", email: "g.sutton@waygate.example", title: "Internal Auditor", role: "INTERNAL_AUDITOR", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-15" },
  { id: "u-osei", name: "Diane Osei", email: "d.osei@waygate.example", title: "Chief Operating Officer", role: "READONLY_EXECUTIVE", scopeType: "GLOBAL", scope: [], status: "ACTIVE", createdAt: "2026-01-15" },
  { id: "u-dla", name: "External Reviewer (DLA)", email: "ehs.review@dla.example", title: "External Expert Reviewer", role: "EXTERNAL_REVIEWER", scopeType: "GLOBAL", scope: [], status: "INVITED", createdAt: "2026-02-01" },
];

export function listUsers(): ManagedUser[] {
  return [...USERS].sort((a, b) => a.name.localeCompare(b.name));
}

export function addUser(input: Omit<ManagedUser, "id" | "createdAt" | "status"> & { status?: UserStatus }): ManagedUser {
  if (USERS.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error(`A user with email ${input.email} already exists.`);
  }
  const u: ManagedUser = {
    ...input,
    id: "u-" + Math.random().toString(36).slice(2, 9),
    status: input.status ?? "INVITED", // new users start invited; PRODUCTION: send invite email
    createdAt: new Date().toISOString().slice(0, 10),
  };
  USERS.push(u);
  return u;
}

export function updateUser(id: string, patch: Partial<Pick<ManagedUser, "role" | "scopeType" | "scope" | "status" | "title">>): ManagedUser {
  const u = USERS.find((x) => x.id === id);
  if (!u) throw new Error("user not found");
  Object.assign(u, patch);
  return u;
}
