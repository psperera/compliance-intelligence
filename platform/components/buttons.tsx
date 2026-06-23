"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

// ---- toast ----
function toast(message: string, ok = true) {
  const t = document.createElement("div");
  t.textContent = message;
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:200;
    background:${ok ? "var(--navy)" : "var(--red)"};color:#fff;padding:11px 18px;border-radius:10px;
    font-size:13px;font-weight:600;box-shadow:var(--shadow-lg);opacity:0;transition:opacity .2s`;
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = "1"));
  setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 250); }, 2400);
}

// ---- generic soft action (gives real feedback instead of a dead click) ----
export function SoftButton({ label, message, className = "btn" }: { label: string; message: string; className?: string }) {
  return <button className={className} onClick={() => toast(message)}>{label}</button>;
}

// ---- CSV export of arbitrary rows ----
export function ExportButton<T extends Record<string, unknown>>(
  { rows, columns, filename, label = "Export CSV" }:
  { rows: T[]; columns: { key: keyof T; header: string }[]; filename: string; label?: string },
) {
  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = columns.map((c) => esc(c.header)).join(",");
    const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(",")).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} rows → ${filename}`);
  }
  return <button className="btn" onClick={exportCsv}>{label}</button>;
}

// ---- Add Regulation modal (POST /api/regulations → refresh) ----
const JURS = ["Germany (EU)","United States","Slovakia (EU)","France (EU)","Switzerland","Belgium (EU)","China","India","United Kingdom","Brazil","Singapore","United Arab Emirates","South Korea"];
const TOPICS = ["Radiation Safety","Occupational H&S","Process Safety","Chemicals & Hazardous Substances","Waste & Circularity","Air Emissions","Water Discharge","Energy & Carbon","Product Stewardship","Transport & Logistics","Fire Safety","Building & Facilities","Labour & Worker Welfare","Sustainability Disclosure","Emergency Response","Industrial Permits"];
const RISKS = ["CRITICAL","HIGH","MEDIUM","LOW","INFORMATIONAL"];

export function AddRegulationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ id: "", title: "", jur: JURS[0], topic: TOPICS[0], agency: "", risk: "MEDIUM", eff: "", owner: "" });

  async function save() {
    setBusy(true); setErr(null);
    const res = await fetch("/api/regulations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    const d = await res.json();
    setBusy(false);
    if (res.ok) { setOpen(false); setF({ id: "", title: "", jur: JURS[0], topic: TOPICS[0], agency: "", risk: "MEDIUM", eff: "", owner: "" }); toast(`Added ${d.regulation.id}`); router.refresh(); }
    else setErr(d.error);
  }

  return (
    <>
      <button className="btn primary" onClick={() => setOpen(true)}>+ Add regulation</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(14,27,44,.45)", zIndex: 100, display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: 540, maxWidth: "100%", boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>Add regulation</h3>
              <button onClick={() => setOpen(false)} style={{ border: "none", background: "transparent", fontSize: 20 }}>×</button>
            </div>
            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <L t="Reference ID *"><input style={I} value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} placeholder="DE-NEW-01" /></L>
              <L t="Risk rating"><select style={I} value={f.risk} onChange={(e) => setF({ ...f, risk: e.target.value })}>{RISKS.map((r) => <option key={r}>{r}</option>)}</select></L>
              <L t="Title *" wide><input style={I} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Full regulation title" /></L>
              <L t="Jurisdiction *"><select style={I} value={f.jur} onChange={(e) => setF({ ...f, jur: e.target.value })}>{JURS.map((j) => <option key={j}>{j}</option>)}</select></L>
              <L t="Topic *"><select style={I} value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}>{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></L>
              <L t="Agency"><input style={I} value={f.agency} onChange={(e) => setF({ ...f, agency: e.target.value })} placeholder="e.g. BMUV" /></L>
              <L t="Effective date"><input style={I} type="date" value={f.eff} onChange={(e) => setF({ ...f, eff: e.target.value })} /></L>
              <L t="Owner" wide><input style={I} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })} placeholder="Accountable owner" /></L>
            </div>
            {err && <div style={{ color: "var(--red)", fontSize: 12.5, fontWeight: 600, padding: "0 18px 8px" }}>✗ {err}</div>}
            <div style={{ padding: "0 18px 18px", display: "flex", gap: 8 }}>
              <button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Add regulation"}</button>
              <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function L({ t, wide, children }: { t: string; wide?: boolean; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11.5, fontWeight: 600, color: "var(--muted)", gridColumn: wide ? "1 / -1" : undefined }}>{t}{children}</label>;
}
const I: React.CSSProperties = { padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, color: "var(--ink)", background: "#fff" };
