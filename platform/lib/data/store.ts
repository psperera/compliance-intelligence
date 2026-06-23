// lib/data/store.ts — read model for the UI.
//
// In this build the data is served from an in-memory dataset (the Waygate seed) so the app
// runs with no database. Each accessor is async and isolated so the swap to Prisma is a
// drop-in: replace the body with `db.<model>.findMany(...)` — the page code doesn't change.
//
// PRODUCTION: back these with Prisma queries scoped via lib/auth/rbac.withScope(user, where).

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";

export interface Site {
  id: string; name: string; country: string; cc: string; jur: string;
  type: string; role: string; line: string; emp?: number; score: number;
  risk: "High" | "Medium" | "Low"; open: number; permits: number;
}
export interface Regulation {
  id: string; title: string; jur: string; topic: string; agency: string;
  status: string; eff: string; risk: Severity; comp: string; owner: string;
  sites: string[]; watch: boolean; changed: string;
}
export interface ChangeEvent {
  id: string; regId: string; title: string; jur: string; topic: string;
  sev: Severity; cat: string; impact: string; status: string; eff: string;
  sites: string[]; line: string; owner: string; date: string; conf: string;
  prevVersion?: string; currVersion?: string;
}
export interface ActionItem {
  id: string; title: string; reg: string; chg: string; site: string; line: string;
  pri: Severity; owner: string; due: string; status: string; ev: string;
}

const SITES: Site[] = [
  { id:"hurth",name:"Hürth",country:"Germany",cc:"DE",jur:"Germany (EU)",type:"Technology Centre",role:"Ultrasound HQ",line:"Ultrasound Technologies",emp:224,score:91,risk:"Medium",open:6,permits:5 },
  { id:"wunstorf",name:"Wunstorf",country:"Germany",cc:"DE",jur:"Germany (EU)",type:"Technology Centre",role:"Radiography HQ & R&D",line:"Radiography & CT Systems",emp:162,score:84,risk:"High",open:11,permits:7 },
  { id:"skaneateles",name:"Skaneateles",country:"USA",cc:"US",jur:"United States",type:"Technology Centre",role:"RVI HQ & R&D",line:"Remote Visual Inspection",emp:169,score:88,risk:"Medium",open:7,permits:4 },
  { id:"ahrensburg",name:"Ahrensburg",country:"Germany",cc:"DE",jur:"Germany (EU)",type:"Manufacturing",role:"Manufacturing",line:"Manufacturing Operations",emp:146,score:79,risk:"High",open:14,permits:9 },
  { id:"novemesto",name:"Nové Mesto",country:"Slovakia",cc:"SK",jur:"Slovakia (EU)",type:"Technology Centre",role:"Services & UT",line:"Field Services",emp:101,score:86,risk:"Medium",open:5,permits:3 },
  { id:"contrex",name:"Contrexéville",country:"France",cc:"FR",jur:"France (EU)",type:"Manufacturing",role:"Manufacturing & Office",line:"Manufacturing Operations",emp:13,score:82,risk:"Medium",open:4,permits:4 },
  { id:"zurich",name:"Zurich",country:"Switzerland",cc:"CH",jur:"Switzerland",type:"Office",role:"R&D (Automation)",line:"Digital & AI",emp:19,score:94,risk:"Low",open:1,permits:1 },
  { id:"berchem",name:"Berchem",country:"Belgium",cc:"BE",jur:"Belgium (EU)",type:"Office",role:"R&D (Imaging Solutions)",line:"Digital & AI",emp:8,score:93,risk:"Low",open:1,permits:1 },
  { id:"changzhou",name:"Changzhou",country:"China",cc:"CN",jur:"China",type:"Manufacturing",role:"Manufacturing",line:"Manufacturing Operations",emp:37,score:74,risk:"High",open:13,permits:8 },
  { id:"mountolive",name:"Mount Olive",country:"USA",cc:"US",jur:"United States",type:"Office",role:"Repair & Operations",line:"Field Services",emp:24,score:87,risk:"Medium",open:3,permits:2 },
  { id:"bengaluru",name:"Bengaluru",country:"India",cc:"IN",jur:"India",type:"Spoke / Partner",role:"Digital & AI Technologies",line:"Digital & AI",emp:58,score:85,risk:"Medium",open:4,permits:2 },
  { id:"coventry",name:"Coventry",country:"United Kingdom",cc:"GB",jur:"United Kingdom",type:"Spoke / Partner",role:"Battery & Composites",line:"Manufacturing Operations",emp:16,score:80,risk:"High",open:9,permits:5 },
  { id:"saopaulo",name:"São Paulo",country:"Brazil",cc:"BR",jur:"Brazil",type:"Office",role:"LATAM Office & Service",line:"Field Services",emp:18,score:83,risk:"Medium",open:5,permits:3 },
  { id:"singapore",name:"Singapore",country:"Singapore",cc:"SG",jur:"Singapore",type:"Office",role:"APAC Regional Office",line:"Field Services",emp:14,score:90,risk:"Low",open:2,permits:2 },
  { id:"dubai",name:"Dubai",country:"UAE",cc:"AE",jur:"United Arab Emirates",type:"Office",role:"MENAT Regional Office",line:"Field Services",emp:11,score:81,risk:"Medium",open:6,permits:4 },
  { id:"cincinnati",name:"Cincinnati",country:"USA",cc:"US",jur:"United States",type:"Customer Solution Centre",role:"Flagship CSC",line:"Customer Solutions",emp:22,score:89,risk:"Medium",open:3,permits:3 },
  { id:"pangyo",name:"Pangyo",country:"South Korea",cc:"KR",jur:"South Korea",type:"Customer Solution Centre",role:"CSC — CT & X-ray",line:"Customer Solutions",emp:21,score:88,risk:"Medium",open:3,permits:3 },
  { id:"garching",name:"Garching",country:"Germany",cc:"DE",jur:"Germany (EU)",type:"Customer Solution Centre",role:"CSC — X-ray & CT Lab",line:"Customer Solutions",emp:15,score:90,risk:"Low",open:2,permits:3 },
];

let REGS: Regulation[] = [
  { id:"DE-TA-LUFT",title:"TA Luft — Technical Instructions on Air Quality Control",jur:"Germany (EU)",topic:"Air Emissions",agency:"BMUV",status:"In force",eff:"2021-12-01",risk:"HIGH",comp:"Partially compliant",owner:"M. Keller",sites:["ahrensburg","wunstorf"],watch:true,changed:"2026-06-12" },
  { id:"DE-RAD-04",title:"Radiation Protection Ordinance (StrlSchV)",jur:"Germany (EU)",topic:"Radiation Safety",agency:"BfS / BMUV",status:"In force",eff:"2018-12-31",risk:"CRITICAL",comp:"Compliant",owner:"A. Brandt",sites:["wunstorf","garching"],watch:true,changed:"2026-05-18" },
  { id:"US-OSHA-1910",title:"OSHA 29 CFR 1910 — Occupational Safety & Health Standards",jur:"United States",topic:"Occupational H&S",agency:"OSHA",status:"In force",eff:"1971-05-29",risk:"HIGH",comp:"Partially compliant",owner:"R. Maddox",sites:["skaneateles","cincinnati","mountolive"],watch:true,changed:"2026-06-02" },
  { id:"US-EPA-TRI",title:"EPCRA §313 — Toxics Release Inventory reporting",jur:"United States",topic:"Chemicals & Hazardous Substances",agency:"US EPA",status:"In force",eff:"1987-01-01",risk:"HIGH",comp:"Under review",owner:"R. Maddox",sites:["skaneateles","cincinnati"],watch:true,changed:"2026-06-09" },
  { id:"EU-CSRD",title:"Corporate Sustainability Reporting Directive (CSRD/ESRS)",jur:"Germany (EU)",topic:"Sustainability Disclosure",agency:"EU Commission",status:"In force",eff:"2024-01-05",risk:"HIGH",comp:"Partially compliant",owner:"S. Vogel",sites:["hurth","wunstorf","ahrensburg","contrex","novemesto","berchem","garching"],watch:true,changed:"2026-06-15" },
  { id:"UK-RIDDOR",title:"RIDDOR 2013 — Reporting of Injuries, Diseases & Dangerous Occurrences",jur:"United Kingdom",topic:"Occupational H&S",agency:"HSE",status:"Under review",eff:"2013-10-01",risk:"HIGH",comp:"Under review",owner:"J. Whitfield",sites:["coventry"],watch:true,changed:"2026-06-10" },
  { id:"CN-RAD",title:"Regulations on Radioisotopes & Radiation Devices",jur:"China",topic:"Radiation Safety",agency:"MEE",status:"In force",eff:"2005-12-01",risk:"HIGH",comp:"Under review",owner:"W. Li",sites:["changzhou"],watch:true,changed:"2026-06-03" },
  { id:"KR-OSHA",title:"Occupational Safety & Health Act (Serious Accidents Act)",jur:"South Korea",topic:"Occupational H&S",agency:"MOEL",status:"In force",eff:"2022-01-27",risk:"HIGH",comp:"Partially compliant",owner:"Y. Park",sites:["pangyo"],watch:true,changed:"2026-06-05" },
  { id:"EU-CBAM",title:"Carbon Border Adjustment Mechanism (EU 2023/956)",jur:"Germany (EU)",topic:"Energy & Carbon",agency:"EU Commission",status:"In force",eff:"2023-10-01",risk:"MEDIUM",comp:"Under review",owner:"S. Vogel",sites:["ahrensburg","wunstorf","contrex"],watch:true,changed:"2026-06-14" },
  { id:"IN-EWASTE",title:"E-Waste Management Rules 2022",jur:"India",topic:"Waste & Circularity",agency:"CPCB",status:"In force",eff:"2023-04-01",risk:"MEDIUM",comp:"Under review",owner:"A. Rao",sites:["bengaluru"],watch:true,changed:"2026-05-27" },
  { id:"DE-EnEfG",title:"Energy Efficiency Act (EnEfG)",jur:"Germany (EU)",topic:"Energy & Carbon",agency:"BMWK",status:"In force",eff:"2023-11-18",risk:"MEDIUM",comp:"Under review",owner:"S. Vogel",sites:["ahrensburg","hurth","wunstorf"],watch:true,changed:"2026-05-12" },
  { id:"EU-BATTERY",title:"EU Batteries Regulation (2023/1542)",jur:"United Kingdom",topic:"Product Stewardship",agency:"EU Commission",status:"Enacted",eff:"2025-08-18",risk:"MEDIUM",comp:"Under review",owner:"J. Whitfield",sites:["coventry"],watch:true,changed:"2026-06-13" },
  { id:"EU-REACH",title:"REACH (EC 1907/2006) — chemicals registration",jur:"Germany (EU)",topic:"Chemicals & Hazardous Substances",agency:"ECHA",status:"In force",eff:"2007-06-01",risk:"HIGH",comp:"Compliant",owner:"S. Vogel",sites:["ahrensburg","contrex","wunstorf"],watch:true,changed:"2026-04-28" },
  { id:"FR-ICPE",title:"ICPE — Classified Installations for Environmental Protection",jur:"France (EU)",topic:"Industrial Permits",agency:"DREAL",status:"In force",eff:"2013-06-01",risk:"MEDIUM",comp:"Compliant",owner:"P. Moreau",sites:["contrex"],watch:true,changed:"2026-05-04" },
  { id:"CN-WSAFE",title:"Work Safety Law of the PRC (2021 amendment)",jur:"China",topic:"Process Safety",agency:"MEM",status:"In force",eff:"2021-09-01",risk:"HIGH",comp:"Under review",owner:"W. Li",sites:["changzhou"],watch:true,changed:"2026-06-08" },
  { id:"SG-WSH",title:"Workplace Safety & Health Act",jur:"Singapore",topic:"Occupational H&S",agency:"MOM",status:"In force",eff:"2006-03-01",risk:"MEDIUM",comp:"Compliant",owner:"L. Tan",sites:["singapore"],watch:true,changed:"2026-05-30" },
];

// Change events. The TA Luft change carries the version labels the diff engine compares.
const CHANGES: ChangeEvent[] = [
  { id:"CHG-2038",regId:"DE-TA-LUFT",title:"TA Luft particulate emission limit reduced for surface treatment",jur:"Germany (EU)",topic:"Air Emissions",sev:"CRITICAL",cat:"Tightened requirement",impact:"Immediate action required",status:"Action plan created",eff:"2026-08-15",sites:["ahrensburg","wunstorf"],line:"Manufacturing Operations",owner:"M. Keller",date:"2026-06-12",conf:"High",prevVersion:"v2021.2",currVersion:"v2026.1" },
  { id:"CHG-2041",regId:"UK-RIDDOR",title:"RIDDOR reporting threshold for over-7-day incapacitation revised",jur:"United Kingdom",topic:"Occupational H&S",sev:"HIGH",cat:"Tightened requirement",impact:"Action required before effective date",status:"Expert review required",eff:"2026-09-01",sites:["coventry"],line:"Manufacturing Operations",owner:"J. Whitfield",date:"2026-06-10",conf:"Medium" },
  { id:"CHG-2035",regId:"US-EPA-TRI",title:"TRI Form R submission deadline moved earlier; PFAS threshold added",jur:"United States",topic:"Chemicals & Hazardous Substances",sev:"HIGH",cat:"Reporting change",impact:"Action required before effective date",status:"Approved",eff:"2026-07-01",sites:["skaneateles","cincinnati"],line:"Field Services",owner:"R. Maddox",date:"2026-06-09",conf:"High" },
  { id:"CHG-2033",regId:"EU-CSRD",title:"ESRS E1 climate disclosure scope expanded to Scope 3 categories",jur:"Germany (EU)",topic:"Sustainability Disclosure",sev:"HIGH",cat:"Scope change",impact:"Action required before effective date",status:"Expert review required",eff:"2027-01-01",sites:["hurth","wunstorf","ahrensburg"],line:"Digital & AI",owner:"S. Vogel",date:"2026-06-15",conf:"Medium" },
  { id:"CHG-2028",regId:"CN-RAD",title:"Radioisotope device licensing renewal period shortened to 3 years",jur:"China",topic:"Radiation Safety",sev:"HIGH",cat:"Permit change",impact:"Immediate action required",status:"Action plan created",eff:"2026-08-01",sites:["changzhou"],line:"Manufacturing Operations",owner:"W. Li",date:"2026-06-03",conf:"High" },
  { id:"CHG-2026",regId:"KR-OSHA",title:"Serious Accidents Act — penalty ceiling raised; CEO duty clarified",jur:"South Korea",topic:"Occupational H&S",sev:"HIGH",cat:"Penalty change",impact:"Expert review required",status:"Expert review required",eff:"2026-09-15",sites:["pangyo"],line:"Customer Solutions",owner:"Y. Park",date:"2026-06-05",conf:"Medium" },
  { id:"CHG-2024",regId:"EU-CBAM",title:"CBAM definitive regime — quarterly embedded-emissions report required",jur:"Germany (EU)",topic:"Energy & Carbon",sev:"MEDIUM",cat:"Reporting change",impact:"Action required before effective date",status:"Action plan created",eff:"2026-12-31",sites:["ahrensburg","wunstorf"],line:"Manufacturing Operations",owner:"S. Vogel",date:"2026-06-14",conf:"High" },
  { id:"CHG-2013",regId:"EU-BATTERY",title:"Batteries Regulation — carbon footprint declaration for industrial cells",jur:"United Kingdom",topic:"Product Stewardship",sev:"MEDIUM",cat:"New obligation",impact:"Action required before effective date",status:"Expert review required",eff:"2026-08-18",sites:["coventry"],line:"Manufacturing Operations",owner:"J. Whitfield",date:"2026-06-13",conf:"Medium" },
];

const ACTIONS: ActionItem[] = [
  { id:"ACT-881",title:"Install high-efficiency particulate abatement on Line 3",reg:"DE-TA-LUFT",chg:"CHG-2038",site:"ahrensburg",line:"Manufacturing Operations",pri:"CRITICAL",owner:"M. Keller",due:"2026-08-01",status:"In progress",ev:"Required" },
  { id:"ACT-879",title:"Recalibrate continuous dust monitor to 0.10 kg/h threshold",reg:"DE-TA-LUFT",chg:"CHG-2038",site:"wunstorf",line:"Radiography & CT Systems",pri:"HIGH",owner:"A. Brandt",due:"2026-07-20",status:"In progress",ev:"Required" },
  { id:"ACT-876",title:"Update RIDDOR reporting SOP for revised threshold",reg:"UK-RIDDOR",chg:"CHG-2041",site:"coventry",line:"Manufacturing Operations",pri:"HIGH",owner:"J. Whitfield",due:"2026-08-20",status:"Not started",ev:"Required" },
  { id:"ACT-872",title:"Submit TRI Form R with new PFAS data",reg:"US-EPA-TRI",chg:"CHG-2035",site:"skaneateles",line:"Field Services",pri:"HIGH",owner:"R. Maddox",due:"2026-06-28",status:"Awaiting approval",ev:"Attached" },
  { id:"ACT-868",title:"Renew radioisotope device licence (3-yr cycle)",reg:"CN-RAD",chg:"CHG-2028",site:"changzhou",line:"Manufacturing Operations",pri:"CRITICAL",owner:"W. Li",due:"2026-07-25",status:"Blocked",ev:"Required" },
  { id:"ACT-865",title:"Map Scope 3 categories for ESRS E1 disclosure",reg:"EU-CSRD",chg:"CHG-2033",site:"hurth",line:"Digital & AI",pri:"HIGH",owner:"S. Vogel",due:"2026-10-15",status:"In progress",ev:"Required" },
  { id:"ACT-840",title:"Water discharge permit variance — Changzhou",reg:"CN-RAD",chg:"",site:"changzhou",line:"Manufacturing Operations",pri:"HIGH",owner:"W. Li",due:"2026-06-05",status:"Overdue",ev:"Missing" },
  { id:"ACT-837",title:"COSHH assessment refresh — composites cell",reg:"UK-RIDDOR",chg:"",site:"coventry",line:"Manufacturing Operations",pri:"MEDIUM",owner:"J. Whitfield",due:"2026-05-28",status:"Overdue",ev:"Missing" },
  { id:"ACT-820",title:"BImSchG permit periodic review filed",reg:"DE-TA-LUFT",chg:"",site:"ahrensburg",line:"Manufacturing Operations",pri:"HIGH",owner:"M. Keller",due:"2026-03-14",status:"Complete",ev:"Attached" },
  { id:"ACT-795",title:"WSH competency training rollout — Singapore",reg:"SG-WSH",chg:"",site:"singapore",line:"Field Services",pri:"MEDIUM",owner:"L. Tan",due:"2026-05-30",status:"Complete",ev:"Attached" },
];

// ---- accessors (async to mirror a DB) ----
export async function getSites(): Promise<Site[]> { return SITES; }
export async function getSite(id: string): Promise<Site | undefined> { return SITES.find((s) => s.id === id); }
export async function getRegulations(): Promise<Regulation[]> { return REGS; }
export async function getRegulation(id: string): Promise<Regulation | undefined> { return REGS.find((r) => r.id === id); }
export async function getChanges(): Promise<ChangeEvent[]> { return CHANGES; }
export async function getChange(id: string): Promise<ChangeEvent | undefined> { return CHANGES.find((c) => c.id === id); }
export async function getActions(): Promise<ActionItem[]> { return ACTIONS; }
export async function getActionsForSite(siteId: string): Promise<ActionItem[]> { return ACTIONS.filter((a) => a.site === siteId); }
export async function getActionsForChange(chgId: string): Promise<ActionItem[]> { return ACTIONS.filter((a) => a.chg === chgId); }
export async function getRegulationsForSite(siteId: string): Promise<Regulation[]> { return REGS.filter((r) => r.sites.includes(siteId)); }

export const siteName = (id: string) => SITES.find((s) => s.id === id)?.name ?? id;
export const siteCC = (id: string) => SITES.find((s) => s.id === id)?.cc ?? "";

// PRODUCTION: replace with db.regulation.create(...) + AuditLog entry.
export async function addRegulation(input: {
  id: string; title: string; jur: string; topic: string; agency: string;
  risk: Severity; status?: string; eff?: string; owner?: string; sites?: string[];
}): Promise<Regulation> {
  if (REGS.some((r) => r.id.toLowerCase() === input.id.toLowerCase())) throw new Error(`Regulation ${input.id} already exists.`);
  const reg: Regulation = {
    id: input.id, title: input.title, jur: input.jur, topic: input.topic, agency: input.agency,
    status: input.status ?? "In force", eff: input.eff ?? new Date().toISOString().slice(0, 10),
    risk: input.risk, comp: "Under review", owner: input.owner ?? "Unassigned",
    sites: input.sites ?? [], watch: false, changed: new Date().toISOString().slice(0, 10),
  };
  REGS = [reg, ...REGS];
  return reg;
}

export const JURISDICTIONS = ["Germany (EU)","United States","Slovakia (EU)","France (EU)","Switzerland","Belgium (EU)","China","India","United Kingdom","Brazil","Singapore","United Arab Emirates","South Korea"];
export const TOPICS = ["Radiation Safety","Occupational H&S","Process Safety","Chemicals & Hazardous Substances","Waste & Circularity","Air Emissions","Water Discharge","Energy & Carbon","Product Stewardship","Transport & Logistics","Fire Safety","Building & Facilities","Labour & Worker Welfare","Sustainability Disclosure","Emergency Response","Industrial Permits"];
