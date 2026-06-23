// digest.service.ts — periodic digest builder (pure + unit-tested).
//
// Produces the weekly/daily/monthly summary that goes to regional HS&E leaders and the
// monthly executive summary to corporate leadership. The digest scheduler renders this
// and hands it to the email provider.

import type { EmailMessage } from "../integrations/email/provider";

export type DigestPeriod = "DAILY" | "WEEKLY" | "MONTHLY";

export interface DigestChange {
  ref: string;
  title: string;
  jurisdiction: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  detectedAt: string;     // ISO
  effectiveAt?: string;   // ISO
}

export interface DigestAction {
  ref: string;
  title: string;
  status: string;
  dueDate?: string;
}

export interface DigestInput {
  period: DigestPeriod;
  now: Date;
  windowStart: Date;
  changes: DigestChange[];
  actions: DigestAction[];
  audienceLabel: string;  // "Regional HS&E leaders", "Corporate leadership"
  recipients: string[];
  appBaseUrl?: string;
}

export interface DigestSummary {
  period: DigestPeriod;
  newChanges: DigestChange[];
  criticalHigh: DigestChange[];
  upcomingEffective: DigestChange[]; // effective within next 30 days
  overdueActions: DigestAction[];
  counts: { new: number; criticalHigh: number; upcoming: number; overdue: number };
}

const DAY = 1000 * 60 * 60 * 24;

export function summariseDigest(input: DigestInput): DigestSummary {
  const inWindow = (iso?: string) =>
    !!iso && new Date(iso) >= input.windowStart && new Date(iso) <= input.now;

  const newChanges = input.changes.filter((c) => inWindow(c.detectedAt));
  const criticalHigh = newChanges.filter((c) => c.severity === "CRITICAL" || c.severity === "HIGH");
  const horizon = new Date(input.now.getTime() + 30 * DAY);
  const upcomingEffective = input.changes.filter(
    (c) => c.effectiveAt && new Date(c.effectiveAt) > input.now && new Date(c.effectiveAt) <= horizon,
  );
  const overdueActions = input.actions.filter(
    (a) => a.dueDate && new Date(a.dueDate) < input.now && !["complete", "closed"].includes(a.status.toLowerCase()),
  );

  return {
    period: input.period,
    newChanges,
    criticalHigh,
    upcomingEffective,
    overdueActions,
    counts: {
      new: newChanges.length,
      criticalHigh: criticalHigh.length,
      upcoming: upcomingEffective.length,
      overdue: overdueActions.length,
    },
  };
}

export function renderDigestEmail(input: DigestInput, summary: DigestSummary): EmailMessage {
  const periodLabel = { DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly" }[input.period];
  const subject = `${periodLabel} EHS regulatory digest — ${summary.counts.new} new, ${summary.counts.criticalHigh} critical/high, ${summary.counts.overdue} overdue`;
  const base = input.appBaseUrl ?? "https://compliance.waygate.example";

  const list = (items: { ref: string; title: string }[]) =>
    items.length
      ? items.map((i) => `<li><a href="${base}/change/${i.ref}">${i.ref}</a> — ${i.title}</li>`).join("")
      : "<li>None</li>";

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto">
    <div style="background:#0e1b2c;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0"><b>Compliance Intelligence</b> · ${periodLabel} digest · ${input.audienceLabel}</div>
    <div style="border:1px solid #e3e8ef;border-top:none;border-radius:0 0 10px 10px;padding:20px">
      <p>Summary for the period ending ${input.now.toISOString().slice(0, 10)}:
        <b>${summary.counts.new}</b> new changes ·
        <b>${summary.counts.criticalHigh}</b> critical/high ·
        <b>${summary.counts.upcoming}</b> entering force ≤30d ·
        <b>${summary.counts.overdue}</b> overdue actions.</p>
      <h3 style="font-size:14px">Critical &amp; high-impact changes</h3><ul>${list(summary.criticalHigh)}</ul>
      <h3 style="font-size:14px">Entering force in the next 30 days</h3><ul>${list(summary.upcomingEffective)}</ul>
      <h3 style="font-size:14px">Overdue actions</h3><ul>${list(summary.overdueActions)}</ul>
      <p style="margin-top:16px"><a href="${base}/forecaster" style="background:#1f5fd6;color:#fff;padding:8px 13px;border-radius:8px;text-decoration:none">View full horizon →</a></p>
    </div>
  </div>`;

  const text =
    `${periodLabel} EHS regulatory digest — ${input.audienceLabel}\n\n` +
    `New changes: ${summary.counts.new}\nCritical/high: ${summary.counts.criticalHigh}\n` +
    `Entering force ≤30d: ${summary.counts.upcoming}\nOverdue actions: ${summary.counts.overdue}\n`;

  return { to: input.recipients, subject, html, text, tags: { digest: input.period } };
}
