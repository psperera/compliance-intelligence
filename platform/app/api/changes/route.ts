// GET  /api/changes — list
// POST /api/changes — create a tracked change (e.g. from the Compare tool). RBAC: create_assessment.
import { NextResponse } from "next/server";
import { getChanges, addChange } from "../../../lib/data/store";
import { getCurrentUser } from "../../../lib/auth/current-user";
import { can } from "../../../lib/auth/rbac";

export async function GET() {
  return NextResponse.json({ changes: await getChanges() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!can(me, "create_assessment")) return NextResponse.json({ error: "Forbidden: create_assessment required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.title || !b.jur) return NextResponse.json({ error: "title and jurisdiction are required" }, { status: 400 });
  const change = await addChange({
    regId: b.regId || "AD-HOC", title: b.title, jur: b.jur, topic: b.topic || "—",
    sev: b.sev || "MEDIUM", cat: b.cat || "Amendment", impact: b.impact || "Expert review required",
    eff: b.eff || new Date().toISOString().slice(0, 10), sites: b.sites, line: b.line,
    owner: b.owner || me.id, conf: b.conf, prevVersion: b.prevVersion || "A", currVersion: b.currVersion || "B",
    prevText: b.prevText, currText: b.currText,
  });
  return NextResponse.json({ ok: true, change });
}
