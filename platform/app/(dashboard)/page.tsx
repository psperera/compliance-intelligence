import Link from "next/link";
import { getChanges, getSites } from "../../lib/data/store";
import { Crumbs, PageHead, Kpi, Bar, SevPill, StatusPill, RiskPill, flag, fmt, scoreColor } from "../../components/ui";

export default async function DashboardPage() {
  const [changes, sites] = await Promise.all([getChanges(), getSites()]);
  const priority = changes.filter((c) => c.sev === "CRITICAL" || c.sev === "HIGH").slice(0, 6);
  const exposed = [...sites].sort((a, b) => b.open * (b.risk === "High" ? 2 : 1) - a.open * (a.risk === "High" ? 2 : 1)).slice(0, 6);

  const regions = [
    { l: "Europe (DACH)", v: 86, c: "var(--teal)" }, { l: "Europe (West)", v: 88, c: "var(--teal)" },
    { l: "Americas", v: 87, c: "var(--teal)" }, { l: "Greater China", v: 74, c: "var(--red)" },
    { l: "South Asia", v: 85, c: "var(--amber)" }, { l: "APAC / MENAT", v: 88, c: "var(--teal)" },
  ];

  return (
    <>
      <Crumbs items={["Executive Overview"]} />
      <PageHead
        title="Global compliance overview"
        subtitle="Waygate Technologies · 18 sites · 10 countries · live data · as of 23 Jun 2026"
        actions={<Link className="btn primary" href="/change">Review changes ({changes.length})</Link>}
      />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi t="Global compliance score" v="86%" dir="up" note="+2.4 pts vs Q1" />
        <Kpi t="Open regulatory changes" v={String(changes.length)} dir="flat" note="several need expert review" />
        <Kpi t="Overdue actions" v="2" dir="dn" note="escalated to leadership" />
        <Kpi t="Entering force ≤ 90 days" v="9" dir="up" note="3 critical / high" />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}>
        <div className="card"><div className="ch"><h3>Score by region</h3></div>
          <div className="cb">{regions.map((r) => <Bar key={r.l} l={r.l} v={r.v} c={r.c} suffix="%" />)}</div></div>
        <div className="card"><div className="ch"><h3>Group posture</h3></div>
          <div className="cb">
            <Bar l="Compliant" v={62} c="var(--green)" suffix="%" />
            <Bar l="Partially compliant" v={23} c="var(--amber)" suffix="%" />
            <Bar l="Under review" v={9} c="var(--blue)" suffix="%" />
            <Bar l="Non-compliant" v={6} c="var(--red)" suffix="%" />
          </div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="ch"><h3>High-priority regulatory changes</h3><Link className="btn sm" href="/change">View all</Link></div>
          <div className="tablewrap"><table className="tbl">
            <thead><tr><th>Change</th><th>Jurisdiction</th><th>Severity</th><th>Effective</th><th>Status</th></tr></thead>
            <tbody>{priority.map((c) => (
              <tr key={c.id}>
                <td><Link className="ttl" href={`/change/${c.id}`}>{c.title}</Link><div className="sm">{c.id}</div></td>
                <td>{flag(cc(c.jur))} {c.jur}</td><td><SevPill s={c.sev} /></td><td>{fmt(c.eff)}</td><td><StatusPill s={c.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
        <div className="card">
          <div className="ch"><h3>Sites with highest exposure</h3><Link className="btn sm" href="/sites">All sites</Link></div>
          <div className="cb" style={{ padding: 8 }}>{exposed.map((s) => (
            <Link key={s.id} href={`/sites/${s.id}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderRadius: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 13, background: scoreColor(s.score), flex: "none" }}>{s.score}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{flag(s.cc)} {s.name} <span className="muted" style={{ fontWeight: 400 }}>· {s.country}</span></div><div className="sm muted">{s.type} · {s.role}</div></div>
              <div style={{ textAlign: "right" }}><RiskPill r={s.risk} /><div className="sm muted" style={{ marginTop: 3 }}>{s.open} open</div></div>
            </Link>
          ))}</div>
        </div>
      </div>
    </>
  );
}

function cc(j: string) {
  const m: Record<string, string> = { "Germany (EU)": "DE", "United States": "US", "Slovakia (EU)": "SK", "France (EU)": "FR", "Switzerland": "CH", "Belgium (EU)": "BE", "China": "CN", "India": "IN", "United Kingdom": "GB", "Brazil": "BR", "Singapore": "SG", "United Arab Emirates": "AE", "South Korea": "KR" };
  return m[j] ?? "EU";
}
