// lib/ai/llm.ts — multi-provider LLM layer powering the FOM assistant.
//
// Default provider is a LOCAL LLM via Ollama (no data leaves the machine) — the right
// default for regulatory/compliance content. Admins can switch to OpenAI, Claude
// (Anthropic) or OpenRouter from the Administration screen.
//
// All providers implement the same chat() contract. If the selected provider is
// unreachable (e.g. Ollama not running), callers receive an LlmUnavailableError and can
// fall back to a deterministic, sourced answer.

export type LlmProvider = "ollama" | "openai" | "anthropic" | "openrouter";

export interface LlmConfig {
  provider: LlmProvider;
  model: string;
  ollamaUrl: string;
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  ollama: "Ollama (local LLM)",
  openai: "OpenAI API",
  anthropic: "Claude API (Anthropic)",
  openrouter: "OpenRouter",
};

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  ollama: "llama3.1",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  openrouter: "anthropic/claude-3.5-sonnet",
};

// In-memory selection (set from the Admin screen). PRODUCTION: persist per-organisation
// in the DB (e.g. an OrgSetting row) and load it here.
let CURRENT: LlmConfig = {
  provider: (process.env.FOM_PROVIDER as LlmProvider) || "ollama",
  model: process.env.FOM_MODEL || DEFAULT_MODELS[(process.env.FOM_PROVIDER as LlmProvider) || "ollama"],
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
};

export function getLlmConfig(): LlmConfig { return { ...CURRENT }; }
export function setLlmConfig(patch: Partial<LlmConfig>): LlmConfig {
  CURRENT = { ...CURRENT, ...patch };
  if (patch.provider && !patch.model) CURRENT.model = DEFAULT_MODELS[patch.provider];
  return getLlmConfig();
}

export class LlmUnavailableError extends Error {
  constructor(public provider: LlmProvider, msg: string) { super(msg); this.name = "LlmUnavailableError"; }
}

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export async function chat(messages: ChatMessage[], cfg: LlmConfig = getLlmConfig()): Promise<string> {
  try {
    switch (cfg.provider) {
      case "ollama": return await ollamaChat(messages, cfg);
      case "openai": return await openAiCompatChat(messages, cfg, "https://api.openai.com/v1/chat/completions", process.env.OPENAI_API_KEY);
      case "openrouter": return await openAiCompatChat(messages, cfg, "https://openrouter.ai/api/v1/chat/completions", process.env.OPENROUTER_API_KEY);
      case "anthropic": return await anthropicChat(messages, cfg);
    }
  } catch (e) {
    if (e instanceof LlmUnavailableError) throw e;
    throw new LlmUnavailableError(cfg.provider, (e as Error).message);
  }
}

async function ollamaChat(messages: ChatMessage[], cfg: LlmConfig): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${cfg.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, messages, stream: false }),
    });
  } catch (e) {
    throw new LlmUnavailableError("ollama", `Cannot reach Ollama at ${cfg.ollamaUrl} — is it running? (${(e as Error).message})`);
  }
  if (!res.ok) throw new LlmUnavailableError("ollama", `Ollama returned ${res.status}. Pull the model with: ollama pull ${cfg.model}`);
  const data = await res.json();
  return data?.message?.content ?? "";
}

async function openAiCompatChat(messages: ChatMessage[], cfg: LlmConfig, url: string, key?: string): Promise<string> {
  if (!key) throw new LlmUnavailableError(cfg.provider, `Missing API key for ${PROVIDER_LABELS[cfg.provider]}.`);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: cfg.model, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw new LlmUnavailableError(cfg.provider, `${PROVIDER_LABELS[cfg.provider]} returned ${res.status}.`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function anthropicChat(messages: ChatMessage[], cfg: LlmConfig): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new LlmUnavailableError("anthropic", "Missing ANTHROPIC_API_KEY.");
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
  const turns = messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content }));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: cfg.model, system, messages: turns, max_tokens: 1024 }),
  });
  if (!res.ok) throw new LlmUnavailableError("anthropic", `Claude API returned ${res.status}.`);
  const data = await res.json();
  return (data?.content ?? []).map((b: { text?: string }) => b.text ?? "").join("");
}
