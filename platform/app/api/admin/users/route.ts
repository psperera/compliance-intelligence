// GET  /api/admin/users  — list users
// POST /api/admin/users  — add a user (RBAC: manage_users)
// PATCH /api/admin/users — update role/scope/status (RBAC: manage_users)
import { NextResponse } from "next/server";
import { getCurrentUser } from "../../../../lib/auth/current-user";
import { can, ROLE_PERMISSIONS, type RoleKey } from "../../../../lib/auth/rbac";
import { listUsers, addUser, updateUser } from "../../../../lib/data/users";

export async function GET() {
  return NextResponse.json({ users: listUsers() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!can(me, "manage_users")) return NextResponse.json({ error: "Forbidden: manage_users required" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.name || !b.email || !b.role) return NextResponse.json({ error: "name, email and role are required" }, { status: 400 });
  if (!(b.role in ROLE_PERMISSIONS)) return NextResponse.json({ error: "unknown role" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });

  try {
    const user = addUser({
      name: b.name, email: b.email, title: b.title ?? "", role: b.role as RoleKey,
      scopeType: b.scopeType ?? "GLOBAL", scope: Array.isArray(b.scope) ? b.scope : [],
    });
    // PRODUCTION: send invite email via EmailProvider; write AuditLog (category USER).
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!can(me, "manage_users")) return NextResponse.json({ error: "Forbidden: manage_users required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const user = updateUser(b.id, { role: b.role, scopeType: b.scopeType, scope: b.scope, status: b.status, title: b.title });
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
