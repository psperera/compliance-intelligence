/**
 * Compliance Intelligence — database seed
 * Tenant: Waygate Technologies.
 *
 * Includes the USER DATABASE for the HS&E / EHS / legal / compliance team,
 * headed by Tony Hammond, Group HS&E Director.
 *
 * Run with:  pnpm prisma db seed
 *
 * Idempotent: uses upsert on natural keys so re-running won't duplicate rows.
 */
import { PrismaClient, SiteType, RiskLevel } from "@prisma/client";

const db = new PrismaClient();
const ORG = { slug: "waygate", name: "Waygate Technologies" };

// ───────────────────────────── RBAC: roles & permissions ─────────────────────────────

const PERMISSIONS = [
  ["view_content", "View regulatory content"],
  ["edit_metadata", "Edit regulatory metadata"],
  ["create_assessment", "Create comparison assessments"],
  ["approve_assessment", "Approve assessments"],
  ["assign_actions", "Assign actions"],
  ["close_actions", "Close actions"],
  ["upload_evidence", "Upload evidence"],
  ["exec_reporting", "View executive reporting"],
  ["manage_users", "Manage users"],
  ["manage_sites", "Manage sites"],
  ["configure_alerts", "Configure notifications"],
  ["export_reports", "Export reports"],
  ["view_audit_logs", "View audit logs"],
] as const;

// Permission matrix mirrors the Administration screen in the prototype.
const ROLES: Record<string, { name: string; perms: string[] }> = {
  PLATFORM_ADMIN: { name: "Platform Administrator", perms: PERMISSIONS.map((p) => p[0]) },
  COMPLIANCE_DIRECTOR: {
    name: "Corporate Compliance Director",
    perms: ["view_content","edit_metadata","create_assessment","approve_assessment","assign_actions","close_actions","upload_evidence","exec_reporting","configure_alerts","export_reports","view_audit_logs"],
  },
  LEGAL_LEAD: {
    name: "Corporate Legal Lead",
    perms: ["view_content","create_assessment","approve_assessment","exec_reporting","export_reports","view_audit_logs"],
  },
  REGIONAL_HSE_MANAGER: {
    name: "Regional HS&E Manager",
    perms: ["view_content","edit_metadata","create_assessment","assign_actions","close_actions","upload_evidence","exec_reporting","configure_alerts","export_reports","view_audit_logs"],
  },
  SITE_MANAGER: {
    name: "Site Manager",
    perms: ["view_content","edit_metadata","create_assessment","assign_actions","close_actions","upload_evidence"],
  },
  REGULATORY_ANALYST: {
    name: "Regulatory Analyst",
    perms: ["view_content","edit_metadata","create_assessment","upload_evidence","configure_alerts"],
  },
  BUSINESS_LINE_LEADER: {
    name: "Business Line Leader",
    perms: ["view_content","assign_actions","exec_reporting","export_reports"],
  },
  INTERNAL_AUDITOR: {
    name: "Internal Auditor",
    perms: ["view_content","exec_reporting","view_audit_logs"],
  },
  READONLY_EXECUTIVE: {
    name: "Read-only Executive",
    perms: ["view_content","exec_reporting"],
  },
  EXTERNAL_REVIEWER: {
    name: "External Expert Reviewer",
    perms: ["view_content","create_assessment","approve_assessment"],
  },
};

// ───────────────────────────── USER DATABASE ─────────────────────────────
// Tony Hammond is the Group HS&E Director (global scope). The rest of the
// HS&E / EHS / legal / compliance org reports into the group function.

type SeedUser = {
  name: string;
  email: string;
  title: string;
  role: keyof typeof ROLES;
  scopeType: "GLOBAL" | "REGION" | "SITE";
  scope?: string[]; // region names or site externalRefs
  status?: "ACTIVE" | "INVITED" | "SUSPENDED";
};

const USERS: SeedUser[] = [
  { name: "Tony Hammond", email: "thammond@vassalenterprises.com", title: "Group HS&E Director", role: "PLATFORM_ADMIN", scopeType: "GLOBAL", status: "ACTIVE" },
  { name: "Sabine Vogel", email: "s.vogel@waygate.example", title: "Corporate Compliance Director", role: "COMPLIANCE_DIRECTOR", scopeType: "GLOBAL" },
  { name: "Helen Curtis", email: "h.curtis@waygate.example", title: "General Counsel / Legal Policy Lead", role: "LEGAL_LEAD", scopeType: "GLOBAL" },
  { name: "Martin Keller", email: "m.keller@waygate.example", title: "Regional HS&E Manager — DACH", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["Europe (DACH)"] },
  { name: "Ray Maddox", email: "r.maddox@waygate.example", title: "Regional HS&E Manager — Americas", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["Americas"] },
  { name: "Lena Tan", email: "l.tan@waygate.example", title: "Regional HS&E Manager — APAC", role: "REGIONAL_HSE_MANAGER", scopeType: "REGION", scope: ["APAC / MENAT"] },
  { name: "Anika Brandt", email: "a.brandt@waygate.example", title: "Regulatory Analyst — Radiation Safety", role: "REGULATORY_ANALYST", scopeType: "GLOBAL" },
  { name: "Wei Li", email: "w.li@waygate.example", title: "Site Manager — Changzhou", role: "SITE_MANAGER", scopeType: "SITE", scope: ["changzhou"] },
  { name: "James Whitfield", email: "j.whitfield@waygate.example", title: "Site Manager — Coventry", role: "SITE_MANAGER", scopeType: "SITE", scope: ["coventry"] },
  { name: "Pierre Moreau", email: "p.moreau@waygate.example", title: "Site Manager — Contrexéville", role: "SITE_MANAGER", scopeType: "SITE", scope: ["contrex"] },
  { name: "Yuna Park", email: "y.park@waygate.example", title: "Site Manager — Pangyo CSC", role: "SITE_MANAGER", scopeType: "SITE", scope: ["pangyo"] },
  { name: "Arjun Rao", email: "a.rao@waygate.example", title: "Business Line Leader — Digital & AI", role: "BUSINESS_LINE_LEADER", scopeType: "GLOBAL" },
  { name: "Khalid Haddad", email: "k.haddad@waygate.example", title: "HS&E Lead — MENAT", role: "REGIONAL_HSE_MANAGER", scopeType: "SITE", scope: ["dubai"] },
  { name: "Camila Almeida", email: "c.almeida@waygate.example", title: "HS&E Lead — LATAM", role: "SITE_MANAGER", scopeType: "SITE", scope: ["saopaulo"] },
  { name: "Greg Sutton", email: "g.sutton@waygate.example", title: "Internal Auditor", role: "INTERNAL_AUDITOR", scopeType: "GLOBAL" },
  { name: "Diane Osei", email: "d.osei@waygate.example", title: "Chief Operating Officer", role: "READONLY_EXECUTIVE", scopeType: "GLOBAL" },
  { name: "External Reviewer (DLA)", email: "ehs.review@dla.example", title: "External Expert Reviewer", role: "EXTERNAL_REVIEWER", scopeType: "GLOBAL", status: "INVITED" },
];

// ───────────────────────────── Reference data ─────────────────────────────

const REGIONS = ["Europe (DACH)", "Europe (West)", "Americas", "Greater China", "South Asia", "APAC / MENAT"];

const BUSINESS_LINES = [
  "Radiography & CT Systems","Ultrasound Technologies","Remote Visual Inspection",
  "Manufacturing Operations","Digital & AI","Field Services","Customer Solutions",
];

const JURISDICTIONS: { name: string; iso: string; eu: boolean; region: string }[] = [
  { name: "Germany (EU)", iso: "DE", eu: true, region: "Europe (DACH)" },
  { name: "Switzerland", iso: "CH", eu: false, region: "Europe (DACH)" },
  { name: "France (EU)", iso: "FR", eu: true, region: "Europe (West)" },
  { name: "Belgium (EU)", iso: "BE", eu: true, region: "Europe (West)" },
  { name: "Slovakia (EU)", iso: "SK", eu: true, region: "Europe (West)" },
  { name: "United Kingdom", iso: "GB", eu: false, region: "Europe (West)" },
  { name: "United States", iso: "US", eu: false, region: "Americas" },
  { name: "Brazil", iso: "BR", eu: false, region: "Americas" },
  { name: "China", iso: "CN", eu: false, region: "Greater China" },
  { name: "India", iso: "IN", eu: false, region: "South Asia" },
  { name: "Singapore", iso: "SG", eu: false, region: "APAC / MENAT" },
  { name: "United Arab Emirates", iso: "AE", eu: false, region: "APAC / MENAT" },
  { name: "South Korea", iso: "KR", eu: false, region: "APAC / MENAT" },
];

// Waygate real footprint — 18 sites across 10 countries.
const SITES: {
  ref: string; name: string; country: string; iso: string; jur: string; type: SiteType;
  role: string; line: string; region: string; emp?: number; score: number; risk: RiskLevel;
}[] = [
  { ref:"hurth", name:"Hürth", country:"Germany", iso:"DE", jur:"Germany (EU)", type:"TECHNOLOGY_CENTRE", role:"Ultrasound HQ", line:"Ultrasound Technologies", region:"Europe (DACH)", emp:224, score:91, risk:"MEDIUM" },
  { ref:"wunstorf", name:"Wunstorf", country:"Germany", iso:"DE", jur:"Germany (EU)", type:"TECHNOLOGY_CENTRE", role:"Radiography HQ & R&D", line:"Radiography & CT Systems", region:"Europe (DACH)", emp:162, score:84, risk:"HIGH" },
  { ref:"skaneateles", name:"Skaneateles", country:"USA", iso:"US", jur:"United States", type:"TECHNOLOGY_CENTRE", role:"RVI HQ & R&D", line:"Remote Visual Inspection", region:"Americas", emp:169, score:88, risk:"MEDIUM" },
  { ref:"ahrensburg", name:"Ahrensburg", country:"Germany", iso:"DE", jur:"Germany (EU)", type:"MANUFACTURING", role:"Manufacturing", line:"Manufacturing Operations", region:"Europe (DACH)", emp:146, score:79, risk:"HIGH" },
  { ref:"novemesto", name:"Nové Mesto", country:"Slovakia", iso:"SK", jur:"Slovakia (EU)", type:"TECHNOLOGY_CENTRE", role:"Services & UT", line:"Field Services", region:"Europe (West)", emp:101, score:86, risk:"MEDIUM" },
  { ref:"contrex", name:"Contrexéville", country:"France", iso:"FR", jur:"France (EU)", type:"MANUFACTURING", role:"Manufacturing & Office", line:"Manufacturing Operations", region:"Europe (West)", emp:13, score:82, risk:"MEDIUM" },
  { ref:"zurich", name:"Zurich", country:"Switzerland", iso:"CH", jur:"Switzerland", type:"OFFICE", role:"R&D (Automation)", line:"Digital & AI", region:"Europe (DACH)", emp:19, score:94, risk:"LOW" },
  { ref:"berchem", name:"Berchem", country:"Belgium", iso:"BE", jur:"Belgium (EU)", type:"OFFICE", role:"R&D (Imaging Solutions)", line:"Digital & AI", region:"Europe (West)", emp:8, score:93, risk:"LOW" },
  { ref:"changzhou", name:"Changzhou", country:"China", iso:"CN", jur:"China", type:"MANUFACTURING", role:"Manufacturing", line:"Manufacturing Operations", region:"Greater China", emp:37, score:74, risk:"HIGH" },
  { ref:"mountolive", name:"Mount Olive", country:"USA", iso:"US", jur:"United States", type:"OFFICE", role:"Repair & Operations", line:"Field Services", region:"Americas", emp:24, score:87, risk:"MEDIUM" },
  { ref:"bengaluru", name:"Bengaluru", country:"India", iso:"IN", jur:"India", type:"SPOKE_PARTNER", role:"Digital & AI Technologies", line:"Digital & AI", region:"South Asia", emp:58, score:85, risk:"MEDIUM" },
  { ref:"coventry", name:"Coventry", country:"United Kingdom", iso:"GB", jur:"United Kingdom", type:"SPOKE_PARTNER", role:"Horizon 3 — Battery & Composites", line:"Manufacturing Operations", region:"Europe (West)", emp:16, score:80, risk:"HIGH" },
  { ref:"saopaulo", name:"São Paulo", country:"Brazil", iso:"BR", jur:"Brazil", type:"OFFICE", role:"LATAM Regional Office & Service", line:"Field Services", region:"Americas", emp:18, score:83, risk:"MEDIUM" },
  { ref:"singapore", name:"Singapore", country:"Singapore", iso:"SG", jur:"Singapore", type:"OFFICE", role:"APAC Regional Office", line:"Field Services", region:"APAC / MENAT", emp:14, score:90, risk:"LOW" },
  { ref:"dubai", name:"Dubai", country:"UAE", iso:"AE", jur:"United Arab Emirates", type:"OFFICE", role:"MENAT Regional Office", line:"Field Services", region:"APAC / MENAT", emp:11, score:81, risk:"MEDIUM" },
  { ref:"cincinnati", name:"Cincinnati", country:"USA", iso:"US", jur:"United States", type:"CUSTOMER_SOLUTION_CENTRE", role:"Flagship CSC — 26,000 sq ft", line:"Customer Solutions", region:"Americas", emp:22, score:89, risk:"MEDIUM" },
  { ref:"pangyo", name:"Pangyo", country:"South Korea", iso:"KR", jur:"South Korea", type:"CUSTOMER_SOLUTION_CENTRE", role:"CSC — CT & X-ray Inspection", line:"Customer Solutions", region:"APAC / MENAT", emp:21, score:88, risk:"MEDIUM" },
  { ref:"garching", name:"Garching", country:"Germany", iso:"DE", jur:"Germany (EU)", type:"CUSTOMER_SOLUTION_CENTRE", role:"CSC — 500m² X-ray & CT Lab", line:"Customer Solutions", region:"Europe (DACH)", emp:15, score:90, risk:"LOW" },
];

// ───────────────────────────── Seed routine ─────────────────────────────

async function main() {
  const org = await db.organisation.upsert({
    where: { slug: ORG.slug }, update: {}, create: ORG,
  });

  // permissions
  const permByKey: Record<string, string> = {};
  for (const [key, name] of PERMISSIONS) {
    const p = await db.permission.upsert({ where: { key }, update: { name }, create: { key, name } });
    permByKey[key] = p.id;
  }

  // roles + role-permission links
  const roleByKey: Record<string, string> = {};
  for (const [key, def] of Object.entries(ROLES)) {
    const r = await db.role.upsert({ where: { key }, update: { name: def.name }, create: { key, name: def.name } });
    roleByKey[key] = r.id;
    for (const perm of def.perms) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: r.id, permissionId: permByKey[perm] } },
        update: {}, create: { roleId: r.id, permissionId: permByKey[perm] },
      });
    }
  }

  // regions
  const regionByName: Record<string, string> = {};
  for (const name of REGIONS) {
    const r = await db.region.upsert({
      where: { organisationId_name: { organisationId: org.id, name } },
      update: {}, create: { organisationId: org.id, name },
    });
    regionByName[name] = r.id;
  }

  // business lines
  const lineByName: Record<string, string> = {};
  for (const name of BUSINESS_LINES) {
    const bl = await db.businessLine.upsert({
      where: { organisationId_name: { organisationId: org.id, name } },
      update: {}, create: { organisationId: org.id, name },
    });
    lineByName[name] = bl.id;
  }

  // jurisdictions
  const jurByName: Record<string, string> = {};
  for (const j of JURISDICTIONS) {
    const rec = await db.jurisdiction.upsert({
      where: { name: j.name },
      update: { countryISO: j.iso, isEU: j.eu, regionId: regionByName[j.region] },
      create: { name: j.name, countryISO: j.iso, isEU: j.eu, regionId: regionByName[j.region] },
    });
    jurByName[j.name] = rec.id;
  }

  // sites
  const siteByRef: Record<string, string> = {};
  for (const s of SITES) {
    const rec = await db.site.upsert({
      where: { id: s.ref }, // using ref as stable id for the seed
      update: {
        name: s.name, country: s.country, countryISO: s.iso, siteType: s.type, role: s.role,
        employees: s.emp ?? null, complianceScore: s.score, riskRating: s.risk,
        jurisdictionId: jurByName[s.jur], regionId: regionByName[s.region], businessLineId: lineByName[s.line],
      },
      create: {
        id: s.ref, organisationId: org.id, name: s.name, country: s.country, countryISO: s.iso,
        siteType: s.type, role: s.role, employees: s.emp ?? null, complianceScore: s.score, riskRating: s.risk,
        jurisdictionId: jurByName[s.jur], regionId: regionByName[s.region], businessLineId: lineByName[s.line],
      },
    });
    siteByRef[s.ref] = rec.id;
  }

  // USERS (the user database) + scope links
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, title: u.title, roleId: roleByKey[u.role], scopeType: u.scopeType, status: u.status ?? "ACTIVE" },
      create: {
        organisationId: org.id, name: u.name, email: u.email, title: u.title,
        roleId: roleByKey[u.role], scopeType: u.scopeType, status: u.status ?? "ACTIVE",
      },
    });
    if (u.scopeType === "REGION" && u.scope) {
      for (const rn of u.scope) {
        await db.userRegionScope.upsert({
          where: { userId_regionId: { userId: user.id, regionId: regionByName[rn] } },
          update: {}, create: { userId: user.id, regionId: regionByName[rn] },
        });
      }
    }
    if (u.scopeType === "SITE" && u.scope) {
      for (const sref of u.scope) {
        await db.userSiteScope.upsert({
          where: { userId_siteId: { userId: user.id, siteId: siteByRef[sref] } },
          update: {}, create: { userId: user.id, siteId: siteByRef[sref] },
        });
        await db.siteResponsibility.upsert({
          where: { siteId_userId_role: { siteId: siteByRef[sref], userId: user.id, role: u.title } },
          update: {}, create: { siteId: siteByRef[sref], userId: user.id, role: u.title },
        });
      }
    }
  }

  console.log(`Seeded ${USERS.length} users (HS&E Director: Tony Hammond), ${SITES.length} sites, ${JURISDICTIONS.length} jurisdictions, ${Object.keys(ROLES).length} roles.`);
  console.log("Note: regulations, change events, actions, watchlists and evidence are loaded by the");
  console.log("regulatory-feed mock adapter on first worker run (see lib/integrations/regulatory-feed/mock.ts).");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
