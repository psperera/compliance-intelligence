"use client";
import { useEffect, useState, useCallback } from "react";

type Source = { changeId?: string; prevText?: string; currText?: string; title?: string; candidateSites?: string[] };
type Analysis = { summary: string; businessImpact: string; confidence: string; provider?: string; model?: string; degraded?: boolean };

// Renders the AI-assisted impact analysis. Shows the deterministic draft instantly, then
// auto-generates the REAL analysis from the configured LLM (Ollama by default). A Regenerate
// button re-runs it. If no LLM is reachable it keeps the deterministic fallback and says so.
export function AiImpact({ initial, source, auto = true }: { initial: Analysis; source: Source; auto?: boolean }) {
  const [a, setA] = useState<Analysis>(initial);
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = useCallback(async (regenerate = false) => {
    setBusy(true);
    try {
      const res = await fetch("/api/impact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...source, regenerate }) });
      const d = await res.json();
      if (res.ok) { setA({ summary: d.summary, businessImpact: d.businessImpact, confidence: d.confidence, provider: d.provider, model: d.model, degraded: d.degraded }); setGenerated(true); }
    } finally { setBusy(false); }
  }, [source]);

  useEffect(() => { if (auto) generate(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="aibox">
      <div className="aih">✦ AI-assisted impact analysis
        <span className="pill p-amber"><span className="pd" />Draft · Requires expert review</span>
        <span className="conf" style={{ marginLeft: "auto" }}>Confidence: {a.confidence}</span>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.6 }}>{busy && !generated ? "Generating analysis with the configured LLM…" : a.summary}</p>
      {a.businessImpact && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}><b>Likely business impact:</b> {a.businessImpact}</p>}
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, borderTop: "1px solid #e0d8f5", paddingTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>{a.degraded ? "⚠ " : "✦ "}{a.provider ? a.provider : "Deterministic draft"}{a.model ? ` · ${a.model}` : ""} · raw diff stored separately · not a final compliance decision.</span>
        <button className="btn sm" style={{ marginLeft: "auto" }} disabled={busy} onClick={() => generate(true)}>{busy ? "Generating…" : "Regenerate with LLM"}</button>
      </div>
    </div>
  );
}
