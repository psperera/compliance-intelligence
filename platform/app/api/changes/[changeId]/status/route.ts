// POST /api/changes/:changeId/status — update workflow status (RBAC: create_assessment).
import { NextResponse } from "next/server";
import { setChangeStatus } from "../../../../../lib/data/store";
import { getCurrentUser } from "../../../../../lib/auth/current-user";
import { can } from "../../../../../lib/auth/rbac";

const ALLOWED = ["Marked as reviewed", "Expert review required", "Action plan created", "Escalated", "Approved"];

export async function POST(req: Request, { params }: { params: Promise<{ changeId: string }> }) {
  const { changeId } = await params;
  const me = await getCurrentUser();
  if (!can(me, "create_assessment")) return NextResponse.json({ error: "Forbidden: create_assessment required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(b.status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  try {
    const c = await setChangeStatus(changeId, b.status);
    return NextResponse.json({ ok: true, status: c.status });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
