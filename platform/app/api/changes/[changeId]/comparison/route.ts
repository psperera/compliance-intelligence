// GET /api/changes/:changeId/comparison
// Returns the deterministic diff engine output for a change (raw diff + signals + AI draft).
import { NextResponse } from "next/server";
import { getChange } from "../../../../../lib/data/store";
import { ChangeDetectionService } from "../../../../../lib/services/change-detection.service";
import { mockRegulatoryFeed } from "../../../../../lib/integrations/regulatory-feed/mock";
import { mockAiProvider } from "../../../../../lib/integrations/ai/mock";

export async function GET(_req: Request, { params }: { params: Promise<{ changeId: string }> }) {
  const { changeId } = await params;
  const change = await getChange(changeId);
  if (!change) return NextResponse.json({ error: "change not found" }, { status: 404 });
  if (!change.prevVersion || !change.currVersion)
    return NextResponse.json({ error: "no source versions ingested for this change" }, { status: 409 });

  const detector = new ChangeDetectionService(mockRegulatoryFeed, mockAiProvider);
  const result = await detector.analyze(change.regId, change.prevVersion, change.currVersion);
  return NextResponse.json(result);
}
