// POST /api/regulations/:regId/watch — toggle watchlist flag. Body: { watch: boolean }
import { NextResponse } from "next/server";
import { setRegulationWatch } from "../../../../../lib/data/store";
import { getCurrentUser } from "../../../../../lib/auth/current-user";
import { can } from "../../../../../lib/auth/rbac";

export async function POST(req: Request, { params }: { params: Promise<{ regId: string }> }) {
  const { regId } = await params;
  const me = await getCurrentUser();
  if (!can(me, "configure_alerts")) return NextResponse.json({ error: "Forbidden: configure_alerts required" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  try {
    const r = await setRegulationWatch(regId, b.watch !== false);
    return NextResponse.json({ ok: true, watch: r.watch });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 404 });
  }
}
