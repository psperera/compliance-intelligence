// POST /api/assistant — HS.ai, the AI compliance helper.
//
// Builds a grounded context from the regulatory record, asks the selected LLM (Ollama by
// default) to answer using ONLY that context with citations, and degrades gracefully to a
// deterministic keyword search if no LLM is reachable — so HS.ai always returns something useful.

import { NextResponse } from "next/server";
import { getRegulations, getChanges, siteName } from "../../../lib/data/store";
import { chat, getLlmConfig, LlmUnavailableError, PROVIDER_LABELS, type ChatMessage } from "../../../lib/ai/llm";

const SYSTEM = `You are HS.ai, the AI compliance assistant for Waygate Technologies'
Compliance Intelligence platform. You guide HS&E, EHS, legal and site users.
Rules:
- Answer ONLY from the CONTEXT provided. Do not invent regulations, numbers, or dates.
- Always cite the regulation or change ID (e.g. DE-TA-LUFT, CHG-2038) you used.
- If the answer isn't in the context, say so and suggest where to look.
- Be concise and practical. You assist; you never make the final compliance decision.`;

async function buildContext(): Promise<string> {
  const [regs, changes] = await Promise.all([getRegulations(), getChanges()]);
  const r = regs.map((x) => `REG ${x.id} | ${x.title} | ${x.jur} | ${x.topic} | status ${x.status} | risk ${x.risk} | sites ${x.sites.map(siteName).join(", ")}`).join("\n");
  const c = changes.map((x) => `CHG ${x.id} (${x.regId}) | ${x.title} | ${x.sev} | effective ${x.eff} | sites ${x.sites.map(siteName).join(", ")} | ${x.impact}`).join("\n");
  return `REGULATIONS:\n${r}\n\nRECENT CHANGES:\n${c}`;
}

// Deterministic fallback: keyword match over the record so FOM is useful even with no LLM.
async function fallbackAnswer(question: string): Promise<string> {
  const q = question.toLowerCase();
  const [regs, changes] = await Promise.all([getRegulations(), getChanges()]);
  const terms = q.split(/\W+/).filter((w) => w.length > 3);
  const score = (s: string) => terms.reduce((n, t) => n + (s.toLowerCase().includes(t) ? 1 : 0), 0);
  const regHits = regs.map((x) => ({ x, s: score(`${x.id} ${x.title} ${x.topic} ${x.jur}`) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 4);
  const chgHits = changes.map((x) => ({ x, s: score(`${x.id} ${x.title} ${x.topic} ${x.jur}`) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 4);
  const lines: string[] = [];
  if (regHits.length) lines.push("Relevant regulations:\n" + regHits.map((h) => `• ${h.x.id} — ${h.x.title} (${h.x.jur}, risk ${h.x.risk})`).join("\n"));
  if (chgHits.length) lines.push("Relevant changes:\n" + chgHits.map((h) => `• ${h.x.id} — ${h.x.title} (${h.x.sev}, effective ${h.x.eff})`).join("\n"));
  if (!lines.length) lines.push("I couldn't find a matching entry in the regulatory record. Try the Regulatory Baseline search or rephrase.");
  return lines.join("\n\n");
}

export async function POST(req: Request) {
  const { question } = await req.json().catch(() => ({ question: "" }));
  if (!question || typeof question !== "string")
    return NextResponse.json({ error: "question required" }, { status: 400 });

  const cfg = getLlmConfig();
  const context = await buildContext();
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION: ${question}` },
  ];

  try {
    const answer = await chat(messages, cfg);
    return NextResponse.json({ answer, provider: cfg.provider, providerLabel: PROVIDER_LABELS[cfg.provider], model: cfg.model, grounded: true });
  } catch (e) {
    if (e instanceof LlmUnavailableError) {
      const answer = await fallbackAnswer(question);
      return NextResponse.json({
        answer,
        provider: cfg.provider,
        providerLabel: PROVIDER_LABELS[cfg.provider],
        model: cfg.model,
        degraded: true,
        notice: `${PROVIDER_LABELS[cfg.provider]} unavailable — showing a record-based answer. ${e.message}`,
      });
    }
    return NextResponse.json({ error: "assistant error" }, { status: 500 });
  }
}
