# Compliance Intelligence

**Global regulatory intelligence. Local accountability. Clear action.**

A regulatory-change platform for global HS&E / EHS, legal and compliance teams — built around
the Waygate Technologies footprint (18 sites, 10 countries). It tracks the regulations that
apply to each site, detects what changed between versions of a regulation, drafts an
AI-assisted impact analysis (expert-reviewed, never auto-approved), assigns owners and
actions, and notifies accountable leaders before risks become incidents.

> Every regulatory change is **traceable**. Every impact has an **owner**. Every compliance decision is **auditable**.

![CI](https://github.com/psperera/compliance-intelligence/actions/workflows/ci.yml/badge.svg)

---

## What's in the repo

```
compliance-intelligence.html     Interactive UI prototype (open in a browser — no install)
platform/                        The application
  app/                           Next.js 15 (App Router) pages + API routes
  components/                    UI + FOM assistant + diff viewer
  lib/diff/                      Deterministic clause-level diff engine
  lib/services/                  change-detection · notification · escalation · digest
  lib/integrations/              swappable adapters (regulatory-feed · ai · email) + mocks
  lib/ai/llm.ts                  Multi-provider LLM layer (Ollama default)
  lib/auth/rbac.ts               Roles, permissions, scope filtering
  workers/                       BullMQ workers + schedulers
  prisma/                        schema + seed (user database) + init.sql
  tests/                         vitest (42) + playwright (6)
  scripts/demo.ts                end-to-end pipeline demo (no infra)
```

---

## Quick start

```bash
cd platform
npm install

npm run dev      # Next.js app → http://localhost:3000
npm run demo     # whole pipeline on mock adapters (no DB/Redis)
npm test         # 42 unit tests
```

Open `compliance-intelligence.html` directly for the standalone prototype.
Full data layer (Postgres + Redis) and the worker process are documented in
[`platform/README.md`](platform/README.md).

---

## Loading your HSE / H&S policies

The platform compares **two versions of the same regulation or internal policy** and derives
the change automatically. You load policies as clause-numbered text (or structured XML in
production). Everything is keyed off a stable external reference (e.g. `DE-TA-LUFT`).

### 1. The shape of a policy

A regulation has metadata + one or more **versions**; each version is clause-numbered text:

```ts
// FeedRegulation (metadata)
{ externalRef: "DE-TA-LUFT", title: "TA Luft — Air Quality Control",
  jurisdiction: "Germany (EU)", topic: "Air Emissions", agency: "BMUV",
  status: "IN_FORCE", riskRating: "HIGH", applicableSites: ["ahrensburg","wunstorf"] }

// FeedVersionDoc (the text the diff engine parses — note the clause numbers)
{ regulationRef: "DE-TA-LUFT", versionLabel: "v2026.1", effectiveAt: "2026-08-15",
  rawText: [
    "§5.2.1 Total dust emissions shall not exceed 5 mg/m³ as a daily mean value.",
    "§5.2.3 Installations shall be fitted with high-efficiency particulate abatement (≥99%).",
    "§6.1.1 Records shall be retained for a minimum of 10 years.",
  ].join("\n") }
```

Clause markers the parser recognises: `§5.2.1`, `Art. 12(3)`, `Section 4`, `1.2.3`, `(a)`, `Reg 7`.

### 2. Where to load them

- **Now (no backend):** add entries to
  [`platform/lib/integrations/regulatory-feed/mock.ts`](platform/lib/integrations/regulatory-feed/mock.ts)
  (`REGULATIONS`, `VERSIONS`, `CHANGES`). The UI, diff engine, and FOM pick them up immediately.
- **Production:** implement the `RegulatoryFeedProvider` interface
  ([`provider.ts`](platform/lib/integrations/regulatory-feed/provider.ts)) against a live feed
  (Enhesa, LexisNexis, an agency XML drop, or an internal policy repo) and bind it via
  `REGULATORY_FEED_PROVIDER`. Nothing else changes.

### 3. What happens on load

```
parse (clauses) → diff (added/removed/amended/moved + token spans)
   → deterministic signals (thresholds, %, dates, frequency, retention)
   → severity + categories + compliance impact      ← reproducible, authoritative
   → AI draft impact summary (DRAFT · requires expert review)   ← never auto-approved
   → match watchlists → email accountable owners → escalate if unowned/overdue → audit
```

### 4. See it on real data

```bash
npm run demo
```
loads the bundled **TA Luft** example (`v2021.2 → v2026.1`) and prints the clause diff
(`§5.2.1/§5.2.2/§5.2.4/§6.1.1` amended, `§5.2.3` added, `§5.3.0` removed), the tightened
thresholds (10→5 mg/m³, 0.20→0.10 kg/h), severity **CRITICAL**, the alert emails, the
escalations and the weekly digest.

In the running app, the same output renders at **Change Control → CHG-2038**, or via the API:

```bash
curl http://localhost:3000/api/changes/CHG-2038/comparison | jq '.comparison.stats, .severity'
# → {"added":1,"deleted":1,"amended":4,"moved":0,"unchanged":0}  "CRITICAL"
```

---

## Examples — data & searches

**Baseline** (`/baseline`) lists every applicable regulation with jurisdiction, topic, agency,
status, owner, risk and per-site applicability; click through to the clause-level record.
Filterable in the prototype by saved views (*My assigned*, *High-risk*, *Changes this month*,
*UK operational sites*, *Global environmental*).

**Site workspace** (`/sites/changzhou`) shows the site's compliance matrix — every requirement,
its regulation, control status, evidence and risk.

**FOM assistant** answers grounded questions with citations — try:
- "What changed in TA Luft and which sites are affected?"
- "Which radiation safety regulations apply to Changzhou?"
- "What's overdue and who owns it?"

**API**
```bash
curl http://localhost:3000/api/changes/CHG-2038/comparison      # real diff engine output
curl -X POST http://localhost:3000/api/changes/CHG-2038/approve # RBAC-gated (403 without approve_assessment)
curl -X POST http://localhost:3000/api/assistant -H 'Content-Type: application/json' \
     -d '{"question":"Which sites are affected by the TA Luft change?"}'
```

---

## FOM — AI compliance assistant

**FOM** (Field Operations Mentor) is the in-app helper that guides users through the regulatory
record. It answers **only** from the loaded data and **cites the regulation / change IDs** it used.

### Local-first by default (Ollama)

FOM defaults to a **local LLM via [Ollama](https://ollama.com)** so regulatory content never
leaves your machine:

```bash
ollama serve
ollama pull llama3.1     # default model
```
Set `OLLAMA_URL` (default `http://localhost:11434`) if it runs elsewhere. If no LLM is
reachable, FOM degrades gracefully to a deterministic, record-based answer — it never goes dark.

### Switching providers (admin menu)

Administrators choose the provider in **Administration → FOM AI assistant provider**:

| Provider | Notes | Env |
|---|---|---|
| **Ollama (local LLM)** | private, on-prem, recommended default | `OLLAMA_URL`, `FOM_MODEL` |
| **OpenAI API** | `gpt-4o-mini` default | `OPENAI_API_KEY` |
| **Claude API (Anthropic)** | `claude-haiku-4-5` default | `ANTHROPIC_API_KEY` |
| **OpenRouter** | routes to many models | `OPENROUTER_API_KEY` |

The selection is enforced server-side and only changeable by users with the admin permission.
Set a default without the UI via `FOM_PROVIDER` / `FOM_MODEL` in `.env`.

---

## Roles & access

Ten roles with a permission matrix (see Administration, or
[`lib/auth/rbac.ts`](platform/lib/auth/rbac.ts)). Non-global users are automatically scoped to
their site/region on every query. The signed-in user in this build is **Tony Hammond, Group
HS&E Director** (full access) — see [`lib/auth/current-user.ts`](platform/lib/auth/current-user.ts);
swap it for your SSO session in production.

## Tests & CI

`npm test` (42 unit: diff, RBAC, notification/escalation/digest) and `npm run test:e2e`
(6 Playwright smoke tests) run on every push via GitHub Actions.

## Status

The backend services, diff engine, RBAC, workers, data model and the Next.js UI are real and
tested. External providers (regulatory feed, AI, email, storage, SSO) ship as **mock adapters**
so everything runs with no third party connected — look for `// PRODUCTION INTEGRATION:` markers.
