import Link from "next/link";
import { getRegulations } from "../../../lib/data/store";
import { Crumbs, PageHead, SevPill, StatusPill, flag, fmt, jurCC } from "../../../components/ui";

export default async function BaselinePage() {
  const regs = await getRegulations();
  return (
    <>
      <Crumbs items={["Regulatory Baseline"]} />
      <PageHead
        title="Regulatory Baseline"
        subtitle="The regulations, permits and obligations that apply to Waygate — work directly within the regulatory record."
        actions={<><button className="btn">Export</button><button className="btn primary">+ Add regulation</button></>}
      />
      <div className="card"><div className="tablewrap"><table className="tbl">
        <thead><tr>
          <th>Regulation</th><th>Jurisdiction</th><th>Topic</th><th>Agency</th><th>Status</th>
          <th>Effective</th><th>Sites</th><th>Owner</th><th>Risk</th><th>Compliance</th>
        </tr></thead>
        <tbody>{regs.map((r) => (
          <tr key={r.id}>
            <td><Link className="ttl" href={`/baseline/${r.id}`}>{r.title}</Link><div className="sm">{r.id}</div></td>
            <td>{flag(jurCC(r.jur))} {r.jur}</td>
            <td><span className="tag">{r.topic}</span></td>
            <td className="sm">{r.agency}</td>
            <td><StatusPill s={r.status} /></td>
            <td>{fmt(r.eff)}</td>
            <td className="sm">{r.sites.length}</td>
            <td className="sm">{r.owner}</td>
            <td><SevPill s={r.risk} /></td>
            <td><StatusPill s={r.comp} /></td>
          </tr>
        ))}</tbody>
      </table></div></div>
    </>
  );
}
