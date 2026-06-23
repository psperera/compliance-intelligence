import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateRule, matchWatchlists, immediateWatchlists, resolveRecipients,
  buildSubject, renderAlertEmail, dispatchForChange,
  type MatchableChange, type WatchlistLike,
} from "../../lib/services/notification.service";
import { evaluateEscalations, type ChangeRecord, type ActionRecord } from "../../lib/services/escalation.service";
import { summariseDigest, renderDigestEmail, type DigestInput } from "../../lib/services/digest.service";
import { MockEmailProvider } from "../../lib/integrations/email/mock";

const change: MatchableChange = {
  ref: "CHG-2038",
  title: "TA Luft particulate emission limit reduced for surface treatment",
  regulationRef: "DE-TA-LUFT",
  regulationTitle: "TA Luft — Technical Instructions on Air Quality Control",
  jurisdiction: "Germany (EU)",
  topic: "Air Emissions",
  agency: "BMUV",
  severity: "CRITICAL",
  status: "APPROVED",
  businessLine: "Manufacturing Operations",
  siteRefs: ["ahrensburg", "wunstorf"],
  keywords: ["particulate", "dust", "abatement"],
  effectiveAt: "2026-08-15",
  whatChanged: "Particulate limit halved (10→5 mg/m³); monitoring trigger tightened.",
  whyItMatters: "Coating operations exceed the new trigger and need abatement upgrades.",
  requiredAction: { title: "Install particulate abatement on Line 3", ref: "ACT-881", owner: "Martin Keller", dueDate: "2026-08-01" },
};

const wlAir: WatchlistLike = {
  id: "WL-01", name: "EU air & emissions — manufacturing", active: true, frequency: "IMMEDIATE",
  rules: [
    { field: "jurisdiction", operator: "IN", value: ["Germany (EU)", "France (EU)"] },
    { field: "topic", operator: "IN", value: ["Air Emissions", "Industrial Permits"] },
  ],
  recipients: [{ email: "m.keller@waygate.example" }, { roleKey: "REGIONAL_HSE_MANAGER" }],
};
const wlHighRisk: WatchlistLike = {
  id: "WL-06", name: "High-risk obligations — group", active: true, frequency: "CRITICAL_ONLY",
  rules: [{ field: "risk", operator: "GTE", value: "HIGH" }],
  recipients: [{ email: "thammond@vassalenterprises.com" }],
};
const wlAPAC: WatchlistLike = {
  id: "WL-04", name: "APAC occupational H&S", active: true, frequency: "DAILY_DIGEST",
  rules: [{ field: "jurisdiction", operator: "IN", value: ["Singapore", "South Korea"] }],
  recipients: [{ email: "l.tan@waygate.example" }],
};
const wlPaused: WatchlistLike = { ...wlAir, id: "WL-09", name: "paused", active: false };

describe("evaluateRule", () => {
  it("matches IN/EQUALS on simple fields", () => {
    expect(evaluateRule({ field: "topic", operator: "IN", value: ["Air Emissions"] }, change)).toBe(true);
    expect(evaluateRule({ field: "agency", operator: "EQUALS", value: "BMUV" }, change)).toBe(true);
    expect(evaluateRule({ field: "agency", operator: "EQUALS", value: "OSHA" }, change)).toBe(false);
  });
  it("matches site membership", () => {
    expect(evaluateRule({ field: "site", operator: "IN", value: ["wunstorf"] }, change)).toBe(true);
    expect(evaluateRule({ field: "site", operator: "IN", value: ["changzhou"] }, change)).toBe(false);
  });
  it("matches keyword substrings", () => {
    expect(evaluateRule({ field: "keyword", operator: "CONTAINS", value: ["abatement"] }, change)).toBe(true);
    expect(evaluateRule({ field: "keyword", operator: "CONTAINS", value: ["asbestos"] }, change)).toBe(false);
  });
  it("matches risk with GTE severity ranking", () => {
    expect(evaluateRule({ field: "risk", operator: "GTE", value: "HIGH" }, change)).toBe(true);   // CRITICAL >= HIGH
    expect(evaluateRule({ field: "risk", operator: "GTE", value: "CRITICAL" }, { ...change, severity: "MEDIUM" })).toBe(false);
  });
});

describe("matchWatchlists", () => {
  const all = [wlAir, wlHighRisk, wlAPAC, wlPaused];
  it("selects only matching, active watchlists", () => {
    const matched = matchWatchlists(all, change).map((w) => w.id);
    expect(matched).toContain("WL-01");
    expect(matched).toContain("WL-06");
    expect(matched).not.toContain("WL-04"); // wrong jurisdiction
    expect(matched).not.toContain("WL-09"); // paused
  });
  it("immediateWatchlists includes IMMEDIATE and CRITICAL_ONLY (when critical)", () => {
    const imm = immediateWatchlists(all, change).map((w) => w.id);
    expect(imm).toEqual(expect.arrayContaining(["WL-01", "WL-06"]));
  });
  it("CRITICAL_ONLY does not fire for non-critical changes", () => {
    const imm = immediateWatchlists(all, { ...change, severity: "MEDIUM" }).map((w) => w.id);
    expect(imm).not.toContain("WL-06");
  });
});

describe("resolveRecipients", () => {
  it("expands role keys via the role→email map and dedupes", () => {
    const emails = resolveRecipients(wlAir, { REGIONAL_HSE_MANAGER: ["m.keller@waygate.example", "r.maddox@waygate.example"] });
    expect(emails).toContain("r.maddox@waygate.example");
    expect(emails.filter((e) => e === "m.keller@waygate.example")).toHaveLength(1); // deduped
  });
});

describe("renderAlertEmail", () => {
  it("builds an action-required subject naming severity and sites", () => {
    const subject = buildSubject(change, ["Ahrensburg", "Wunstorf"]);
    expect(subject).toContain("Action required");
    expect(subject).toContain("Critical");
    expect(subject).toContain("Ahrensburg");
  });
  it("renders html + text with the required action and a comparison link", () => {
    const msg = renderAlertEmail({ change, recipients: ["x@y.z"], siteNames: ["Ahrensburg", "Wunstorf"], watchlistName: "EU air" });
    expect(msg.html).toContain("ACT-881");
    expect(msg.html).toContain("/change/CHG-2038");
    expect(msg.text).toContain("Required action");
    expect(msg.tags?.changeRef).toBe("CHG-2038");
  });
});

describe("dispatchForChange", () => {
  let email: MockEmailProvider;
  beforeEach(() => { email = new MockEmailProvider(); });
  it("sends one email per matching immediate watchlist with resolved recipients", async () => {
    const sent = await dispatchForChange(change, {
      email,
      watchlists: [wlAir, wlHighRisk, wlAPAC],
      roleEmailMap: { REGIONAL_HSE_MANAGER: ["r.maddox@waygate.example"] },
      siteNameMap: { ahrensburg: "Ahrensburg", wunstorf: "Wunstorf" },
    });
    expect(sent).toHaveLength(2); // WL-01 + WL-06
    expect(email.outbox).toHaveLength(2);
    expect(email.outbox[0].subject).toContain("Action required");
    expect(email.outbox.flatMap((m) => m.to)).toContain("thammond@vassalenterprises.com");
  });
});

describe("evaluateEscalations", () => {
  const now = new Date("2026-06-23T12:00:00Z");
  const changes: ChangeRecord[] = [
    { ref: "CHG-A", title: "Unassigned critical", detectedAt: "2026-06-20T12:00:00Z", ownerId: null, severity: "CRITICAL" }, // 72h
    { ref: "CHG-B", title: "Assigned", detectedAt: "2026-06-20T12:00:00Z", ownerId: "u1", severity: "HIGH" },
    { ref: "CHG-C", title: "Recent unassigned", detectedAt: "2026-06-23T00:00:00Z", ownerId: null, severity: "LOW" }, // 12h
  ];
  const actions: ActionRecord[] = [
    { ref: "ACT-840", title: "Overdue water permit", dueDate: "2026-06-05", status: "Overdue", ownerName: "Wei Li" }, // 18d
    { ref: "ACT-881", title: "On time", dueDate: "2026-08-01", status: "In progress" },
    { ref: "ACT-820", title: "Done late but closed", dueDate: "2026-05-01", status: "Complete" },
  ];
  const esc = evaluateEscalations(now, changes, actions);

  it("flags unassigned change over 48h and overdue action over 7d only", () => {
    const refs = esc.map((e) => e.ref);
    expect(refs).toContain("CHG-A");
    expect(refs).toContain("ACT-840");
    expect(refs).not.toContain("CHG-B"); // assigned
    expect(refs).not.toContain("CHG-C"); // too recent
    expect(refs).not.toContain("ACT-881"); // not due
    expect(refs).not.toContain("ACT-820"); // complete
  });
  it("routes critical unassigned to the group director role", () => {
    expect(esc.find((e) => e.ref === "CHG-A")?.escalateTo).toBe("PLATFORM_ADMIN");
  });
});

describe("digest", () => {
  const now = new Date("2026-06-23T00:00:00Z");
  const input: DigestInput = {
    period: "WEEKLY", now, windowStart: new Date("2026-06-16T00:00:00Z"),
    changes: [
      { ref: "CHG-1", title: "New crit", jurisdiction: "Germany (EU)", severity: "CRITICAL", detectedAt: "2026-06-18", effectiveAt: "2026-07-05" },
      { ref: "CHG-2", title: "Old low", jurisdiction: "France (EU)", severity: "LOW", detectedAt: "2026-05-01", effectiveAt: "2026-12-01" },
    ],
    actions: [{ ref: "ACT-840", title: "Overdue", status: "Overdue", dueDate: "2026-06-05" }],
    audienceLabel: "Regional HS&E leaders", recipients: ["regional@waygate.example"],
  };
  const summary = summariseDigest(input);

  it("counts new changes, critical/high, upcoming and overdue within window", () => {
    expect(summary.counts.new).toBe(1);          // CHG-1 only (CHG-2 outside window)
    expect(summary.counts.criticalHigh).toBe(1);
    expect(summary.counts.upcoming).toBe(1);     // CHG-1 effective in 30d
    expect(summary.counts.overdue).toBe(1);
  });
  it("renders a digest email with the counts in the subject", () => {
    const msg = renderDigestEmail(input, summary);
    expect(msg.subject).toContain("Weekly");
    expect(msg.subject).toContain("1 new");
    expect(msg.tags?.digest).toBe("WEEKLY");
  });
});
