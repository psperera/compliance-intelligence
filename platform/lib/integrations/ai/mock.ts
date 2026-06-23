// ai/mock.ts — deterministic stand-in for the AI provider.
//
// Produces a plausible draft impact summary from the deterministic diff signals,
// so the platform demonstrates the human-in-the-loop flow with no model connected.
// Confidence is derived from how cleanly the signals were detected — never forced to HIGH.

import type { AiProvider, ImpactDraft, Confidence } from "./provider";
import type { ComparisonResult } from "../../diff/types";

function deriveCategories(c: ComparisonResult): string[] {
  const cats = new Set<string>();
  if (c.stats.added > 0) cats.add("New obligation");
  if (c.stats.deleted > 0) cats.add("Removed obligation");
  for (const s of c.signals) {
    if (s.kind === "THRESHOLD_CHANGED" || s.kind === "PERCENTAGE_CHANGED")
      cats.add(s.direction === "TIGHTENED" ? "Tightened requirement" : "Reduced requirement");
    if (s.kind === "FREQUENCY_CHANGED") cats.add("Reporting change");
    if (s.kind === "DATE_CHANGED") cats.add("Effective-date change");
    if (s.kind === "RETENTION_CHANGED") cats.add("Reporting change");
  }
  if (cats.size === 0) cats.add("Administrative change");
  return [...cats];
}

function deriveConfidence(c: ComparisonResult): Confidence {
  const material = c.signals.length;
  const churn = c.stats.added + c.stats.deleted + c.stats.amended + c.stats.moved;
  if (material >= 2 && churn <= 8) return "HIGH";
  if (material >= 1) return "MEDIUM";
  if (churn > 0) return "LOW";
  return "HUMAN_CONFIRMATION_REQUIRED";
}

export class MockAiProvider implements AiProvider {
  async draftImpact(input: {
    regulationTitle: string;
    comparison: ComparisonResult;
    candidateSites: string[];
  }): Promise<ImpactDraft> {
    const c = input.comparison;
    const sentences: string[] = [];

    for (const s of c.signals) {
      if (s.kind === "THRESHOLD_CHANGED")
        sentences.push(`${s.clauseNo} tightens a limit from ${s.from} to ${s.to}` + (s.direction === "TIGHTENED" ? " (stricter)." : "."));
      if (s.kind === "FREQUENCY_CHANGED")
        sentences.push(`Reporting frequency changes from ${s.from} to ${s.to}.`);
      if (s.kind === "RETENTION_CHANGED")
        sentences.push(`Record retention changes from ${s.from} to ${s.to}.`);
      if (s.kind === "DATE_CHANGED")
        sentences.push(`A key date moves from ${s.from} to ${s.to}.`);
    }
    if (c.stats.added) sentences.push(`${c.stats.added} new clause(s) introduce additional obligations.`);
    if (c.stats.deleted) sentences.push(`${c.stats.deleted} clause(s) were removed.`);

    const summary =
      `The amendment to "${input.regulationTitle}" contains ${c.stats.amended} amended, ` +
      `${c.stats.added} added and ${c.stats.deleted} removed clause(s). ` + sentences.join(" ");

    const businessImpact =
      input.candidateSites.length
        ? `Sites likely affected: ${input.candidateSites.join(", ")}. Operations that exceed the revised ` +
          `thresholds will require engineering or procedural changes before the effective date; recommend an ` +
          `immediate applicability check and permit review.`
        : `No applicable sites detected automatically — confirm applicability during expert review.`;

    return {
      summary,
      businessImpact,
      suggestedCategories: deriveCategories(c),
      likelyAffectedSites: input.candidateSites,
      confidence: deriveConfidence(c),
      aiModel: "mock:deterministic-v1",
    };
  }

  async translate(text: string): Promise<string> { return text; }
}

export const mockAiProvider = new MockAiProvider();
