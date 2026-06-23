import { describe, it, expect } from "vitest";
import {
  can, requirePermission, withScope, canAccessSite, permissionsFor, ForbiddenError,
  type AuthUser,
} from "../../lib/auth/rbac";

const admin: AuthUser = { id: "u1", organisationId: "org", role: "PLATFORM_ADMIN", scopeType: "GLOBAL", regionIds: [], siteIds: [] };
const director: AuthUser = { id: "u2", organisationId: "org", role: "COMPLIANCE_DIRECTOR", scopeType: "GLOBAL", regionIds: [], siteIds: [] };
const exec: AuthUser = { id: "u3", organisationId: "org", role: "READONLY_EXECUTIVE", scopeType: "GLOBAL", regionIds: [], siteIds: [] };
const siteMgr: AuthUser = { id: "u4", organisationId: "org", role: "SITE_MANAGER", scopeType: "SITE", regionIds: [], siteIds: ["changzhou"] };
const regional: AuthUser = { id: "u5", organisationId: "org", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", regionIds: ["dach"], siteIds: [] };
const reviewer: AuthUser = { id: "u6", organisationId: "org", role: "EXTERNAL_REVIEWER", scopeType: "GLOBAL", regionIds: [], siteIds: [] };

describe("can()", () => {
  it("platform admin holds every permission", () => {
    expect(can(admin, "manage_users")).toBe(true);
    expect(can(admin, "approve_assessment")).toBe(true);
    expect(can(admin, "view_audit_logs")).toBe(true);
  });

  it("read-only executive can view + report but not mutate", () => {
    expect(can(exec, "view_content")).toBe(true);
    expect(can(exec, "exec_reporting")).toBe(true);
    expect(can(exec, "assign_actions")).toBe(false);
    expect(can(exec, "approve_assessment")).toBe(false);
  });

  it("site manager cannot manage users or approve assessments", () => {
    expect(can(siteMgr, "upload_evidence")).toBe(true);
    expect(can(siteMgr, "manage_users")).toBe(false);
    expect(can(siteMgr, "approve_assessment")).toBe(false);
  });

  it("external reviewer can create and approve assessments only", () => {
    expect(can(reviewer, "approve_assessment")).toBe(true);
    expect(can(reviewer, "create_assessment")).toBe(true);
    expect(can(reviewer, "assign_actions")).toBe(false);
    expect(can(reviewer, "manage_users")).toBe(false);
  });
});

describe("requirePermission()", () => {
  it("passes silently when permitted", () => {
    expect(() => requirePermission(director, "approve_assessment")).not.toThrow();
  });
  it("throws ForbiddenError when not permitted", () => {
    expect(() => requirePermission(exec, "approve_assessment")).toThrow(ForbiddenError);
    try { requirePermission(siteMgr, "manage_users"); }
    catch (e) { expect((e as ForbiddenError).status).toBe(403); }
  });
});

describe("withScope()", () => {
  it("global users are tenant-scoped only", () => {
    expect(withScope(admin, { foo: 1 })).toEqual({ foo: 1, organisationId: "org" });
  });

  it("site-scoped users get a siteId IN filter", () => {
    const where = withScope(siteMgr, {});
    expect(where).toEqual({ organisationId: "org", siteId: { in: ["changzhou"] } });
  });

  it("site-scoped users honour a custom site field", () => {
    const where = withScope(siteMgr, {}, "site_id");
    expect((where as any).site_id).toEqual({ in: ["changzhou"] });
  });

  it("region-scoped users filter via the site relation", () => {
    const where = withScope(regional, {});
    expect(where).toEqual({ organisationId: "org", site: { regionId: { in: ["dach"] } } });
  });

  it("never leaks across tenants — organisation is always set", () => {
    expect((withScope(siteMgr, { x: 1 }) as any).organisationId).toBe("org");
  });
});

describe("canAccessSite()", () => {
  it("global can access any site", () => {
    expect(canAccessSite(admin, "anything")).toBe(true);
  });
  it("site-scoped only their own site", () => {
    expect(canAccessSite(siteMgr, "changzhou")).toBe(true);
    expect(canAccessSite(siteMgr, "ahrensburg")).toBe(false);
  });
  it("region-scoped matches by the site's region", () => {
    expect(canAccessSite(regional, "ahrensburg", "dach")).toBe(true);
    expect(canAccessSite(regional, "skaneateles", "americas")).toBe(false);
  });
});

describe("permissionsFor()", () => {
  it("returns the role's permission list", () => {
    expect(permissionsFor("READONLY_EXECUTIVE")).toEqual(["view_content", "exec_reporting"]);
    expect(permissionsFor("PLATFORM_ADMIN").length).toBeGreaterThanOrEqual(13);
  });
});
