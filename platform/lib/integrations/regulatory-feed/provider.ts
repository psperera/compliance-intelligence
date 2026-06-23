// regulatory-feed/provider.ts — port interface for any regulatory intelligence source.
//
// The rest of the system depends ONLY on this interface. The mock implementation
// (mock.ts) ships seed data so everything runs end-to-end with no vendor connected.
// A production adapter (e.g. enhesa.ts) implements the same interface against a live feed.
//
// PRODUCTION INTEGRATION: bind REGULATORY_FEED_PROVIDER env to select the implementation.

export interface FeedRegulation {
  externalRef: string;
  title: string;
  jurisdiction: string;
  topic: string;
  agency: string;
  status: "PROPOSED" | "DRAFT" | "ENACTED" | "IN_FORCE" | "UNDER_REVIEW" | "REPEALED";
  effectiveDate?: string;
  riskRating: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  sourceUrl?: string;
  language?: string;
  applicableSites: string[]; // site refs
}

export interface FeedVersionDoc {
  regulationRef: string;
  versionLabel: string;
  effectiveAt?: string;
  rawText: string; // clause-numbered source text (parsed by lib/diff/parse.ts)
}

export interface FeedChange {
  externalRef: string;        // "CHG-2038"
  regulationRef: string;      // "DE-TA-LUFT"
  title: string;
  prevVersionLabel: string;
  currVersionLabel: string;
  effectiveAt?: string;
  affectedSites: string[];
  businessLine?: string;
  proposedOwner?: string;
}

export interface FeedAction {
  externalRef: string;
  title: string;
  regulationRef?: string;
  changeRef?: string;
  siteRef?: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  owner?: string;
  dueDate?: string;
  evidence: "Required" | "Attached" | "Missing";
}

export interface RegulatoryFeedProvider {
  /** Pull the regulatory baseline applicable to the tenant. */
  listRegulations(): Promise<FeedRegulation[]>;
  /** Fetch two versions of a regulation as raw documents for diffing. */
  getVersions(regulationRef: string): Promise<FeedVersionDoc[]>;
  /** Pull detected change events awaiting analysis. */
  listChanges(): Promise<FeedChange[]>;
  /** Pull seeded/initial response actions. */
  listActions(): Promise<FeedAction[]>;
}
