// POST /api/impact — generate the REAL AI-assisted impact analysis via the configured LLM.
// Body: { changeId } OR { prevText, currText, title?, candidateSites? }
import { NextResponse } from "next/server";
import { parseDocument } from "../../../lib/diff/parse";
import { compareVersions } from "../../../lib/diff/diff";
import type { ComparisonResult } from "../../../lib/diff/types";
import { getChange, getAdHocVersions } from "../../../lib/data/store";
import { mockRegulatoryFeed } from "../../../lib/integrations/regulatory-feed/mock";
import { llmAiProvider } from "../../../lib/integrations/ai/llm-provider";
import { getLlmConfig, PROVIDER_LABELS } from "../../../lib/ai/llm";

async function comparisonFromChange(changeId: string): Promise<{ cmp: ComparisonResult; title: string; sites: string[] } | null> {
  const change = await getChange(changeId);
  if (!change) return null;
  // ad-hoc (Compare-tool-created) change?
  const adhoc = await getAdHocVersions(changeId);
  if (adhoc) return { cmp: compareVersions(parseDocument("prev", adhoc.prev), parseDocument("curr", adhoc.curr)), title: change.title, sites: change.sites };
  // seeded change with ingested versions
  if (change.prevVersion && change.currVersion) {
    const vs = await mockRegulatoryFeed.getVersions(change.regId);
    const p = vs.find((v) => v.versionLabel === change.prevVersion);
    const c = vs.find((v) => v.versionLabel === change.currVersion);
    if (p && c) return { cmp: compareVersions(parseDocument(p.versionLabel, p.rawText), parseDocument(c.versionLabel, c.rawText)), title: change.title, sites: change.sites };
  }
  return null;
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  let cmp: ComparisonResult | null = null;
  let title = b.title || "the compared document";
  let sites: string[] = b.candidateSites ?? [];

  if (b.changeId) {
    const r = await comparisonFromChange(b.changeId);
    if (!r) return NextResponse.json({ error: "No comparable versions for this change." }, { status: 409 });
    cmp = r.cmp; title = r.title; sites = r.sites;
  } else if (b.prevText && b.currText) {
    cmp = compareVersions(parseDocument("prev", b.prevText), parseDocument("curr", b.currText));
  } else {
    return NextResponse.json({ error: "Provide changeId or prevText + currText." }, { status: 400 });
  }

  const draft = await llmAiProvider.draftImpact({ regulationTitle: title, comparison: cmp, candidateSites: sites });
  const cfg = getLlmConfig();
  const degraded = draft.aiModel.startsWith("fallback");
  return NextResponse.json({
    summary: draft.summary, businessImpact: draft.businessImpact, confidence: draft.confidence,
    categories: draft.suggestedCategories, model: draft.aiModel,
    provider: degraded ? "Deterministic fallback" : PROVIDER_LABELS[cfg.provider], degraded,
  });
}
