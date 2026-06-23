// parse.ts — turn a regulatory source document into a structured clause tree.
//
// Real regulatory feeds deliver structured XML/HTML (Akoma Ntoso, LegalDocML, agency XML).
// This parser handles plain text / lightly-structured input by detecting clause numbering,
// which is enough for the diff engine and for the mock adapter. A production parser would
// branch on source format behind the same ParsedDocument return type.

import type { ParsedClause, ParsedDocument } from "./types";

// Matches clause markers at the start of a line:
//   §5.2.1   Art. 12(3)   Section 4   (a)   1.2.3   Reg 7
const CLAUSE_MARKER =
  /^\s*(§\s?\d+(?:\.\d+)*[a-z]?|Art\.?\s?\d+(?:\(\d+\))?|Section\s+\d+(?:\.\d+)*|Reg\s+\d+|\d+(?:\.\d+){1,}|\([a-z0-9]+\))\b/i;

/** Normalise whitespace and curly quotes so diffs are stable and reproducible. */
export function normalise(text: string): string {
  return text
    .replace(/ /g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parentOf(clauseNo: string): string | undefined {
  const m = clauseNo.match(/^(§?\s?)(\d+(?:\.\d+)*)/);
  if (!m) return undefined;
  const parts = m[2].split(".");
  if (parts.length <= 1) return undefined;
  return (m[1] || "") + parts.slice(0, -1).join(".");
}

/**
 * Parse raw text into clauses. Lines that begin with a clause marker start a new clause;
 * subsequent lines without a marker are folded into the current clause body.
 */
export function parseDocument(versionLabel: string, raw: string): ParsedDocument {
  const lines = raw.split(/\r?\n/);
  const clauses: ParsedClause[] = [];
  let current: { clauseNo: string; heading?: string; buf: string[] } | null = null;
  let ordinal = 0;

  const flush = () => {
    if (current && current.buf.join(" ").trim()) {
      const clauseNo = current.clauseNo.replace(/\s+/g, "");
      clauses.push({
        clauseNo,
        parentNo: parentOf(clauseNo),
        ordinal: ordinal++,
        heading: current.heading?.trim() || undefined,
        text: normalise(current.buf.join(" ")),
      });
    }
  };

  for (const line of lines) {
    if (!line.trim()) continue;
    const m = line.match(CLAUSE_MARKER);
    if (m) {
      flush();
      const marker = m[1];
      const rest = line.slice(line.indexOf(marker) + marker.length).trim();
      // a short rest with no terminal punctuation is treated as a heading
      const isHeading = rest.length > 0 && rest.length < 60 && !/[.;:]$/.test(rest);
      current = { clauseNo: marker, heading: isHeading ? rest : undefined, buf: isHeading ? [] : [rest] };
    } else if (current) {
      current.buf.push(line.trim());
    } else {
      // preamble before the first marker → synthetic clause
      current = { clauseNo: "§0", buf: [line.trim()] };
    }
  }
  flush();
  return { versionLabel, clauses };
}
