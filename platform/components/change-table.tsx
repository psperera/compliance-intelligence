"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { ChangeEvent } from "../lib/data/store";
import { SevPill, StatusPill, flag, fmt, jurCC } from "./ui";

const SEV_RANK: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1 };
type SortKey = "id" | "title" | "jur" | "cat" | "sev" | "impact" | "eff" | "status" | "conf";

export function ChangeTable({ changes }: { changes: ChangeEvent[] }) {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState("All");
  const [status, setStatus] = useState("All");
  const [jur, setJur] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("eff");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const jurs = useMemo(() => ["All", ...Array.from(new Set(changes.map((c) => c.jur))).sort()], [changes]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(changes.map((c) => c.status)))], [changes]);

  const rows = useMemo(() => {
    let out = changes.filter((c) =>
      (sev === "All" || c.sev === sev) &&
      (status === "All" || c.status === status) &&
      (jur === "All" || c.jur === jur) &&
      (!q || `${c.id} ${c.title} ${c.regId} ${c.cat}`.toLowerCase().includes(q.toLowerCase())),
    );
    const val = (c: ChangeEvent): string | number => sortKey === "sev" ? SEV_RANK[c.sev] : (c[sortKey] as string);
    out = [...out].sort((a, b) => {
      const av = val(a), bv = val(b);
      const cc = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cc : -cc;
    });
    return out;
  }, [changes, q, sev, status, jur, sortKey, sortDir]);

  function sort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "sev" ? "desc" : "asc"); }
  }
  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th onClick={() => sort(k)} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
      {children} <span style={{ color: sortKey === k ? "var(--blue)" : "var(--line)" }}>{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
    </th>
  );
  const sel: React.CSSProperties = { padding: "7px 11px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, color: "var(--ink)", background: "#fff", fontWeight: 500 };

  return (
    <div className="card">
      <div className="ch"><h3>Change register</h3><span className="sub">{rows.length} of {changes.length} · {changes.filter((c) => c.status === "Expert review required").length} awaiting expert review</span></div>
      <div className="cb" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingBottom: 0, borderBottom: "none" }}>
        <select style={sel} value={sev} onChange={(e) => setSev(e.target.value)}>{["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => <option key={s}>{s === "All" ? "All severities" : s}</option>)}</select>
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s}>{s === "All" ? "All statuses" : s}</option>)}</select>
        <select style={sel} value={jur} onChange={(e) => setJur(e.target.value)}>{jurs.map((j) => <option key={j}>{j === "All" ? "All jurisdictions" : j}</option>)}</select>
        <input style={{ ...sel, minWidth: 220 }} placeholder="Filter by title, ID, category…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="tablewrap"><table className="tbl">
        <thead><tr>
          <Th k="id">ID</Th><Th k="title">Change</Th><Th k="jur">Jurisdiction</Th><Th k="cat">Category</Th>
          <Th k="sev">Severity</Th><Th k="impact">Impact</Th><Th k="eff">Effective</Th><Th k="status">Status</Th><Th k="conf">Conf.</Th>
        </tr></thead>
        <tbody>{rows.map((c) => (
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
        ))}
        {rows.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No changes match these filters.</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
