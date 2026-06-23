import Link from "next/link";
import { getSites } from "../../../lib/data/store";
import { Crumbs, PageHead, RiskPill, flag, scoreColor } from "../../../components/ui";

export default async function SitesPage() {
  const sites = [...(await getSites())].sort((a, b) => a.score - b.score);
  return (
    <>
      <Crumbs items={["Sites"]} />
      <PageHead title="Sites" subtitle="Site-level accountability across Waygate's 18 locations — from corporate frameworks to local ordinances." />
      <div className="card"><div className="tablewrap"><table className="tbl">
        <thead><tr><th>Site</th><th>Country</th><th>Type</th><th>Business line</th><th>Employees</th><th>Permits</th><th>Open actions</th><th>Risk</th><th>Compliance score</th></tr></thead>
        <tbody>{sites.map((s) => (
          <tr key={s.id}>
            <td><Link className="ttl" href={`/sites/${s.id}`}>{flag(s.cc)} {s.name}</Link><div className="sm">{s.role}</div></td>
            <td className="sm">{s.country}</td><td><span className="tag">{s.type}</span></td><td className="sm">{s.line}</td>
            <td className="sm">{s.emp ?? "—"}</td><td className="sm">{s.permits}</td><td>{s.open}</td><td><RiskPill r={s.risk} /></td>
            <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="bt" style={{ width: 80, height: 8, background: "var(--line2)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${s.score}%`, background: scoreColor(s.score) }} /></div><b>{s.score}</b>
            </div></td>
          </tr>
        ))}</tbody>
      </table></div></div>
    </>
  );
}
