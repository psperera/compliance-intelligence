// notification.service.ts — watchlist matching, recipient resolution, alert rendering, dispatch.
//
// Pure functions (matchWatchlists, renderAlertEmail, resolveRecipients) are unit-tested.
// dispatchForChange wires them to the email provider and is called by the notification worker.

import type { EmailProvider, EmailMessage } from "../integrations/email/provider";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
export const SEVERITY_RANK: Record<Severity, number> = {
  CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFORMATIONAL: 1,
};

/** The fields of a change a watchlist rule can match against. */
export interface MatchableChange {
  ref: string;             // "CHG-2038"
  title: string;
  regulationRef: string;   // "DE-TA-LUFT"
  regulationTitle: string;
  jurisdiction: string;
  topic: string;
  agency: string;
  severity: Severity;
  status: string;
  businessLine?: string;
  siteRefs: string[];
  keywords: string[];      // tokens for keyword rules
  effectiveAt?: string;
  whatChanged: string;
  whyItMatters: string;
  requiredAction?: { title: string; ref: string; owner?: string; dueDate?: string };
}

export type RuleOperator = "IN" | "EQUALS" | "CONTAINS" | "GTE";
export interface WatchlistRule {
  field: "jurisdiction" | "topic" | "regulation" | "agency" | "site" | "businessLine" | "risk" | "status" | "keyword";
  operator: RuleOperator;
  value: string | string[];
}

export type AlertFrequency = "IMMEDIATE" | "DAILY_DIGEST" | "WEEKLY_DIGEST" | "MONTHLY_DIGEST" | "CRITICAL_ONLY";

export interface Recipient { email: string; userId?: string; roleKey?: string; }
export interface WatchlistLike {
  id: string;
  name: string;
  active: boolean;
  frequency: AlertFrequency;
  rules: WatchlistRule[];
  recipients: Recipient[];
}

// ---------- matching ----------

function asArray(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}

export function evaluateRule(rule: WatchlistRule, change: MatchableChange): boolean {
  const want = asArray(rule.value).map((x) => String(x).toLowerCase());
  const has = (s?: string) => !!s && want.includes(s.toLowerCase());

  switch (rule.field) {
    case "jurisdiction": return has(change.jurisdiction);
    case "topic": return has(change.topic);
    case "regulation": return has(change.regulationRef);
    case "agency": return has(change.agency);
    case "businessLine": return has(change.businessLine);
    case "status": return has(change.status);
    case "site": return change.siteRefs.some((s) => want.includes(s.toLowerCase()));
    case "keyword": {
      const hay = [...change.keywords, change.title, change.whatChanged].join(" ").toLowerCase();
      return want.some((w) => hay.includes(w));
    }
    case "risk": {
      // GTE against severity rank (e.g. value "HIGH" matches HIGH and CRITICAL)
      const threshold = SEVERITY_RANK[(asArray(rule.value)[0] as Severity)] ?? 0;
      return rule.operator === "GTE"
        ? SEVERITY_RANK[change.severity] >= threshold
        : SEVERITY_RANK[change.severity] === threshold;
    }
    default: return false;
  }
}

/** A watchlist matches when ALL its rules pass (AND). Rules with array values are OR within. */
export function matchWatchlist(wl: WatchlistLike, change: MatchableChange): boolean {
  if (!wl.active || wl.rules.length === 0) return false;
  return wl.rules.every((r) => evaluateRule(r, change));
}

export function matchWatchlists(wls: WatchlistLike[], change: MatchableChange): WatchlistLike[] {
  return wls.filter((wl) => matchWatchlist(wl, change));
}

/** Which watchlists should fire an IMMEDIATE alert for this change right now. */
export function immediateWatchlists(wls: WatchlistLike[], change: MatchableChange): WatchlistLike[] {
  return matchWatchlists(wls, change).filter(
    (wl) => wl.frequency === "IMMEDIATE" || (wl.frequency === "CRITICAL_ONLY" && change.severity === "CRITICAL"),
  );
}

// ---------- recipients ----------

export function resolveRecipients(wl: WatchlistLike, roleEmailMap: Record<string, string[]> = {}): string[] {
  const out = new Set<string>();
  for (const r of wl.recipients) {
    if (r.email) out.add(r.email);
    if (r.roleKey && roleEmailMap[r.roleKey]) roleEmailMap[r.roleKey].forEach((e) => out.add(e));
  }
  return [...out];
}

// ---------- rendering ----------

const SEV_LABEL: Record<Severity, string> = {
  CRITICAL: "Critical", HIGH: "High-impact", MEDIUM: "Medium-impact", LOW: "Low-impact", INFORMATIONAL: "Informational",
};

export function buildSubject(change: MatchableChange, siteNames: string[]): string {
  const where = siteNames.length ? ` affecting ${siteNames.join(", ")}` : ` in ${change.jurisdiction}`;
  const lead = SEVERITY_RANK[change.severity] >= 4 ? "Action required: " : "";
  return `${lead}${SEV_LABEL[change.severity]} EHS regulatory change${where}`;
}

export function renderAlertEmail(input: {
  change: MatchableChange;
  recipients: string[];
  siteNames: string[];
  appBaseUrl?: string;
  watchlistName?: string;
}): EmailMessage {
  const { change, recipients, siteNames } = input;
  const base = input.appBaseUrl ?? "https://compliance.waygate.example";
  const link = `${base}/change/${change.ref}`;
  const a = change.requiredAction;

  const subject = buildSubject(change, siteNames);
  const lines = [
    `${SEV_LABEL[change.severity]} regulatory change — ${change.severity}`,
    ``,
    `Regulation:   ${change.regulationTitle}`,
    `Jurisdiction: ${change.jurisdiction} (${change.agency})`,
    `What changed: ${change.whatChanged}`,
    `Why it matters: ${change.whyItMatters}`,
    `Affected sites: ${siteNames.join(", ") || "—"}`,
    a ? `Required action: ${a.title} (${a.ref})` : ``,
    a?.owner ? `Action owner: ${a.owner}` : ``,
    a?.dueDate ? `Due date: ${a.dueDate}` : ``,
    change.effectiveAt ? `Effective: ${change.effectiveAt}` : ``,
    ``,
    `Open side-by-side comparison: ${link}`,
  ].filter(Boolean);

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:620px;margin:0 auto;border:1px solid #e3e8ef;border-radius:12px;overflow:hidden">
    <div style="background:#0e1b2c;color:#fff;padding:16px 20px"><b>Compliance Intelligence</b> · Automated regulatory alert</div>
    <div style="padding:22px 24px">
      <div style="background:#fbe9e8;border:1px solid #f1c2bf;color:#c2362f;border-radius:8px;padding:10px 13px;font-weight:700;margin-bottom:16px">
        ${change.severity} severity · ${change.requiredAction ? "action required" : "for review"}
      </div>
      <h2 style="font-size:16px;margin:0 0 14px">${subject}</h2>
      <table style="font-size:13px;border-collapse:collapse">
        ${row("Regulation", change.regulationTitle)}
        ${row("Jurisdiction", `${change.jurisdiction} · ${change.agency}`)}
        ${row("What changed", change.whatChanged)}
        ${row("Why it matters", change.whyItMatters)}
        ${row("Affected sites", siteNames.join(", ") || "—")}
        ${a ? row("Required action", `${a.title} (${a.ref})`) : ""}
        ${a?.owner ? row("Action owner", a.owner) : ""}
        ${a?.dueDate ? row("Due date", `<b style="color:#c2362f">${a.dueDate}</b>`) : ""}
      </table>
      <p style="margin-top:18px"><a href="${link}" style="background:#1f5fd6;color:#fff;padding:9px 14px;border-radius:8px;text-decoration:none">Open side-by-side comparison →</a></p>
      ${input.watchlistName ? `<p style="font-size:11px;color:#64748b;border-top:1px solid #eef2f7;padding-top:10px">You receive this because you own watchlist <b>${input.watchlistName}</b>.</p>` : ""}
    </div>
  </div>`;

  return { to: recipients, subject, html, text: lines.join("\n"), tags: { changeRef: change.ref } };
}

function row(k: string, v: string): string {
  return `<tr><td style="color:#64748b;font-weight:600;padding:4px 14px 4px 0;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
}

// ---------- dispatch (called by the notification worker) ----------

export interface DispatchDeps {
  email: EmailProvider;
  watchlists: WatchlistLike[];
  roleEmailMap?: Record<string, string[]>;
  siteNameMap?: Record<string, string>;
  appBaseUrl?: string;
}

export async function dispatchForChange(change: MatchableChange, deps: DispatchDeps) {
  const matched = immediateWatchlists(deps.watchlists, change);
  const siteNames = change.siteRefs.map((r) => deps.siteNameMap?.[r] ?? r);
  const sent: { watchlistId: string; to: string[]; emailId: string }[] = [];

  for (const wl of matched) {
    const recipients = resolveRecipients(wl, deps.roleEmailMap);
    if (recipients.length === 0) continue;
    const msg = renderAlertEmail({ change, recipients, siteNames, appBaseUrl: deps.appBaseUrl, watchlistName: wl.name });
    const res = await deps.email.send(msg);
    sent.push({ watchlistId: wl.id, to: recipients, emailId: res.id });
    // PRODUCTION: also write an Alert row + AuditLog entry (category NOTIFICATION) here.
  }
  return sent;
}
