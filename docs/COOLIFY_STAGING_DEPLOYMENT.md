# Voice of Gudalur — Coolify Staging Deployment Guide (Phase 2)

Target: Hetzner VPS (CAX21, 4 vCPU / 8 GB RAM, Ubuntu 24.04) → Coolify → Docker
image `voice-of-gudalur` → CockroachDB Cloud (existing) → Storj S3 (existing).

Intended hostname: **`test.voiceofgudalur.space`**.

Scope: **staging only**. This document does not change production DNS, does not
retire Netlify, and does not touch auth/session tables. The Netlify deployment
remains the rollback target until staging is verified (48 h soak).

Companion files: `.env.staging.example` (variable contract) and
`docs/PHASE_2_COOLIFY_STAGING_REPORT.md` (what was implemented + open risks).

> **Read §12 before deploying.** There is currently **no isolated staging
> database** and **no isolated staging Storj bucket**. Until both exist this
> container shares production data, and the write guards in §15 are the only
> thing preventing staging traffic from polluting the live public record.

---

## 1. VPS prerequisites

| Item | Requirement |
|---|---|
| OS | Ubuntu 24.04 LTS |
| Instance | Hetzner CAX21 (4 vCPU / 8 GB) |
| Ports in | 22 (SSH, key-only), 80 (ACME), 443 (TLS) — Coolify/Traefik proxies everything else |
| Ports out | 26257 (CockroachDB Cloud), 443 (Storj gateway, Google, Telegram, Open-Meteo) |
| Install | Coolify (installs Docker + Traefik proxy): `curl -fsSL https://cdn.coollabs.io/coolify/install.sh \| bash` |
| Firewall | ufw allow 22,80,443; everything else default-deny in |
| Backups | Hetzner snapshot schedule + confirm CockroachDB Cloud backups enabled |

Do NOT install a database on the VPS — CockroachDB stays on CockroachDB Cloud.
Do NOT install Ollama on the same box (8 GB RAM); set `AI_VOG_ENABLED=false`.

## 2. Docker deployment method (Coolify)

1. Coolify → **New Resource → Docker Compose** (or Dockerfile build), source:
   this Git repository, branch `main` (or a `staging` branch).
2. Coolify builds the image from the repo root **Dockerfile**
   (multi-stage: Vite build → production-deps runtime; non-root `node` user).
   The runtime stage runs `npm ci --omit=dev`, so dev-only tooling
   (including `serverless-http`, used solely by the Netlify function) is not
   present in the image.
3. Port: container listens on **3000** (`PORT` env). Coolify/Traefik proxies the
   domain → `http://app:3000`.
4. Health check (Coolify "Healthcheck URL"): **`/api/health`** — process-level,
   no DB dependency. The image also ships a Docker `HEALTHCHECK` for it.
5. Pre-deploy migration command (Coolify → Resource → Pre-deploy):
   `node --import tsx server/db/migrate.ts up`
   (idempotent; tracked in `schema_migrations`; runs only on deploys).
6. Graceful shutdown: Coolify sends SIGTERM with the default stop timeout —
   set **Stop timeout ≥ 30 s**; the app drains in-flight requests for
   `SHUTDOWN_TIMEOUT_SECONDS` (default 20 s) before exiting.
7. Build-time variable: `VITE_APP_ENV=staging` must be present for the
   `vite build` step, otherwise the staging banner is not baked into the bundle.

## 3. Required environment variables (Coolify → Environment)

The authoritative, annotated list lives in **`.env.staging.example`**. Summary:

| Variable | Value (staging) | Notes |
|---|---|---|
| `APP_ENV` | `staging` | **activates the write guards (§15)** |
| `VITE_APP_ENV` | `staging` | build-time; renders the visible staging banner |
| `NODE_ENV` | `production` | set by Dockerfile; keeps cookies `Secure`, serves `dist/` |
| `PORT` | `3000` | set by Dockerfile |
| `APP_URL` | `https://test.voiceofgudalur.space` | drives the CSP self-origin |
| `SITE_URL` | `https://test.voiceofgudalur.space` | OAuth redirect base |
| `TRUST_PROXY_HOPS` | `1` | Cloudflare → Traefik → container is one hop; **must be 1** |
| `SHUTDOWN_TIMEOUT_SECONDS` | `20` | drain window; keep below the Coolify stop timeout |
| `DATABASE_URL` | staging connection string | see §11 / §12 |
| `DATABASE_POOL_MAX` | `10` | below production's 20 so staging cannot starve live traffic |
| `DATABASE_SSL` / `DATABASE_SSL_CA` | `verify-full` + CA path | mount the CA as a Coolify file-volume secret (§4) |
| `SESSION_SECRET` | long random string | **required** — the server refuses to boot without it |
| `PETITION_IDENTITY_SECRET` | long random string | required for public name+mobile signing |
| `PRESIGNED_UPLOADS` | `false` | **must stay false on staging** (§14) |
| `STORJ_*` | staging values when they exist | see §14 |
| `GOOGLE_*` / `TELEGRAM_*` | leave unset | rungs degrade honestly; avoids linking real accounts |
| `TURNSTILE_SECRET_KEY` | staging widget secret | use a separate widget from production |
| `EMERGENCY_MODE` | `0` | load-shedding off unless needed |
| `AI_VOG_ENABLED` | `false` | no petition path depends on AI |
| `STAGING_ALLOW_WRITES` | `false` | **do not set true** unless §12 is satisfied |
| `STAGING_ALLOW_SNAPSHOTS` | `false` | see §16 |

## 4. Environment files & secret handling

- `.dockerignore` excludes `.env*`, so **no secret is ever baked into the
  image**; everything is injected by Coolify at deploy time.
- `.env.staging.example` is committed on purpose (allow-listed in `.gitignore`)
  and contains **placeholders only**. It is a review artefact, not a value store.
- The CockroachDB CA (`DATABASE_SSL_CA`) is a file, not a string: mount it as a
  Coolify **file-volume secret** at `/etc/vog/cockroach-ca.crt`. Never commit
  the `.crt`.
- Use **different** `SESSION_SECRET` / `PETITION_IDENTITY_SECRET` /
  `IDENTITY_HMAC_SECRET` values from production, so a staging session or token
  can never be replayed against the live site.
- Rotating a secret requires a redeploy (values are read at process start).

## 5. First-deploy runbook

1. Provision the VPS and install Coolify (§1). Confirm the firewall.
2. Add the repository in Coolify; choose **Docker Compose** deployment.
3. Load every variable from `.env.staging.example` into
   Coolify → Environment, with `APP_ENV=staging` and `VITE_APP_ENV=staging`.
4. Mount the CockroachDB CA as a file-volume secret (§4).
5. Set the Healthcheck URL to `/api/health` and the stop timeout to ≥ 30 s.
6. Add the pre-deploy migration command (§2 step 5).
7. **Do not attach the public domain yet.** Deploy first, then reach the app
   through Coolify's internal/temporary URL.
8. Confirm the boot log contains the staging banner (§17). If it does not,
   `APP_ENV` did not reach the container — fix that before continuing.
9. Confirm `GET /api/health` returns `environment.env = "staging"` (§6).
10. Once safe, attach `test.voiceofgudalur.space` (§7) and issue TLS (§8).

## 6. Health, readiness & monitoring endpoints

| Endpoint | Purpose | DB dependency |
|---|---|---|
| `GET /api/health` | liveness / container healthcheck | none |
| `GET /api/ready` | readiness for the proxy | DB ping + storage check |

`/api/health` returns `{status, uptime, timestamp, emergency, environment}`.
The `environment` object is added by Phase 2 and is **non-secret** — it carries
only the resolved environment name:

```json
{ "env": "staging", "staging": true, "writes_allowed": false }
```

Every response also carries an `X-Environment` header, so an operator can
identify which environment answered with a single `curl -I` and Cloudflare
logs are self-describing. Use it as the primary staging-vs-production
assertion during verification.

## 7. Domain configuration (Cloudflare)

- DNS: `test.voiceofgudalur.space` → VPS IPv4 (A record), **proxied
  (orange cloud)**. This is a NEW record; the production apex/`www` records are
  untouched by this work.
- Coolify domain: `https://test.voiceofgudalur.space` → `app:3000`.
- Cloudflare must forward the client IP (default behaviour) — combined with
  `TRUST_PROXY_HOPS=1`, Express rate limiters bucket real visitors, not the
  proxy.
- Keep the Cloudflare DNS TTL low (Auto/300 s) until staging is verified, so a
  rollback propagates quickly.
- **Do not** create or modify the production hostname's records as part of
  staging verification.

## 8. SSL/TLS configuration

- Cloudflare SSL/TLS mode must be **Full (strict)**. Traefik issues a
  Let's Encrypt certificate for the staging hostname; Full (strict) validates
  it. `Flexible` would cause a redirect loop and downgrade the connection.
- Cloudflare **Always Use HTTPS** = on; **Automatic HTTPS Rewrites** = on.
- Recommended: **HSTS** with a short `max-age` while testing (e.g. 86400),
  raised only after the 48 h soak — HSTS is difficult to unwind.
- Minimum TLS version 1.2. Enable TLS 1.3.
- Do not enable Cloudflare's "Origin Certificates" / mTLS for the origin unless
  Traefik is reconfigured to present the client cert; the default LE certificate
  is what Full (strict) expects.

## 9. Cloudflare cache rules

- **Bypass cache on `/api/*`** — API responses carry their own short TTLs and
  include authenticated data. The edge must never cache them.
- Cache `/assets/*` aggressively (content-hashed by Vite; safe to
  `Cache Everything` with a long TTL).
- Cache `/data/*.json` with a short TTL. These are the public snapshot files the
  dashboard polls; they are refreshed by the in-container job (§16).
- Do **not** cache `/sw.js`, `/manifest.webmanifest` or the HTML shell for long:
  a stale service worker pins clients to an old bundle.
- Confirm after deploy: staging responses include `Cache-Control` from Express,
  and Cloudflare's `cf-cache-status` is `BYPASS` for `/api/*`.

## 10. Cloudflare rate limiting & WAF

- The application already rate-limits in-process (per-IP buckets). Cloudflare
  rate limiting is a **defence in depth** layer, not a replacement —
  `TRUST_PROXY_HOPS=1` is what makes the in-process limiters see real IPs.
- Recommended edge rule: rate-limit `/api/*` per IP (e.g. 300 requests / 5 min,
  action: Block with a 60 s timeout). Keep it well above legitimate polling so
  the staging soak does not produce false 429s.
- Enable the managed WAF ruleset. Leave **Bot Fight Mode off** on staging: it
  interferes with the PWA/service-worker fetch patterns during testing.
- Turnstile: staging must use its **own widget** (separate site/secret pair) so
  test traffic never consumes production challenge quotas.
- 429s in staging logs usually mean either an edge rule that is too tight or a
  wrong `TRUST_PROXY_HOPS` — check both before changing application code.

## 11. Database connection requirements

- Connection string with SSL: `DATABASE_SSL=verify-full` + `DATABASE_SSL_CA`
  pointing at the CockroachDB CA inside the container
  (`/etc/vog/cockroach-ca.crt`, mounted as a file-volume secret).
- CockroachDB Cloud must be reachable on **26257** from the VPS egress IP. If
  the cluster is IP-allowlisted, add the VPS IP — and note that a Coolify
  rebuild on a new VPS requires the allowlist to be updated again.
- `DATABASE_POOL_MAX=10` on staging (production uses 20). A staging container
  must never be able to exhaust the cluster's connection budget and starve live
  traffic.
- Migrations run **only** via the pre-deploy command (§2). Never run
  `prisma db push` / `prisma migrate dev` against this database.
- Startup does not fail if the DB is unreachable — `/api/health` stays green and
  `/api/ready` reports the failure. This is deliberate (liveness ≠ readiness).

## 12. Database safety on staging — **READ THIS BEFORE DEPLOYING**

**BLOCKER: there is currently no isolated staging database.** The deployed
staging container therefore connects to the *same* CockroachDB cluster that
production uses, unless a dedicated staging database/cluster is provisioned
first.

That is exactly why Phase 2 added the write guards in §15: reads, snapshots,
login and browsing are fully testable, but routes that would append to the
public record are refused with **403 `STAGING_WRITE_BLOCKED`**.

Recommended path (removes the blocker):

1. Create a **separate CockroachDB database or cluster** for staging
   (a second database inside the existing cluster, with its own
   `DATABASE_URL`, is sufficient and cheapest).
2. Run `npm run db:migrate` against it via the pre-deploy command.
3. Optionally seed a snapshot of non-personal reference data.
4. Point `DATABASE_URL` at it.
5. Only then consider `STAGING_ALLOW_WRITES=true`.

Safety rules while the blocker stands:

- **Never** set `STAGING_ALLOW_WRITES=true`. It disables the guards and would
  let staging write to the live public record.
- Verify the target before every deploy:
  `psql "$DATABASE_URL" -c "select current_database(), inet_server_addr()"` —
  confirm you are on the staging database, not production.
- Run a read-only connectivity probe after deploy:
  `GET /api/ready` must report healthy, and `SELECT count(*)` style checks are
  fine; **no** INSERT/UPDATE/DELETE by hand.
- If production data must be inspected, use read-only credentials or a replica —
  never mutate through the staging container.
- Residual risk while shared: `POST /api/auth/register`, `POST /api/auth/google`
  and Telegram verification write rows into the **shared** user/identity tables.
  They are intentionally not blocked (blocking them would make the primary
  onboarding path untestable on staging), so **do not run bulk registration or
  load tests against staging until an isolated database exists**. Progress
  tracking for this is in the Phase 2 report's risk register.

## 13. Backup & restore procedure

- **Database:** CockroachDB Cloud managed backups. Verify the schedule and the
  retention window exist *before* relying on them, and record where the console
  is. For a shared cluster, staging has no separate restore point — another
  reason to isolate the database (§12).
- **VPS:** take a Hetzner snapshot before any Coolify/VPS-level change
  (proxy changes, firewall edits, upgrades).
- **Media:** Storj bucket versioning/replication per the Storj console
  (unchanged by this work).
- **Config:** the Coolify environment variable set *is* configuration. After any
  change, export it and store it in the team password manager. Losing it makes a
  rebuild a manual reconstruction.
- **Restore drill:** at least once, restore the database into a scratch database
  and point a throwaway container at it. A backup that has never been restored is
  an assumption, not a control.

## 14. Storj requirements

- Same bucket/keys as production (read + write for media) — **no isolated
  staging bucket exists yet**, so uploads tested here write into the bucket
  production serves from. Treat this as an open risk.
- `STORJ_PUBLIC_LINK_BASE` must keep the `/raw/` form (defensive normalization
  exists, but keep it clean).
- `PRESIGNED_UPLOADS` **must remain `false` on staging**. It gates
  `POST /api/media/presign` and `PUT /api/media/:id/complete`; the happy path
  has not been executed end-to-end because there is no isolated staging bucket
  to test against, and enabling it would write real objects into the shared
  production bucket.
- Recommended path: create a **separate staging bucket** with its own access
  key, then verify `PRESIGNED_UPLOADS=true` (presign → browser PUT → complete)
  there before ever considering it for production.
- CORS is **not configured by this repository** — Storj/bucket CORS for direct
  browser PUTs must be set in the Storj console when presigned uploads are
  introduced. This is tracked as an open dependency.

## 15. Staging safety boundary (write guards)

Implemented by `server/middleware/stagingGuard.ts`, mounted as the **first**
middleware in `server.ts` (before the rate limiters, CSRF and every route).

- **Trigger:** `APP_ENV=staging`. Any other value (or unset) is production
  behaviour, byte-for-byte unchanged — the guard is inert until explicitly
  enabled. `NODE_ENV` is deliberately *not* the marker, because it must stay
  `production` on staging so session cookies remain `Secure`.
- **Behaviour:** **state-changing methods** (POST/PUT/PATCH/DELETE) on any
  `/api` path are refused with **`403 STAGING_WRITE_BLOCKED`** and a `blocked`
  field. 403 (not 404) is intentional: staging must identify itself rather than
  pretend the route does not exist.
- **Fail closed (default deny).** The guard does *not* trust a hand-maintained
  list of bad routes. A request is allowed only if it is (a) a GET/HEAD read,
  (b) outside `/api`, or (c) on the explicit sign-in/session allow list.
  Everything else is refused. A mutating route added to the server tomorrow is
  therefore **blocked on staging until someone deliberately classifies it** —
  the `blocked` field reports `unclassified-mutating-route` and the log line
  names the path. This is what caught `/api/offline/*` and `/api/petition/sign`,
  both of which the original prefix list missed (§15.1).
- **Blocked prefixes (shared production state):** `/api/alerts`,
  `/api/voice/incident`, `/api/petitions`, `/api/petition`, `/api/manifesto`,
  `/api/wildlife`, `/api/offline`, `/api/civic`, `/api/validation`,
  `/api/authorization`, `/api/admin`, `/api/officials`, `/api/media`,
  `/api/push`, `/api/ai`.
- **Allowed mutating routes (sign-in / session only):** `/api/auth/*`,
  `POST /api/admin/login`, `POST /api/admin/logout`,
  `POST /api/officials/login`. Honest caveat: on a container that still shares
  the production database these *can* create or touch an account row and a
  session. They cannot pollute the public record, alert real devices, or move
  real media — which is the boundary this guard defends. Provisioning the
  isolated database in §12 is what removes even that residue.
- **Never blocked:** every GET/HEAD read, including `GET /api/push/public-key`.
  This keeps staging genuinely useful for testing.
- **Push suppression:** independent of the route guard, both
  `webPush.sendNotification()` call sites and the `push_log` insert are skipped
  when `APP_ENV=staging`, so a staging alert can never reach a real device.
- **Snapshot suppression:** `scripts/exportSnapshot.ts` refuses to run unless
  `STAGING_ALLOW_SNAPSHOTS=true`.
- **Escape hatch:** `STAGING_ALLOW_WRITES=true` disables the boundary. It is
  only legitimate once §12 is satisfied (isolated database) and should be
  enabled for a bounded verification window, then set back to `false`.
- **Boot evidence:** the container logs a staging banner on every start and
  warns loudly if the escape hatch is open (§17).

### 15.1 Regression tests

`server/middleware/stagingGuard.test.ts` (82 tests) asserts the contract from
the **outside** — a real express app on a real port, driven by real HTTP
requests — so it can fail when the guard and the route table disagree:

- every state-changing route the server registers today is listed with the
  prefix expected to block it, and must return `403 STAGING_WRITE_BLOCKED`;
- the inventory is transcribed from `server.ts` and the router mounts, **not**
  from the guard's own arrays, so it cannot rubber-stamp a mistake;
- unclassified routes, look-alikes (`/api/authx`, `/api/petitionsXYZ`) and
  non-`/api` paths are covered explicitly;
- `APP_ENV` unset must leave production byte-for-byte unchanged — the whole
  guarded inventory is replayed and must succeed;
- `STAGING_ALLOW_WRITES=true` must re-open everything.

Run it with `npx vitest run server/middleware/stagingGuard.test.ts`.

> **When you add a mutating route:** if it writes to shared production state,
> add its prefix to `STAGING_BLOCKED_PREFIXES`; if it is safe on staging, add it
> to `STAGING_ALLOWED_MUTATING_PREFIXES`. Forgetting is safe by construction
> (the route is blocked on staging and noisy in the logs), but the test will
> fail either way, which is the point.

- **Push suppression:** independent of the route guard, both
  `webPush.sendNotification()` call sites and the `push_log` insert are skipped
  when `APP_ENV=staging`, so a staging alert can never reach a real device.
- **Snapshot suppression:** `scripts/exportSnapshot.ts` refuses to run unless
  `STAGING_ALLOW_SNAPSHOTS=true`.
- **Escape hatch:** `STAGING_ALLOW_WRITES=true` disables the boundary. It is
  only legitimate once §12 is satisfied (isolated database) and should be
  enabled for a bounded verification window, then set back to `false`.
- **Boot evidence:** the container logs a staging banner on every start and
  warns loudly if the escape hatch is open (§17).

## 16. Scheduled jobs (snapshot refresh)

On Netlify, `netlify/functions/refresh-snapshots.ts` POSTed a Build Hook every
15 min, re-running `npm run build` to regenerate `dist/data/*.json`. In a
persistent container the filesystem is writable, so the equivalent — using the
same exporter the build already runs — is a **scheduled job inside the
container** (safest option: no host access, no credentials outside the
container, identical output):

```bash
node --import tsx scripts/exportSnapshot.ts
```

Every 15 minutes. It writes `dist/data/{stats,ledger,media}.json`, served
statically by the same container. Alternative (VPS crontab):

```cron
*/15 * * * * docker exec voice-of-gudalur node --import tsx scripts/exportSnapshot.ts >> /var/log/vog-snapshots.log 2>&1
```

**Staging caveat:** snapshot export is suppressed when `APP_ENV=staging` unless
`STAGING_ALLOW_SNAPSHOTS=true`. Only enable it if this container owns its own
`dist/` and no shared snapshot store serves the staging site; otherwise the job
would overwrite files that the live site serves.

## 17. Log inspection & monitoring

- Coolify → Resource → **Logs** (stdout/stderr, request-ID-tagged lines).
- **Staging banner (expected on every boot when `APP_ENV=staging`):**

  ```text
  VOICE OF GUDALUR Server running on http://0.0.0.0:3000 (pid …, dist=…)
  [staging] APP_ENV=staging — staging safety boundary is ACTIVE.
  [staging] every state-changing /api route returns 403 STAGING_WRITE_BLOCKED — including alerts, incidents, petition/civic/manifesto/wildlife writes, media and push subscriptions.
  [staging] fail closed: routes that have not been classified are refused too; only sign-in/session under /api/auth, /api/admin/login, /api/admin/logout and /api/officials/login are allowed.
  [staging] X-Environment header = staging.
  ```

  If `STAGING_ALLOW_WRITES=true`, an explicit `⚠` warning line is printed
  instead/as well. **If the banner is absent, `APP_ENV` did not reach the
  container — stop and fix it before trusting any other result.**
- Guarded actions log a `[staging] BLOCKED …` line naming the route and the
  matched prefix, plus `[staging] … push suppressed …` for suppressed alerts.
- Shutdown lines to expect on redeploy: `[shutdown] SIGTERM received …` →
  `[shutdown] CockroachDB pool closed.` → `[shutdown] clean exit.`
- Monitoring to wire up: Coolify health-check status (from `/api/health`),
  container restart count, and a check that `/api/ready` stays healthy. Alert on
  repeated restarts — a crash loop usually means a missing required variable
  (`SESSION_SECRET`) rather than a code fault.
- Never log secrets. The guard and the environment descriptor print only the
  resolved environment name, never a credential value.

## 18. VPS & container security hardening

- **Coolify dashboard must not be exposed on the public port.** Coolify's own
  dashboard defaults to port **8000**; leaving it open to the internet exposes
  the control plane for every container on the host. Either keep 8000 closed in
  `ufw` and reach it over an SSH tunnel
  (`ssh -L 8000:localhost:8000 user@vps`), or place it behind the proxy with
  authentication. Ports 22/80/443 only (§1).
- SSH: key-only (`PasswordAuthentication no`), no root login, ideally restricted
  to known source IPs. Add fail2ban or Coolify's built-in protections.
- Keep the base image patched: `unattended-upgrades` for Ubuntu security
  updates; rebuild the container periodically so `node:22-slim` picks up base
  image fixes.
- The container runs as the non-root `node` user (Dockerfile), with
  `node_modules` root-owned and read-only at runtime.
- No secrets in the image (`.dockerignore` excludes `.env*`). Verify by
  inspecting the built image, not by trusting the file list.
- Do not install Ollama, a database, or other heavyweight services on this host
  (8 GB RAM) — they compete with the proxy and the app.

## 19. Resource limits

- Set container memory/CPU limits in Coolify/compose so a runaway process cannot
  take down the proxy for other services on the VPS.
- Suggested starting point for CAX21 (4 vCPU / 8 GB), staging only:
  **memory 1.5 GB, CPU 2.0**. Raise only with evidence from actual usage.
- `MAX_IN_FLIGHT` (default 1000) is the in-process ceiling; when exceeded the app
  returns 503 with `Retry-After`, which is the intended load-shedding behaviour.
- `DATABASE_POOL_MAX=10` bounds DB connections (§11).
- The snapshot refresh job (§16) is CPU/IO-light but runs every 15 min — do not
  schedule it on the same minute as a deploy.
- Watch disk: Docker images and build cache grow across deploys. Prune
  periodically (`docker system prune`) and monitor free space.

## 20. Restart procedure

1. Coolify → Resource → **Restart** (or Redeploy).
2. Watch deploy logs: build → pre-deploy migration → container start → staging
   banner (§17).
3. Verify: `curl -s https://test.voiceofgudalur.space/api/health` →
   `{"status":"ok",…,"environment":{"env":"staging",…}}`.
4. Verify a guarded route is still refused (§22 step 6).
5. Planned restarts send SIGTERM and drain gracefully; a restart that logs no
   `[shutdown]` lines indicates the orchestrator killed the process too early —
   raise the stop timeout (§2 step 6).

## 21. Rollback procedure

- **App-level:** Coolify → Deployments → redeploy the previous commit SHA.
- **Config-level:** revert the changed environment variables and restart. The
  staging banner disappearing from logs is the confirmation that `APP_ENV` is no
  longer `staging`.
- **Platform-level (final rollback):** Netlify is untouched and still live.
  Revert the Cloudflare record for the staging hostname, or simply delete it —
  the production hostname was never modified by this work.
- Sessions live in CockroachDB (not in the container), so existing logins keep
  working after either rollback.
- Because the staging hostname is a *separate* DNS record, rollback carries no
  risk to production traffic; there is no cutover to unwind.

## 22. Verification checklist (staging, before any DNS change)

Run in order. Items 1–3 are **environment-safety** assertions and must pass
before any functional testing, because they prove the guards are live.

1. **Boot banner present** in the container logs on start (§17).
2. `GET /api/health` → `environment.env == "staging"` and
   `environment.writes_allowed == false` (§6).
3. `curl -I https://test.voiceofgudalur.space/api/health` → `X-Environment:
   staging` header present.
4. `GET /api/ready` → 200 (DB reachable). Then confirm the DB target is the one
   you intend (§12) — do not skip this while the database is shared.
5. Home page loads (Vite SPA served by Express), the **staging banner renders**,
   and the PWA registers.
6. **Guard proof** — a guarded route is refused, not executed:

   ```bash
   curl -s -o - -w '\n%{http_code}\n' -X POST \
     https://test.voiceofgudalur.space/api/push/subscribe \
     -H 'content-type: application/json' -d '{}'
   # expect: 403 + {"error":"STAGING_WRITE_BLOCKED",…}
   ```

   Confirm the matching `[staging] BLOCKED …` line appears in the logs.
7. **Login works** (unaffected by the guards): register/login → session
   established under `/api/auth`.
8. **Reads work**: dashboard stats, ledger, media list, manifesto — all served.
9. Media list/storage-health diagnostics respond (reads only; uploads are
   intentionally blocked, §14).
10. Redeploy → logs show the SIGTERM graceful drain; no dropped in-flight
    requests (§20).
11. Rate limiting: repeated anonymous `/api/*` hits → 429 with correct per-IP
    buckets (confirms `TRUST_PROXY_HOPS=1`).
12. Edge checks: `cf-cache-status: BYPASS` on `/api/*` (§9); Cloudflare SSL mode
    **Full (strict)** with a valid cert (§8).
13. Confirm **no** write landed anywhere shared: no new alert, no new incident,
    no new signature, no new media object, no `push_log` row (§15).
14. After the 48 h soak with all of the above green, production cutover becomes a
    separate, deliberate decision — it is **out of scope** for this phase.