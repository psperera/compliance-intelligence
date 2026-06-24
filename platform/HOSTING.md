# Hosting at hse.next-horizon.ai (Cloudflare Tunnel)

Expose the locally-running app (and its local Ollama LLM) at **https://hse.next-horizon.ai**
through a Cloudflare Tunnel — no ports opened on your network, no public IP. Your
`next-horizon.ai` zone must already be on Cloudflare.

```
Browser ──https──> Cloudflare edge (hse.next-horizon.ai)
                      │  (encrypted tunnel)
                      ▼
                 cloudflared on your Mac ──> http://localhost:3000 (Next.js)
                                              └─> http://localhost:11434 (Ollama, stays local)
```

## 1. Run the app in production mode
```bash
cd platform
npm install
npm run build
npm run start          # serves on http://localhost:3000
```
(Production mode avoids dev cross-origin issues. The `allowedDevOrigins` entry in
`next.config.mjs` covers `npm run dev` if you prefer dev.)

## 2. Install cloudflared (no Homebrew needed)
Download the macOS package from Cloudflare:
https://github.com/cloudflare/cloudflared/releases (pick `cloudflared-darwin-arm64.tgz`),
or via the official installer. Verify: `cloudflared --version`.

## 3. Create the tunnel and route the hostname
```bash
cloudflared tunnel login                       # authorize the next-horizon.ai zone
cloudflared tunnel create hse-app              # creates tunnel + credentials json
cloudflared tunnel route dns hse-app hse.next-horizon.ai   # creates the CNAME in Cloudflare DNS
```

## 4. Tunnel config
Create `~/.cloudflared/config.yml`:
```yaml
tunnel: hse-app
credentials-file: /Users/pperera/.cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: hse.next-horizon.ai
    service: http://localhost:3000
  - service: http_status:404
```

## 5. Run it
```bash
cloudflared tunnel run hse-app
```
Visit **https://hse.next-horizon.ai**. Cloudflare terminates TLS at the edge; the tunnel is
encrypted end-to-end. The app's relative `/api/*` calls work unchanged behind the proxy.

---

## ⚠️ Add authentication before exposing it publicly
The app currently has **no real login** — the signed-in user is hard-coded to Tony Hammond
(`lib/auth/current-user.ts`). A public URL would let anyone in. Put **Cloudflare Access**
(Zero Trust) in front of the hostname to restrict it to your team:

1. Cloudflare dashboard → **Zero Trust → Access → Applications → Add a self-hosted app**.
2. Application domain: `hse.next-horizon.ai`.
3. Add a policy allowing only specific emails / your domain (e.g. `@bakerhughes.com`).

Access enforces login at the edge before any request reaches the tunnel. Later, wire
`getCurrentUser()` to read the Cloudflare Access JWT (`Cf-Access-Jwt-Assertion` header) so the
app knows who's signed in.

## Persistence note
For a hosted instance, run the Postgres backend so data survives restarts:
`docker compose up -d` → `npm run db:setup` → set `DATA_BACKEND=prisma` in `.env`.
