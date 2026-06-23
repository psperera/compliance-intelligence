// current-user.ts — resolves the signed-in user for the request.
//
// In this build it returns a fixed user (Tony Hammond, Group HS&E Director) so RBAC gating
// in the UI is exercised end-to-end. The shape is the AuthUser the rbac guard expects.
//
// PRODUCTION: read the session (OIDC/SAML adapter), look up the user + role + scope in the
// DB, and return it here. Everything downstream (can(), withScope(), requirePermission())
// already works against this shape.

import type { AuthUser } from "./rbac";

export async function getCurrentUser(): Promise<AuthUser> {
  return {
    id: "u-hammond",
    organisationId: "waygate",
    role: "PLATFORM_ADMIN", // Group HS&E Director — full access
    scopeType: "GLOBAL",
    regionIds: [],
    siteIds: [],
  };
}

export const CURRENT_USER_DISPLAY = { name: "Tony Hammond", title: "Group HS&E Director", initials: "TH" };
