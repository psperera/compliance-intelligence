import Link from "next/link";
import { getChanges } from "../../../lib/data/store";
import { Crumbs, PageHead, SevPill, StatusPill, flag, fmt, jurCC } from "../../../components/ui";

export default async function ChangeRegister() {
  const changes = await getChanges();
  const awaiting = changes.filter((c) => c.status === "Expert review required").length;
  return (
    <>
      <Crumbs items={["Change Control"]} />
      <PageHead title="Regulatory Change Control"
        subtitle="Version-controlled comparison · every change is traceable, every impact has an owner, every decision is auditable." />
      <div className="card">
        <div className="ch"><h3>Change register</h3><span className="sub">{changes.length} detected changes · {awaiting} awaiting expert review</span></div>
        <div className="tablewrap"><table className="tbl">
          <thead><tr><th>ID</th><th>Change</th><th>Jurisdiction</th><th>Category</th><th>Severity</th><th>Impact</th><th>Effective</th><th>Status</th><th>Conf.</th></tr></thead>
          <tbody>{changes.map((c) => (
            <tr key={c.id}>
              <td className="sm" style={{ fontWeight: 700 }}>{c.id}</td>
              <td><Link className="ttl" href={`/change/${c.id}`}>{c.title}</Link></td>
              <td>{flag(jurCC(c.jur))} {c.jur}</td>
              <td><span className="tag">{c.cat}</span></td>
              <td><SevPill s={c.sev} /></td>
              <td className="sm">{c.impact}</td>
              <td>{fmt(c.eff)}</td>
              <td><StatusPill s={c.status} /></td>
              <td><span className="conf">{c.conf}</span></td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </>
  );
}
