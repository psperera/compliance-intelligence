// regulatory-feed/mock.ts — in-memory mock of a regulatory intelligence feed.
//
// Lets the whole platform run end-to-end with no vendor connected. Workers call this on
// first run to load the regulatory baseline, the change register, response actions, and
// the raw version documents the diff engine compares. Data mirrors the prototype + seed.

import type {
  RegulatoryFeedProvider, FeedRegulation, FeedVersionDoc, FeedChange, FeedAction,
} from "./provider";

// ---- regulatory baseline (representative subset; full set mirrors prisma/seed.ts) ----
const REGULATIONS: FeedRegulation[] = [
  { externalRef:"DE-TA-LUFT", title:"TA Luft — Technical Instructions on Air Quality Control", jurisdiction:"Germany (EU)", topic:"Air Emissions", agency:"BMUV", status:"IN_FORCE", effectiveDate:"2021-12-01", riskRating:"HIGH", sourceUrl:"https://example.gov/ta-luft", applicableSites:["ahrensburg","wunstorf"] },
  { externalRef:"DE-RAD-04", title:"Radiation Protection Ordinance (StrlSchV)", jurisdiction:"Germany (EU)", topic:"Radiation Safety", agency:"BfS / BMUV", status:"IN_FORCE", effectiveDate:"2018-12-31", riskRating:"CRITICAL", applicableSites:["wunstorf","garching"] },
  { externalRef:"US-OSHA-1910", title:"OSHA 29 CFR 1910 — Occupational Safety & Health Standards", jurisdiction:"United States", topic:"Occupational H&S", agency:"OSHA", status:"IN_FORCE", effectiveDate:"1971-05-29", riskRating:"HIGH", applicableSites:["skaneateles","cincinnati","mountolive"] },
  { externalRef:"US-EPA-TRI", title:"EPCRA §313 — Toxics Release Inventory reporting", jurisdiction:"United States", topic:"Chemicals & Hazardous Substances", agency:"US EPA", status:"IN_FORCE", effectiveDate:"1987-01-01", riskRating:"HIGH", applicableSites:["skaneateles","cincinnati"] },
  { externalRef:"EU-CSRD", title:"Corporate Sustainability Reporting Directive (CSRD/ESRS)", jurisdiction:"Germany (EU)", topic:"Sustainability Disclosure", agency:"EU Commission", status:"IN_FORCE", effectiveDate:"2024-01-05", riskRating:"HIGH", applicableSites:["hurth","wunstorf","ahrensburg","contrex","novemesto","berchem","garching"] },
  { externalRef:"UK-RIDDOR", title:"RIDDOR 2013 — Reporting of Injuries, Diseases & Dangerous Occurrences", jurisdiction:"United Kingdom", topic:"Occupational H&S", agency:"HSE", status:"UNDER_REVIEW", effectiveDate:"2013-10-01", riskRating:"HIGH", applicableSites:["coventry"] },
  { externalRef:"CN-RAD", title:"Regulations on Radioisotopes & Radiation Devices", jurisdiction:"China", topic:"Radiation Safety", agency:"MEE", status:"IN_FORCE", effectiveDate:"2005-12-01", riskRating:"HIGH", applicableSites:["changzhou"] },
  { externalRef:"KR-OSHA", title:"Occupational Safety & Health Act (Serious Accidents Act)", jurisdiction:"South Korea", topic:"Occupational H&S", agency:"MOEL", status:"IN_FORCE", effectiveDate:"2022-01-27", riskRating:"HIGH", applicableSites:["pangyo"] },
  { externalRef:"EU-CBAM", title:"Carbon Border Adjustment Mechanism (EU 2023/956)", jurisdiction:"Germany (EU)", topic:"Energy & Carbon", agency:"EU Commission", status:"IN_FORCE", effectiveDate:"2023-10-01", riskRating:"MEDIUM", applicableSites:["ahrensburg","wunstorf","contrex"] },
  { externalRef:"IN-EWASTE", title:"E-Waste Management Rules 2022", jurisdiction:"India", topic:"Waste & Circularity", agency:"CPCB", status:"IN_FORCE", effectiveDate:"2023-04-01", riskRating:"MEDIUM", applicableSites:["bengaluru"] },
  { externalRef:"DE-EnEfG", title:"Energy Efficiency Act (EnEfG)", jurisdiction:"Germany (EU)", topic:"Energy & Carbon", agency:"BMWK", status:"IN_FORCE", effectiveDate:"2023-11-18", riskRating:"MEDIUM", applicableSites:["ahrensburg","hurth","wunstorf"] },
  { externalRef:"EU-BATTERY", title:"EU Batteries Regulation (2023/1542)", jurisdiction:"United Kingdom", topic:"Product Stewardship", agency:"EU Commission", status:"ENACTED", effectiveDate:"2025-08-18", riskRating:"MEDIUM", applicableSites:["coventry"] },
];

// ---- raw version documents for diffing (clause-numbered text) ----
// The TA Luft scenario is the headline change shown in Change Control.
const VERSIONS: Record<string, FeedVersionDoc[]> = {
  "DE-TA-LUFT": [
    {
      regulationRef: "DE-TA-LUFT", versionLabel: "v2021.2", effectiveAt: "2021-12-01",
      rawText: [
        "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 10 mg/m³ as a daily mean value, measured at the point of release.",
        "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.20 kg/h.",
        "§5.2.4 Operators shall submit emission measurement reports to the competent authority annually.",
        "§5.3.0 Periodic measurements may be performed by an internally accredited testing body.",
        "§6.1.1 Records of all emission measurements shall be retained and made available to the authority on request.",
      ].join("\n"),
    },
    {
      regulationRef: "DE-TA-LUFT", versionLabel: "v2026.1", effectiveAt: "2026-08-15",
      rawText: [
        "§5.2.1 Total dust emissions from surface treatment installations shall not exceed 5 mg/m³ as a daily mean value, measured at the point of release.",
        "§5.2.2 Continuous monitoring shall be required for installations with a mass flow exceeding 0.10 kg/h.",
        "§5.2.3 Installations shall be fitted with a high-efficiency particulate abatement system achieving at least 99% separation efficiency.",
        "§5.2.4 Operators shall submit emission measurement reports to the competent authority quarterly.",
        "§6.1.1 Records of all emission measurements shall be retained for a minimum of 10 years and made available to the authority on request.",
      ].join("\n"),
    },
  ],
};

// ---- change register (subset; severity/category are derived by the service from the diff) ----
const CHANGES: FeedChange[] = [
  { externalRef:"CHG-2038", regulationRef:"DE-TA-LUFT", title:"TA Luft particulate emission limit reduced for surface treatment", prevVersionLabel:"v2021.2", currVersionLabel:"v2026.1", effectiveAt:"2026-08-15", affectedSites:["ahrensburg","wunstorf"], businessLine:"Manufacturing Operations", proposedOwner:"Martin Keller" },
  { externalRef:"CHG-2041", regulationRef:"UK-RIDDOR", title:"RIDDOR reporting threshold for over-7-day incapacitation revised", prevVersionLabel:"v2013.1", currVersionLabel:"v2026.1", effectiveAt:"2026-09-01", affectedSites:["coventry"], businessLine:"Manufacturing Operations", proposedOwner:"James Whitfield" },
  { externalRef:"CHG-2035", regulationRef:"US-EPA-TRI", title:"TRI Form R submission deadline moved earlier; PFAS threshold added", prevVersionLabel:"v2024.1", currVersionLabel:"v2026.1", effectiveAt:"2026-07-01", affectedSites:["skaneateles","cincinnati"], businessLine:"Field Services", proposedOwner:"Ray Maddox" },
  { externalRef:"CHG-2028", regulationRef:"CN-RAD", title:"Radioisotope device licensing renewal period shortened to 3 years", prevVersionLabel:"v2018.1", currVersionLabel:"v2026.1", effectiveAt:"2026-08-01", affectedSites:["changzhou"], businessLine:"Manufacturing Operations", proposedOwner:"Wei Li" },
];

// ---- response actions (subset) ----
const ACTIONS: FeedAction[] = [
  { externalRef:"ACT-881", title:"Install high-efficiency particulate abatement on Line 3", regulationRef:"DE-TA-LUFT", changeRef:"CHG-2038", siteRef:"ahrensburg", priority:"CRITICAL", status:"In progress", owner:"Martin Keller", dueDate:"2026-08-01", evidence:"Required" },
  { externalRef:"ACT-879", title:"Recalibrate continuous dust monitor to 0.10 kg/h threshold", regulationRef:"DE-TA-LUFT", changeRef:"CHG-2038", siteRef:"wunstorf", priority:"HIGH", status:"In progress", owner:"Anika Brandt", dueDate:"2026-07-20", evidence:"Required" },
  { externalRef:"ACT-872", title:"Submit TRI Form R with new PFAS data", regulationRef:"US-EPA-TRI", changeRef:"CHG-2035", siteRef:"skaneateles", priority:"HIGH", status:"Awaiting approval", owner:"Ray Maddox", dueDate:"2026-06-28", evidence:"Attached" },
  { externalRef:"ACT-868", title:"Renew radioisotope device licence (3-yr cycle)", regulationRef:"CN-RAD", changeRef:"CHG-2028", siteRef:"changzhou", priority:"CRITICAL", status:"Blocked", owner:"Wei Li", dueDate:"2026-07-25", evidence:"Required" },
  { externalRef:"ACT-840", title:"Overdue: water discharge permit variance — Changzhou", regulationRef:"CN-WATER", siteRef:"changzhou", priority:"HIGH", status:"Overdue", owner:"Wei Li", dueDate:"2026-06-05", evidence:"Missing" },
];

export class MockRegulatoryFeed implements RegulatoryFeedProvider {
  async listRegulations(): Promise<FeedRegulation[]> { return REGULATIONS; }
  async getVersions(regulationRef: string): Promise<FeedVersionDoc[]> { return VERSIONS[regulationRef] ?? []; }
  async listChanges(): Promise<FeedChange[]> { return CHANGES; }
  async listActions(): Promise<FeedAction[]> { return ACTIONS; }
}

export const mockRegulatoryFeed = new MockRegulatoryFeed();
