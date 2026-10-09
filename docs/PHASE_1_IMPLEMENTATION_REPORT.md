# Voice of Gudalur — Phase 1 Implementation Report
## Express + Docker + Coolify Staging Preparation

**Date:** 2026-09-16
**Phase:** 1 of N (staging preparation only)
**Status:** Phase 1 complete — staging-ready artifacts produced. **Not** production-ready.

---

## 0. Constraints honored (explicit)

| Constraint | Status | Evidence |
|---|---|---|
| Better Auth **not** implemented | ✅ Not done | No `better-auth` dependency or code exists (0 matches) |
| Auth tables not modified | ✅ | No file under `server/db/migrations/` changed |
| User identity relationships not modified | ✅ | No changes to `users` / `accounts` / `sessions` schema or queries |
| Sessions not modified | ✅ | `server/middleware/auth.ts` unchanged |
| Tokens not invalidated | ✅ | No secret rotation; cookie/session code untouched |
| Netlify configuration **not** deleted | ✅ | `netlify.toml`, `netlify/functions/*`, `.netlify/` untouched |
| Production DNS not changed | ✅ | No DNS/Cloudflare/registrar interaction performed |
| Production env vars not changed | ✅ | Only `.env.example` (a template) was extended |
| Production data not modified | ✅ | Read-only startup connectivity check; no writes, no DDL |
| Coolify not installed remotely | ✅ | No remote/VPS access performed |

Netlify remains fully functional as the rollback target.

---

## 1. Task 1 — Serverless assumptions separated

### 1.1 Inventory of Netlify/serverless assumptions found

| # | Assumption | Location | Classification |
|---|---|---|---|
| 1 | `serverless-http` wraps `createApp()` | `netlify/functions/api.ts:16` | **Retain** (Netlify only) |
| 2 | `app.set('trust proxy', 2)` hard-coded for "Netlify proxy → LB" | `server.ts` (pre-change) | **Incompatible** → made env-driven |
| 3 | Binary-marker response munging for the ~6 MB Netlify cap | `netlify/functions/api.ts:50-70` | **Retain** (Netlify only) |
| 4 | Build Hook cron → `npm run build` re-run | `netlify/functions/refresh-snapshots.ts` | **Retain**; container replacement documented |
| 5 | Read-only serverless FS assumption | `netlify/functions/refresh-snapshots.ts` | **Obsolete in container** (FS is writable) |
| 6 | `server.ts` exports `createApp()` for the wrapper | `server.ts:68` | **Retain** (also used by tests) |
| 7 | Local entrypoint lacked shutdown handling | `server.ts` `startServer()` | **Incompatible** → rewritten |
| 8 | No `Cache-Control` on statically served assets (Netlify CDN supplied them) | `server.ts` | **Incompatible** → mirrored in Express |
| 9 | `tsx` was a **devDependency** | `package.json` | **Docker blocker** → moved to dependencies |
| 10 | No production `start` script | `package.json` | **Added** |

### 1.2 What was changed (only what was necessary)

**`server.ts` — production entrypoint / process lifecycle**

- New env-driven proxy trust (`TRUST_PROXY_HOPS`), defaulting to the historical `2`, so **Netlify behavior is unchanged** unless explicitly overridden:

```ts
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? '');
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : 2);
```

- **Graceful shutdown** in `startServer()`: `SIGTERM`/`SIGINT` → stop accepting new connections → drain in-flight requests for `SHUTDOWN_TIMEOUT_SECONDS` (default 20 s, `unref`'d force timer) → `getPool().end()` → `process.exit(0)`. In-flight requests are never cut off before the grace window; if it expires, `server.closeAllConnections()` is the last resort.
- **Static serving hardened** with `Cache-Control` parity to `netlify.toml`: immutable for hashed `assets/`, `must-revalidate` for HTML/`webmanifest`/`sw.js`, short TTL for `data/`.
- Binds `0.0.0.0:PORT` and logs `pid` + `dist` mode for log-based verification.
- The entrypoint guard is retained so `createApp()` is still importable by the Netlify wrapper and the test suite without booting a listener.

**`package.json`**

| Script | Purpose |
|---|---|
| `build:web` | `vite build` only — used by Docker stage 1 (never needs DB access) |
| `start` | `tsx server.ts --serve-dist` — local production-style run |
| `start:prod` | `node --import tsx server.ts` — the Docker/Coolify command |

- `tsx` **moved from `devDependencies` → `dependencies`**. This repo has no compiled server build; the server runs TypeScript directly, so `tsx` is a genuine runtime dependency. Without this, `npm ci --omit=dev` produced an image that could not start.

**Nothing was deleted.** `netlify/functions/api.ts`, `netlify/functions/refresh-snapshots.ts`, `netlify.toml` and `.netlify/` are untouched, so Netlify rollback (including the Build Hook snapshot cron) still works exactly as before. `serverless-http` remains a dependency but is **not** imported by the Docker runtime path.

---

## 2. Task 2 — Frontend build

Verified as-is; **the frontend was not rewritten.**

| Item | Value |
|---|---|
| Framework | React 19.2 + Vite 6.2, SPA (no SSR/Next.js — confirmed in Phase 0 audit) |
| Build command | `npm run build:web` → `vite build`. (`npm run build` additionally runs the DB-dependent snapshot exporter and is **not** used in Docker.) |
| Output directory | `dist/` — `index.html`, hashed `assets/*`, `data/*.json` snapshots, PWA `sw.js` + `manifest.webmanifest` |
| Runtime API URL | **Same-origin relative** — the SPA calls `/api/*` on its own origin (`src/services/api.ts`). No `VITE_API_URL` is required. Consequence: **no frontend rebuild is needed when the domain changes**, and there is no CORS surface. |
| Frontend env vars | Build-time `import.meta.env.*` only: `VITE_APP_MODE` (`full`/`petition`), `VITE_AI_VOG_ENABLED`, `VITE_PUSH_PUBLIC_KEY`. Inlined at build time; all non-secret. |
| Assets served by Express? | **Yes** — `NODE_ENV=production` → `express.static(dist)` + SPA fallback `app.get('*')`. Verified in-container. |
| Assets served via Cloudflare? | **Yes, preferred.** Cloudflare should cache `/assets/*` (immutable) and `/data/*.json` (short TTL) and bypass `/api/*`. Express must still serve them for direct-container access, health checks and rollback simplicity. |

Because `VITE_*` values are inlined at build time, the image must be built with the intended `VITE_APP_MODE` / `VITE_AI_VOG_ENABLED` values, or rebuilt when they change (see "Unresolved risks").

---

## 3. Task 3 — Docker

### 3.1 Artifacts created (all new — no existing deployment file deleted)

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production image |
| `.dockerignore` | Keeps secrets, `node_modules`, `dist`, `.git`, `docs/`, `netlify/` out of the build context |
| `docker-compose.yml` | Local staging verification only — mirrors Coolify (env injected, healthcheck, `stop_grace_period: 30s`) |

### 3.2 Dockerfile design

```
stage 1 (build)   : node:22-slim + npm ci --include=dev → npm run build:web → dist/
stage 2 (runtime) : node:22-slim + npm ci --omit=dev  → dist/ + server sources → USER node
```

| Requirement | How it is met |
|---|---|
| Multi-stage build | Yes — dev deps never reach the runtime image |
| Production dependencies only | `npm ci --omit=dev` + `npm cache clean --force`. `tsx` is intentionally a prod dep (see §1.2) |
| No development server | `CMD ["node","--import","tsx","server.ts"]`; Vite middleware is only loaded when `--serve-dist` is absent **and** `NODE_ENV !== production` |
| No secrets baked in | `.dockerignore` excludes `.env*`; every credential is injected by Coolify at deploy time |
| No DB credentials in image | ✅ — `DATABASE_URL` only via env |
| No Storj keys in image | ✅ — `STORJ_*` only via env |
| No Google/Telegram secrets in image | ✅ — `GOOGLE_*` / `TELEGRAM_*` only via env |
| Non-root runtime | `USER node` — **verified in-container: `uid=1000(node)`** |
| Healthcheck | `HEALTHCHECK` using node's built-in `fetch` against `/api/health` (node:22-slim has no `curl`), `interval=30s timeout=5s start-period=20s retries=3` |
| Correct PORT handling | `ENV PORT=3000`, `EXPOSE 3000`, server reads `process.env.PORT` |
| Graceful shutdown compatible | `SIGTERM` → drain → pool close → exit 0 (verified 0.44 s) |

**Ownership optimisation (measured):** ownership is set at copy time via `COPY --chown=node:node`. A separate `RUN chown -R node:node /app` rewrote the tree and pushed it to an extra overlayfs layer, producing a **2.14 GB** image; the `--chown` form produced **1.25 GB**. `dist/` is owned by `node` because the in-container snapshot job rewrites `dist/data/*.json`.

### 3.3 Docker build result

| Run | Result |
|---|---|
| Attempt 1 (pre-optimisation Dockerfile) | ✅ built, **2.14 GB** |
| Attempt 2 | ❌ **host-side failure**, not a code/Dockerfile failure: `write /var/lib/docker/buildkit/containerd-overlayfs/metadata_v2.db: read-only file system` — the Windows **C: drive had 0 GB free**, so containerd's metadata DB became read-only and containers hit `input/output error` |
| Remediation | Freed host space (npm cache, prune), restarted the Docker/WSL engine |
| Attempt 3 (final Dockerfile + current lockfile) | ✅ **succeeded — `voice-of-gudalur:staging`, 1.25 GB** |

An intermediate failure was an out-of-sync lockfile (`Missing: @emnapi/core@1.11.3 from lock file`). This is now resolved: **`npm ci --include=dev --dry-run` → exit 0** and **`npm ci --omit=dev --dry-run` → exit 0** (both Docker stages are in sync).

---

## 4. Task 4 — Express API security hardening

Scope: audit the running Express API against the eight brief items and change
**only confirmed issues**. Every fix is either a strict tightening of an existing
route or opt-in via an environment variable, so the live Netlify deployment is
behaviourally unchanged.

| # | Brief item | Finding | Action |
|---|---|---|---|
| 1 | `/api/alerts/broadcast` reachable without auth | **Confirmed** — the route accepted *any* POST and only `console.log`ed (flagged in `PRODUCTION_MIGRATION_PREFLIGHT.md` §13.3) | **Fixed** — now `requireAuth, requireRole('ADMIN','PLATFORM_ADMIN')` (`server.ts:518`); the global double-submit CSRF guard applies to it as a state-changing route |
| 2 | CSP hard-codes the production domain | **Confirmed** — `https://voiceofgudalur.space` was a literal inside the header string, so a staging domain would need a code edit | **Fixed** — `CSP_SELF_ORIGIN` is derived from `APP_URL` with the production domain as the fallback (`server.ts:171`) |
| 3 | Multer buffers whole uploads in RAM | **Verified existing control** — media uploads use `multer.memoryStorage()` with a 4.5 MB cap and a MIME allow-list (`server/routes/media.ts:45-55`); audio uses a 10 MB cap + `audio/*`-only filter (`server.ts:558-564`) | No code change needed; the memory ceiling for *large* files is lifted by the presigned Storj path in §5 instead of by loosening the safe default |
| 4 | Upload size limits enforced | **Confirmed present** — 4.5 MB (media), 10 MB (audio), 100 KB (`express.json` default), and a new 512 MB hard ceiling on the presigned path that returns **413** | Verified, plus new 413 branch |
| 5 | Unsupported file types rejected | **Confirmed present** — `fileFilter` regex on media (`image/png|jpe?g|webp|gif|avif`, `video/mp4|webm|quicktime`) and audio-only elsewhere; new `ALLOWED_MIMES` allow-list returns **415** on the presigned path | Verified, plus new 415 branch |
| 6 | Sensitive values must not be logged | **Verified clean** — a repo-wide scan of `console.*`/`logger.*` calls for `aadhaar\|mobile\|phone\|password\|otp\|token\|secret` returns only static labels (e.g. `logger.error('reset official password:', e.message)`), never field values | No change |
| 7 | `trust proxy` correct for the new topology | **Confirmed** — was hard-coded `2` for "Netlify proxy → LB" | **Fixed** — env-driven `TRUST_PROXY_HOPS`, default `2` (see below) |
| 8 | Client IP still resolved behind a proxy | **Confirmed working** — limiters key on `req.ip` through the `ipKeyGenerator` helper, which respects Express `trust proxy` | Verified by live header probe (§7.3) |

### 4.1 The `trust proxy` fix (item 7)

```ts
// server.ts:82-83 — hops per environment, override with TRUST_PROXY_HOPS:
//   2 = Netlify proxy → load balancer            (serverless default, preserved)
//   1 = Cloudflare → Coolify Traefik → container (persistent Docker deploy)
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? '');
app.set('trust proxy', Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : 2);
```

Why this matters: `express-rate-limit` buckets by `req.ip`. With the wrong hop
count every visitor either shares one bucket (registration/OTP 429s
platform-wide) or an attacker can spoof `X-Forwarded-For` to mint fresh buckets.
Unset or invalid values fall back to `2`, the historical value, so **Netlify is
unaffected**; Docker sets `TRUST_PROXY_HOPS=1` (`docker-compose.yml:17`,
documented in `COOLIFY_STAGING_DEPLOYMENT.md` §3 (environment variables) and §5
(Cloudflare edge / per-IP rate limiting).

### 4.2 CSP origin (item 2)

```ts
const CSP_SELF_ORIGIN = (process.env.APP_URL || 'https://voiceofgudalur.space').replace(/\/+$/, '');
```

`APP_URL` already existed (it is used for canonical links and emails) and is set
to the real origin in both environments, so no new configuration was introduced.
Trailing slashes are stripped so `APP_URL=https://staging.example/` cannot
produce a malformed `script-src` entry. Note that `'unsafe-inline'` remains in
`script-src` (pre-existing, flagged in the preflight as a non-blocker); removing
it requires a Vite/React nonce or hash migration and is **out of scope for
Phase 1**.

### 4.3 Deliberately NOT changed

- **In-memory rate-limit store** — still per-process. With a single container in
  staging this is correct; the preflight already records this and Cloudflare WAF
  covers the multi-replica case.
- **Login/session model** — the custom JWT-access + opaque-rotating-refresh
  implementation is untouched; Better Auth is a later phase.
- **`/api/media` response contract, media URLs, all DB schemas and migrations.**

---

## 5. Task 5 — Storj upload path (large media that never transits Express)

**Problem.** Media uploads currently pass through Express as multipart bodies
buffered by `multer.memoryStorage()` under a hard 4.5 MB cap
(`server/routes/media.ts:45`), and on Netlify the function layer additionally
caps response/buffer sizes (~6 MB). Any real video therefore had to be tiny, and
each concurrent upload pinned its bytes in the API process's heap.

**Solution.** An opt-in presigned direct-upload flow: the browser PUTs the file
straight to Storj and Express only ever handles metadata.

| File | Addition |
|---|---|
| `server/services/storj.ts` | `presignPutMedia(id, contentType, contentLength, expiresIn=600)` and `headMedia(key)`; both added to the default export |
| `server/routes/media.ts` | `POST /api/media/presign`, `PUT /api/media/:id/complete` |
| `.env.example` | `PRESIGNED_UPLOADS=false` documented with both behaviours |

**Flow**

1. `POST /api/media/presign` — admin sends `{kind, title, description, contentType, size}`.
2. Validation happens **before any write**: `kind ∈ {poster,video}`, non-empty
   `title`, `contentType ∈ ALLOWED_MIMES` (else **415**), and
   `0 < size ≤ 512 MB` (else **413**).
3. A `media_posts` row is inserted with **`active = FALSE`** (pending). Every
   public query filters `active = TRUE`, so an abandoned upload is invisible.
4. The server presigns a `PutObject` for a **server-derived key**
   (`media/{id}{ext}`) with `ContentType` **and** `ContentLength` bound, valid 10 minutes.
5. The browser PUTs the bytes directly to Storj — **Express never receives the body**.
6. `PUT /api/media/:id/complete` — a bounded `HeadObject` verifies the object
   exists (**409** if not), then `file_url`/`size_bytes` are written,
   `active = TRUE`, an `UPLOAD_MEDIA_DIRECT` audit row is appended, and the
   cached public list is invalidated.

**Security properties**

| Property | Why it matters |
|---|---|
| Key is server-generated from the DB row id | The client can never choose an object path → no arbitrary bucket writes, no traversal |
| Presign binds `ContentType` + `ContentLength` | A swapped MIME or an oversized body fails signature validation, even though the PUT goes straight to Storj |
| 600 s expiry, single object | A leaked URL is short-lived and scoped to one key |
| Admin-only (`requireAuth` + `requireRole('ADMIN','PLATFORM_ADMIN')`) | Same bar as the existing multipart upload route |
| Allow-list + hard size ceiling | 415/413 are returned before the DB insert, so junk uploads create no rows |
| `active = FALSE` until verified | No half-published media can appear in the public list |
| Verification is `HeadObject` only | The server never streams object bytes into memory |
| `PRESIGNED_UPLOADS` must be exactly `"true"` | Production behaviour is unchanged; the endpoint is inert otherwise |

**Compatibility (no breakage either way).** The multipart `POST /api/media` path
is untouched and stays the default and the fallback. Both paths converge on the
**same immutable public URL format**, so enabling or disabling the flag never
orphans existing rows or changes existing links; legacy base64 `data_url` rows
continue to be streamed from the DB exactly as before.

**Live probe result** (see §7.3): with the flag off, `POST /api/media/presign`
is unreachable without a session — **401**, and even that requires a valid CSRF
token first (**403** without one). Note the ordering: the feature gate is
evaluated *inside* the handler, after the auth middleware, so an unauthenticated
caller always sees 401 and cannot probe whether direct uploads are enabled.

---
## 6. Tasks 6 & 7 — Snapshot replacement plan and Coolify documentation

### 6.1 What the Netlify cron actually does today

`netlify/functions/refresh-snapshots.ts` is a *scheduled function* that POSTs a
Netlify **Build Hook** every 15 minutes. The hook does not run a script — it
re-runs the **entire site build** (`npm run build`), which is what regenerates
`dist/data/{stats,ledger,media}.json` via `scripts/exportSnapshot.ts`.

### 6.2 Why it cannot be carried over as-is

- A Build Hook is a Netlify-platform primitive; a Docker container has no
  equivalent trigger, so the hook has nothing to fire at.
- Rebuilding the whole Vite bundle every 15 minutes inside a running container
  would burn CPU, and it would churn content-hashed asset filenames, defeating
  the 1-year immutable caching the app relies on.

### 6.3 The replacement

In a persistent container the filesystem is writable and `dist/` is already
served by the same Express process, so the equivalent of the cron is just the
**exporter on a schedule** — the identical script the build already runs:

```bash
node --import tsx scripts/exportSnapshot.ts   # every 15 minutes
```

It rewrites `dist/data/{stats,ledger,media}.json` in place; no rebuild, no
restart, no asset-hash churn. Two supported ways to schedule it are documented
in `docs/COOLIFY_STAGING_DEPLOYMENT.md` §12: a scheduled job **inside** the
container (preferred — no host access, no credentials leaving the container), or
a VPS crontab entry using `docker exec`.

**Scope note:** this phase documents the replacement but deliberately does
**not** install a cron in the image or compose file — the staging stack is not
live yet and adding a scheduled writer would be an unnecessary moving part. This
is carried forward explicitly as an open item in §8. `netlify/functions/refresh-snapshots.ts`
and `netlify.toml` are left byte-identical, so Netlify keeps working and the
rollback path stays intact.

### 6.4 Coolify staging documentation (Task 7)

`docs/COOLIFY_STAGING_DEPLOYMENT.md` was added as the operator runbook for the
Docker/Coolify target: resource setup and pre-deploy migration command, the
environment-variable table (including `TRUST_PROXY_HOPS=1`,
`SHUTDOWN_TIMEOUT_SECONDS=20`, `NODE_ENV`, `PORT=3000`, DB SSL settings),
Dockerfile/compose behaviour, the Cloudflare + Traefik edge and cache rules, DB
and Storj requirements, log inspection and the expected `[shutdown]` lines,
restart and rollback procedures, backups, the snapshot schedule from §6.3, and a
13-point pre-DNS verification checklist.

Documentation is preparatory only: **no DNS record, Netlify setting, production
environment variable or production database row is modified by this phase.**

---
## 7. Verification — exact commands and observed results

All commands were run from the repository root on the Phase 1 working tree
(Windows, Node v24.11.1, npm workspaces not used, Docker engine 29.5.3).

### 7.1 Static checks and production build

| # | Command | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | ✅ **exit 0** — no type errors |
| 2 | `npx vitest run` | ✅ **exit 0** — `Test Files 26 passed (26)`, `Tests 224 passed (224)`, duration 2.60 s, **0 failures, 0 skipped** |
| 3 | `npx vite build` | ✅ **exit 0** — `✓ built in 7.57s`; `dist/` contains `index.html` (5,893 B), `assets/`, `sw.js`, `workbox-*.js`, `manifest.webmanifest`, `offline.html`, `_headers` |
| 4 | `npm run build` (= `vite build && npm run snapshots`) | ✅ exit 0 — `✓ built in 5.39s`, then the exporter wrote `dist/data/{ledger,media,stats}.json` and logged `Done — stats.total=14, ledger.signs=14, media=31` |
| 5 | `npm ci --include=dev --dry-run` | ✅ exit 0 — build stage lockfile in sync |
| 6 | `npm ci --omit=dev --dry-run` | ✅ exit 0 — runtime stage lockfile in sync |

> Note on #5/#6: these two checks exist because an earlier image build failed
> with `Missing: @emnapi/core@1.11.3 from lock file`. The lockfile was
> reconciled (4 lines changed in `package-lock.json`), which is what makes the
> multi-stage `npm ci` reproducible inside Docker.

### 7.2 Type-checking caught a real pre-existing break

`src/pages/CampaignDashboard.tsx` declared `const signers = …` **twice**
(duplicate `const` in the same scope — a hard TypeScript error). The commit
being prepared for staging could not have built cleanly. Fixed as part of this
phase: the duplicate declaration was removed and `signers` is now populated from
the snapshot (`snap.signers ?? snap.total`) so the dashboard shows the real
signer count with the total as the backward-compatible fallback. This is the
only change in this phase that touches the front end, and it is a build fix plus
a data-source correction, not a redesign.

### 7.3 Live runtime probes (production entrypoint, `--serve-dist`)

The server was started exactly as the container starts it, with
`NODE_ENV=production`, `PORT=<test port>` and `TRUST_PROXY_HOPS=1`:

```bash
PORT=3997 NODE_ENV=production TRUST_PROXY_HOPS=1 \
  node --env-file-if-exists=.env --import tsx server.ts --serve-dist
```

| Probe | Command (essentials) | Observed | Meaning |
|---|---|---|---|
| Boot + health | `curl /api/health` | **200** within 3 s | Production entrypoint binds `PORT` and reports healthy |
| Prod secret guard | start with `NODE_ENV=production` and no `SESSION_SECRET` | **exit, log:** `Error: SESSION_SECRET is not configured. Refusing to start in production…` (`server/middleware/auth.ts:53`) | Fail-closed: no accidental production boot without a real secret |
| Per-IP bucket decrements | 3 × `GET /api/petitions` with `X-Forwarded-For: 203.0.113.77` | `RateLimit: limit=600, remaining=599` → `598` → `597` | Requests from one client share one counter |
| Independent buckets | `GET /api/petitions` with `X-Forwarded-For: 198.51.100.42` | `RateLimit: limit=600, remaining=599` (**fresh**) | With `TRUST_PROXY_HOPS=1` the limiter keys on the **real client IP**, not the proxy — items 7 and 8 confirmed |
| CSRF guard is global | `POST /api/alerts/broadcast` with no CSRF token | **403** `{"error":"Invalid CSRF token"}` | Unauthenticated cross-site writes never reach the route |
| `/api/alerts/broadcast` auth | `POST` **with** a valid CSRF token, no session | **401** `{"error":"Authentication required"}` | **Item 1 fix confirmed** — the route that previously accepted any POST and answered `{success:true}` is now admin-only |
| Presign gate | `POST /api/media/presign` with valid CSRF token, no session | **401** | Auth precedes the feature gate; direct-upload availability cannot be probed anonymously, and no DB write occurs |

Prerequisite for the token probes: `GET /api/auth/csrf` →
`{"csrfToken":"…"}` plus the `csrf_token` cookie, replayed as
`-b cookies.txt -H "X-CSRF-Token: <token>"` (double-submit pattern).

### 7.4 Container verification (summary; details in §3)

- `docker build -t voice-of-gudalur:staging .` → ✅ **succeeded**, image **1.25 GB** (down from 2.14 GB).
- Container starts and passes its own `HEALTHCHECK` (`/api/health`).
- Process runs as **non-root uid=1000** (`docker run … id -u` → `1000`).
- `docker stop` → **graceful shutdown in 0.44 s, exit code 0** — `[shutdown] SIGTERM received …` → `[shutdown] CockroachDB pool closed.` → `[shutdown] clean exit.`

### 7.5 What was NOT executed (and why)

- **No production deploy, no DNS change, no Coolify resource created** — out of scope for Phase 1.
- **No writes to the production database.** The presign flow was probed only as
  far as the auth/CSRF layer; `/presign` is the endpoint that would insert a
  `media_posts` row, so it was intentionally never reached with a live session.
- **No load test** (`scripts/loadtest-25k.mjs` untouched) — staging-capacity measurement belongs to the staging phase.

---

## 8. Unresolved risks and open items

Nothing here blocks the Phase 1 deliverable (a staging-ready image), but each
item must be closed or consciously accepted **before staging receives traffic**.

| # | Item | Severity | Detail / required action |
|---|---|---|---|
| 1 | **Storj bucket CORS for direct uploads** | **High (blocking for `PRESIGNED_UPLOADS=true`)** | A presigned `PUT` is issued by the server, but the *browser* performs the PUT against the Storj gateway, so the bucket must allow cross-origin `PUT` from the app origin. No CORS rule is configured — or even mentioned — anywhere in the repo. **Mitigation already in place:** the flag defaults to `false` and the multipart path is untouched, so the unverified flow is dormant. **Action:** configure/verify bucket CORS in staging *before* enabling the flag. |
| 2 | **Snapshot refresh job not installed** | Medium | §6.3 documents `node --import tsx scripts/exportSnapshot.ts` as the replacement for the Netlify Build-Hook cron, but no Coolify scheduled task (or container cron) exists yet. Until it does, `dist/data/*.json` is only regenerated at deploy time, so snapshot-driven counters go stale between deploys. **Action:** add the scheduled task when the Coolify resource is created. |
| 3 | **Node runtime is pinned only in the Dockerfile** | Low–Medium | The image pins `node:22-slim`, but the repo still has **no `.nvmrc` and no `engines` field**; this workstation runs Node 24.11.1. Everything verified here (typecheck, 224 tests, build) ran on 24 while the container was verified on 22 — both pass today, which means a divergence would be silent. **Action:** commit `engines.node` / `.nvmrc` as `22`. |
| 4 | **Presigned upload flow is not exercised end-to-end** | Medium (known unknown) | The route, gate, validation and exports are type-checked and the auth/CSRF boundary was probed live, but the happy path (presign → browser PUT → `HEAD` → activate) was **deliberately never executed**, because `/presign` inserts a `media_posts` row and the only reachable database is the shared production one. **Action:** first real run must be a small file against staging (or a scratch DB). |
| 5 | **In-memory rate-limit store and TTL caches stay per-process** | Low (accepted) | `express-rate-limit` counters and the 6–10 s TTL caches live in the process. With the planned **single** staging container this is correct; N replicas would multiply the effective limits by N. Cloudflare WAF is the intended backstop. Recorded in the preflight; no change in this phase. |
| 6 | **CSP still allows `'unsafe-inline'` in `script-src`** | Low (pre-existing) | Unchanged by this phase — only the *self-origin* was made environment-driven. Removing `unsafe-inline` needs a nonce/hash migration across the Vite bundle and is explicitly out of scope. |
| 7 | **Netlify-specific compatibility code retained** | Info | The `serverless-http` wrapper and the ~6 MB binary-marker handling in `netlify/functions/api.ts` are dead weight in the container path but are intentionally left byte-identical so the Netlify rollback target keeps working. |
| 8 | **Repo hygiene: `dump.txt`** | Info | An untracked `dump.txt` sits in the repository root (excluded from the image by `.dockerignore`). It was not created by this phase; decide whether to delete or gitignore it. |

### 8.1 Explicit non-goals of Phase 1

Deliberately **not** done, per the phase brief: Better Auth / session-model
migration, any DNS or Cloudflare change, creating the Coolify resource, new
database migrations, changing production environment variables, load testing,
and removing `'unsafe-inline'` from the CSP.

### 8.2 Blast radius and rollback

The only artefacts that can affect a running system are the container image and
two opt-in environment variables (`TRUST_PROXY_HOPS`, `PRESIGNED_UPLOADS`).
Production (Netlify) is untouched: no DNS record, no Netlify setting, no
production environment variable and no database row was modified. Rollback is
therefore a no-op — and because sessions live in CockroachDB rather than in the
container, the documented rollback path stays valid in both directions.

---

## 9. Final change set

`git diff --stat` on the Phase 1 working tree (HEAD = `ec5c8d0`):

```
 .env.example                    |  22 +++++++++
 package-lock.json               |   4 +-
 package.json                    |   5 +-
 server.ts                       |  87 +++++++++++++++++++++++++++------
 server/routes/media.ts          | 106 ++++++++++++++++++++++++++++++++++++++++
 server/services/storj.ts        |  44 ++++++++++++++++-
 src/pages/CampaignDashboard.tsx |   2 +-
 7 files changed, 248 insertions(+), 22 deletions(-)
```

**Modified** — `.env.example` (documents the three new variables),
`package.json` (`start`/`start:prod`/`build:web` scripts; `tsx` moved to
production dependencies because the server runs TypeScript directly),
`package-lock.json` (the `@emnapi/core` reconciliation that makes `npm ci`
reproducible in both Docker stages), `server.ts` (env-driven proxy trust,
production bind on `PORT`, SIGTERM/SIGINT graceful shutdown, health/ready/deep
endpoints, CSP self-origin, admin-only alert broadcast), `server/routes/media.ts`
(presigned direct-upload endpoints), `server/services/storj.ts`
(`presignPutMedia`, `headMedia`), `src/pages/CampaignDashboard.tsx` (duplicate
`const` removed — build fix — plus `signers` sourced from the snapshot).

**New** — `Dockerfile`, `.dockerignore`, `docker-compose.yml`,
`docs/COOLIFY_STAGING_DEPLOYMENT.md`, `docs/PHASE_1_IMPLEMENTATION_REPORT.md`
(this file), `docs/PRODUCTION_MIGRATION_PREFLIGHT.md`.

**Unchanged (deliberately)** — `netlify.toml`, `netlify/functions/*`
(including `refresh-snapshots.ts`), all `server/db/**` migrations and schemas,
all auth/session code, `vite.config.ts`, the service worker/PWA config, every
existing route contract, and all Storj/DB credentials and bucket layout.

---

_Phase 1 complete: the repository now builds and runs as a persistent,
non-root, health-checked Docker image with graceful shutdown, env-driven proxy
trust and CSP, an admin-authenticated alert endpoint, and an opt-in large-media
upload path — with no change to the live production deployment._