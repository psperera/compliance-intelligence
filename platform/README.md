# Compliance Intelligence — running locally

Global regulatory intelligence platform for Waygate Technologies.
**Every regulatory change is traceable. Every impact has an owner. Every compliance decision is auditable.**

There are four things you can run locally, in increasing order of setup:

| What | Needs | Command |
|---|---|---|
| 1. Prototype UI | a browser | open `../compliance-intelligence.html` |
| 2. Test suites | Node | `npm install` → `npm test` (+ `npm run test:e2e`) |
| 3. Pipeline demo | Node | `npm run demo` |
| 4. Full data layer | Docker | `docker compose up -d` → `npm run db:setup` |

---

## 0. Prerequisites
- Node 20+
- Docker (only for the database/Redis path)

```bash
cd platform
npm install
```

## 1. Prototype UI (no install)
The clickable prototype is a single self-contained file in the project root:
```
open "../compliance-intelligence.html"
```

## 2. Tests
```bash
npm test                 # 42 unit tests (diff, RBAC, notification/escalation/digest)
npm run test:e2e:install # one-time Chromium download
npm run test:e2e         # 6 Playwright smoke tests against the prototype
```

## 3. Pipeline demo (no infrastructure)
Runs the whole flow on mock adapters — ingest → diff → severity → AI draft →
watchlist matching → email dispatch → escalation → weekly digest:
```bash
npm run demo
```
You'll see the TA Luft change classified CRITICAL, two alert emails dispatched
(to the DACH regional managers and to Tony Hammond's high-risk watchlist),
an overdue-action escalation, and a weekly digest summary.

## 4. Full data layer (Postgres + Redis)
```bash
cp .env.example .env
docker compose up -d            # postgres(pgvector) + redis
npm run db:setup                # prisma generate + migrate + seed
```
`db:setup` loads the **user database** (Tony Hammond, Group HS&E Director + 16
teammates), the 10 roles + permission matrix, and all 18 Waygate sites.

Then run the background workers (ingest, notification, escalation timers, digests):
```bash
npm run workers
```

### Inspect the seeded data
```bash
docker exec -it ci-postgres psql -U ci -d compliance -c \
  'select name, title from "User" order by name;'
```

---

## Providers
Everything defaults to **mock** (`.env`), so nothing external is required. Switch a
provider (e.g. `AI_PROVIDER=anthropic`, `EMAIL_PROVIDER=resend`) and supply its
key to go live — see the `// PRODUCTION INTEGRATION:` markers in `lib/integrations/`.

## Layout
```
lib/diff/          deterministic clause diff engine
lib/auth/rbac.ts   roles, permissions, scope filtering
lib/services/      change-detection, notification, escalation, digest
lib/integrations/  swappable adapters (regulatory-feed, ai, email) + mocks
workers/           BullMQ workers + schedulers
prisma/            schema + seed (user database) + init.sql
tests/             vitest unit + playwright e2e
scripts/demo.ts    end-to-end pipeline demo
```
> Note: the Next.js `app/` pages are now scaffolded and wired to the services — run
> `npm run dev` for the live app (dashboard, baseline, change control with the real diff
> engine, sites, actions, admin, and the FOM assistant). The single-file
> `../compliance-intelligence.html` remains as a zero-install preview.

## The live app (Next.js)
```bash
npm run dev      # http://localhost:3000
```
Pages: Executive Overview, Regulatory Baseline (+ detail), **Change Control** (renders the
real diff-engine output + AI draft, RBAC-gated approve), Regulatory Forecaster, Sites
(+ workspace/matrix), Actions, Administration (FOM provider menu + role matrix). The **FOM**
assistant (bottom-right) uses a local LLM via Ollama by default — see the root `README.md`.
```
