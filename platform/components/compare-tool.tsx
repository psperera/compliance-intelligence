"use client";
import { useState } from "react";
import Link from "next/link";
import { DiffView } from "./diff-view";
import { AiImpact } from "./ai-impact";
import { SevPill } from "./ui";
import type { ComparisonResult } from "../lib/diff/types";

const JURS = ["Germany (EU)", "United States", "Slovakia (EU)", "France (EU)", "Switzerland", "Belgium (EU)", "China", "India", "United Kingdom", "Brazil", "Singapore", "United Arab Emirates", "South Korea"];
const TOPICS = ["Air Emissions", "Occupational H&S", "Radiation Safety", "Chemicals & Hazardous Substances", "Waste & Circularity", "Energy & Carbon", "Process Safety", "Water Discharge", "Product Stewardship", "Industrial Permits", "Sustainability Disclosure"];

type Result = { comparison: ComparisonResult; severity: string; categories: string[]; aiDraft: { summary: string; businessImpact: string; confidence: string } | null; prevLabel: string; currLabel: string };

const EXAMPLE_A = [
  "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 10 mg/m³ as a daily mean value, measured at the point of release.",
  "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.20 kg/h.",
  "§5.2.4 Operators shall submit emission measurement reports to the competent authority annually.",
  "§5.3.0 Periodic measurements may be performed by an internally accredited testing body.",
  "§6.1.1 Records of all emission measurements shall be retained and made available to the authority on request.",
].join("\n");
const EXAMPLE_B = [
  "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 5 mg/m³ as a daily mean value, measured at the point of release.",
  "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.10 kg/h.",
  "§5.2.3 Installations shall be fitted with a high-efficiency particulate abatement system achieving at least 99% separation efficiency.",
  "§5.2.4 Operators shall submit emission measurement reports to the competent authority quarterly.",
  "§6.1.1 Records of all emission measurements shall be retained for a minimum of 10 years and made available to the authority on request.",
].join("\n");

export function CompareTool() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [labelA, setLabelA] = useState("Previous version");
  const [labelB, setLabelB] = useState("Current version");
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // save-as-tracked-change state
  const [saveOpen, setSaveOpen] = useState(false);
  const [saved, setSaved] = useState<{ id: string } | null>(null);
  const [sv, setSv] = useState({ title: "", jur: JURS[0], topic: TOPICS[0] });
  const [saving, setSaving] = useState(false);

  function loadFile(e: React.ChangeEvent<HTMLInputElement>, set: (v: string) => void) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => set(String(r.result ?? ""));
    r.readAsText(f);
  }

  async function compare() {
    setBusy(true); setErr(null); setRes(null);
    const resp = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prevText: a, currText: b, prevLabel: labelA, currLabel: labelB, title: "the compared document" }) });
    const d = await resp.json();
    setBusy(false);
    if (resp.ok) { setRes(d); setSaved(null); setSaveOpen(false); } else setErr(d.error);
  }

  async function saveAsChange() {
    if (!res) return;
    setSaving(true);
    const resp = await fetch("/api/changes", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sv.title || `${labelA} → ${labelB} comparison`, jur: sv.jur, topic: sv.topic,
        sev: res.severity, cat: res.categories[0] ?? "Amendment", prevText: a, currText: b,
        prevVersion: labelA, currVersion: labelB,
      }) });
    const d = await resp.json(); setSaving(false);
    if (resp.ok) { setSaved({ id: d.change.id }); setSaveOpen(false); } else setErr(d.error);
  }

  const ta: React.CSSProperties = { width: "100%", minHeight: 200, padding: 12, border: "1px solid var(--line)", borderRadius: 8, fontFamily: "ui-monospace,Menlo,monospace", fontSize: 12.5, lineHeight: 1.5, resize: "vertical" };
  const lbl: React.CSSProperties = { padding: "6px 9px", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, fontWeight: 600, width: "100%", marginBottom: 6 };
  const lblS: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--muted)" };
  const selS: React.CSSProperties = { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink)", background: "#fff" };

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="ch"><h3>Compare two documents</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn sm" onClick={() => { setA(EXAMPLE_A); setB(EXAMPLE_B); }}>Load example</button>
            <button className="btn sm" onClick={() => { setA(""); setB(""); setRes(null); }}>Clear</button>
          </div>
        </div>
        <div className="cb">
          <p className="muted" style={{ marginTop: 0, fontSize: 12.5 }}>Paste or upload two versions (clause-numbered text — e.g. <code>§5.2.1 …</code>, <code>Art. 12(3) …</code>, <code>Section 4 …</code>). The deterministic diff engine aligns clauses, marks additions/amendments/removals, and derives severity.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <input style={lbl} value={labelA} onChange={(e) => setLabelA(e.target.value)} />
              <textarea style={ta} value={a} onChange={(e) => setA(e.target.value)} placeholder="Paste the previous / baseline document…" />
              <input type="file" accept=".txt,.md,.xml,.html" onChange={(e) => loadFile(e, setA)} style={{ fontSize: 12, marginTop: 6 }} />
            </div>
            <div>
              <input style={lbl} value={labelB} onChange={(e) => setLabelB(e.target.value)} />
              <textarea style={ta} value={b} onChange={(e) => setB(e.target.value)} placeholder="Paste the new / current document…" />
              <input type="file" accept=".txt,.md,.xml,.html" onChange={(e) => loadFile(e, setB)} style={{ fontSize: 12, marginTop: 6 }} />
            </div>
          </div>
          {err && <div style={{ color: "var(--red)", fontWeight: 600, fontSize: 12.5, marginTop: 10 }}>✗ {err}</div>}
          <div style={{ marginTop: 12 }}><button className="btn primary" onClick={compare} disabled={busy || !a.trim() || !b.trim()}>{busy ? "Comparing…" : "Compare documents →"}</button></div>
        </div>
      </div>

      {res && (
        <>
          <div className="card" style={{ marginBottom: 12 }}><div className="cb" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div><span className="muted sm">Derived severity</span><div><SevPill s={res.severity} /></div></div>
            <div><span className="muted sm">Diff</span><div style={{ fontWeight: 700 }}>{res.comparison.stats.added} added · {res.comparison.stats.amended} amended · {res.comparison.stats.deleted} removed · {res.comparison.stats.moved} moved</div></div>
            <div style={{ flex: 1, minWidth: 200 }}><span className="muted sm">Categories</span><div>{res.categories.map((c) => <span className="tag" key={c} style={{ marginRight: 4 }}>{c}</span>)}</div></div>
          </div></div>

          <div className="section-title">Side-by-side comparison — generated by the diff engine</div>
          <DiffView diffs={res.comparison.clauseDiffs} prevVersion={res.prevLabel} currVersion={res.currLabel} />

          {res.comparison.signals.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}><div className="ch"><h3>Material signals (deterministic)</h3></div>
              <div className="cb">{res.comparison.signals.map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--line2)", fontSize: 13 }}>
                  <span className="tag">{s.clauseNo}</span><b>{s.kind.replace(/_/g, " ").toLowerCase()}</b>
                  <span className="muted">{s.from} → {s.to}</span>
                  {s.direction && s.direction !== "UNKNOWN" && <span className={`pill ${s.direction === "TIGHTENED" ? "p-red" : "p-blue"}`} style={{ marginLeft: "auto" }}><span className="pd" />{s.direction.toLowerCase()}</span>}
                </div>
              ))}</div>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <AiImpact key={`${a.length}-${b.length}-${res.severity}`}
              source={{ prevText: a, currText: b, title: sv.title || "the compared document" }}
              initial={{ summary: res.aiDraft?.summary ?? "Generating analysis…", businessImpact: res.aiDraft?.businessImpact ?? "", confidence: res.aiDraft?.confidence ?? "—" }} />
          </div>

          <div className="card"><div className="cb">
            {saved ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span className="pill p-green"><span className="pd" />Saved as {saved.id}</span>
                <Link className="btn primary" href={`/change/${saved.id}`}>Open in Change Register →</Link>
                <Link className="btn" href="/change">View register</Link>
              </div>
            ) : !saveOpen ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div><b>Track this comparison</b><div className="muted sm">Save it as a change so it lands in the Change Register with an owner and actions.</div></div>
                <button className="btn primary" style={{ marginLeft: "auto" }} onClick={() => { setSv({ ...sv, title: `${labelA} → ${labelB}` }); setSaveOpen(true); }}>Save as tracked change</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                <label style={lblS}>Title<input style={selS} value={sv.title} onChange={(e) => setSv({ ...sv, title: e.target.value })} /></label>
                <label style={lblS}>Jurisdiction<select style={selS} value={sv.jur} onChange={(e) => setSv({ ...sv, jur: e.target.value })}>{JURS.map((j) => <option key={j}>{j}</option>)}</select></label>
                <label style={lblS}>Topic<select style={selS} value={sv.topic} onChange={(e) => setSv({ ...sv, topic: e.target.value })}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></label>
                <button className="btn primary" disabled={saving} onClick={saveAsChange}>{saving ? "Saving…" : "Save"}</button>
              </div>
            )}
          </div></div>
        </>
      )}
    </>
  );
}
