// POST /api/compare — compare TWO arbitrary documents with the real diff engine.
// Body: { prevText, currText, prevLabel?, currLabel?, title? }
// Returns the deterministic clause diff + material signals + derived severity/categories,
// plus an AI-assisted draft summary (mock provider unless an LLM is configured).
import { NextResponse } from "next/server";
import { parseDocument } from "../../../lib/diff/parse";
import { compareVersions } from "../../../lib/diff/diff";
import { deriveSeverity } from "../../../lib/services/change-detection.service";
import { mockAiProvider } from "../../../lib/integrations/ai/mock";

function deriveCategories(stats: { added: number; deleted: number; moved: number }, signals: { kind: string; direction?: string }[]): string[] {
  const cats = new Set<string>();
  if (stats.added) cats.add("New obligation");
  if (stats.deleted) cats.add("Removed obligation");
  if (stats.moved) cats.add("Scope change");
  for (const s of signals) {
    if (s.kind === "THRESHOLD_CHANGED" || s.kind === "PERCENTAGE_CHANGED") cats.add(s.direction === "TIGHTENED" ? "Tightened requirement" : "Reduced requirement");
    if (s.kind === "FREQUENCY_CHANGED" || s.kind === "RETENTION_CHANGED") cats.add("Reporting change");
    if (s.kind === "DATE_CHANGED") cats.add("Effective-date change");
  }
  if (cats.size === 0) cats.add("Administrative change");
  return [...cats];
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const prevText: string = b.prevText ?? "";
  const currText: string = b.currText ?? "";
  if (!prevText.trim() || !currText.trim())
    return NextResponse.json({ error: "Provide both the previous and current document text." }, { status: 400 });

  const prevLabel = b.prevLabel || "Document A";
  const currLabel = b.currLabel || "Document B";

  // REAL diff engine — same code path used for ingested regulations.
  const comparison = compareVersions(parseDocument(prevLabel, prevText), parseDocument(currLabel, currText));
  const severity = deriveSeverity(comparison);
  const categories = deriveCategories(comparison.stats, comparison.signals);

  let aiDraft = null;
  try {
    aiDraft = await mockAiProvider.draftImpact({ regulationTitle: b.title || "the compared document", comparison, candidateSites: [] });
  } catch { /* AI optional */ }

  return NextResponse.json({ comparison, severity, categories, aiDraft, prevLabel, currLabel });
}
