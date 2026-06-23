"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Regulation } from "../lib/data/store";
import { SevPill, StatusPill, flag, fmt, jurCC } from "./ui";

const SEV_RANK: Record<string, number> = { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1 };
type SortKey = "title" | "jur" | "topic" | "agency" | "status" | "eff" | "sites" | "owner" | "risk" | "comp";

const VIEWS: { key: string; label: string; test: (r: Regulation) => boolean }[] = [
  { key: "all", label: "All regulations", test: () => true },
  { key: "high", label: "High-risk obligations", test: (r) => ["CRITICAL", "HIGH"].includes(r.risk) },
  { key: "changed", label: "Changed this month", test: (r) => r.changed >= "2026-06-01" },
  { key: "watch", label: "On watchlists", test: (r) => r.watch },
  { key: "env", label: "Environmental", test: (r) => ["Air Emissions", "Water Discharge", "Waste & Circularity", "Energy & Carbon"].includes(r.topic) },
];

export function BaselineTable({ regs }: { regs: Regulation[] }) {
  const [view, setView] = useState("all");
  const [q, setQ] = useState("");
  const [jur, setJur] = useState("All");
  const [topic, setTopic] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("risk");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const jurs = useMemo(() => ["All", ...Array.from(new Set(regs.map((r) => r.jur))).sort()], [regs]);
  const topics = useMemo(() => ["All", ...Array.from(new Set(regs.map((r) => r.topic))).sort()], [regs]);
  const statuses = useMemo(() => ["All", ...Array.from(new Set(regs.map((r) => r.status)))], [regs]);

  const rows = useMemo(() => {
    const v = VIEWS.find((x) => x.key === view)!;
    let out = regs.filter(v.test).filter((r) =>
      (jur === "All" || r.jur === jur) &&
      (topic === "All" || r.topic === topic) &&
      (status === "All" || r.status === status) &&
      (!q || `${r.id} ${r.title} ${r.owner} ${r.agency}`.toLowerCase().includes(q.toLowerCase())),
    );
    const val = (r: Regulation): string | number =>
      sortKey === "risk" ? SEV_RANK[r.risk] : sortKey === "sites" ? r.sites.length : (r[sortKey] as string);
    out = [...out].sort((a, b) => {
      const av = val(a), bv = val(b);
      const c = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? c : -c;
    });
    return out;
  }, [regs, view, q, jur, topic, status, sortKey, sortDir]);

  function sort(k: SortKey) {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "risk" ? "desc" : "asc"); }
  }
  const Th = ({ k, children, num }: { k: SortKey; children: React.ReactNode; num?: boolean }) => (
    <th onClick={() => sort(k)} style={{ cursor: "pointer", whiteSpace: "nowrap", textAlign: num ? "right" : "left" }}>
      {children} <span style={{ color: sortKey === k ? "var(--blue)" : "var(--line)" }}>{sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
    </th>
  );
  const sel: React.CSSProperties = { padding: "7px 11px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12.5, color: "var(--ink)", background: "#fff", fontWeight: 500 };

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {VIEWS.map((v) => (
          <button key={v.key} onClick={() => setView(v.key)}
            style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              border: view === v.key ? "1px solid var(--navy)" : "1px solid var(--line)",
              background: view === v.key ? "var(--navy)" : "#fff", color: view === v.key ? "#fff" : "var(--muted)" }}>
            {v.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <select style={sel} value={jur} onChange={(e) => setJur(e.target.value)}>{jurs.map((j) => <option key={j}>{j === "All" ? "All jurisdictions" : j}</option>)}</select>
        <select style={sel} value={topic} onChange={(e) => setTopic(e.target.value)}>{topics.map((t) => <option key={t}>{t === "All" ? "All topics" : t}</option>)}</select>
        <select style={sel} value={status} onChange={(e) => setStatus(e.target.value)}>{statuses.map((s) => <option key={s}>{s === "All" ? "All statuses" : s}</option>)}</select>
        <input style={{ ...sel, minWidth: 220 }} placeholder="Filter by title, ID, owner…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="muted" style={{ marginLeft: "auto", fontSize: 12.5 }}>{rows.length} of {regs.length}</span>
      </div>
      <div className="card"><div className="tablewrap"><table className="tbl">
        <thead><tr>
          <Th k="title">Regulation</Th><Th k="jur">Jurisdiction</Th><Th k="topic">Topic</Th><Th k="agency">Agency</Th>
          <Th k="status">Status</Th><Th k="eff">Effective</Th><Th k="sites" num>Sites</Th><Th k="owner">Owner</Th>
          <Th k="risk">Risk</Th><Th k="comp">Compliance</Th>
        </tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td><Link className="ttl" href={`/baseline/${r.id}`}>{r.title}</Link><div className="sm">{r.id}</div></td>
            <td>{flag(jurCC(r.jur))} {r.jur}</td>
            <td><span className="tag">{r.topic}</span></td>
            <td className="sm">{r.agency}</td>
            <td><StatusPill s={r.status} /></td>
            <td>{fmt(r.eff)}</td>
            <td className="sm" style={{ textAlign: "right" }}>{r.sites.length}</td>
            <td className="sm">{r.owner}</td>
            <td><SevPill s={r.risk} /></td>
            <td><StatusPill s={r.comp} /></td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={10} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>No regulations match these filters.</td></tr>}
        </tbody>
      </table></div></div>
    </>
  );
}
