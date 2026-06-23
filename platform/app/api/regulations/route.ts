// GET  /api/regulations — list
// POST /api/regulations — add (RBAC: edit_metadata)
import { NextResponse } from "next/server";
import { getRegulations, addRegulation } from "../../../lib/data/store";
import { getCurrentUser } from "../../../lib/auth/current-user";
import { can } from "../../../lib/auth/rbac";

export async function GET() {
  return NextResponse.json({ regulations: await getRegulations() });
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!can(me, "edit_metadata")) return NextResponse.json({ error: "Forbidden: edit_metadata required" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  if (!b.id || !b.title || !b.jur || !b.topic) return NextResponse.json({ error: "id, title, jurisdiction and topic are required" }, { status: 400 });

  try {
    const reg = await addRegulation({
      id: b.id, title: b.title, jur: b.jur, topic: b.topic, agency: b.agency ?? "—",
      risk: b.risk ?? "MEDIUM", status: b.status, eff: b.eff, owner: b.owner, sites: b.sites,
    });
    return NextResponse.json({ ok: true, regulation: reg });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
