// rbac.ts — role-based access control + scope filtering.
//
// Single source of truth for "who can do what" and "over which sites".
// Mirrors the role permission matrix in the Administration screen and in prisma/seed.ts.
//
// Usage in a route handler:
//   const user = await getSessionUser();
//   requirePermission(user, "approve_assessment");          // throws ForbiddenError otherwise
//   const where = withScope(user, { organisationId: user.organisationId }); // scoped query filter
//   const changes = await db.changeEvent.findMany({ where });

export const PERMISSIONS = [
  "view_content", "edit_metadata", "create_assessment", "approve_assessment",
  "assign_actions", "close_actions", "upload_evidence", "exec_reporting",
  "manage_users", "manage_sites", "configure_alerts", "export_reports", "view_audit_logs",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type RoleKey =
  | "PLATFORM_ADMIN" | "COMPLIANCE_DIRECTOR" | "LEGAL_LEAD" | "REGIONAL_HSE_MANAGER"
  | "SITE_MANAGER" | "REGULATORY_ANALYST" | "BUSINESS_LINE_LEADER" | "INTERNAL_AUDITOR"
  | "READONLY_EXECUTIVE" | "EXTERNAL_REVIEWER";

export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  PLATFORM_ADMIN: [...PERMISSIONS],
  COMPLIANCE_DIRECTOR: ["view_content","edit_metadata","create_assessment","approve_assessment","assign_actions","close_actions","upload_evidence","exec_reporting","configure_alerts","export_reports","view_audit_logs"],
  LEGAL_LEAD: ["view_content","create_assessment","approve_assessment","exec_reporting","export_reports","view_audit_logs"],
  REGIONAL_HSE_MANAGER: ["view_content","edit_metadata","create_assessment","assign_actions","close_actions","upload_evidence","exec_reporting","configure_alerts","export_reports","view_audit_logs"],
  SITE_MANAGER: ["view_content","edit_metadata","create_assessment","assign_actions","close_actions","upload_evidence"],
  REGULATORY_ANALYST: ["view_content","edit_metadata","create_assessment","upload_evidence","configure_alerts"],
  BUSINESS_LINE_LEADER: ["view_content","assign_actions","exec_reporting","export_reports"],
  INTERNAL_AUDITOR: ["view_content","exec_reporting","view_audit_logs"],
  READONLY_EXECUTIVE: ["view_content","exec_reporting"],
  EXTERNAL_REVIEWER: ["view_content","create_assessment","approve_assessment"],
};

export type ScopeType = "GLOBAL" | "REGION" | "SITE";

/** Minimal user shape the guard needs (hydrated from session/db). */
export interface AuthUser {
  id: string;
  organisationId: string;
  role: RoleKey;
  scopeType: ScopeType;
  regionIds: string[]; // populated for REGION scope
  siteIds: string[];   // populated for SITE scope
}

export class ForbiddenError extends Error {
  status = 403 as const;
  constructor(msg = "Insufficient permissions") { super(msg); this.name = "ForbiddenError"; }
}

/** Does this user hold the given permission? */
export function can(user: AuthUser, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

/** Throw unless the user holds the permission. Use at the top of mutating handlers. */
export function requirePermission(user: AuthUser, permission: Permission): void {
  if (!can(user, permission)) throw new ForbiddenError(`Missing permission: ${permission}`);
}

/** True if the user may act on a specific site (global > region > site). */
export function canAccessSite(user: AuthUser, siteId: string, siteRegionId?: string): boolean {
  if (user.scopeType === "GLOBAL") return true;
  if (user.scopeType === "REGION") return !!siteRegionId && user.regionIds.includes(siteRegionId);
  return user.siteIds.includes(siteId);
}

/**
 * Inject a scope filter into a Prisma `where` clause so non-global users only see
 * their permitted sites/regions. Always also filters by organisation (tenant isolation).
 *
 * `siteField` is the relation path to the site on the queried model:
 *   "siteId" for Action/Evidence, "site" for nested, etc. Defaults to "siteId".
 */
export function withScope<T extends Record<string, unknown>>(
  user: AuthUser,
  where: T,
  siteField: string = "siteId",
): T {
  const scoped: Record<string, unknown> = { ...where, organisationId: user.organisationId };
  if (user.scopeType === "GLOBAL") return scoped as T;
  if (user.scopeType === "SITE") {
    scoped[siteField] = { in: user.siteIds };
  } else if (user.scopeType === "REGION") {
    // resolve via the site's region relation
    scoped["site"] = { regionId: { in: user.regionIds } };
  }
  return scoped as T;
}

/** Convenience: full permission set for a role (used to render the Admin matrix). */
export function permissionsFor(role: RoleKey): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
