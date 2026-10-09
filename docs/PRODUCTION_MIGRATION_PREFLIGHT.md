# VOICE OF GUDALUR — PRODUCTION MIGRATION PREFLIGHT AUDIT

**Phase 0 — Read-only pre-flight for: Netlify → Coolify/Hetzner (Dockerized Next.js standalone) migration**

**Audit date:** 2026-09-16 · **Commit:** `ec5c8d0` (main) · **Mode:** READ-ONLY. Nothing in the repository was modified.

---

## ⚠️ EXECUTIVE FINDING — ARCHITECTURE MISMATCH

**This repository is NOT a Next.js application.**

The target architecture specifies "Dockerized Next.js Standalone application". The actual application is:

- **Frontend:** React 19 + Vite 6 SPA (PWA, `vite-plugin-pwa`), built to static files in `dist/`
- **Backend:** Express 4 app in `server.ts#createApp()` — a single Node process serving `/api/*` and the static SPA
- **Production host:** Netlify — the whole Express backend is wrapped by `serverless-http` in `netlify/functions/api.ts` and served as ONE Netlify Function; static SPA served from `dist/` on the Netlify CDN
- **No `next.config.*`, no `app/` or `pages/` router, no Next middleware, no server actions** exist anywhere in the repo

There is **no Next.js to migrate and no Next standalone build to produce**. What actually gets deployed to Coolify is the **Express + Vite-dist Node application** run as a long-lived Node process (`tsx server.ts` in dev, a compiled entrypoint in production). That is *compatible* with the Coolify/Docker/Hetzner/Cloudflare target — Coolify runs any Docker container — but the plan's wording "Next.js standalone" cannot be satisfied literally.

**Decision required before Phase 1:** either (a) deploy the existing Express app in Docker (recommended — zero application rewrite, all auth/DB/storage behavior preserved), or (b) rewrite the frontend as Next.js (a multi-week application migration, high regression risk for petition signing, explicitly out of scope for this audit). This document proceeds on assumption **(a)**.

**Consequence:** the audit finds the migration is feasible and the fixed architecture is preserved, but the "Next.js standalone" element is replaced by "Node (Express) server in Docker". No code changes were made.

---

## 1. CURRENT ARCHITECTURE

**Stack (from `package.json`, lockfile = `package-lock.json`, npm):**

| Component | Version | Notes |
|---|---|---|
| Node | no `.nvmrc`, no `engines` pin | Netlify manifest shows `nodejs24.x`; local dev uses Node 22 types. **Must pin in Docker** (recommend 22 LTS) |
| React / React-DOM | 19.2.x | SPA only, no SSR |
| Vite | 6.2.x | build → `dist/` |
| TypeScript | ~5.8.2 | `noEmit`, run via `tsx` |
| Express | 4.21.x | single app, `createApp()` export |
| pg | 8.23.x | raw SQL, **Prisma present but legacy** |
| Prisma | 6.19.x | **used only by `prisma/seed.ts` and `server/security/vouAudit.ts`** — the VOU parallel system; NOT the production petition path |
| serverless-http | 4.0.0 | Netlify-only dependency |
| Auth | **custom** JWT + opaque refresh sessions | no auth library |

**Build & run:**
- Build: `vite build` + `scripts/exportSnapshot.ts` (writes `dist/data/*.json` public snapshots)
- Local/standalone: `tsx server.ts` → Express serves API + `dist/` statics + SPA fallback (server.ts:788–810)
- Netlify: `netlify/functions/api.ts` wraps `createApp()`; cron function `refresh-snapshots.ts` triggers a Build Hook
- Migrations: `server/db/migrate.ts` — 24 SQL files, tracked in `schema_migrations`, statement-split with "already exists" tolerance

**Key entrypoint facts (`server.ts`):**

## 2. CURRENT AUTH ARCHITECTURE (all custom — no auth library, no Better Auth)

**Session model** (`server/middleware/auth.ts`):
- `access_token`: httpOnly, SameSite=Strict, JWT (jsonwebtoken, HS256) signed with `SESSION_SECRET`, **15 min TTL**, carries `uid, role, kind, phone, gudalurId, name, localityName`
- `refresh_token`: httpOnly, SameSite=Strict, opaque 32-byte base64url, **24 h (SESSION_TTL_SECONDS)**, SHA-256 hash stored in `sessions` table, rotated on every `/api/auth/refresh`
- `csrf_token`: non-httpOnly cookie; global double-submit guard on all POST/PUT/DELETE/PATCH (exemptions: `/api/auth/lookup|register|forgot`)
- Accepts `Authorization: Bearer` or cookie — mobile/PWA-friendly

**Providers (all custom, no library):**
- **Primary:** passwordless phone — register/login via name+mobile (OTP infrastructure `otp_tokens` table exists)
- **Google:** custom OAuth redirect (`GOOGLE_CLIENT_ID/SECRET`), ID token verified server-side (`verifyGoogleIdToken` in routes/auth.ts). **Google is authorization-after-signing, NOT account creation** — `findSocialResident` refuses to mint Gudalur IDs from social logins
- **Telegram:** **custom Telegram Login Widget** implementation — widget hash verified server-side with `TELEGRAM_BOT_TOKEN` (`verifyTelegramHash`), E.164 phone compared in memory against the signer's mobile. Also post-signature mobile-number validation, not account creation
- `GET /api/auth/providers` exposes which providers are configured

**Roles:** `LOCAL_MEMBER | OFFICIAL | APPROVED_OFFICIAL | ADMIN | PLATFORM_ADMIN` (Postgres enum `user_role`), enforced by `requireAuth()` / `requireRole(...)` middleware. Officials are a separate identity kind (`kind: 'official'`, `officials` table, email-based). Admin portal is `PLATFORM_ADMIN` only.

**DB session persistence:** `sessions` table (identity_id, identity_kind, refresh_token_hash, user_agent, ip, role, expires_at, revoked_at) with indexes on identity and refresh_token_hash.

**PRODUCTION SAFETY:** server refuses to start in production without a real `SESSION_SECRET` (auth.ts:47–57). **Docker/Coolify must set it or the container will crash-loop.**

## 3. CURRENT DATABASE ARCHITECTURE

**CockroachDB Cloud** via `pg` Pool (`server/db/client.ts`):
- SSL: `verify-full` default with `DATABASE_SSL_CA` file; `require` fallback via `DATABASE_SSL`
- Pool max from `DATABASE_POOL_MAX` (Netlify build env sets 20; comment recommends 5/serverless). **Single long-lived container: 20 is fine on CAX21**
- CockroachDB retry semantics implemented: SQLSTATE 40001/40P01 retried with bounded exponential backoff + jitter in `withTransaction`/`executeWithRetry`
- All queries parameterized; repositories are the only writers

**Core schema (24 migration files, 001–023, incl. two 023_* files):**
- `users` — uid (PK, STRING), phone UNIQUE NOT NULL, **gudalur_id UNIQUE NOT NULL** (GD-YYYY-XXXXXX), name, email, locality, pincode (default 643212), role enum, verification_level enum (UNVERIFIED/PHONE_VERIFIED/AADHAAR_VERIFIED), **aadhaar_verified/aadhaar_last4/aadhaar_ref only — full Aadhaar is never stored**, password_hash, blood-donor fields, counters
- `officials` — separate officials identity; approved_by FK → users
- `otp_tokens` — hashed OTP with per-OTP salt, attempts, expiry
- `sessions` — as above
- `petition_signs` — **sign_hash UNIQUE** (VG-receipt), user_uid FK→users, gdr_id, full_name, village, phone_last4, **aadhaar_last4/aadhaar_ref** (never full), geo, batch_no, forwarded
- `petition_mobile_signs` (016) — public Name+Mobile signing; `mobile_identity_hash` = HMAC-SHA256(`PETITION_IDENTITY_SECRET`, normalized mobile) — **raw mobile never stored**; the unique HMAC is the dedupe key
- `petition_stats` (015) — maintained aggregate (no COUNT(*) on the hot path)
- `signature_authorizations` (023) — provider subject keys (keyed hashes only)
- `signatures`/`identities`/`validations`/`validation_links` (VOU civic-validation system, Prisma-modeled, mirrored from the petition path by 022)

## 4. CURRENT STORAGE ARCHITECTURE

**Storj S3** via `@aws-sdk/client-s3` + `s3-request-presigner` (`server/services/storj.ts`):
- Endpoint `https://gateway.storjshare.io`, path-style, bucket `vog`
- **Uploads transit the API** (multer → `uploadMedia(buffer)`) — NOT yet direct-to-Storj presigned PUT. The ~6 MB response cap was a Netlify concern; a long-lived container removes it, but large uploads still occupy Node memory/bandwidth
- Serving: **presigned GET URLs (1 h TTL)** — media never proxies through the app in the read path; `STORJ_PUBLIC_LINK_BASE` public-link grant exists but presigning is the reliable path
- Only the object key is stored in CockroachDB (`media_posts.file_url`)
- `isStorjConfigured()` degrades gracefully; `checkBucket()` backs `/api/ready`
- Avatar/poster/video all flow through `server/routes/media.ts` + `mediaPresenter`/`mediaProcessor` (responsive variants, migration 010)

Direct browser→Storj presigned PUT is an *optimization*, not a migration blocker; the server-side SDK path is fully compatible with a container.

## 5. NETLIFY DEPENDENCIES (everything that must be replaced/parked)

| Item | File | Replacement |
|---|---|---|
| `serverless-http` wrapper | `netlify/functions/api.ts` | not deployed; replaced by the Node process itself |
| Netlify config, redirects, headers, edge-cache rules | `netlify.toml` | **re-created as Cloudflare rules + Express headers** — real migration work (see §8) |
| Cron function → Build Hook (`SNAPSHOT_BUILD_HOOK_URL`) | `netlify/functions/refresh-snapshots.ts` | a **cron job calling an API refresh endpoint or writing snapshots in-container** (the code comment notes serverless FS is read-only — a container has a writable FS and can regenerate snapshots directly) |
| Build-time snapshot export | `scripts/exportSnapshot.ts` (npm run snapshots, part of build) | keep; needs DB access at build/deploy time — or move to container start |
| Redirect semantics | `/api/*` → function, `/data/*` static, `/stats.json` → `/data/stats.json`, SPA fallback `/*` → index.html | Express already implements the SPA fallback + statics; `/stats.json` alias must be added at the web-server/CDN layer |
| Edge cache headers on `/api/petitions/sign-stats`, `/api/petitions/ledger`, `/api/media`, `/api/manifesto/stats`, `/api/wildlife/*` | `netlify.toml` [[headers]] | Cloudflare Cache Rules |
| `trust proxy = 2` | server.ts:81 | set to 1 (single Cloudflare→container hop) or derive from CF-Connecting-IP; otherwise rate limiting buckets ALL users together |
| `NPM_FLAGS=--include=dev` (build needs vite devDeps) | netlify.toml | irrelevant in Docker (multi-stage build installs devDeps) |
| Env vars: `DATABASE_URL, SESSION_SECRET, NODE_ENV=production, DATABASE_POOL_MAX, DATABASE_SSL(_CA)` | NETLIFY-ENV-GUIDE.md | same names work in Coolify |
| `neon-buildhooks` plugin lockfile in `.netlify/` | build artifact | ignore |
| `EMERGENCY_MODE`, `MAX_IN_FLIGHT` load-shedding | env | keep as-is (a container benefits from it) |

## 6. BETTER AUTH MIGRATION REQUIREMENTS — **STOP: NOT COMPATIBLE AS SPECIFIED**

The task instructs: "Better Auth … Existing authentication functionality must be preserved during migration." This audit must flag the conflict honestly:

1. **Better Auth is a framework-embedded auth library.** Its standard integration assumes Next.js (or at minimum its own route handlers mounted in the app framework). This app is a custom Express API with a hand-rolled, working, hardened session system. Adopting Better Auth means replacing `server/middleware/auth.ts`, `server/routes/auth.ts`, the `sessions` table semantics, the CSRF guard, and every `requireAuth`/`requireRole` call site.
2. **Better Auth's core tables are `user`, `session`, `account`.** This app has `users` (with gudalur_id, role enum, verification ladder, Aadhaar fields, social provider columns from migration 020) and `sessions` (opaque refresh tokens, dual identity kinds). Mapping without destructive migration is possible but requires an **additive schema migration and an adapter**, running a second auth system in parallel with the existing one — exactly the change the brief says not to make "unnecessarily".
3. **Google + Telegram here are not login providers for account creation** — they are *post-signature verification rungs* wired into the trust ladder (`server/db/trustRanking.ts`), with keyed-hash storage and 409 protection against cross-resident linking. Better Auth's social OAuth models would change this semantics silently.
4. **Custom Telegram implementation** — as the brief demands, it was inspected carefully (`verifyTelegramHash`, widget-field hash verification, in-memory phone comparison). It is correct, minimal, and preservation-safe. Replacing it with Better Auth's Telegram plugin (an OIDC-style flow) would change the trust-ladder data contract.

**Recommendation (STOP-and-explain per instructions):** Better Auth can be *added* (its vanilla core supports custom Express), but it **cannot be mapped onto the current user/account/session structure "without a migration strategy"** — a new `account` table, an additive `session` migration, and a dual-read/dual-write cutover would be required, with real risk to existing sessions and the trust ladder. The safe, brief-compliant alternative: **keep the existing custom auth unchanged for this migration** (it is portable — pure Node, no serverless coupling) and treat Better Auth as a separate, later project with its own migration design. If Better Auth is mandatory for the Coolify phase, this audit's status becomes **BLOCKED** pending an approved schema-migration strategy.

## 7. COOLIFY MIGRATION REQUIREMENTS

What a Docker deployment requires (no code changes):

1. **Dockerfile (multi-stage):** `node:22-slim` → install (incl. devDeps for vite) → `npm run build` → slim runtime image running the Express server with `NODE_ENV=production`. Must include: the CA cert for CockroachDB (`DATABASE_SSL_CA`) and the runtime entrypoint. The repo has **no JS build for server code** — simplest safe path is shipping `tsx` + TS sources in the runtime image (or precompiling; decision in Phase 1)
2. **Container command:** serve API + `dist/` statics + SPA fallback — already exists (`startServer()` production branch, server.ts:802–808). Add a `/stats.json → /data/stats.json` alias to match Netlify behavior
3. **Healthchecks:** Coolify healthcheck → `/api/health`; rollout gate → `/api/ready`
4. **Migrations:** run `npm run db:migrate` as a Coolify **pre-deploy command / one-off job**, NOT in the container entrypoint (avoids concurrent migration races across replicas)
5. **Env:** pass all §16 vars; **SESSION_SECRET and PETITION_IDENTITY_SECRET must be set or the app refuses to serve / signing fails closed (by design)**
6. **Statelessness:** the app holds no state apart from the optional snapshot writer; safe to scale to N containers behind Coolify's proxy
7. **trust proxy:** set 1 (Cloudflare → Coolify Traefik → container)
8. **Resource fit:** CAX21 (4 vCPU/8 GB) comfortably runs one Node process (≈150–300 MB RSS typical for this app) + Coolify overhead + Traefik + Docker

## 8. CLOUDFLARE REQUIREMENTS

- DNS: A/AAAA → Hetzner VPS (or Cloudflare Tunnel); proxy ON
- **Cache rules to recreate** (from netlify.toml): `/assets/*` immutable 1 y; `/sw.js`, `/index.html`, `/manifest.webmanifest` must-revalidate; `/data/*.json` 30 s SWR; `/stats.json` 6 s SWR; the five cached `/api/*` GET endpoints 6–10 s SWR. **Bypass cache when cookies/Authorization present** — the edge must never cache a session-bearing response
- WAF + rate limiting + DDoS per brief; note the app ALSO has its own express-rate-limit (auth 100/15 m, public 600/15 m, writes 300/15 m, AI 60/15 m per IP) — **Cloudflare must pass the real client IP** (CF-Connecting-IP) or all in-app buckets collapse to one
- Turnstile middleware exists (`server/middleware/turnstile.ts`, feature-flagged) — already Cloudflare-native
- Websockets: none required (no realtime since the Supabase removal)
- CSP in server.ts hard-codes `https://voiceofgudalur.space` — domain must be unchanged or CSP updated
- SSL mode: Full (strict) — origin cert on Coolify Traefik

## 9. HETZNER REQUIREMENTS

- Ubuntu 24.04, Docker + Coolify (official install script), CAX21 (4 vCPU/8 GB) per brief
- Firewall: 80/443 open; SSH locked down; Coolify handles TLS via Traefik
- Outbound: CockroachDB Cloud (26257), Storj gateway (443), Telegram/Google APIs, Open-Meteo, LLM endpoint (Pollinations/Ollama at `OLLAMA_URL`, default localhost:11434 — **self-hosted Ollama on the same box would compete for the same 8 GB; plan for it or set AI_VOG_ENABLED=false**)
- Backups: Hetzner snapshots + CockroachDB Cloud native backups (verify enabled)

| `db:check` message references "Netlify Site configuration" | package.json | cosmetic |


## 10. COCKROACHDB SCALING RISKS

- **Measured capacity, not assumptions:** current data volume is tiny (production sign count: 14). CockroachDB Cloud scales horizontally, but each signature is a serialized transaction (sign insert + stats increment, plus optional mirror/authorization writes)
- Connection math: pool (20) × replica count vs CockroachDB connection limits — **N replicas × 20 may exceed the org's connection ceiling; scale DATABASE_POOL_MAX down as replicas go up**
- 40001 retries are implemented, but under heavy petition bursts serialization retries rise → latency spikes; the aggregate `petition_stats` table and idempotency dedupe are the correct mitigations and already exist
- Prisma + cockroachdb provider is legacy upstream — VOU tables accessed via Prisma are a future support risk, not a current one
- No partitioning exists; ledger queries (`petition_signs ORDER BY created_at DESC LIMIT n`) rely on 002 indexes — re-verify at >100k rows

## 11. STORJ PERFORMANCE RISKS

- **All uploads transit the Node process** (multer memory storage → PutObject). A video-heavy campaign would saturate container bandwidth/CPU. Direct presigned PUT is the correct end-state and the SDK is already present; flagged as later-phase work, not a blocker
- Presigned GETs expire in 1 h — client media caching must tolerate re-signing; Cloudflare must NOT cache presigned URLs long (or they die at the edge)
- Storj gateway latency (single gateway region) adds ~100–300 ms to first media byte; acceptable
- The public-link grant (`STORJ_PUBLIC_LINK_BASE`) was historically misconfigured on this project (docs/MEDIA_PERFORMANCE_FINAL_REPORT.md) — the presigned path is authoritative; do not depend on the link grant

## 12. 10-LAKH (1,000,000) USER SCALE RISKS — measured separation

| Dimension | Current reality (measured from code/data) | 10-lakh reality | Single CAX21 verdict |
|---|---|---|---|
| Registered users | tens (production sign count: 14) | 1,000,000 rows in `users` | DB-fine; `users.phone` unique index fine |
| **Concurrent users** | Netlify auto-scaled; single container ≈ MAX_IN_FLIGHT=1000, realistically a few thousand concurrent on static + a few hundred concurrent API streams on 4 vCPU | campaign peak: thousands concurrent | **Single CAX21 is NOT sufficient at peak; plan 2+ replicas (Coolify) + strong Cloudflare edge caching, or CAX31/CAX41** |

## 13. SECURITY RISKS (audit findings, no changes made)

**Already correct:** parameterized SQL; global CSRF double-submit guard; httpOnly + SameSite=Strict + secure cookies; SESSION_SECRET fail-closed in production; per-endpoint rate limiters; request IDs; circuit breaker on external calls; hash-chained audit events (VOU); Aadhaar limited to last4 + ref (never full) and sign-gated (011); mobile numbers only as HMAC (PETITION_IDENTITY_SECRET); Telegram/Google subjects only as keyed hashes with masked UI labels; monotonic trust ladder; Turnstile middleware available; CSP/HSTS/COOP/CORP headers set.

**Risks / gaps found:**
1. **`trust proxy=2` hard-coded** (server.ts:81) — under Coolify+Cloudflare the wrong value breaks per-IP rate limiting (either all users in one bucket or IP spoofing). Migration-critical.
2. **CSP hard-codes `https://voiceofgudalur.space`** and allows `unsafe-inline` scripts — acceptable today; must be revisited on any domain change; `unsafe-inline` weakens XSS defense.
3. **`/api/alerts/broadcast`** (server.ts:510) accepts any POST and only console.logs — no auth, no rate limiter visible. Harmless now but is an unauthenticated write-shaped endpoint — flag for the Coolify phase.
4. **In-memory rate-limit store** — per-container; N replicas multiply effective limits by N. Acceptable (Cloudflare WAF covers), but documented.
5. **In-process TTL caches are per-container** — correctness fine (short TTL), but warm-cache behavior varies per replica.
6. `GET /api/auth/check-phone` fails open on error (by design; unique index backstops) — acceptable.
7. Uploads via multer memory storage — memory-spike vector on large files under container RAM limits; set explicit multer limits at the route (`bodySizeLimit` exists for JSON).
8. Cloudflare must not cache authenticated API responses (cookie bypass rule) — otherwise session leakage at the edge.

## 14. DATA MIGRATION RISKS

- **None required** if auth is preserved (§6): same CockroachDB, same Storj, same users/signatures/GDR IDs/roles/Aadhaar rules. The migration moves the *host*, not the data
- The migration runner is idempotent/resumable and safe to run from a Coolify pre-deploy job; `023_sync_petition_sign_pincode.sql` is documented as intentionally NOT applied (CockroachDB PL/pgSQL limitation) — app code handles pincode; **do not "fix" this during migration**
- Real risks: (a) someone runs `prisma db push`/`prisma migrate dev` against production (the scripts exist in package.json) — **must be forbidden in production environments**; (b) env drift between Netlify and Coolify (especially SESSION_SECRET, PETITION_IDENTITY_SECRET, STORJ keys, CA cert) — a mismatch silently breaks sessions or signing; (c) snapshot export requiring DB access during build in a sandbox without it — schedule snapshots from the container instead

## 15. ROLLBACK STRATEGY

Per the brief's strategy, validated against the codebase:
1. Netlify site stays deployed and frozen (no new deploys) during Coolify staging
2. Staging: Coolify deployment on a staging subdomain behind Cloudflare, pointing at the **same** CockroachDB/Storj (read-mostly verification) — or a backup-restored DB copy for full-isolation write testing
3. Verification = §17 tests, including a real petition signature + GDR ID + ledger + admin login on staging
4. DNS switch: Cloudflare record → Hetzner; shorten TTL beforehand
5. **48 h rollback window:** flip DNS back to Netlify. Sessions survive (sessions live in CockroachDB, not in the container); only in-flight requests die
6. After 48 h: disable the Netlify build-hook cron, keep the site archived

## 16. REQUIRED ENVIRONMENT VARIABLES (Coolify, exact names)

Required (fail-closed without them): `DATABASE_URL`, `SESSION_SECRET` (32+ chars; crash-loop without), `PETITION_IDENTITY_SECRET` (48-byte base64url; signing 503s without), `NODE_ENV=production`, `APP_URL`

## 17. REQUIRED TESTS (pre-cutover verification suite)

1. `npm run db:migrate status` → 0 pending on the production DB from inside the container
2. `GET /api/health` + `/api/ready` green through Coolify healthchecks
3. Register new resident → GDR ID issued (format GD-YYYY-XXXXXX), user row intact
4. Login (phone) → access/refresh/csrf cookies set; refresh rotation works
5. Existing user login → role + verification_level preserved; PLATFORM_ADMIN reaches `/api/admin/*`, LOCAL_MEMBER gets 403
6. **Sign petition with an existing account** → sign_hash receipt, petition_stats increment, ledger entry, dedupe on second attempt
7. Public Name+Mobile signing → HMAC dedupe, no raw mobile stored, pincode present in the sign row
8. Google rung: ID-token authorize → `signature_authorizations` row, trust rank rises; cross-resident link → 409
9. Telegram rung: widget hash verifies; wrong phone → refused
10. Media upload → Storj object exists, presigned GET renders; media delete works
11. Rate limits: burst the auth endpoint → 429 with correct per-client buckets (validates trust proxy)
12. CSRF: POST without X-CSRF-Token → 403; with header → passes
13. Snapshots: `/stats.json` and `/data/stats.json` return JSON (not HTML) with correct counts
14. Aadhaar: full number never appears in any API response (run `npx vitest run` — contract tests exist)
15. `SESSION_SECRET` absent → container refuses to start (validates fail-closed in Docker)
16. Playwright e2e suite (in devDeps) against staging

## 18. BLOCKERS

1. **ARCHITECTURE DECISION (blocking):** target says "Next.js standalone"; the app is React+Vite+Express. Migrate as Dockerized Node/Express (recommended, zero rewrite) or re-scope to a Next.js rewrite (a major project). No Dockerfile exists yet — creating it is Phase 1 work.
2. **Better Auth (blocking as specified, per §6):** cannot map onto the current custom user/session/trust-ladder structure without a new migration strategy and parallel-auth cutover. Recommend deferring Better Auth out of the Coolify phase; if mandatory, provide an approved schema-migration plan first.
3. **Cron/snapshots (minor, design needed):** the refresh-snapshots Netlify Build Hook has no Coolify equivalent — needs a cron design before Netlify is retired.
4. **trust proxy / CF-Connecting-IP (must-fix at deploy):** wrong value silently breaks rate limiting.
5. **Node version pin (must-fix at deploy):** no engines/.nvmrc; Docker must pin (22 LTS) and verify (Netlify already runs Node 24; both work, but pin one).

**Non-blockers (flagged only):** uploads transiting the app (§11), unauthenticated `/api/alerts/broadcast` (§13.3), Prisma/CockroachDB legacy status (§10), `unsafe-inline` CSP (§13.2), per-replica in-memory limiters/caches (§13.4–5).

## 19. EXACT IMPLEMENTATION ORDER

1. Decide blocker 1 (Dockerized Express — assumed) and blocker 2 (defer Better Auth)
2. Create `Dockerfile` (multi-stage, node:22-slim pin, build → runtime with tsx+sources, CA cert) + `.dockerignore`
3. Coolify project on Hetzner Ubuntu 24.04 (CAX21): Docker + Coolify install, firewall 80/443
4. Coolify app: env vars (§16), pre-deploy `db:migrate` job, healthcheck `/api/health`, readiness `/api/ready`
5. Staging domain via Cloudflare (proxy ON, Full-strict, cache rules from §8, cookie bypass on authenticated routes); set `trust proxy=1`
6. Run the §17 verification suite on staging (production DB read-mostly, or restored copy for writes)
7. Fix small findings: `/stats.json` alias, snapshot cron replacement, multer limits, alerts-endpoint auth
8. DNS cutover to Hetzner; watch 503/error rates + petition_stats continuity
9. 48 h Netlify rollback window; then archive Netlify (disable the cron build hook first)

---

## PREFLIGHT STATUS: **READY WITH RISKS**

**Blockers (must resolve before Phase 1; none require touching production data):**
1. "Next.js standalone" does not exist in this codebase — the deploy target is a Dockerized Node/Express process (or a Next.js rewrite, which is a different project)
2. Better Auth cannot be adopted without a migration strategy (§6); recommend deferring it — the existing custom auth is fully portable
3. Snapshot cron + edge-cache/redirect semantics must be re-created at the Cloudflare/container layer before Netlify retirement
4. `trust proxy` and the Node version pin must be set correctly in the Docker deployment

**Cleanly portable as-is:** all auth (custom JWT/sessions/Google/Telegram), all petition logic and data, the CockroachDB access layer with retry semantics, Storj presigned media, rate limiting, emergency mode, health endpoints, 24 idempotent migrations. No destructive migration is required or proposed; no production data is touched by this audit.

Database: `DATABASE_POOL_MAX`, `DATABASE_SSL=verify-full`, `DATABASE_SSL_CA` (file/secret mounted)
Storage: `STORJ_ACCESS_KEY`, `STORJ_SECRET_ACCESS_KEY`, `STORJ_BUCKET`, `STORJ_ENDPOINT`, `STORJ_REGION`, `STORJ_PUBLIC_LINK_BASE`
Auth providers (optional rungs; preserve values from Netlify): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
App behavior: `EMERGENCY_MODE=0`, `MAX_IN_FLIGHT`, `EDGE_CACHE_TTL_SECONDS`, `AI_VOG_ENABLED`, `VITE_APP_MODE=full`, `VITE_AI_VOG_ENABLED` (build-time), `SESSION_TTL_SECONDS`
AI (optional): `OLLAMA_URL`, `OLLAMA_MODEL`, `AI_API_KEY`/`AI_BASE_URL`/`AI_PROVIDER`/`AI_MODEL`, `WHISPER_URL`, `WHISPER_MODEL`, `PYTHON_BIN`
Push (optional): `PUSH_PRIVATE_KEY`, `VAPID_EMAIL`
Netlify-only (drop): `SNAPSHOT_BUILD_HOOK_URL`, `NPM_FLAGS`

| Requests/second (static) | CDN-absorbed on Netlify | same pattern via Cloudflare | fine if cache rules are correct (static + snapshots absorb most reads) |
| Requests/second (API) | in-process TTL 6–10 s + aggregate stats row → each cache miss is 1–3 cheap queries | ~10–50 rps sustained per 100 k active signers | OK at moderate scale; CPU-bound at extreme bursts |
| **Petition submissions** | 1 serialized txn (sign insert + stats increment + optional mirror/authorization writes) | 10 k signatures/day trivial; 10 k/minute is a Cockroach contention test | realistically fine to ~50–100 sign/s; beyond that, batched stats and read-replica reads needed |
| Auth throughput | JWT verify = CPU-only (~10 k/s/core); refresh = 1 DB write (rotation) | refresh storm after mass expiry | refresh-rotation write could be a hotspot; acceptable |
| Database txn throughput | CockroachDB Cloud tier-dependent | multi-region tier only if geo-latency matters | single-region tier is sufficient |
| Media bandwidth | presigned redirects → Storj direct | video-heavy campaigns | **never transits the VPS in the read path — good**; upload path transits the VPS (see §11) |

**The honest statement:** the architecture (edge-cached reads, presigned media, aggregate counters, stateless API) is the right *shape* for large scale, but **one 8 GB box cannot serve 10-lakh concurrent users** — horizontal API replicas + Cloudflare doing the heavy lifting is the load-bearing design, and that is exactly what Coolify enables.

**Netlify as rollback:** keep the Netlify site + env vars frozen for ~48 h after the DNS switch. Nothing in the app writes Netlify-specific state; rollback = flip DNS back.

- `manifesto_signatures`/`manifesto_submissions`/`manifesto_stats`, `petitions`, `petition_batches`, `wildlife_incidents`, `animal_sightings`, `voice_petitions`, `media_posts` (007/010), `audit_events`, `idempotency_keys`, `external_supports`, `app_config`, `locality`
- Indexes/constraints in 002; Aadhaar additions in 005/009/011; trust ladder is monotonic (`server/db/trustRanking.ts`)

**Prisma note:** `prisma/schema.prisma` (cockroachdb provider) models the VOU system only; `@prisma/client` is in dependencies and `prisma generate` is a script, but the production signing path is raw `pg`. Prisma on CockroachDB is in reduced-maintenance territory upstream — flagging, not acting.

- `app.set('trust proxy', 2)` — tuned for the Netlify→Cloud Run chain; **must be re-tuned (1) for Coolify/Cloudflare**
- Middleware order: requestId → emergencyMode → express.json → cookieParser → global CSRF → compression → in-flight load shed (MAX_IN_FLIGHT, default 1000) → rate limiters → security headers → health/ready → routes → static/SPA fallback
- Routes mounted at `/api/auth`, `/api/petitions`, `/api/petition` (public signing), `/api/civic`, `/api/manifesto`, `/api/wildlife`, `/api/offline`, `/api/officials`, `/api/admin`, `/api/config`, `/api/media`, `/api/validation`, `/api/authorization`, `/api/health`, `/api/ready`, `/api/ai/*`, `/api/alerts/broadcast`
- Health `/api/health` (no DB) and readiness `/api/ready` (DB ping) exist — **ideal Coolify healthchecks**
- In-process TTL caches (`server/utils/ttlCache.ts`, 6–10 s) on hot reads; aggregate `petition_stats` table avoids COUNT(*) on the hot path


```
PUBLIC INTERNET
   ↓
Netlify CDN (edge cache: 6–30 s on public reads, immutable on /assets/*)
   ↓
Netlify Function "api" (serverless-http(Express app))      ← WHOLE backend
   ↓                                  ↓
CockroachDB Cloud (pg Pool)      Storj S3 (presigned GET/PUT)
```
