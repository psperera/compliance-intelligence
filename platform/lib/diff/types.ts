// Shared types for the deterministic regulatory diff engine.
// The diff is the authoritative, reproducible source of truth. AI never edits it.

export type ClauseChangeType = "ADDED" | "DELETED" | "AMENDED" | "MOVED" | "UNCHANGED";

/** A single clause parsed from a regulatory document, numbering preserved. */
export interface ParsedClause {
  clauseNo: string;   // "§5.2.1"
  parentNo?: string;  // "§5.2"
  ordinal: number;    // stable order within the version
  heading?: string;
  text: string;       // normalised clause body
}

export interface ParsedDocument {
  versionLabel: string;
  clauses: ParsedClause[];
}

/** Word-level span used to render highlighting in the UI. */
export interface TokenSpan {
  op: "equal" | "insert" | "delete";
  text: string;
}

/** Deterministic signals extracted from a clause amendment (numbers, dates, %, etc.). */
export interface MaterialSignal {
  kind:
    | "THRESHOLD_CHANGED"
    | "PERCENTAGE_CHANGED"
    | "DATE_CHANGED"
    | "FREQUENCY_CHANGED"
    | "RETENTION_CHANGED";
  clauseNo: string;
  from?: string;
  to?: string;
  direction?: "TIGHTENED" | "REDUCED" | "UNKNOWN";
  detail: string;
}

export interface ClauseDiff {
  clauseNo: string;
  changeType: ClauseChangeType;
  prevText?: string;
  currText?: string;
  tokenDiff?: TokenSpan[];
  movedFromOrdinal?: number;
  movedToOrdinal?: number;
}

export interface DiffStats {
  added: number;
  deleted: number;
  amended: number;
  moved: number;
  unchanged: number;
}

export interface ComparisonResult {
  prevVersionLabel: string;
  currVersionLabel: string;
  stats: DiffStats;
  clauseDiffs: ClauseDiff[];
  signals: MaterialSignal[];
}
