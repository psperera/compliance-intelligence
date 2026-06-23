"use client";
import { useEffect, useState } from "react";

type Cfg = { provider: string; model: string; ollamaUrl: string };
const ORDER = ["ollama", "openai", "anthropic", "openrouter"] as const;

export function AiProviderMenu() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai-provider").then((r) => r.json()).then((d) => {
      setCfg(d.config); setLabels(d.labels); setDefaults(d.defaults);
    });
  }, []);

  async function select(provider: string) {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/ai-provider", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider }) });
    const d = await res.json();
    if (res.ok) { setCfg(d.config); setMsg(`FOM now using ${labels[d.config.provider]} (${d.config.model}).`); }
    else setMsg(`✗ ${d.error}`);
    setBusy(false);
  }

  if (!cfg) return <div className="muted">Loading…</div>;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        {ORDER.map((p) => {
          const active = cfg.provider === p;
          return (
            <button key={p} onClick={() => select(p)} disabled={busy}
              style={{ textAlign: "left", padding: 14, borderRadius: 10, cursor: "pointer",
                border: active ? "2px solid var(--blue)" : "1px solid var(--line)", background: active ? "var(--blue-bg)" : "#fff" }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{labels[p]}</div>
              <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>default model: {defaults[p]}</div>
              {p === "ollama" && <div style={{ fontSize: 11, color: "var(--teal)", marginTop: 6, fontWeight: 600 }}>● Local · private · recommended</div>}
              {active && <div style={{ fontSize: 11, color: "var(--blue)", marginTop: 6, fontWeight: 700 }}>✓ Active</div>}
            </button>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Local (Ollama) keeps regulatory content on-prem — start it with <code>ollama serve</code> and <code>ollama pull {defaults.ollama}</code>.
        Cloud providers require their API key in the server environment.
      </div>
      {msg && <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 10, color: msg.startsWith("✗") ? "var(--red)" : "var(--green)" }}>{msg}</div>}
    </div>
  );
}
