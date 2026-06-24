# Hosting at hse.next-horizon.ai (Cloudflare Tunnel)

> ⚠️ **Temporary host.** `https://hse.next-horizon.ai` is an interim address served from a
> local machine via a Cloudflare Tunnel. It is for review/demo only and will be replaced when
> the app is rehosted on permanent infrastructure (managed Next.js host or container platform
> with a Postgres backend). When that happens, point the production hostname at the new origin
> and retire the tunnel — nothing in the app code is tied to this hostname.

Expose the locally-running app (and its local Ollama LLM) at **https://hse.next-horizon.ai**
through a Cloudflare Tunnel — no ports opened on your network, no public IP. The
`next-horizon.ai` zone is on Cloudflare.

```
Browser ──https──> Cloudflare edge (hse.next-horizon.ai) ──> Access (login gate)
                      │  (encrypted tunnel)
                      ▼
                 cloudflared on the Mac ──> http://127.0.0.1:3100 (Next.js)
                                             └─> http://localhost:11434 (Ollama, stays local)
```

You need **two terminals open at once** — one for the app, one for the tunnel. If either
closes, the site goes down (502 if the app stops, 1033 if the tunnel stops).

## 1. Run the app in production mode (terminal 1)
```bash
cd platform
npm install            # ensure deps incl. jose are installed
npm run build          # creates .next/ — start will fail without this
PORT=3100 npm run start
```
Leave it running. `curl -I http://127.0.0.1:3100` should return `HTTP/1.1 200`.
(Production mode avoids dev cross-origin issues; `allowedDevOrigins` in `next.config.mjs`
covers `npm run dev` if you prefer dev.)

## 2. Install cloudflared (no Homebrew needed)
Download the macOS build from https://github.com/cloudflare/cloudflared/releases
(`cloudflared-darwin-arm64.tgz`). Verify: `cloudflared --version`.

## 3. One-time: authorize the zone and route the hostname
```bash
cloudflared tunnel login                                   # authorize the next-horizon.ai zone
cloudflared tunnel create hse-nh2                           # creates tunnel + credentials json
cloudflared tunnel route dns hse-nh2 hse.next-horizon.ai    # CNAME hse.next-horizon.ai -> tunnel
```
The current tunnel is **`hse-nh2`** (UUID `eb3c4f02-56f1-4bcc-9e3a-8d42bfa4b644`). If the
CNAME already exists pointing elsewhere, re-bind with `--overwrite-dns`.

## 4. Run the tunnel (terminal 2)
```bash
cloudflared tunnel run --url http://127.0.0.1:3100 hse-nh2
```
Wait for `Registered tunnel connection`. Then open **https://hse.next-horizon.ai**.

> For a long-lived setup (survives terminal close / reboot), install it as a service instead:
> `sudo cloudflared service install` → `sudo launchctl start com.cloudflare.cloudflared`.

### Common tunnel errors
- **Error 1033** — the tunnel isn't running. Start `cloudflared` (terminal 2).
- **502 / `connection refused on 127.0.0.1:3100`** — the tunnel is up but the app isn't.
  Start the app (terminal 1) and confirm `curl -I http://127.0.0.1:3100` = 200.

---

## Authentication — Cloudflare Access (bakerhughes.com + hexagon.com)
The app trusts the identity Cloudflare Access forwards, so Access sits in front of the hostname.

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add → Self-hosted**.
2. Application domain: **`hse.next-horizon.ai`**.
3. Add a policy → Action **Allow** → Include rule **Emails ending in** → add **both**
   `@bakerhughes.com` and `@hexagon.com`. (If the Include rule lists specific emails instead
   of the domain, anyone not on the list gets `__cf_access_message=unauthorized` after login.)

Access authenticates at the edge (only those domains get through), forwards the verified email
in `Cf-Access-Authenticated-User-Email`, and a signed assertion in `Cf-Access-Jwt-Assertion`.

`lib/auth/current-user.ts` maps the email to the user database (using that person's role and
scope), grants **least-privilege read-only** access to authenticated users from the allowed
domains who aren't in the database yet, and the sidebar shows the real signed-in user. The
allowed domains are also enforced in-app (`ALLOWED_EMAIL_DOMAINS`) as defence-in-depth.

### Application-specific token verification (enabled)
The app verifies the Access JWT and requires **this application's** audience, so it only trusts
tokens minted for the Compliance Intelligence app (not any other Access app, and not a spoofed
email header). The two env vars are set in `platform/.env`:

```
CF_ACCESS_TEAM_DOMAIN=https://hyflux.cloudflareaccess.com
CF_ACCESS_AUD=c49022f7c94f0882d37ea8457797e6764038846435de12e97c5f4d28506f8805
```

- `CF_ACCESS_TEAM_DOMAIN` = your Zero Trust team domain.
- `CF_ACCESS_AUD` = the **Application Audience (AUD) Tag** from Access application → **Overview**.

With both set, `current-user.ts` verifies `Cf-Access-Jwt-Assertion` against
`https://hyflux.cloudflareaccess.com/cdn-cgi/access/certs`, enforces `iss` = your team and
`aud` = this app's tag, and reads the email from the **verified** claims. Requests without a
valid token for this specific app are denied in-app. **Rebuild/restart after changing these.**
When the app is rehosted, replace the AUD with the new Access application's tag.

### Diagnostics — `/api/whoami`
Visit **https://hse.next-horizon.ai/api/whoami** to see exactly what the origin received:
`accessHeaderEmail`, `accessJwtPresent`, `jwtVerificationConfigured`, and the `resolvedUser`.
If `resolvedUser` is wrong, this tells you whether Access forwarded an identity or the app fell
back to the dev default. **Tip:** Access caches your session — test different users in a private
window or hit `/cdn-cgi/access/logout` first.

For **local dev** (no Access in front), set `DEV_USER_EMAIL` in `.env` to act as a given user;
it defaults to `tony.hammond@bakerhughes.com`.

## Persistence note
This temporary host runs the in-memory backend by default, so data resets on restart. For a
durable instance (recommended once rehosted), run Postgres: `docker compose up -d` →
`npm run db:setup` → set `DATA_BACKEND=prisma` in `.env`.
