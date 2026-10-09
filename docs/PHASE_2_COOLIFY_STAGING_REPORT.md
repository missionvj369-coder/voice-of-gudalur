# Voice of Gudalur — Phase 2 Implementation Report

## Coolify staging deployment + the staging safety boundary

**Scope.** Stand up a second, permanent deployment of this application (staging)
on Coolify, and make it *safe* to point that second copy at shared production
state — the production CockroachDB database, the production Storj bucket, and
real subscribers' push endpoints.

**Date:** 16 September 2026
**Branch:** `main` · **Base commit:** `ec5c8d0`
**Companion documents:** `docs/COOLIFY_STAGING_DEPLOYMENT.md` (the operator
runbook), `docs/PHASE_1_IMPLEMENTATION_REPORT.md` (the container foundation this
phase builds on).

---

## 0. Constraints honored (explicit)

Phase 2 inherited one non-negotiable constraint from Phase 1 and added three of
its own.

| # | Constraint | How it was honored |
|---|---|---|
| 1 | **Production behaviour must not change.** | The staging marker defaults to `production`. `APP_ENV` unset ⇒ `stagingAllowsWrites()` returns `true` unconditionally, so most of the new code is unreachable on the live site. The frontend banner compiles to `null` unless the bundle is built with `VITE_APP_ENV=staging`. |
| 2 | **No real campaign side effects from staging.** | Every mutating route that reaches shared state returns `403` on staging; Web Push is suppressed at both send sites; the snapshot exporter refuses to run. |
| 3 | **Fail closed, not fail open.** | The guard is default-deny for *unclassified* mutating `/api` routes. A route added in six months' time is blocked on staging until someone consciously classifies it (§2.2, §3). |
| 4 | **No new secret may be committed.** | `.env.staging.example` holds placeholders only and is the single deliberate `.env*` exception in `.gitignore`; `.dockerignore` excludes `.env*` from the image. |

---

## 1. Task 1 — A staging identity: `APP_ENV`

### 1.1 Why a new variable instead of reusing `NODE_ENV`

The obvious marker would have been `NODE_ENV=staging`, and it is wrong here.
`NODE_ENV` is load-bearing for three unrelated things in this codebase: session
cookies are only `Secure` when it equals `production`, and the `dist/` static
serving path only exists for `production`. Setting `NODE_ENV=staging` would have
downgraded cookie security on an internet-facing host to gain a label.

So staging gets its own variable. `APP_ENV` is orthogonal: `NODE_ENV` stays
`production` on staging, and only `APP_ENV` says "this is a test deployment".

### 1.2 Resolution order

`server/middleware/stagingGuard.ts` resolves it once, explicitly:

```
APP_ENV=staging      → 'staging'
APP_ENV=development  → 'development'
APP_ENV=production   → 'production'
APP_ENV unset        → NODE_ENV === 'production' ? 'production' : 'development'
```

The unset branch preserves the historical inference, so the Netlify deployment
and the Phase 1 image behave exactly as before — the guard only arms itself when
someone *says* `APP_ENV=staging`.

Four functions are exported from the module and used across the codebase:

| Export | Purpose |
|---|---|
| `appEnv()` | Resolved env: `production` \| `staging` \| `development`. |
| `isStaging()` | The predicate every call site uses. |
| `stagingAllowsWrites()` | `!isStaging() \|\| STAGING_ALLOW_WRITES === 'true'`. |
| `environmentInfo()` | Non-secret descriptor (`env`, `staging`, `writes_allowed`) for health output. |

### 1.3 Boot-time announcement

The process states its own identity to the log stream at startup
(`server.ts`, "Staging identity banner"), so an operator reading Coolify logs
never has to guess which deployment they are looking at:

```
[staging] APP_ENV=staging — staging safety boundary is ACTIVE.
[staging] every state-changing /api route returns 403 STAGING_WRITE_BLOCKED — including alerts, incidents, petition/civic/manifesto/wildlife writes, media and push subscriptions.
[staging] fail closed: routes that have not been classified are refused too; only sign-in/session under /api/auth, /api/admin/login, /api/admin/logout and /api/officials/login are allowed.
[staging] X-Environment header = staging.
```

A fifth line appears — deliberately loud — if the escape hatch is open:

```
[staging] ⚠  STAGING_ALLOW_WRITES=true — the boundary is DISABLED. Enabled only for the documented verification window.
```

`/api/health` includes `environmentInfo()`, so a health check now also answers
"is this staging, and are writes enabled?" without shelling into the container.

---

## 2. Task 2 — The staging safety boundary

`server/middleware/stagingGuard.ts` + `app.use(stagingGuard)` in `server.ts`.

### 2.1 Mount position — and why it matters

The guard is registered at `server.ts:103`, immediately after
`requestIdMiddleware` and **before** `express.json`, `cookieParser`, the CSRF
middleware and the rate limiters.

This was not the first placement. The guard was originally mounted further down
the stack, and a live probe (§9.2) showed the requests never reached it: the
mutating POSTs came back `Invalid CSRF token` instead of `STAGING_WRITE_BLOCKED`.
Two things follow from that, and both are arguments for the early mount:

1. **Correct diagnosis.** A blocked write must say "staging refused this", not
   "your token was bad" — otherwise the operator debugs CSRF on a test box.
2. **No budget consumed.** A refused request must not burn body-parser work or
   the rate-limit budget that a legitimate visitor needs.

The guard needs only `req.method` and `req.path`, so nothing above it is
required.

### 2.2 Classification: allow, then deny, then default-deny

`stagingClassification(req)` returns `null` ("let it through") or a string
naming the rule that blocked it. The order is the whole design:

1. **Non-mutating methods pass.** `GET`/`HEAD`/`OPTIONS` are never blocked;
   staging is meant to be browsable and health-checkable.
2. **Anything outside `/api/` passes.** Static assets and the SPA fallback
   cannot reach shared state.
3. **Allow list.** Auth plumbing only — `POST /api/auth/*` (register, lookup,
   google, telegram, refresh, logout, `PATCH /api/auth/me`), plus
   `/api/admin/login`, `/api/admin/logout`, `/api/officials/login`. Checked
   *first*, because those last three live inside prefixes that are otherwise
   blocked. Without a session nobody can inspect a staging deployment at all.
4. **Deny list.** Mutating methods on any prefix that writes shared state (§4).
5. **Default deny.** Anything else under `/api/` that nobody has classified
   returns `UNCLASSIFIED_MUTATING` and is refused.

Prefix matching is on a path boundary (`path === p || path.startsWith(p + '/')`),
so `/api/auth` cannot swallow `/api/authorization`. A live probe verified exactly
that: `/api/authx` classifies as `unclassified-mutating-route`, not as allowed.

### 2.3 Response shape

`403`, never `404`. A staging deployment must identify itself rather than
pretend a route does not exist.

```
HTTP/1.1 403 Forbidden
X-Environment: staging
Cache-Control: no-store
{
  "error": "STAGING_WRITE_BLOCKED",
  "env": "staging",
  "blocked": "<matched rule, or 'unclassified-mutating-route'>",
  "message": "..."
}
```

`Cache-Control: no-store` prevents a CDN or browser from caching a refusal.
Every refusal also emits one `console.warn` naming the method, path and rule,
and telling the reader what to do about it — the log is the audit trail.

### 2.4 The escape hatch

`STAGING_ALLOW_WRITES=true` disables the boundary entirely, and is **inert
outside staging** (`stagingAllowsWrites()` short-circuits to `true` when not
staging). It exists for one documented situation: a staging container wired to
its own isolated database. The template sets it `false` and comments the
condition under which it may be flipped. It is read from the environment on
every request, so it cannot be changed by a mutation at runtime.

---

## 3. Two real holes found and closed

The guard's deny list was originally derived from a review of `server.ts`. That
approach found only the routes someone remembered to look at. Driving a real
server with real HTTP (§8) found two routes that no amount of reading the guard
would reveal, because the guard was self-consistent — the **route table** was the
thing that disagreed with it.

### 3.1 `/api/offline/*` — the wildlife router is mounted twice

`server/routes/wildlife.ts` is mounted at *two* prefixes:

```
app.use('/api/wildlife', wildlifeRouter);
app.use('/api/offline', wildlifeRouter);   // same router, second mount
```

The deny list covered `/api/wildlife` and therefore looked complete. A
`POST /api/offline/sync` — an offline-sync write into the incident store — was
allowed through on staging. Closed by adding `/api/offline` to the deny list and
a comment at both entries recording that they are the same router.

### 3.2 `/api/petition/sign` — the public router uses the singular path

The petition feature has two routers with confusingly similar names, and the
public one — the one an anonymous visitor drives — is mounted at the **singular**
path, while the authenticated/admin one is plural:

```
app.use('/api/petitions', petitionsRouter);   // ledger reads + support writes
app.use('/api/petition',  publicPetitionsRouter);  // PUBLIC signing path
```

The original list had `/api/petitions` only. `POST /api/petition/sign` — the
single most important write in the whole product — was permitted on staging.
Closed by adding `/api/petition`.

### 3.3 Why this is worth a section

Both holes were *silent*. Neither returned an error; both would have written
real records into the production ledger from the test box. The lesson is
recorded in the deployment doc (§15) as guidance for the next person who adds a
route, and it is why the test suite asserts against the route *table* rather
than against the guard's own lists (§8).

---

## 4. Task 3 — Web Push suppression

Two guards in `server.ts`, because push delivery is a *side effect inside a
handler*, not a route of its own that the guard could classify:

| Site | Line | What is suppressed |
|---|---|---|
| Wildlife incident handler | `server.ts:647` | `webPush.sendNotification()` to incident subscribers. Logs `[staging] wildlife push suppressed — N subscription(s) not notified.` |
| Admin broadcast handler | `server.ts:689` | `[staging] broadcast push suppressed — no notifications delivered.` |

Both are gated on `isStaging()` and both are placed *before* the send call, so
the push never leaves the process. The route guard already answers `403` for
these routes on staging; these two guards are defence in depth, and they matter
for the case where `STAGING_ALLOW_WRITES=true` is set for an isolated-database
verification window — the writes would then proceed, but a real person's phone
still would not ring because of a test.

---

## 5. Task 4 — Snapshot export suppression

`scripts/exportSnapshot.ts:180`. The exporter is read-only against the database,
but it **overwrites `dist/data/*.json`**, which is the public read path the crowd
actually hits. On staging that would mean a test box rewriting the snapshot
files production serves.

```ts
if (isStaging() && (process.env.STAGING_ALLOW_SNAPSHOTS || '').toLowerCase() !== 'true') {
  console.log('[staging] snapshot export skipped — APP_ENV=staging. ' +
    'Set STAGING_ALLOW_SNAPSHOTS=true only if this container owns its own dist/.');
  return;
}
```

It returns early and succeeds, rather than throwing: a skipped export must not
fail a deploy. `STAGING_ALLOW_SNAPSHOTS` is the matching, independent opt-in;
its precondition is recorded in the template — the container must own its own
`dist/` and no shared snapshot store may be serving from it.

This matters for the scheduled-jobs story in the deployment doc (§16): the
Phase 1 replacement for the Netlify cron writes snapshot JSON, and on staging it
is inert by default.

---

## 6. Task 5 — A staging deployment that looks like staging

Code is not a substitute for what the eye sees. A tester looking at a page that
renders identically to the live petition is one mis-click away from believing a
test signature counted.

`src/config/stagingMode.ts` reads a **build-time** flag and
`src/components/StagingBanner.tsx` renders the result, mounted in `src/App.tsx`
above the router content:

```
VITE_APP_ENV=staging → orange "STAGING — test environment. Signatures, alerts
                       and uploads are disabled." pill on every page
unset / production   → component returns null; production bundle unchanged
```

It is build-time on purpose. A runtime flag would let a misconfigured *staging*
build render as production, which is the failure this exists to prevent — the
bundle must have been *compiled* as staging. Two details are deliberate:

- `pointer-events-none` and `z-[200]`, so the banner can never intercept a tap
  on a petition control underneath it.
- `role="status"`, so it is announced by a screen reader.

Mirrors the existing `VITE_APP_MODE` pattern in `src/config/productionMode.ts`
rather than inventing a second mechanism.

---

## 7. Task 6 — Operator documentation and the environment contract

Two artifacts, both new:

**`docs/COOLIFY_STAGING_DEPLOYMENT.md`** — 22 sections, written to be followed
by someone who has not read this codebase:

| § | Section | § | Section |
|---|---|---|---|
| 1 | VPS prerequisites | 12 | Database safety on staging — **READ THIS BEFORE DEPLOYING** |
| 2 | Docker deployment method (Coolify) | 13 | Backup & restore procedure |
| 3 | Required environment variables | 14 | Storj requirements |
| 4 | Environment files & secret handling | 15 | Staging safety boundary (write guards) |
| 5 | First-deploy runbook | 15.1 | Regression tests |
| 6 | Health, readiness & monitoring | 16 | Scheduled jobs (snapshot refresh) |
| 7 | Domain configuration (Cloudflare) | 17 | Log inspection & monitoring |
| 8 | SSL/TLS configuration | 18 | VPS & container security hardening |
| 9 | Cloudflare cache rules | 19 | Resource limits |
| 10 | Cloudflare rate limiting & WAF | 20 | Restart procedure |
| 11 | Database connection requirements | 21 | Rollback procedure |
| | | 22 | Verification checklist (staging, before any DNS change) |

§12 is placed before the deployment sections on purpose: an operator must
understand that there is no isolated staging database *before* they start, not
after.

**`.env.staging.example`** — 11 labelled sections, `[REQ]`/`[OPT]` per variable,
each with the reason it matters and the failure mode when it is wrong. It is the
one sanctioned `.env*` exception in `.gitignore`, so the required variable set is
reviewable in Git while real values live only in Coolify. Three entries carry
warnings rather than values:

- `NODE_ENV=production` — with an explicit note *not* to set it to `staging`.
- `PRESIGNED_UPLOADS=false` — because the direct-to-Storj path would write real
  objects into the shared production bucket.
- `STORJ_BUCKET=vog` — flagged as still shared with production (§10, R2).

---

## 8. Task 7 — Regression test suite

`server/middleware/stagingGuard.test.ts` — **82 tests**, new.

The suite boots a **real Express app on a real port** and drives it with **real
HTTP requests**. Nothing is mocked, and the guard's own exported lists are never
imported to build expectations.

### 8.1 It asserts against the route table, not against the guard

This is the decision that makes the suite worth having. The inventory of routes
was transcribed from `server.ts` and the router mounts — from the application's
actual route table — *not* from `STAGING_BLOCKED_PREFIXES`. Therefore:

- If someone adds a mutating route and forgets to classify it, the suite fails.
- If someone moves or removes a mount, the suite fails.
- The suite cannot be satisfied by editing it to agree with a bug in the guard,
  because it never reads the guard.

That is a deliberate inversion of the usual test-writing instinct, and it is the
direct consequence of §3: a guard that only knows what its author remembered is
exactly how two real holes survived review.

### 8.2 What is covered

| Group | Assertions |
|---|---|
| Blocked writes | Every deny-list prefix, driven with the mutating methods that reach it → `403 STAGING_WRITE_BLOCKED` |
| The two closed holes | `POST /api/offline/sync` and `POST /api/petition/sign` by name |
| Allowed auth | `/api/auth/*`, `/api/admin/login`, `/api/admin/logout`, `/api/officials/login` |
| Prefix boundary | `/api/authx` vs `/api/authorization` — the allow list must not swallow its neighbours |
| Default deny | An unclassified mutating `/api` path → `403` with `blocked: 'unclassified-mutating-route'` |
| Reads pass | `GET`/`HEAD`/`OPTIONS` on blocked prefixes are served, not refused |
| Outside `/api/` | Static and SPA paths are never refused |
| Response contract | `403`, `X-Environment: staging`, `Cache-Control: no-store`, body shape |
| Escape hatch | `STAGING_ALLOW_WRITES=true` re-enables writes, and is inert when not staging |
| Production safety | With `APP_ENV` unset, a mutating route is **not** refused |

### 8.3 Observed result

```
 ✓ server/middleware/stagingGuard.test.ts (82 tests) 257ms
 Test Files  1 passed (1)
      Tests  82 passed (82)
```

This suite is the executable form of deployment-doc §15.1: the instruction for
"when you add a mutating route" is (1) classify it in the guard, and (2) the
suite now demands it.

---

## 9. Verification — exact commands and observed results

### 9.1 Static checks and the full suite

| Command | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0**, zero bytes of output — clean |
| `npx vitest run` | **27 test files / 306 tests passed**, exit 0 |
| `npx vitest run server/middleware/stagingGuard.test.ts` | 82 passed |
| `npx vite build` | exit 0 |

The suite total moved 224 → 306 — **+82**, all of it the new guard suite. No
pre-existing test was modified or skipped to make this pass.

### 9.2 Live runtime probes

The defect that motivated §2.1 was invisible to static reasoning, so the fix was
verified by running the real server as staging and issuing real requests.

Method: start the production entrypoint on a spare port with `APP_ENV=staging`
and `NODE_ENV=production`; POST to one route from each classification group;
record status and body; read the process log from a redirected stdout/stderr file
(the PowerShell console mangles the box-drawing characters in the guard's
warnings, so the terminal was not used as evidence).

| Probe | Before | After |
|---|---|---|
| `POST /api/alerts/broadcast` | `Invalid CSRF token` — never reached the guard | **403** `STAGING_WRITE_BLOCKED`, matched `/api/alerts` |
| `POST /api/petition/sign` | allowed — would have written to the ledger | **403**, matched `/api/petition` |
| `POST /api/offline/sync` | allowed — would have written an incident | **403**, matched `/api/offline` |
| `POST /api/authx/probe` | — | **403**, `blocked: 'unclassified-mutating-route'` |
| `GET /api/health` | 200 | 200 — reads never blocked |

The captured log contained one `[staging] BLOCKED …` line per refused request,
each naming the rule that matched.

### 9.3 What was NOT executed, and why

Stated plainly so that nothing above is mistaken for a completed end-to-end test:

- **No deploy to Coolify.** No VPS or Coolify instance was available here. The
  runbook (deployment doc §1–§22) is written but has not been walked against a
  live host.
- **No container was built in this phase.** The image and Dockerfile are Phase 1
  artifacts; this phase changed only application code inside them.
- **No browser test on a staging URL.** The banner was verified by building with
  `VITE_APP_ENV=staging` (it renders) and without (it compiles out) — not by
  loading `test.voiceofgudalur.space`.
- **The presigned-upload happy path remains unexercised**, and is deliberately
  gated off (`PRESIGNED_UPLOADS=false`) because there is no isolated staging
  bucket to write into. A Phase 1 open item carried forward, not a Phase 2
  regression.
- **No request was ever made against production.** Every probe ran against a
  locally started, staging-configured process.

---

## 10. Risk register

The risks below are the reason this phase exists. Every one of them is a way a
test environment could touch something real.

| ID | Risk | Impact | Likelihood | Mitigation | Status |
|---|---|---|---|---|---|
| **R1** | **No isolated staging database.** The staging container points at the shared production CockroachDB cluster. | Critical — test writes enter the live public record | High without mitigation | Fail-closed guard: every mutating route that reaches the ledger returns `403`. Exporter refuses to run. | **Mitigated, not eliminated** — see R5 |
| **R2** | Shared production Storj bucket. | High — test media appears beside real campaign media | Medium | `/api/media` blocked on staging; `PRESIGNED_UPLOADS=false` in the template, so its direct-to-Storj path is both gated off *and* route-blocked. | Mitigated |
| **R3** | Real Web Push delivery to real subscribers' devices. | High — a test could ring a stranger's phone | Medium | Two `server.ts` guards placed before each `sendNotification()` call; the routes are also blocked by the guard. | Mitigated (defence in depth) |
| **R4** | Snapshot export overwriting `dist/data/*.json`, the public read path. | Medium — the crowd reads test data | Medium | Staging guard in `scripts/exportSnapshot.ts`; independent `STAGING_ALLOW_SNAPSHOTS` opt-in. | Mitigated |
| **R5** | **Account and session rows.** The allowed auth routes (`/api/auth/*`, admin/official login) do write to the shared database. | Low–Medium — an account row or session may be created or touched | Certain if login is exercised on staging | **None, by design** — these routes must work for anyone to inspect staging at all. | **Accepted, documented** — the guard's header and §2.2 state this limit explicitly |
| **R6** | A mutating route added later escapes the deny list. | High | Low | Default-deny for unclassified mutating `/api` routes + the 82-test suite + deployment-doc §15.1 guidance. | Mitigated |
| **R7** | `STAGING_ALLOW_WRITES=true` left set after a verification window. | High — the boundary is fully off | Low | Template default is `false`; a loud boot-time warning is logged; `writes_allowed` is visible in `/api/health`. | Mitigated, with detection |
| **R8** | Google OAuth redirect URI not registered for the staging domain. | Medium — Google login fails on staging; other login paths still work | Medium | Documented in `.env.staging.example` (`SITE_URL`) and deployment doc §3. | **Open** — a console action at deploy time |
| **R9** | Turnstile widget shared with production. | Low–Medium — challenge interstitials fail verification on staging | Low | Separate-widget advice is in the template and deployment doc §3. | **Open** — a console action at deploy time |
| **R10** | Third-party AI cost incurred by a test environment. | Low | Low | `/api/ai` blocked; `AI_VOG_ENABLED=false`. | Mitigated |
| **R11** | The committed `.gitignore` was **UTF-16LE with a BOM**, so Git treated it as a binary blob (`Bin 294 -> 288 bytes` in the diff) and its patterns were unreliable for other tooling. | Medium — ignore-rule drift; the `.env*` protection is safety-relevant | Present until fixed | Normalized to UTF-8 while adding the `!.env.staging.example` exception. | **Fixed in this phase** (§12) |
| **R12** | `dump.txt` (11 KB — a stray copy of `CampaignDashboard.tsx`) sits untracked in the repository root. | Low — clutter, and `git add -A` would commit it | Low | — | **Open** — recommend deleting it or adding it to `.gitignore` |

R1 and R5 should be read together. The guard converts "staging can corrupt the
public record" into "staging can create an account and a session". That is a
deliberate, stated trade: without a working session nobody can log in to inspect
staging at all, and no isolated database exists yet to make the stronger promise
possible.

---

## 11. Unresolved risks and open items

### 11.1 Explicit non-goals of Phase 2

- **Not** provisioning an isolated staging database. The guard manages the risk;
  it does not remove it. Until a separate cluster or database exists, R1 stands.
- **Not** provisioning an isolated Storj bucket or key (R2).
- **Not** changing production behaviour. The entire production surface of this
  phase is one middleware that immediately calls `next()`.
- **Not** an end-to-end Coolify deploy — see §9.3.
- **Not** enabling the presigned-upload flow, on staging or anywhere.

### 11.2 Blast radius and rollback

The honest answer on production is *almost* none, and the reason is structural
rather than hopeful:

- `stagingAllowsWrites()` returns `true` unconditionally when `APP_ENV` is not
  `staging`, so the first line of `stagingGuard` is `next()`. Every
  classification branch below it is unreachable on the live site.
- `APP_ENV` is unset in production. It is not added to the production
  environment, and its absence *is* the safe default.
- The shipped bundle is unchanged: `StagingBanner` compiles to `null` without
  `VITE_APP_ENV=staging`, and `scripts/exportSnapshot.ts` behaves as it always
  did when `isStaging()` is false.
- The only unconditional production cost is one extra middleware function call
  per request.

**Rollback** is therefore proportionate: unset `APP_ENV`, or delete the single
`app.use(stagingGuard)` line at `server.ts:103`, and redeploy. The staging
container reverts to ordinary mutating behaviour, and nothing else in the phase
needs undoing, because everything else is already inert.

The one thing rollback must *not* be used to do is keep `APP_ENV=staging` while
removing the guard — that combination is precisely the unsafe configuration this
phase exists to eliminate.

---
## 12. Final change set

### 12.1 New files (Phase 2)

| File | What it is |
|---|---|
| `server/middleware/stagingGuard.ts` | The safety boundary: environment resolution, route classification, middleware. |
| `server/middleware/stagingGuard.test.ts` | 82 tests driving a real Express server over real HTTP. |
| `src/config/stagingMode.ts` | Build-time `VITE_APP_ENV` → `IS_STAGING` plus the banner text. |
| `src/components/StagingBanner.tsx` | The visible staging pill; compiles to `null` in production. |
| `.env.staging.example` | The staging variable contract: 11 sections, `[REQ]`/`[OPT]`, placeholders only. |
| `docs/COOLIFY_STAGING_DEPLOYMENT.md` | The 22-section operator runbook. |
| `docs/PHASE_2_COOLIFY_STAGING_REPORT.md` | This report. |

### 12.2 Modified (Phase 2)

| File | Change |
|---|---|
| `server.ts` | Imports the guard; mounts it at `:103` **before** the body parsers, CSRF and rate limiters; suppresses both Web Push send sites (`:647`, `:689`); logs the staging identity banner at boot; reports `environmentInfo()` from `/api/health`. |
| `scripts/exportSnapshot.ts` | Refuses to overwrite `dist/data/*.json` on staging unless `STAGING_ALLOW_SNAPSHOTS=true`. |
| `src/App.tsx` | +2 lines: the import and `<StagingBanner />`. |
| `.gitignore` | **Encoding repaired** (UTF-16LE → UTF-8) and `!.env.staging.example` added, so the staging variable contract is reviewable in Git while every other `.env*` stays ignored. |

### 12.3 Already modified before this phase (not Phase 2 work)

The working tree also carries Phase 1's changes. They are listed here so the diff
is not misread as belonging to this phase:

| File | Phase 1 change |
|---|---|
| `.env.example` | +22 lines: `TRUST_PROXY_HOPS`, `SHUTDOWN_TIMEOUT_SECONDS`, `PRESIGNED_UPLOADS`. |
| `package.json`, `package-lock.json` | `start` / `start:prod` / `build:web` scripts; `tsx` promoted from dev to runtime dependency (the image runs TypeScript directly). |
| `server/routes/media.ts`, `server/services/storj.ts` | The presigned direct-to-Storj upload path. |
| `src/pages/CampaignDashboard.tsx` | Removed a duplicate `const signers` declaration — the pre-existing type break that Phase 1 report §7.2 records finding. |
| `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `docs/PHASE_1_IMPLEMENTATION_REPORT.md`, `docs/PRODUCTION_MIGRATION_PREFLIGHT.md` | Phase 1 artifacts, still untracked. |

### 12.4 Verification status of this change set

```
npx tsc --noEmit                             exit 0   (0 bytes of output)
npx vitest run                               27 files, 306 tests passed
npx vitest run server/middleware/stagingGuard.test.ts
                                             82 tests passed
npx vite build                               exit 0
```

Every figure above was re-run at the close of this phase rather than carried
over from an earlier run.

### 12.5 Commit status

**Nothing in this phase has been committed.** `ec5c8d0` is still the tip, and the
entire Phase 1 + Phase 2 change set sits in the working tree — including several
untracked files that must be added deliberately.

One caution before committing: `dump.txt` (R12) is untracked and would be swept
in by `git add -A`. Add files by name instead.

