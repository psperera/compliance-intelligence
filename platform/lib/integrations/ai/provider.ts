// ai/provider.ts — bounded AI interface. AI interprets; it never decides compliance.
//
// Every method returns content that is stored with lifecycle=DRAFT and a confidence level,
// and must pass human expert review before it is treated as authoritative.
//
// PRODUCTION INTEGRATION: implement against your model provider in anthropic.ts and bind
// via AI_PROVIDER env. Keep the surface area exactly this small.

import type { ComparisonResult } from "../../diff/types";

export type Confidence = "HIGH" | "MEDIUM" | "LOW" | "HUMAN_CONFIRMATION_REQUIRED";

export interface ImpactDraft {
  summary: string;           // plain-English explanation of the material change
  businessImpact: string;    // likely effect on the company / sites
  suggestedCategories: string[];
  likelyAffectedSites: string[];
  confidence: Confidence;
  aiModel: string;           // provenance
}

export interface AiProvider {
  /** Group clause changes into themes and draft a plain-English impact summary. */
  draftImpact(input: {
    regulationTitle: string;
    comparison: ComparisonResult;
    candidateSites: string[];
  }): Promise<ImpactDraft>;

  /** Optional translation when source language differs from working language. */
  translate?(text: string, targetLang: string): Promise<string>;
}
