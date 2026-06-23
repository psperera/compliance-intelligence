import Link from "next/link";
import { getChanges } from "../../../lib/data/store";
import { Crumbs, PageHead, Kpi, SevPill, flag, fmt, jurCC } from "../../../components/ui";

const BUCKETS: { label: string; test: (eff: string) => boolean }[] = [
  { label: "≤ 30 days", test: (e) => e <= "2026-07-23" },
  { label: "31–90 days", test: (e) => e > "2026-07-23" && e <= "2026-09-21" },
  { label: "3–6 months", test: (e) => e > "2026-09-21" && e <= "2026-12-23" },
  { label: "6–12 months", test: (e) => e > "2026-12-23" },
];

export default async function ForecasterPage() {
  const fc = (await getChanges()).filter((c) => c.eff >= "2026-06-23").sort((a, b) => a.eff.localeCompare(b.eff));
  return (
    <>
      <Crumbs items={["Regulatory Forecaster"]} />
      <PageHead title="Regulatory Forecaster" subtitle="See regulatory change before it comes into force — understand impact, prepare ahead, reduce disruption." />
      <div className="kpis" style={{ marginBottom: 18 }}>
        <Kpi t="Items on horizon" v={String(fc.length)} dir="flat" note="across jurisdictions" />
        <Kpi t="Entering force ≤ 30d" v={String(fc.filter((c) => BUCKETS[0].test(c.eff)).length)} dir="dn" note="prepare now" />
        <Kpi t="Critical / high" v={String(fc.filter((c) => c.sev === "CRITICAL" || c.sev === "HIGH").length)} dir="flat" note="priority" />
        <Kpi t="Consultations open" v="3" dir="flat" note="deadlines this quarter" />
      </div>
      {BUCKETS.map((b) => {
        const items = fc.filter((c) => b.test(c.eff));
        if (!items.length) return null;
        return (
          <div className="card" key={b.label} style={{ marginBottom: 14 }}>
            <div className="ch"><h3>{b.label}</h3><span className="sub">{items.length} item{items.length > 1 ? "s" : ""}</span></div>
            <div className="cb" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
              {items.map((c) => (
                <Link key={c.id} href={`/change/${c.id}`} style={{ border: "1px solid var(--line)", borderRadius: 9, padding: 13, borderTop: `3px solid ${c.sev === "CRITICAL" ? "var(--red)" : c.sev === "HIGH" ? "var(--amber)" : "var(--blue)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span className="sm" style={{ fontWeight: 700, color: "var(--muted)" }}>{flag(jurCC(c.jur))} {c.jur}</span><SevPill s={c.sev} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, margin: "7px 0 5px", lineHeight: 1.35 }}>{c.title}</div>
                  <div className="sm muted">Effective {fmt(c.eff)} · {c.impact}</div>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>→ Build readiness plan</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
