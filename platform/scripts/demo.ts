/**
 * demo.ts — run the whole regulatory pipeline locally with NO infrastructure.
 *
 *   npx tsx scripts/demo.ts        (or: npm run demo)
 *
 * Exercises: ingest → deterministic diff → severity/category → AI draft →
 * watchlist matching → email dispatch → escalation sweep → weekly digest.
 * Uses the mock adapters, so no Postgres / Redis / API keys are required.
 */
import { ChangeDetectionService } from "../lib/services/change-detection.service";
import { mockRegulatoryFeed } from "../lib/integrations/regulatory-feed/mock";
import { mockAiProvider } from "../lib/integrations/ai/mock";
import { MockEmailProvider } from "../lib/integrations/email/mock";
import {
  dispatchForChange, type MatchableChange, type WatchlistLike,
} from "../lib/services/notification.service";
import { evaluateEscalations, type ChangeRecord, type ActionRecord } from "../lib/services/escalation.service";
import { summariseDigest, renderDigestEmail, type DigestChange, type DigestAction } from "../lib/services/digest.service";

const hr = (t: string) => console.log("\n" + "─".repeat(72) + "\n" + t + "\n" + "─".repeat(72));

async function main() {
  const NOW = new Date("2026-06-23T12:00:00Z");

  // 1) INGEST + DETECT ----------------------------------------------------------
  hr("1 · INGEST + DETECT  (DE-TA-LUFT v2021.2 → v2026.1)");
  const detector = new ChangeDetectionService(mockRegulatoryFeed, mockAiProvider);
  const r = await detector.analyze("DE-TA-LUFT", "v2021.2", "v2026.1");

  console.log("Clause diff:");
  for (const d of r.comparison.clauseDiffs) console.log("  " + d.changeType.padEnd(9) + d.clauseNo);
  console.log("Stats:        ", JSON.stringify(r.comparison.stats));
  console.log("Signals:      ", r.comparison.signals.map((s) => `${s.clauseNo} ${s.kind}(${s.direction})`).join("  "));
  console.log("Severity:     ", r.severity, "→", r.complianceImpact);
  console.log("Categories:   ", r.categories.join(", "));
  console.log("AI draft:     ", `[${r.assessmentLifecycle} · confidence ${r.aiDraft.confidence} · ${r.changeStatus}]`);
  console.log("              ", r.aiDraft.summary);

  // 2) NOTIFY -------------------------------------------------------------------
  hr("2 · NOTIFY  (match watchlists → dispatch alert emails)");
  const reg = (await mockRegulatoryFeed.listRegulations()).find((x) => x.externalRef === "DE-TA-LUFT")!;
  const feedChange = (await mockRegulatoryFeed.listChanges()).find((c) => c.externalRef === "CHG-2038")!;
  const action = (await mockRegulatoryFeed.listActions()).find((a) => a.changeRef === "CHG-2038");

  const change: MatchableChange = {
    ref: feedChange.externalRef, title: feedChange.title,
    regulationRef: reg.externalRef, regulationTitle: reg.title,
    jurisdiction: reg.jurisdiction, topic: reg.topic, agency: reg.agency,
    severity: r.severity as MatchableChange["severity"], status: "APPROVED",
    businessLine: feedChange.businessLine, siteRefs: feedChange.affectedSites,
    keywords: ["particulate", "dust", "abatement", "emission"],
    effectiveAt: feedChange.effectiveAt,
    whatChanged: "Particulate limit halved (10→5 mg/m³); monitoring trigger tightened to 0.10 kg/h; abatement obligation added; quarterly reporting.",
    whyItMatters: "Ahrensburg & Wunstorf coating operations exceed the new trigger and require abatement upgrades before the effective date.",
    requiredAction: action && { title: action.title, ref: action.externalRef, owner: action.owner, dueDate: action.dueDate },
  };

  const watchlists: WatchlistLike[] = [
    { id: "WL-01", name: "EU air & emissions — manufacturing", active: true, frequency: "IMMEDIATE",
      rules: [{ field: "jurisdiction", operator: "IN", value: ["Germany (EU)", "France (EU)"] },
              { field: "topic", operator: "IN", value: ["Air Emissions", "Industrial Permits"] }],
      recipients: [{ email: "tony.hammond@bakerhughes.com" }, { roleKey: "REGIONAL_HSE_MANAGER" }] },
    { id: "WL-06", name: "High-risk obligations — group", active: true, frequency: "CRITICAL_ONLY",
      rules: [{ field: "risk", operator: "GTE", value: "HIGH" }],
      recipients: [{ email: "tony.hammond@bakerhughes.com" }] },
    { id: "WL-04", name: "APAC occupational H&S", active: true, frequency: "DAILY_DIGEST",
      rules: [{ field: "jurisdiction", operator: "IN", value: ["Singapore", "South Korea"] }],
      recipients: [{ email: "tony.hammond@bakerhughes.com" }] },
  ];

  const email = new MockEmailProvider();
  const sent = await dispatchForChange(change, {
    email, watchlists,
    roleEmailMap: { REGIONAL_HSE_MANAGER: ["tony.hammond@bakerhughes.com", "tony.hammond@bakerhughes.com"] },
    siteNameMap: { ahrensburg: "Ahrensburg", wunstorf: "Wunstorf" },
    appBaseUrl: "https://compliance.waygate.example",
  });
  console.log(`Dispatched ${sent.length} alert(s):`);
  for (const m of email.outbox) console.log(`  → ${m.to.join(", ")}\n     ${m.subject}`);

  // 3) ESCALATE -----------------------------------------------------------------
  hr("3 · ESCALATE  (unassigned > 48h · overdue > 7d)");
  const changes: ChangeRecord[] = [
    { ref: "CHG-2026", title: "Serious Accidents Act penalty change", detectedAt: "2026-06-19T12:00:00Z", ownerId: null, severity: "HIGH" },
    { ref: "CHG-2038", title: "TA Luft limit", detectedAt: "2026-06-12T09:00:00Z", ownerId: "u-keller", severity: "CRITICAL" },
  ];
  const actions: ActionRecord[] = [
    { ref: "ACT-840", title: "Water discharge permit variance — Changzhou", dueDate: "2026-06-05", status: "Overdue", ownerName: "Tony Hammond" },
    { ref: "ACT-881", title: "Install abatement on Line 3", dueDate: "2026-08-01", status: "In progress" },
  ];
  const esc = evaluateEscalations(NOW, changes, actions);
  for (const e of esc) console.log(`  [${e.escalateTo}] ${e.kind}  ${e.ref} — ${e.reason}`);
  if (!esc.length) console.log("  (nothing to escalate)");

  // 4) DIGEST -------------------------------------------------------------------
  hr("4 · WEEKLY DIGEST  (regional HS&E leaders)");
  const digestChanges: DigestChange[] = (await mockRegulatoryFeed.listChanges()).map((c) => ({
    ref: c.externalRef, title: c.title, jurisdiction: "—",
    severity: c.externalRef === "CHG-2038" ? "CRITICAL" : "HIGH",
    detectedAt: "2026-06-18", effectiveAt: c.effectiveAt,
  }));
  const digestActions: DigestAction[] = [{ ref: "ACT-840", title: "Water permit variance", status: "Overdue", dueDate: "2026-06-05" }];
  const input = {
    period: "WEEKLY" as const, now: NOW, windowStart: new Date("2026-06-16T00:00:00Z"),
    changes: digestChanges, actions: digestActions,
    audienceLabel: "Regional HS&E leaders", recipients: ["tony.hammond@bakerhughes.com"],
  };
  const summary = summariseDigest(input);
  const digestEmail = renderDigestEmail(input, summary);
  console.log("Counts:", JSON.stringify(summary.counts));
  console.log("Subject:", digestEmail.subject);

  hr("DONE · pipeline ran end-to-end on mock adapters (no Postgres / Redis needed)");
}

main().catch((e) => { console.error(e); process.exit(1); });
