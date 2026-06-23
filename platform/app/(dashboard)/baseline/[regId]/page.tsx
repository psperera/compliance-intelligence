import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegulation, getChanges, getActions, siteName, siteCC } from "../../../../lib/data/store";
import { Crumbs, PageHead, SevPill, StatusPill, ActionPill, flag, fmt, jurCC } from "../../../../components/ui";

export default async function RegulationDetail({ params }: { params: Promise<{ regId: string }> }) {
  const { regId } = await params;
  const reg = await getRegulation(regId);
  if (!reg) notFound();
  const changes = (await getChanges()).filter((c) => c.regId === regId);
  const actions = (await getActions()).filter((a) => a.reg === regId);

  return (
    <>
      <Crumbs items={["Regulatory Baseline", reg.id]} />
      <PageHead title={reg.title} subtitle={`${reg.id} · ${reg.agency} · ${flag(jurCC(reg.jur))} ${reg.jur}`}
        actions={<button className="btn primary">Add to watchlist ★</button>} />

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="card">
          <div className="ch"><h3>Regulatory record</h3><span className="sub">Full text · clause-level</span></div>
          <div className="legaltext">
            <div className="cl"><div className="cn">Purpose</div>This regulation establishes binding requirements for {reg.topic.toLowerCase()} applicable to industrial installations within {reg.jur}. Operators shall ensure ongoing conformity and maintain documentary evidence of compliance.</div>
            <div className="cl"><div className="cn">§1 Scope</div>Applies to all installations conducting activities listed in Annex I, including inspection, testing, manufacturing and ancillary operations carried out at the registered site.</div>
            <div className="cl"><div className="cn">§2 General obligations</div>The operator shall implement a management system proportionate to the activity, appoint a responsible person, and review against the applicable limits and reporting duties.</div>
            <div className="cl"><div className="cn">§3 Monitoring &amp; records</div>Measurements shall be performed at the prescribed intervals; records retained and made available on request for the statutory period.</div>
            <div className="muted" style={{ fontSize: 12 }}>Source: {reg.agency} · <span style={{ color: "var(--blue)" }}>Open original legal text ↗</span></div>
          </div>
        </div>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="ch"><h3>Metadata</h3></div>
            <div className="cb"><div className="kv">
              <div className="k">Status</div><div><StatusPill s={reg.status} /></div>
              <div className="k">Risk rating</div><div><SevPill s={reg.risk} /></div>
              <div className="k">Compliance</div><div><StatusPill s={reg.comp} /></div>
              <div className="k">Effective date</div><div>{fmt(reg.eff)}</div>
              <div className="k">Last changed</div><div>{fmt(reg.changed)}</div>
              <div className="k">Owner</div><div>{reg.owner}</div>
              <div className="k">Topic</div><div><span className="tag">{reg.topic}</span></div>
            </div></div>
          </div>
          <div className="card"><div className="ch"><h3>Applicable sites ({reg.sites.length})</h3></div>
            <div className="cb" style={{ padding: 8 }}>{reg.sites.map((s) => (
              <Link key={s} href={`/sites/${s}`} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderRadius: 7 }}>
                <span>{flag(siteCC(s))} {siteName(s)}</span>
              </Link>
            ))}</div>
          </div>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="ch"><h3>Recent changes</h3></div>
          <div className="tablewrap"><table className="tbl">
            <thead><tr><th>Change</th><th>Category</th><th>Severity</th><th>Effective</th><th>Status</th></tr></thead>
            <tbody>{changes.map((c) => (
              <tr key={c.id}><td><Link className="ttl" href={`/change/${c.id}`}>{c.title}</Link><div className="sm">{c.id}</div></td>
                <td><span className="tag">{c.cat}</span></td><td><SevPill s={c.sev} /></td><td>{fmt(c.eff)}</td><td><StatusPill s={c.status} /></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {actions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="ch"><h3>Related actions</h3></div>
          <div className="tablewrap"><table className="tbl">
            <thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{actions.map((a) => (
              <tr key={a.id}><td className="ttl">{a.title}<div className="sm">{a.id}</div></td><td className="sm">{a.owner}</td><td>{fmt(a.due)}</td><td><ActionPill s={a.status} /></td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </>
  );
}
