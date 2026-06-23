// change-detection.service.ts — orchestrates the deterministic-first pipeline.
//
//   feed.getVersions → parse → compareVersions (raw diff, authoritative)
//                    → derive severity/category/impact from signals (deterministic)
//                    → ai.draftImpact (DRAFT, requires expert review — never authoritative)
//
// Returns domain objects; the worker persists them: ChangeComparison (raw) and
// ChangeAssessment (AI) are stored SEPARATELY, and every step appends an AuditLog row.

import { parseDocument } from "../diff/parse";
import { compareVersions } from "../diff/diff";
import type { ComparisonResult } from "../diff/types";
import type { RegulatoryFeedProvider } from "../integrations/regulatory-feed/provider";
import type { AiProvider, ImpactDraft } from "../integrations/ai/provider";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
export type ComplianceImpact =
  | "IMMEDIATE_ACTION_REQUIRED" | "ACTION_REQUIRED_BEFORE_EFFECTIVE_DATE"
  | "MONITOR_ONLY" | "NO_COMPANY_IMPACT" | "EXPERT_REVIEW_REQUIRED";

export interface DetectionResult {
  regulationRef: string;
  comparison: ComparisonResult;     // raw diff — source of truth
  severity: Severity;               // deterministic
  categories: string[];             // deterministic
  complianceImpact: ComplianceImpact;
  aiDraft: ImpactDraft;             // AI — labelled DRAFT / requires expert review
  assessmentLifecycle: "DRAFT";
  changeStatus: "EXPERT_REVIEW_REQUIRED";
}

/** Deterministic severity from the diff signals + structural churn. */
export function deriveSeverity(c: ComparisonResult): Severity {
  const tightened = c.signals.some((s) => s.direction === "TIGHTENED" && (s.kind === "THRESHOLD_CHANGED" || s.kind === "PERCENTAGE_CHANGED"));
  const newObligation = c.stats.added > 0;
  const penaltyOrDate = c.signals.some((s) => s.kind === "DATE_CHANGED");
  const reporting = c.signals.some((s) => s.kind === "FREQUENCY_CHANGED" || s.kind === "RETENTION_CHANGED");

  if (tightened && newObligation) return "CRITICAL";
  if (tightened || penaltyOrDate) return "HIGH";
  if (reporting || newObligation || c.stats.amended > 0) return "MEDIUM";
  if (c.stats.deleted > 0 || c.stats.moved > 0) return "LOW";
  return "INFORMATIONAL";
}

function deriveImpact(sev: Severity): ComplianceImpact {
  switch (sev) {
    case "CRITICAL": return "IMMEDIATE_ACTION_REQUIRED";
    case "HIGH": return "ACTION_REQUIRED_BEFORE_EFFECTIVE_DATE";
    case "MEDIUM": return "ACTION_REQUIRED_BEFORE_EFFECTIVE_DATE";
    case "LOW": return "MONITOR_ONLY";
    default: return "NO_COMPANY_IMPACT";
  }
}

function deriveCategories(c: ComparisonResult): string[] {
  const cats = new Set<string>();
  if (c.stats.added) cats.add("New obligation");
  if (c.stats.deleted) cats.add("Removed obligation");
  if (c.stats.moved) cats.add("Scope change");
  for (const s of c.signals) {
    if ((s.kind === "THRESHOLD_CHANGED" || s.kind === "PERCENTAGE_CHANGED"))
      cats.add(s.direction === "TIGHTENED" ? "Tightened requirement" : "Reduced requirement");
    if (s.kind === "FREQUENCY_CHANGED" || s.kind === "RETENTION_CHANGED") cats.add("Reporting change");
    if (s.kind === "DATE_CHANGED") cats.add("Effective-date change");
  }
  if (cats.size === 0) cats.add("Administrative change");
  return [...cats];
}

export class ChangeDetectionService {
  constructor(private feed: RegulatoryFeedProvider, private ai: AiProvider) {}

  /** Analyse a single regulation's latest change. Pure: no DB writes (the worker persists). */
  async analyze(regulationRef: string, prevLabel: string, currLabel: string): Promise<DetectionResult> {
    const versions = await this.feed.getVersions(regulationRef);
    const prev = versions.find((v) => v.versionLabel === prevLabel);
    const curr = versions.find((v) => v.versionLabel === currLabel);
    if (!prev || !curr) throw new Error(`Versions not found for ${regulationRef}: ${prevLabel} / ${currLabel}`);

    // 1) deterministic diff (authoritative)
    const comparison = compareVersions(
      parseDocument(prev.versionLabel, prev.rawText),
      parseDocument(curr.versionLabel, curr.rawText),
    );

    // 2) deterministic classification
    const severity = deriveSeverity(comparison);
    const categories = deriveCategories(comparison);
    const complianceImpact = deriveImpact(severity);

    // 3) regulation metadata for AI context + candidate sites
    const reg = (await this.feed.listRegulations()).find((r) => r.externalRef === regulationRef);
    const candidateSites = reg?.applicableSites ?? [];

    // 4) AI draft (never authoritative; stored separately, requires expert review)
    const aiDraft = await this.ai.draftImpact({
      regulationTitle: reg?.title ?? regulationRef,
      comparison,
      candidateSites,
    });

    return {
      regulationRef,
      comparison,
      severity,
      categories,
      complianceImpact,
      aiDraft,
      assessmentLifecycle: "DRAFT",
      changeStatus: "EXPERT_REVIEW_REQUIRED",
    };
  }
}
