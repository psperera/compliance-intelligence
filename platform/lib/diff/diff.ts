// diff.ts — deterministic clause-level comparison between two parsed versions.
//
// Algorithm:
//   1. Align clauses by clause number (exact), then recover renumbered/moved clauses
//      by fuzzy text similarity among the leftovers.
//   2. For aligned pairs, run a word-level LCS diff → token spans for highlighting,
//      and classify UNCHANGED vs AMENDED.
//   3. Clauses only in the new version = ADDED; only in the old = DELETED;
//      matched-but-renumbered = MOVED.
//   4. Extract deterministic material signals (thresholds, %, dates, frequency, retention).
//
// No AI, no randomness — the same inputs always produce the same output.

import type {
  ParsedClause, ParsedDocument, TokenSpan, ClauseDiff, ComparisonResult, MaterialSignal,
} from "./types";

// ---------- word-level diff (LCS) ----------
function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? [];
}

export function wordDiff(a: string, b: string): TokenSpan[] {
  const A = tokenize(a), B = tokenize(b);
  const n = A.length, m = B.length;
  // LCS length table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const out: TokenSpan[] = [];
  const push = (op: TokenSpan["op"], text: string) => {
    const last = out[out.length - 1];
    if (last && last.op === op) last.text += text;
    else out.push({ op, text });
  };

  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("equal", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("delete", A[i]); i++; }
    else { push("insert", B[j]); j++; }
  }
  while (i < n) push("delete", A[i++]);
  while (j < m) push("insert", B[j++]);
  return out;
}

// ---------- fuzzy similarity for move detection ----------
function similarity(a: string, b: string): number {
  const sa = new Set(a.toLowerCase().split(/\s+/));
  const sb = new Set(b.toLowerCase().split(/\s+/));
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union; // Jaccard
}

// ---------- material signal extraction ----------
const NUM_UNIT = /(\d+(?:\.\d+)?)\s*(mg\/m³|mg\/m3|kg\/h|µg\/m³|mg\/l|ppm|°c|years?|months?|m³|kwh|gwh|%)/gi;
const FREQ = /\b(annually|annual|quarterly|monthly|weekly|daily|biennial)\b/gi;
const DATE = /\b(\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2})\b/g;

function firstMatch(re: RegExp, s: string): RegExpExecArray | null {
  re.lastIndex = 0;
  return re.exec(s);
}

function extractSignals(clauseNo: string, prev: string, curr: string): MaterialSignal[] {
  const sig: MaterialSignal[] = [];

  // threshold / percentage with units
  const p = firstMatch(NUM_UNIT, prev);
  const c = firstMatch(NUM_UNIT, curr);
  if (p && c && (p[1] !== c[1] || p[2] !== c[2])) {
    const from = parseFloat(p[1]); const to = parseFloat(c[1]);
    const unit = c[2].toLowerCase();
    const isPct = unit === "%";
    const isRetention = /years?|months?/.test(unit);
    const direction = to < from ? "TIGHTENED" : to > from ? "REDUCED" : "UNKNOWN";
    sig.push({
      kind: isRetention ? "RETENTION_CHANGED" : isPct ? "PERCENTAGE_CHANGED" : "THRESHOLD_CHANGED",
      clauseNo, from: `${p[1]} ${p[2]}`, to: `${c[1]} ${c[2]}`,
      // for retention, longer = stricter; flip the direction reading
      direction: isRetention ? (to > from ? "TIGHTENED" : "REDUCED") : direction,
      detail: `${clauseNo}: ${p[1]} ${p[2]} → ${c[1]} ${c[2]}`,
    });
  }

  // reporting / inspection frequency
  const fp = firstMatch(FREQ, prev); const fc = firstMatch(FREQ, curr);
  if (fp && fc && fp[1].toLowerCase() !== fc[1].toLowerCase()) {
    const rank: Record<string, number> = { daily: 5, weekly: 4, monthly: 3, quarterly: 2, biennial: 1, annual: 1, annually: 1 };
    const tighter = (rank[fc[1].toLowerCase()] ?? 0) > (rank[fp[1].toLowerCase()] ?? 0);
    sig.push({
      kind: "FREQUENCY_CHANGED", clauseNo, from: fp[1], to: fc[1],
      direction: tighter ? "TIGHTENED" : "REDUCED",
      detail: `${clauseNo}: reporting frequency ${fp[1]} → ${fc[1]}`,
    });
  }

  // effective / compliance dates
  const dp = firstMatch(DATE, prev); const dc = firstMatch(DATE, curr);
  if (dp && dc && dp[1] !== dc[1]) {
    sig.push({ kind: "DATE_CHANGED", clauseNo, from: dp[1], to: dc[1], direction: "UNKNOWN", detail: `${clauseNo}: date ${dp[1]} → ${dc[1]}` });
  }
  return sig;
}

// ---------- main comparison ----------
export function compareVersions(prev: ParsedDocument, curr: ParsedDocument): ComparisonResult {
  const prevByNo = new Map(prev.clauses.map((c) => [c.clauseNo, c]));
  const currByNo = new Map(curr.clauses.map((c) => [c.clauseNo, c]));

  const clauseDiffs: ClauseDiff[] = [];
  const signals: MaterialSignal[] = [];
  const stats = { added: 0, deleted: 0, amended: 0, moved: 0, unchanged: 0 };

  const handledPrev = new Set<string>();
  const handledCurr = new Set<string>();

  // 1) exact clause-number alignment
  for (const pc of prev.clauses) {
    const cc = currByNo.get(pc.clauseNo);
    if (!cc) continue;
    handledPrev.add(pc.clauseNo); handledCurr.add(cc.clauseNo);
    if (normalize(pc.text) === normalize(cc.text)) {
      stats.unchanged++;
      clauseDiffs.push({ clauseNo: pc.clauseNo, changeType: "UNCHANGED", prevText: pc.text, currText: cc.text });
    } else {
      stats.amended++;
      clauseDiffs.push({
        clauseNo: pc.clauseNo, changeType: "AMENDED",
        prevText: pc.text, currText: cc.text, tokenDiff: wordDiff(pc.text, cc.text),
      });
      signals.push(...extractSignals(pc.clauseNo, pc.text, cc.text));
    }
  }

  // 2) recover MOVED (renumbered) clauses among leftovers by similarity
  const leftoverPrev = prev.clauses.filter((c) => !handledPrev.has(c.clauseNo));
  const leftoverCurr = curr.clauses.filter((c) => !handledCurr.has(c.clauseNo));
  for (const pc of leftoverPrev) {
    let best: { cc: ParsedClause; score: number } | null = null;
    for (const cc of leftoverCurr) {
      if (handledCurr.has(cc.clauseNo)) continue;
      const score = similarity(pc.text, cc.text);
      if (!best || score > best.score) best = { cc, score };
    }
    if (best && best.score >= 0.6) {
      handledPrev.add(pc.clauseNo); handledCurr.add(best.cc.clauseNo);
      stats.moved++;
      const amended = normalize(pc.text) !== normalize(best.cc.text);
      clauseDiffs.push({
        clauseNo: best.cc.clauseNo, changeType: "MOVED",
        prevText: pc.text, currText: best.cc.text,
        tokenDiff: amended ? wordDiff(pc.text, best.cc.text) : undefined,
        movedFromOrdinal: pc.ordinal, movedToOrdinal: best.cc.ordinal,
      });
      if (amended) signals.push(...extractSignals(best.cc.clauseNo, pc.text, best.cc.text));
    }
  }

  // 3) remaining prev-only = DELETED, curr-only = ADDED
  for (const pc of prev.clauses) {
    if (handledPrev.has(pc.clauseNo)) continue;
    stats.deleted++;
    clauseDiffs.push({ clauseNo: pc.clauseNo, changeType: "DELETED", prevText: pc.text });
  }
  for (const cc of curr.clauses) {
    if (handledCurr.has(cc.clauseNo)) continue;
    stats.added++;
    clauseDiffs.push({ clauseNo: cc.clauseNo, changeType: "ADDED", currText: cc.text });
  }

  clauseDiffs.sort((a, b) => a.clauseNo.localeCompare(b.clauseNo, undefined, { numeric: true }));
  return { prevVersionLabel: prev.versionLabel, currVersionLabel: curr.versionLabel, stats, clauseDiffs, signals };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}
