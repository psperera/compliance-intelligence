import { describe, it, expect } from "vitest";
import { parseDocument, normalise } from "../../lib/diff/parse";
import { wordDiff, compareVersions } from "../../lib/diff/diff";

// TA Luft scenario fixtures (mirror the mock regulatory feed).
const PREV = [
  "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 10 mg/m³ as a daily mean value, measured at the point of release.",
  "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.20 kg/h.",
  "§5.2.4 Operators shall submit emission measurement reports to the competent authority annually.",
  "§5.3.0 Periodic measurements may be performed by an internally accredited testing body.",
  "§6.1.1 Records of all emission measurements shall be retained and made available to the authority on request.",
].join("\n");

const CURR = [
  "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 5 mg/m³ as a daily mean value, measured at the point of release.",
  "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.10 kg/h.",
  "§5.2.3 Installations shall be fitted with a high-efficiency particulate abatement system achieving at least 99% separation efficiency.",
  "§5.2.4 Operators shall submit emission measurement reports to the competent authority quarterly.",
  "§6.1.1 Records of all emission measurements shall be retained for a minimum of 10 years and made available to the authority on request.",
].join("\n");

describe("parseDocument", () => {
  it("splits clauses and preserves numbering + hierarchy", () => {
    const doc = parseDocument("v1", PREV);
    expect(doc.clauses).toHaveLength(5);
    expect(doc.clauses.map((c) => c.clauseNo)).toEqual(["§5.2.1", "§5.2.2", "§5.2.4", "§5.3.0", "§6.1.1"]);
    expect(doc.clauses[0].parentNo).toBe("§5.2");
    expect(doc.clauses[0].ordinal).toBe(0);
  });

  it("folds wrapped lines into the current clause body", () => {
    const doc = parseDocument("v1", "§1 First line\ncontinued second line.\n§2 Next clause.");
    expect(doc.clauses).toHaveLength(2);
    expect(doc.clauses[0].text).toContain("continued second line");
  });

  it("normalise collapses whitespace and curly quotes", () => {
    expect(normalise("  the  “word”   here ")).toBe('the "word" here');
  });
});

describe("wordDiff", () => {
  it("emits equal / delete / insert spans", () => {
    const spans = wordDiff("limit of 10 mg", "limit of 5 mg");
    expect(spans.some((s) => s.op === "delete" && s.text.includes("10"))).toBe(true);
    expect(spans.some((s) => s.op === "insert" && s.text.includes("5"))).toBe(true);
    expect(spans.some((s) => s.op === "equal" && s.text.includes("limit"))).toBe(true);
  });

  it("reconstructs both sides from the spans", () => {
    const a = "the quick brown fox", b = "the slow brown fox jumps";
    const spans = wordDiff(a, b);
    const left = spans.filter((s) => s.op !== "insert").map((s) => s.text).join("");
    const right = spans.filter((s) => s.op !== "delete").map((s) => s.text).join("");
    expect(left).toBe(a);
    expect(right).toBe(b);
  });
});

describe("compareVersions — TA Luft", () => {
  const result = compareVersions(parseDocument("v2021.2", PREV), parseDocument("v2026.1", CURR));
  const byNo = Object.fromEntries(result.clauseDiffs.map((d) => [d.clauseNo, d.changeType]));

  it("classifies each clause correctly", () => {
    expect(byNo["§5.2.1"]).toBe("AMENDED");
    expect(byNo["§5.2.2"]).toBe("AMENDED");
    expect(byNo["§5.2.3"]).toBe("ADDED");
    expect(byNo["§5.2.4"]).toBe("AMENDED");
    expect(byNo["§5.3.0"]).toBe("DELETED");
    expect(byNo["§6.1.1"]).toBe("AMENDED");
  });

  it("produces correct stats", () => {
    expect(result.stats).toEqual({ added: 1, deleted: 1, amended: 4, moved: 0, unchanged: 0 });
  });

  it("detects tightened thresholds and frequency as material signals", () => {
    const thr = result.signals.filter((s) => s.kind === "THRESHOLD_CHANGED");
    expect(thr.length).toBe(2);
    expect(thr.every((s) => s.direction === "TIGHTENED")).toBe(true);
    const freq = result.signals.find((s) => s.kind === "FREQUENCY_CHANGED");
    expect(freq?.from).toMatch(/annual/i);
    expect(freq?.to).toMatch(/quarterly/i);
  });

  it("attaches a token diff to amended clauses for highlighting", () => {
    const amended = result.clauseDiffs.find((d) => d.clauseNo === "§5.2.1")!;
    expect(amended.tokenDiff).toBeDefined();
    expect(amended.tokenDiff!.some((t) => t.op === "insert")).toBe(true);
  });
});

describe("compareVersions — structural cases", () => {
  it("flags an unchanged clause", () => {
    const r = compareVersions(parseDocument("a", "§1 Identical text here."), parseDocument("b", "§1 Identical text here."));
    expect(r.stats.unchanged).toBe(1);
    expect(r.clauseDiffs[0].changeType).toBe("UNCHANGED");
  });

  it("detects a renumbered clause as MOVED, not added+deleted", () => {
    const prev = "§7 The operator shall maintain a documented emergency response plan reviewed every twelve months.";
    const curr = "§9 The operator shall maintain a documented emergency response plan reviewed every twelve months.";
    const r = compareVersions(parseDocument("a", prev), parseDocument("b", curr));
    expect(r.stats.moved).toBe(1);
    expect(r.stats.added).toBe(0);
    expect(r.stats.deleted).toBe(0);
    expect(r.clauseDiffs[0].changeType).toBe("MOVED");
  });

  it("is deterministic — same input yields identical output", () => {
    const a = compareVersions(parseDocument("v2021.2", PREV), parseDocument("v2026.1", CURR));
    const b = compareVersions(parseDocument("v2021.2", PREV), parseDocument("v2026.1", CURR));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
