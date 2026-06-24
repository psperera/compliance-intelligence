// llm-provider.ts — real AiProvider backed by the multi-provider LLM layer (Ollama default).
//
// Produces the impact analysis from the deterministic diff using the configured model.
// Confidence stays DETERMINISTIC (from the diff signals) so it can't be inflated by the model.
// Falls back to the deterministic mock provider if no LLM is reachable.

import type { AiProvider, ImpactDraft, Confidence } from "./provider";
import type { ComparisonResult } from "../../diff/types";
import { chat, getLlmConfig, LlmUnavailableError, type ChatMessage } from "../../ai/llm";
import { mockAiProvider } from "./mock";

function deriveConfidence(c: ComparisonResult): Confidence {
  const material = c.signals.length;
  const churn = c.stats.added + c.stats.deleted + c.stats.amended + c.stats.moved;
  if (material >= 2 && churn <= 8) return "HIGH";
  if (material >= 1) return "MEDIUM";
  if (churn > 0) return "LOW";
  return "HUMAN_CONFIRMATION_REQUIRED";
}

function clauseDigest(c: ComparisonResult): string {
  return c.clauseDiffs
    .filter((d) => d.changeType !== "UNCHANGED")
    .map((d) => {
      if (d.changeType === "ADDED") return `ADDED ${d.clauseNo}: ${d.currText}`;
      if (d.changeType === "DELETED") return `REMOVED ${d.clauseNo}: ${d.prevText}`;
      return `AMENDED ${d.clauseNo}: "${d.prevText}" → "${d.currText}"`;
    })
    .join("\n")
    .slice(0, 4000);
}

const SYSTEM = `You are an EHS/HS&E regulatory analyst assistant for an industrial company.
Given a clause-level diff of a regulation/policy, write a precise impact analysis.
Rules: cite clause numbers; use ONLY facts in the diff (don't invent figures); be concise and practical.
Return STRICT JSON only, no prose outside it, in this shape:
{"summary":"2-4 sentences on the material change","businessImpact":"likely operational/compliance impact","categories":["short tags"]}`;

function parseJson(raw: string): { summary?: string; businessImpact?: string; categories?: string[] } | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

export class LlmAiProvider implements AiProvider {
  async draftImpact(input: { regulationTitle: string; comparison: ComparisonResult; candidateSites: string[] }): Promise<ImpactDraft> {
    const cfg = getLlmConfig();
    const confidence = deriveConfidence(input.comparison);
    const signals = input.comparison.signals.map((s) => `${s.clauseNo} ${s.kind} ${s.from ?? ""}→${s.to ?? ""} (${s.direction ?? ""})`).join("; ");
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM },
      { role: "user", content:
        `Regulation: ${input.regulationTitle}\n` +
        `Diff stats: ${JSON.stringify(input.comparison.stats)}\n` +
        `Deterministic signals: ${signals || "none"}\n` +
        (input.candidateSites.length ? `Applicable sites: ${input.candidateSites.join(", ")}\n` : "") +
        `\nClause changes:\n${clauseDigest(input.comparison)}` },
    ];

    try {
      const raw = await chat(messages, cfg);
      const parsed = parseJson(raw);
      return {
        summary: parsed?.summary?.trim() || raw.trim().slice(0, 1200),
        businessImpact: parsed?.businessImpact?.trim() ||
          (input.candidateSites.length ? `Review applicability for: ${input.candidateSites.join(", ")}.` : "Confirm applicability during expert review."),
        suggestedCategories: parsed?.categories ?? [],
        likelyAffectedSites: input.candidateSites,
        confidence,
        aiModel: `${cfg.provider}:${cfg.model}`,
      };
    } catch (e) {
      if (e instanceof LlmUnavailableError) {
        const fb = await mockAiProvider.draftImpact(input);
        return { ...fb, aiModel: `fallback (LLM unavailable: ${e.message})` };
      }
      throw e;
    }
  }
}

export const llmAiProvider = new LlmAiProvider();
