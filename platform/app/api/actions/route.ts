// GET  /api/actions — list
// POST /api/actions — create (RBAC: assign_actions)
import { NextResponse } from "next/server";
import { getActions, addAction } from "../../../lib/data/store";
import { getCurrentUser } from "../../../lib/auth/current-user";
import { can } from "../../../lib/auth/rbac";

export async function GET() {
  return NextResponse.json({ actions: await getActions() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!can(me, "assign_actions")) return NextResponse.json({ error: "Forbidden: assign_actions required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const action = await addAction({
    title: b.title, reg: b.reg, chg: b.chg, site: b.site, line: b.line,
    pri: b.pri || "MEDIUM", owner: b.owner, due: b.due, status: b.status, ev: b.ev,
  });
  return NextResponse.json({ ok: true, action });
}
