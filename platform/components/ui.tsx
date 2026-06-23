// Shared presentational helpers usable from server components (pure, no client hooks).
import React from "react";

export function flag(cc: string): string {
  if (!cc) return "";
  return cc.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

export function fmt(d?: string): string {
  if (!d || d === "—") return "—";
  const [y, m, dd] = d.split("-");
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1];
  return `${dd} ${mon} ${y}`;
}

const SEV: Record<string, string> = { CRITICAL: "p-red", HIGH: "p-amber", MEDIUM: "p-blue", LOW: "p-grey", INFORMATIONAL: "p-grey" };
const STAT: Record<string, string> = {
  "Compliant": "p-green", "Partially compliant": "p-amber", "Non-compliant": "p-red", "Under review": "p-blue",
  "Approved": "p-green", "Expert review required": "p-amber", "Action plan created": "p-blue", "Marked as reviewed": "p-teal",
  "In force": "p-green", "Enacted": "p-blue",
};
const ACT: Record<string, string> = {
  "Not started": "p-grey", "In progress": "p-blue", "Awaiting evidence": "p-amber", "Awaiting approval": "p-purple",
  "Blocked": "p-red", "Complete": "p-green", "Overdue": "p-red", "Closed": "p-grey",
};

export function Pill({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`pill ${kind}`}><span className="pd" />{children}</span>;
}
export const SevPill = ({ s }: { s: string }) => <Pill kind={SEV[s] ?? "p-grey"}>{s[0] + s.slice(1).toLowerCase()}</Pill>;
export const StatusPill = ({ s }: { s: string }) => <Pill kind={STAT[s] ?? "p-grey"}>{s}</Pill>;
export const ActionPill = ({ s }: { s: string }) => <Pill kind={ACT[s] ?? "p-grey"}>{s}</Pill>;
export const RiskPill = ({ r }: { r: string }) => <Pill kind={r === "High" ? "p-red" : r === "Medium" ? "p-amber" : "p-green"}>{r} risk</Pill>;

export function jurCC(j: string): string {
  const m: Record<string, string> = { "Germany (EU)": "DE", "United States": "US", "Slovakia (EU)": "SK", "France (EU)": "FR", "Switzerland": "CH", "Belgium (EU)": "BE", "China": "CN", "India": "IN", "United Kingdom": "GB", "Brazil": "BR", "Singapore": "SG", "United Arab Emirates": "AE", "South Korea": "KR" };
  return m[j] ?? "EU";
}

export function scoreColor(v: number) {
  return v >= 90 ? "var(--green)" : v >= 85 ? "var(--teal)" : v >= 78 ? "var(--amber)" : "var(--red)";
}

export function Crumbs({ items }: { items: string[] }) {
  return (
    <div className="crumbs">
      <span>Compliance Intelligence</span>
      {items.map((x, i) => (
        <React.Fragment key={i}><span>›</span>{i === items.length - 1 ? <b>{x}</b> : <span>{x}</span>}</React.Fragment>
      ))}
    </div>
  );
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="pagehead">
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

export function Kpi({ t, v, dir, note }: { t: string; v: string; dir?: "up" | "dn" | "flat"; note?: string }) {
  const arrow = dir === "up" ? "▲" : dir === "dn" ? "▼" : "▬";
  return (
    <div className="kpi">
      <div className="t">{t}</div>
      <div className="v">{v}</div>
      {note && <div className={`d ${dir ?? "flat"}`}>{arrow} {note}</div>}
    </div>
  );
}

export function Bar({ l, v, c, suffix }: { l: string; v: number; c?: string; suffix?: string }) {
  return (
    <div className="barrow">
      <div className="bl">{l}</div>
      <div className="bt"><div className="bf" style={{ width: `${v}%`, background: c ?? "var(--blue)" }} /></div>
      <div className="bv">{v}{suffix ?? ""}</div>
    </div>
  );
}
