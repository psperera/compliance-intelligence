import Link from "next/link";
import { getActions, getSites, siteName, siteCC } from "../../../lib/data/store";
import { Crumbs, PageHead, Kpi, SevPill, ActionPill, flag, fmt } from "../../../components/ui";
import { ExportButton, AddActionButton } from "../../../components/buttons";

export default async function ActionsPage() {
  const actions = await getActions();
  const siteOpts = (await getSites()).map((s) => ({ id: s.id, name: s.name }));
  const open = actions.filter((a) => !["Complete", "Closed"].includes(a.status));
  const overdue = actions.filter((a) => a.status === "Overdue");
  const exportRows = actions.map((a) => ({ ...a, site: siteName(a.site) }));
  return (
    <>
      <Crumbs items={["Actions"]} />
      <PageHead title="Actions & Tasks" subtitle="Assign ownership, deadlines and evidence — monitor closure globally and locally."
        actions={<>
          <ExportButton rows={exportRows} filename="actions.csv"
            columns={[{ key: "id", header: "ID" }, { key: "title", header: "Action" }, { key: "reg", header: "Regulation" }, { key: "site", header: "Site" }, { key: "pri", header: "Priority" }, { key: "owner", header: "Owner" }, { key: "due", header: "Due" }, { key: "status", header: "Status" }, { key: "ev", header: "Evidence" }]} />
          <AddActionButton sites={siteOpts} />
        </>} />
      <div className="kpis" style={{ marginBottom: 16 }}>
        <Kpi t="Open actions" v={String(open.length)} dir="flat" note="across sites" />
        <Kpi t="Overdue" v={String(overdue.length)} dir="dn" note="escalated to leadership" />
        <Kpi t="Due ≤ 14 days" v="4" dir="up" note="2 critical" />
        <Kpi t="Closure rate (90d)" v="82%" dir="up" note="+6 pts" />
      </div>
      <div className="card"><div className="tablewrap"><table className="tbl">
        <thead><tr><th>Action</th><th>Regulation</th><th>Site</th><th>Priority</th><th>Owner</th><th>Due</th><th>Evidence</th><th>Status</th></tr></thead>
        <tbody>{actions.map((a) => (
          <tr key={a.id}>
            <td className="ttl">{a.title}<div className="sm">{a.id}{a.chg ? ` · ${a.chg}` : ""}</div></td>
            <td className="sm"><Link href={`/baseline/${a.reg}`} style={{ color: "var(--blue)" }}>{a.reg}</Link></td>
            <td className="sm">{a.site ? `${flag(siteCC(a.site))} ${siteName(a.site)}` : "—"}</td>
            <td><SevPill s={a.pri} /></td><td className="sm">{a.owner}</td><td>{fmt(a.due)}</td>
            <td className="sm">{a.ev}</td><td><ActionPill s={a.status} /></td>
          </tr>
        ))}</tbody>
      </table></div></div>
    </>
  );
}
