"use client";
import { useState, useRef, useEffect } from "react";

// FOM — Field Operations Mentor. AI compliance assistant that guides users with answers
// grounded in the regulatory record. Backed by /api/assistant (local LLM via Ollama by
// default; switchable in Administration). Degrades to a record-based answer if no LLM.
type Msg = { role: "user" | "fom"; text: string; provider?: string; degraded?: boolean; notice?: string };

const SUGGESTIONS = [
  "What changed in TA Luft and which sites are affected?",
  "Which radiation safety regulations apply to Changzhou?",
  "What's overdue and who owns it?",
];

export function Fom() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "fom", text: "Hi, I'm FOM — your compliance assistant. Ask about regulations, changes, sites or actions. I answer from the regulatory record and cite my sources." }]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight); }, [msgs, open]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setMsgs((m) => [...m, { role: "user", text: question }]);
    setQ(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const d = await res.json();
      setMsgs((m) => [...m, { role: "fom", text: d.answer ?? d.error ?? "No answer.", provider: d.providerLabel, degraded: d.degraded, notice: d.notice }]);
    } catch {
      setMsgs((m) => [...m, { role: "fom", text: "Request failed." }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="Open FOM assistant"
        style={{ position: "fixed", right: 22, bottom: 22, zIndex: 60, width: 56, height: 56, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg,#6d4bb6,#1f5fd6)", color: "#fff", fontWeight: 800, fontSize: 16, boxShadow: "0 8px 28px rgba(31,95,214,.45)" }}>
        FOM
      </button>

      {open && (
        <div style={{ position: "fixed", right: 22, bottom: 88, zIndex: 60, width: 380, maxWidth: "calc(100vw - 32px)", height: 520, maxHeight: "calc(100vh - 130px)",
          background: "#fff", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ background: "linear-gradient(135deg,#6d4bb6,#1f5fd6)", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 800 }}>FOM</div>
            <div style={{ fontSize: 11.5, opacity: .9 }}>Field Operations Mentor · AI compliance assistant</div>
            <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#fff", fontSize: 18 }}>×</button>
          </div>

          <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, background: "var(--bg)" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%" }}>
                <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5, padding: "9px 12px", borderRadius: 12,
                  background: m.role === "user" ? "var(--blue)" : "#fff", color: m.role === "user" ? "#fff" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid var(--line)" }}>
                  {m.text}
                </div>
                {m.role === "fom" && m.provider && (
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>
                    {m.degraded ? "⚠ " : "✦ "}{m.provider}{m.degraded ? " · record-based fallback" : ""}
                  </div>
                )}
                {m.notice && <div style={{ fontSize: 10.5, color: "var(--amber)", marginTop: 2 }}>{m.notice}</div>}
              </div>
            ))}
            {busy && <div className="muted" style={{ fontSize: 12 }}>FOM is thinking…</div>}
            {msgs.length <= 1 && (
              <div style={{ marginTop: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask(s)} style={{ display: "block", width: "100%", textAlign: "left", margin: "5px 0", padding: "8px 10px", fontSize: 12, border: "1px solid var(--line)", borderRadius: 9, background: "#fff", color: "var(--ink)" }}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid var(--line)" }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)}
              placeholder="Ask FOM…" style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--line)", borderRadius: 9, fontSize: 13 }} />
            <button className="btn primary" onClick={() => ask(q)} disabled={busy}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
