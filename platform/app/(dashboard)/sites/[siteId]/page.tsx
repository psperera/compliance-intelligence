import Link from "next/link";
import { notFound } from "next/navigation";
import { getSite, getRegulationsForSite, getActionsForSite } from "../../../../lib/data/store";
import { Crumbs, PageHead, Kpi, SevPill, StatusPill, ActionPill, flag, fmt } from "../../../../components/ui";

export default async function SiteWorkspace({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = await getSite(siteId);
  if (!site) notFound();
  const regs = await getRegulationsForSite(siteId);
  const actions = await getActionsForSite(siteId);
  const open = actions.filter((a) => !["Complete", "Closed"].includes(a.status));
  const overdue = actions.filter((a) => a.status === "Overdue");

  return (
    <>
      <Crumbs items={["Sites", site.name]} />
      <PageHead title={`${flag(site.cc)} ${site.name} — ${site.country}`}
        subtitle={`${site.type} · ${site.role} · ${site.line} · ${site.emp ?? "—"} employees · ${site.jur}`}
        actions={<Link className="btn primary" href="/actions">View actions ({actions.length})</Link>} />

      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi t="Compliance score" v={`${site.score}%`} dir={site.score >= 85 ? "up" : "dn"} note={site.score >= 85 ? "above group target" : "below group target"} />
        <Kpi t="Applicable regulations" v={String(regs.length)} dir="flat" note={`${regs.filter((r) => ["CRITICAL", "HIGH"].includes(r.risk)).length} high-risk`} />
        <Kpi t="Open actions" v={String(open.length)} dir={overdue.length ? "dn" : "flat"} note={`${overdue.length} overdue`} />
        <Kpi t="Permits & licences" v={String(site.permits)} dir="flat" note="tracked" />
      </div>

      <div className="card">
        <div className="ch"><h3>Compliance matrix</h3><span className="sub">Requirement-level control &amp; evidence status</span></div>
        <div className="tablewrap"><table className="tbl">
          <thead><tr><th>Requirement</th><th>Regulation</th><th>Type</th><th>Owner</th><th>Control status</th><th>Risk</th></tr></thead>
          <tbody>{regs.map((r) => (
            <tr key={r.id}>
              <td className="ttl">{r.title.split("—")[0].trim()}</td>
              <td className="sm"><Link href={`/baseline/${r.id}`} style={{ color: "var(--blue)" }}>{r.id}</Link></td>
              <td><span className="tag">{r.topic}</span></td>
              <td className="sm">{r.owner}</td>
              <td><StatusPill s={r.comp} /></td>
              <td><SevPill s={r.risk} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>

      {actions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="ch"><h3>Site actions</h3></div>
          <div className="tablewrap"><table className="tbl">
            <thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Evidence</th><th>Status</th></tr></thead>
            <tbody>{actions.map((a) => (
              <tr key={a.id}><td className="ttl">{a.title}<div className="sm">{a.id}</div></td><td className="sm">{a.owner}</td><td>{fmt(a.due)}</td>
                <td className="sm">{a.ev}</td><td><ActionPill s={a.status} /></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}
