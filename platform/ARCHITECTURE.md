# Compliance Intelligence — Platform Architecture

**Global regulatory intelligence. Local accountability. Clear action.**

Tenant: Waygate Technologies · 18 sites · 10 countries · ~994 employees
Document owner: Tony Hammond, Group HS&E Director
Version: 0.1 (engineering blueprint, June 2026)

Central promise enforced by the architecture:
**Every regulatory change is traceable. Every impact has an owner. Every compliance decision is auditable.**

---

## 1. System architecture (text diagram)

```
                                  ┌─────────────────────────────────────────────┐
                                  │                   CLIENTS                     │
                                  │  Desktop (primary) · Tablet/mobile (exec,     │
                                  │  alerts) · Email clients · Slack / MS Teams   │
                                  └───────────────┬───────────────────────────────┘
                                                  │ HTTPS / TLS 1.3
                                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS 15 APP (App Router, RSC + TS)                           │
│                                                                                          │
│  app/(dashboard) ── server components ── TanStack Query ── shadcn/ui ── Recharts         │
│        │                                                                                  │
│        ▼                                                                                  │
│  app/api/*  (route handlers)  ── Zod validation ── RBAC guard ── service layer            │
└───────────────┬──────────────────────────────────────────────────────┬──────────────────┘
                │                                                        │
                ▼                                                        ▼
┌───────────────────────────────────┐                  ┌────────────────────────────────────┐
│        SERVICE / DOMAIN LAYER      │                  │          BACKGROUND WORKERS          │
│  (lib/services, framework-agnostic)│                  │   (BullMQ on Redis, separate proc)   │
│  ┌──────────────────────────────┐  │                  │  • ingest regulatory source docs     │
│  │ RegulationService            │  │                  │  • run diff + change detection       │
│  │ ChangeDetectionService  ◄────┼──┼──────────────────┼─►• AI grouping / summarisation        │
│  │ ImpactAssessmentService      │  │                  │  • applicability resolution          │
│  │ ActionService                │  │                  │  • notification dispatch + escalation │
│  │ Watchlist/NotificationService│  │                  │  • scheduled digests (cron)          │
│  │ EvidenceService              │  │                  │  • embedding (pgvector) refresh       │
│  │ ComplianceScoreService       │  │                  └───────────────┬──────────────────────┘
│  │ AuditService (append-only)   │  │                                  │
│  └──────────────┬───────────────┘  │                                  │
└─────────────────┼──────────────────┘                                  │
                  │ Prisma ORM                                           │
                  ▼                                                      ▼
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────┐
│            PostgreSQL 16                  │     │           ADAPTER INTERFACES               │
│  • relational core (see schema.prisma)   │     │  (lib/integrations/* — swappable ports)    │
│  • pgvector: clause + guide embeddings   │     │  • RegulatoryFeedProvider  (Enhesa/LexisN.)│
│  • full-text search (tsvector + GIN)     │     │  • AiProvider              (Anthropic/…)    │
│  • row-level multi-tenant isolation      │     │  • EmailProvider           (Resend/SendGrid)│
│  • append-only audit_log (no UPDATE/DEL) │     │  • ObjectStorage           (S3/Azure Blob) │
└──────────────────────────────────────────┘     │  • IdentityProvider        (SSO / SAML/OIDC)│
                  ▲                                │  • ChatProvider            (Slack/Teams)   │
                  │ cache + queues                 └──────────────────────────────────────────┘
                  ▼
        ┌──────────────────┐
        │      Redis       │  queues (BullMQ) · rate limit · session/query cache · digest scheduling
        └──────────────────┘
```

### Request lifecycle (read)
`Client → RSC/route handler → RBAC guard (session + role + scope) → Service → Prisma → Postgres → DTO → cache (Redis) → client`

### Request lifecycle (mutation)
`Client → route handler → Zod parse → RBAC guard → Service (transaction) → Prisma write + AuditService.append (same tx) → enqueue side-effects (notifications) → response`

Audit writes happen **inside the same database transaction** as the mutation, so a state change and its audit record are atomic — you cannot have one without the other.

---

## 2. Technology choices

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | RSC for fast data-dense pages, one deployable, strong typing |
| UI | React, Tailwind, shadcn/ui, Lucide | Premium, accessible, consistent enterprise components |
| Server state | TanStack Query | Caching, optimistic updates, background refetch |
| Tables | TanStack Table | Virtualised, sortable, filterable baseline grid |
| Charts | Recharts | Dashboard + analytics visualisations |
| Forms | React Hook Form + Zod | Same Zod schema validates client and API |
| DB | PostgreSQL 16 + Prisma | Relational integrity, migrations, type-safe queries |
| Vector | pgvector | Semantic search over clauses, guides, evidence — no extra datastore |
| Jobs/cache | Redis + BullMQ | Ingestion, diffing, notifications, digests, escalation timers |
| Storage | Object storage adapter | Evidence files + raw regulatory source documents |
| Auth | SSO via OIDC/SAML adapter + RBAC | Enterprise identity, least-privilege access |

Every external dependency sits behind an interface in `lib/integrations/`, with a working **mock implementation** so the system runs end-to-end with no third-party connected. Production integrations are dropped in by swapping the adapter binding — search the codebase for `// PRODUCTION INTEGRATION:` markers.

---

## 3. Folder structure

```
platform/
├─ ARCHITECTURE.md                  ← this file
├─ prisma/
│  ├─ schema.prisma                 ← full data model
│  └─ seed.ts                       ← user database + Waygate seed data
├─ app/
│  ├─ (auth)/sign-in/page.tsx
│  ├─ (dashboard)/
│  │  ├─ layout.tsx                 ← sidebar + topbar shell, RBAC nav
│  │  ├─ page.tsx                   ← Executive Overview
│  │  ├─ baseline/page.tsx
│  │  ├─ baseline/[regId]/page.tsx
│  │  ├─ change/page.tsx
│  │  ├─ change/[changeId]/page.tsx ← side-by-side comparison + assessment
│  │  ├─ forecaster/page.tsx
│  │  ├─ watchlists/page.tsx
│  │  ├─ alerts/page.tsx
│  │  ├─ sites/page.tsx
│  │  ├─ sites/[siteId]/page.tsx    ← site workspace + compliance matrix
│  │  ├─ actions/page.tsx           ← Kanban + table
│  │  ├─ evidence/page.tsx
│  │  ├─ guides/page.tsx
│  │  ├─ guides/[guideId]/page.tsx
│  │  ├─ reporting/page.tsx
│  │  ├─ admin/page.tsx             ← users, roles, RBAC matrix
│  │  └─ audit/page.tsx
│  └─ api/                          ← route handlers (see §4)
├─ lib/
│  ├─ db.ts                         ← Prisma client singleton
│  ├─ auth/                         ← session, RBAC guard, permission map
│  │  ├─ rbac.ts                    ← ROLE_PERMISSIONS, can(), withScope()
│  │  └─ session.ts
│  ├─ services/
│  │  ├─ regulation.service.ts
│  │  ├─ change-detection.service.ts
│  │  ├─ impact-assessment.service.ts
│  │  ├─ action.service.ts
│  │  ├─ watchlist.service.ts
│  │  ├─ notification.service.ts
│  │  ├─ evidence.service.ts
│  │  ├─ compliance-score.service.ts
│  │  └─ audit.service.ts           ← append-only writer
│  ├─ integrations/                 ← swappable adapters (ports)
│  │  ├─ regulatory-feed/ (provider.ts, mock.ts, enhesa.ts)
│  │  ├─ ai/ (provider.ts, mock.ts, anthropic.ts)
│  │  ├─ email/ (provider.ts, mock.ts, resend.ts)
│  │  ├─ storage/ (provider.ts, mock.ts, s3.ts)
│  │  └─ chat/ (provider.ts, mock.ts, slack.ts)
│  ├─ diff/                         ← deterministic text-diff engine
│  │  ├─ parse.ts                   ← document → sections/clauses/paragraphs
│  │  ├─ diff.ts                    ← clause-level Myers diff + classification
│  │  └─ types.ts
│  └─ validation/                   ← shared Zod schemas
├─ workers/
│  ├─ index.ts                      ← BullMQ worker bootstrap
│  ├─ ingest.worker.ts
│  ├─ change-detection.worker.ts
│  ├─ notification.worker.ts
│  ├─ escalation.worker.ts          ← overdue / unassigned timers
│  └─ digest.scheduler.ts           ← daily/weekly/monthly cron
├─ components/                      ← ui/, charts/, tables/, change/ (diff viewer)
└─ tests/                           ← unit (diff, scoring, rbac) + e2e (Playwright)
```

---

## 4. API route design

REST-style route handlers under `app/api/`. All mutating routes: Zod-validated body, RBAC guard, atomic audit write, idempotency key on create. List routes support `?page&pageSize&sort&filter[...]` and are automatically scoped to the caller's permitted sites/regions.

### Auth & identity
```
POST   /api/auth/callback              OIDC/SAML callback (adapter)
GET    /api/me                         current user, role, permitted scope
```

### Regulations & baseline
```
GET    /api/regulations                list + filter (jurisdiction, topic, agency, status, site, risk, q)
POST   /api/regulations                create               [edit_metadata]
GET    /api/regulations/:id            detail + clauses + relations
PATCH  /api/regulations/:id            update metadata      [edit_metadata]
GET    /api/regulations/:id/versions   version list
GET    /api/regulations/:id/clauses    clause tree (current version)
GET    /api/search                     keyword + full-text + semantic (pgvector) across all entities
```

### Change control (core)
```
POST   /api/ingest                     submit a regulatory source doc → enqueue ingest+diff   [system/feed]
GET    /api/changes                    change register (filter by severity, status, jurisdiction)
GET    /api/changes/:id                change event + materiality + applicability
GET    /api/comparisons/:id            side-by-side diff payload (prev vs current, classified clauses)
POST   /api/changes/:id/assessment     create/update impact assessment (draft)                 [create_assessment]
POST   /api/changes/:id/review         mark reviewed / request legal review                    [create_assessment]
POST   /api/changes/:id/approve        approve & publish assessment                            [approve_assessment]
POST   /api/changes/:id/escalate       escalate to executive                                   [create_assessment]
POST   /api/changes/:id/applicability  set affected sites + business lines                     [create_assessment]
```

### Forecaster
```
GET    /api/forecaster                 horizon items (buckets: 30d/90d/6m/12m/watch)
POST   /api/forecaster/:id/readiness   create readiness plan + assign analyst
```

### Watchlists, alerts, notifications
```
GET    /api/watchlists                 list (scoped)
POST   /api/watchlists                 create + rules
PATCH  /api/watchlists/:id             update rules / recipients / frequency                   [configure_alerts]
GET    /api/notifications              in-app feed for current user
POST   /api/notifications/preview      render email alert preview (no send)
PUT    /api/notification-prefs         per-user channel + cadence
POST   /api/notifications/test         send test alert                                         [configure_alerts]
```

### Sites, actions, evidence
```
GET    /api/sites                      list + compliance score
GET    /api/sites/:id                  workspace (regs, matrix, permits, evidence, actions)
GET    /api/sites/:id/matrix           compliance matrix rows
GET    /api/actions                    Kanban/table data (filter by site, owner, status, due)
POST   /api/actions                    create + assign                                          [assign_actions]
PATCH  /api/actions/:id                update status / owner / due                              [assign|close_actions]
POST   /api/evidence                   upload (returns signed URL from storage adapter)        [upload_evidence]
PATCH  /api/evidence/:id               version / expiry / status
```

### Reporting & audit
```
GET    /api/reports/:type              scorecard | change-impact | actions | site | exposure | ...
POST   /api/reports/:type/export       pdf | xlsx | csv | pptx (queued; returns job id)        [export_reports]
GET    /api/audit                      paginated immutable audit log (filter)                  [view_audit_logs]
```

### Admin (RBAC)
```
GET    /api/users                      [manage_users]
POST   /api/users                      invite                                                  [manage_users]
PATCH  /api/users/:id                  role / scope / status                                   [manage_users]
GET    /api/roles                      role → permission matrix
```

`[permission]` = required permission checked by the RBAC guard. Site Managers are additionally scope-limited to their own site unless granted wider access (`withScope()` injects a site/region filter into every query for non-global roles).

---

## 5. Regulatory change-detection logic

Pipeline is **deterministic first, AI second**. The text diff is reproducible and authoritative; AI only *interprets* — it never decides compliance, and its output is always stored separately and labelled `DRAFT / AI_ASSISTED / REQUIRES_REVIEW`.

```
 (1) INGEST                A regulatory source document arrives (feed adapter or manual upload).
       │                   Store raw file in object storage; create RegulationVersion(status=INGESTED).
       ▼
 (2) EXTRACT METADATA      title, jurisdiction, agency, citation, publication date, effective date,
       │                   topic, legal status, source URL, original language.
       ▼
 (3) PARSE                 lib/diff/parse.ts → structured tree: Section › Clause › Paragraph › Sentence,
       │                   preserving clause numbering (e.g. §5.2.1). Persist as RegulationClause rows.
       ▼
 (4) ALIGN + DIFF          lib/diff/diff.ts compares NEW version against the last APPROVED version.
       │                   • Align clauses by clause number, then by fuzzy text similarity (handles renumber/move).
       │                   • Per aligned pair run a Myers/word-level diff → token spans (added/removed/equal).
       │                   • Classify each clause: ADDED · DELETED · AMENDED · MOVED · UNCHANGED.
       │                   Output = immutable ChangeComparison (the raw diff). This is the source of truth.
       ▼
 (5) DETECT SIGNAL         Rule layer flags material patterns from the raw diff:
       │                   numeric thresholds changed (limits, mass-flow, %), effective-date changes,
       │                   penalty changes, new reporting obligations, scope changes, new/removed obligations.
       │                   → seeds ChangeEvent.category candidates + a deterministic severity hint.
       ▼
 (6) AI INTERPRET          AiProvider (async, in worker). Strictly bounded tasks:
       │                   • group related clause changes into themes,
       │                   • draft a plain-English summary,
       │                   • suggest likely business impacts,
       │                   • flag likely-affected facilities / business lines,
       │                   • optional translation if original language ≠ working language.
       │                   Returns a confidence score → HIGH / MEDIUM / LOW / HUMAN_CONFIRMATION_REQUIRED.
       │                   Stored on ChangeAssessment with status=DRAFT, aiAssisted=true. NEVER auto-approved.
       ▼
 (7) APPLICABILITY         Resolve affected sites/business lines from regulation→site mapping + AI hints;
       │                   present to analyst for confirmation (human-in-the-loop).
       ▼
 (8) EXPERT REVIEW         Analyst/Compliance Director (or External Reviewer) reviews diff + draft.
       │                   Actions: edit, mark reviewed, request legal review, create action plan, escalate.
       │                   Approval transitions assessment DRAFT → APPROVED (publishable). Required before
       │                   any assessment is treated as authoritative.
       ▼
 (9) NOTIFY                On approve / on critical detection: NotificationService matches the change against
       │                   active WatchlistRules → dispatches immediate alerts, queues digests, starts
       │                   escalation timers (unassigned > 48h; action overdue > 7d).
       ▼
(10) AUDIT                 Every step (5–9) appends an immutable AuditLog row in-transaction:
                           who/what/when, before/after, AI vs human, confidence, approval chain.
```

### Confidence & labelling model
Each AI output carries: `confidence ∈ {HIGH, MEDIUM, LOW, HUMAN_CONFIRMATION_REQUIRED}` and a lifecycle label `DRAFT → AI_ASSISTED → REQUIRES_EXPERT_REVIEW → APPROVED → SUPERSEDED`. The UI renders these as badges (as shown in the prototype's Change Control screen). Raw diff and AI analysis are **separate columns/tables** so the legal text trail is never overwritten by interpretation.

### Why deterministic-first matters
- Reproducibility: the same two versions always yield the same diff (auditable, defensible to a regulator).
- Safety: numeric/threshold/penalty/date changes are caught by rules, not left to a model.
- Separation of duties: AI accelerates analysis; a qualified human approves the compliance decision.

---

## 6. Security, tenancy & compliance posture

- **Multi-tenant** via `organisationId` on every row + row-scoped Prisma middleware; Waygate is one tenant.
- **RBAC** with 10 roles and a permission matrix (see `lib/auth/rbac.ts` and the Admin screen). Non-global roles are scope-filtered to their site/region on every query.
- **Append-only audit**: `audit_log` has no UPDATE/DELETE grants; writes are transactional with the mutation.
- **Soft deletion** (`deletedAt`) on user-managed entities; regulatory versions and audit records are never hard-deleted.
- **Secrets** via environment/secret manager; adapters never log payloads containing personal data.
- **PII minimisation**: notifications reference roles + record IDs, never embed sensitive data in URLs.
- **At-rest encryption** for evidence files; signed, expiring URLs for download.

---

## 7. Running it (intended)

```bash
# 1. infra
docker compose up -d            # postgres(+pgvector), redis

# 2. database
pnpm prisma migrate deploy
pnpm prisma db seed             # loads user database (Tony Hammond + team) + Waygate seed

# 3. app + workers (separate processes)
pnpm dev                        # Next.js
pnpm workers                    # BullMQ workers + schedulers

# everything runs with MOCK adapters by default — no external services required.
# To go live, set provider env bindings (REGULATORY_FEED_PROVIDER=enhesa, AI_PROVIDER=anthropic,
# EMAIL_PROVIDER=resend, STORAGE_PROVIDER=s3, IDP=oidc) and supply credentials.
```

See `prisma/schema.prisma` for the full data model and `prisma/seed.ts` for the seeded user database and Waygate footprint.
