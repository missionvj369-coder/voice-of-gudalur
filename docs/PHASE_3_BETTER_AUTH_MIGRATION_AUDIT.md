# Phase 3 — Better Auth Compatibility Audit & Parallel-Integration Design

**Status: READY WITH RISKS — do not cut over.**
**Verdict scope: this document authorises a PARALLEL, non-authoritative integration only. It does NOT authorise replacing the existing authentication system.**

| | |
|---|---|
| Subject | `better-auth@1.7.5` proposed for adoption |
| Target system | existing custom JWT + opaque-refresh auth (Voice of Gudalur) |
| Repository tip | `ec5c8d0` (branch `main`) |
| Method | inspection of real published package bytes, repo source, and SQL migrations |
| Result | no hard blocker found; **four** unverified items must be closed before any code is written |

---

## 0. Method, evidence standard, and honesty rules

Every factual claim in this document carries one of three markers:

- **[VERIFIED]** — read directly from authoritative bytes. The artifact is cited.
- **[UNVERIFIED]** — could not be established from available evidence. It is an open task, not an assumption.
- **[RISK]** — verified fact whose *consequence* for this codebase is adverse.

Two evidence sources were used, both real rather than documentary:

1. **Published package bytes.** `npm pack better-auth@1.7.5` extracted to `%TEMP%\ba`,
   `npm pack @better-auth/core@1.7.5` to `%TEMP%\bacore`, and
   `npm pack @better-auth/telemetry@1.7.5` to `%TEMP%\batele`.
   All API, schema and option claims come from `.d.mts` declaration files and `.mjs` implementations
   inside those tarballs — **not** from the project's website, which describes drift-prone `latest`.
2. **This repository.** `package.json`, `server/`, `src/`, `prisma/`, and
   `server/db/migrations/*.sql`.

Rules applied throughout:

- Where the vendor's documentation and the shipped bytes disagree, **the bytes win** and the disagreement is recorded.
- No capability is asserted as available because it "usually" exists in Better Auth. It is asserted
  only with a declaration-file citation.
- Where a claim would require a running database or network to settle, it is left **[UNVERIFIED]**
  and listed in §16 as a spike with an explicit acceptance test.

---

## 1. Executive verdict

### 1.1 What is confirmed compatible

| Area | Finding | Marker |
|---|---|---|
| Express/Node hosting | `better-auth/node` exports `toNodeHandler` and `fromNodeHeaders` | **[VERIFIED]** |
| Database driver | `pg ^8.0.0` is a declared peer dependency; repo ships `pg@8.23.0` | **[VERIFIED]** |
| Schema coexistence | Better Auth's default models are **singular**; this repo's are **plural** — no name collision | **[VERIFIED]** |
| "Social login must not create accounts" | Providers accept `disableSignUp` / `disableImplicitSignUp` | **[VERIFIED]** |
| Existing password hashes | `emailAndPassword.password.{hash,verify}` are overridable hooks | **[VERIFIED]** |
| Custom primary keys | `advanced.database.generateId` accepts a function receiving `{ model }` | **[VERIFIED]** |
| Telemetry privacy | Telemetry is **opt-in and off by default** in 1.7.5 | **[VERIFIED]** |
| Rate-limit storage | `rateLimit.storage` / `modelName` / `customStorage` are configurable | **[VERIFIED]** |
| CockroachDB special-casing | **zero** occurrences of `cockroach` in the shipped package | **[VERIFIED]** |

### 1.2 What is confirmed absent

| Area | Finding | Marker |
|---|---|---|
| Telegram | **zero** matches for `telegram` anywhere in `better-auth@1.7.5` or `@better-auth/core@1.7.5` | **[VERIFIED]** |
| CockroachDB | no dialect handling, no adapter, no documentation string | **[VERIFIED]** |

Telegram is therefore **not a supported provider** and cannot be "configured". Any Telegram work is
custom integration code, designed in §9 — it is not a library feature.

### 1.3 The four items that must close before implementation

These are the reason the verdict is *READY WITH RISKS* and not *READY*:

1. **CockroachDB DDL acceptance [UNVERIFIED]** — Better Auth generates its own tables. Whether its
   generated DDL executes on CockroachDB v23+ has never been tested here. See §7.3 and §16/S1.
2. **Express body-parser ordering [UNVERIFIED]** — `toNodeHandler` consumes the raw request stream.
   Its behaviour when mounted behind this app's existing `express.json()` pipeline is untested. See §5.2 and §16/S2.
3. **`zod` major-version divergence [RISK]** — Better Auth requires `zod ^4.5.4`; this repo pins
   `zod ^3.23.0` (installed 3.25.76). See §2.3 and §16/S3.
4. **Isolated staging database does not exist** — carried forward from Phase 2. No Better Auth
   migration, user import, or dual-write may be attempted against the shared production cluster.
   See §13.

### 1.4 Explicit non-goal

This document does **not** propose, in any phase, that Google or Telegram sign-in becomes the
mechanism that creates a resident. That constraint is a product invariant of this codebase, it is
already implemented, and §8/§9 are written to preserve it rather than to relax it.
---

## 2. Verified dependency and version facts

### 2.1 What `better-auth@1.7.5` declares

From the packed `package.json` **[VERIFIED]**:

```
dependencies: @better-auth/utils 0.4.2, @better-fetch/fetch 1.3.2,
  @noble/ciphers ^2.2.0, @noble/hashes ^2.2.0, better-call 1.4.0,
  defu ^6.1.4, jose ^6.2.3, kysely ^0.28.17 || ^0.29.0, nanostores ^1.3.0,
  zod ^4.5.4,
  @better-auth/core 1.7.5, @better-auth/drizzle-adapter 1.7.5,
  @better-auth/kysely-adapter 1.7.5, @better-auth/memory-adapter 1.7.5,
  @better-auth/mongo-adapter 1.7.5, @better-auth/prisma-adapter 1.7.5,
  @better-auth/telemetry 1.7.5

peerDependencies: pg ^8.0.0, @prisma/client ^5||^6||^7, prisma ^5||^6||^7,
  react ^18||^19, react-dom ^18||^19, vitest ^2||^3||^4||^5,
  mysql2 ^3, mongodb ^6||^7, drizzle-orm, drizzle-kit, next, etc.
```

Three consequences that matter here:

- **`kysely` is a direct dependency, not an optional one.** Better Auth always carries a Kysely-based
  adapter. Adopting it does not require adding a new top-level dependency to reach Kysely.
- **`@prisma/client` is only a *peer*.** Better Auth does not pull Prisma in by itself.
- **`@better-auth/telemetry` is a *direct dependency*, not `optionalDependencies`.** The package is
  always installed. Its runtime behaviour is analysed in §14.5; the short version is that it is inert
  unless explicitly switched on.

### 2.2 What this repository actually has installed

Measured from `node_modules`, not from `package.json` ranges **[VERIFIED]**:

| Package | Repo range | Installed | Better Auth need | Verdict |
|---|---|---|---|---|
| `pg` | `^8.23.0` | **8.23.0** | peer `^8.0.0` | satisfied |
| `prisma` | `^6.0.0` | **6.19.3** | peer `^5`/`^6`/`^7` | satisfied |
| `@prisma/client` | `^6.0.0` | **6.19.3** | peer `^5`/`^6`/`^7` | satisfied |
| `vitest` | `^4.1.11` | **4.1.11** | peer `^2`-`^5` | satisfied |
| `express` | `^4.21.2` | **4.22.2** | detected for telemetry only | fine |
| `typescript` | `~5.8.2` | **5.8.3** | none | fine |
| `zod` | `^3.23.0` | **3.25.76** | **dep `^4.5.4`** | **CONFLICT** |
| `better-auth` | absent | **MISSING** | — | not yet added |
| `kysely` | absent | **MISSING** | dep (bundled under `better-auth`) | arrives transitively |
| `jose` | absent | **MISSING** | dep (bundled under `better-auth`) | arrives transitively |

### 2.3 The `zod` divergence — [RISK], with mitigation

This repository uses `zod ^3.23.0` extensively for request validation. `better-auth@1.7.5` declares
`zod ^4.5.4` as a **direct dependency**, and its shipped schema files import it directly **[VERIFIED]** —
e.g. `@better-auth/core/dist/db/schema/user.mjs` begins `import * as z from "zod";`.

Because `zod@3.25.76` does **not** satisfy `^4.5.4`, npm will install a **second, nested copy** of
`zod@4` under `node_modules/better-auth/node_modules/`. Two consequences:

- **Benign by default.** Better Auth's `zod` is an internal implementation detail. Nothing in our
  request-validation code needs to interoperate with it. Nested installation is a legitimate npm
  outcome and the two versions do not collide at runtime.
- **Becomes a real defect if we hand our `zod` schemas into Better Auth configuration.** The moment a
  Better Auth option expects a *v4* schema (for example a custom `additionalFields` validator), a
  `zod@3` schema passed in will fail at runtime with confusing shape errors, because the object was
  built by a different library instance.

**Mitigation, mandatory:** Better Auth configuration must not accept any `zod` schema produced by this
repository. Where a Better Auth option needs a validator, use that library's own bundle by importing
through Better Auth's re-exported types, or use plain functions/predicates. Add an import-boundary
lint or code-review rule rather than relying on memory.

**Residual risk:** duplicate copies of `zod` in the bundle server-side, and a permanent `npm ls` peer
warning. Accepted; tracked in §16/S3.

---

## 3. What Better Auth 1.7.5 actually is

### 3.1 The entry points this integration would use

From the packed `exports` map **[VERIFIED]**:

| Subpath | Resolves to | Used for |
|---|---|---|
| `better-auth` | `dist/index.mjs` | `betterAuth({...})` factory |
| `better-auth/node` | `dist/integrations/node.mjs` | **`toNodeHandler`, `fromNodeHeaders`** |
| `better-auth/db` | `dist/db/index.mjs` | adapter/schema helpers, `getSchema` |
| `better-auth/db/adapter` | `dist/db/adapter-kysely.mjs` | internal Kysely adapter factory (`getAdapter`) |
| `better-auth/plugins/*` | per-plugin | `phone-number`, `email-otp`, `jwt`, `two-factor`, … |
| `better-auth/social-providers` | `dist/social-providers/index.mjs` | provider implementations incl. `google` |
| `better-auth/client`, `better-auth/react` | `dist/client/*` | browser client (frontend) |

### 3.2 The Node/Express handler — **now resolved** [VERIFIED]

`better-auth/node` (`dist/integrations/node.d.mts`) declares exactly:

```ts
declare const toNodeHandler: (auth: { handler: Auth["handler"] } | Auth["handler"])
  => (req: node_http.IncomingMessage, res: node_http.ServerResponse) => Promise<void>;
declare function fromNodeHeaders(nodeHeaders: node_http.IncomingHttpHeaders): Headers;
```

This closes the previously-open question. Notes that follow directly from the signature:

- It is a **raw `IncomingMessage`/`ServerResponse`** handler. It is not Express middleware and it does
  **not** call `next()` — it is terminal. It must be mounted so that it owns the matched route.
- Because it takes the raw stream, **where it sits relative to `express.json()` is load-bearing**
  (§5.2). This is the second of the four blockers.
- `toNodeHandler` accepts either the whole `auth` object or just `auth.handler`, so mounting can be
  as narrow as `app.all('/api/ba/*', toNodeHandler(auth))`.

### 3.3 Default data model (from shipped `@better-auth/core` schema files) [VERIFIED]

`coreSchema` in `@better-auth/core/dist/db/schema/shared.mjs`:

```js
const coreSchema = z.object({
  id: z.string(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});
```

Each model extends it (`@better-auth/core/dist/db/schema/*.mjs`):

| Model | Default table name | Fields beyond `id`/`createdAt`/`updatedAt` |
|---|---|---|
| `user` | `user` | `email` (lower-cased by transform), `emailVerified` (bool, default `false`), `name` (string, **required**), `image` (nullish) |
| `session` | `session` | `userId`, `expiresAt`, `token`, `ipAddress` (nullish), `userAgent` (nullish) |
| `account` | `account` | `providerId`, `accountId`, `userId`, `accessToken`, `refreshToken`, `idToken`, `accessTokenExpiresAt`, `refreshTokenExpiresAt`, `scope`, `password` (nullish) |
| `verification` | `verification` | `identifier`, `value`, `expiresAt` |
| rate limit | `rateLimit` (per `options.rateLimit.modelName`) | `key`, `count`, `lastRequest` — **no `id`/timestamps** |

Three details that will matter later:

- **`id` is `z.string()`** in every model, so a custom `id` strategy is type-compatible with this
  repo's `STRING` identifiers (§10).
- **Credentials live on the `account` row, not on `user`.** `account.password` is the credential
  store, with `providerId = "credential"`. A password hash is therefore *not* a column on `user`.
- **`user.name` is required and `user.email` is not nullish**, whereas this repo has residents with a
  phone and no email. This asymmetry is a migration concern (§11).

### 3.4 Table naming is configurable, and the default is singular [VERIFIED]

`@better-auth/core/dist/db/adapter/get-default-model-name.mjs` resolves the physical model by looking
up `schema[candidate]` or an entry whose `modelName` matches. The shipped `get-tables` logic reads
`options.session?.modelName || "session"` and equivalents per model, so **every** model name can be
overridden via `<model>.modelName`.

`usePlural` is handled by stripping a trailing `s` to find the schema key:

```js
if (usePlural && model.charAt(model.length - 1) === "s") {
  const m = resolve(model.slice(0, -1));
  if (m) return m;
}
```

Interpretation, stated precisely because it is the crux of §6: `usePlural` tells Better Auth that
**your existing tables are named in the plural**, so it should address `users`/`sessions` rather than
`user`/`session`. It is a *pointer at your tables*, not a renaming of its own. That is exactly why it
is dangerous here.
---

## 4. Inventory of the existing authentication system

Every claim below names the file it came from. This is the system Better Auth would have to live beside.

### 4.1 Token model

**[VERIFIED]** — `server/services/authService.ts`, `server/db/migrations/001_base_schema.sql`:

- **Access credential: a JWT** signed with `SESSION_SECRET`, carrying the identity
  (`uid`, `phone`, `gudalurId`, `name`, `role`, `kind`, `localityName`). Verified per request by
  `server/middleware/auth.ts`, which populates `req.user`.
- **Refresh credential: an opaque random token** stored in the `sessions` table, with only its hash
  retained (`refresh_token_hash`), plus `expires_at` and `revoked_at`.
- **Session lifetime** defaults to `SESSION_TTL_SECONDS=86400` (24 h) per `.env.staging.example`.
- **CSRF: a bespoke `csrfToken`**, minted at session creation, returned in the login response body,
  and echoed by the client. This is *not* the double-submit-cookie pattern and *not* Better Auth's.

`sessions` table shape **[VERIFIED]**:

```sql
CREATE TABLE sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_id        STRING NOT NULL,
    identity_kind      STRING NOT NULL,
    refresh_token      STRING NOT NULL UNIQUE,
    refresh_token_hash STRING NOT NULL,
    user_agent         STRING,
    ip                 STRING,
    role               user_role,
    created_at         TIMESTAMPTZ DEFAULT now() NOT NULL,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    CONSTRAINT chk_session_kind CHECK (identity_kind IN ('user','official'))
);
```

Two structural facts worth isolating now, because they drive §12:

- The table has **no session "token" column** in Better Auth's sense — only a refresh token and its
  hash. Better Auth's `session.token` is the session cookie value itself.
- The table is **polymorphic**: `identity_kind` is `'user'` *or* `'official'`, with `identity_id`
  pointing at whichever ledger. Better Auth's `session.userId` is a single foreign key to `user`.

### 4.2 Identity model

**[VERIFIED]** — `prisma/schema.prisma` is present; `server/db/migrations/*.sql` define the real tables.

- `users` holds residents, keyed by a `STRING` `uid` plus a human-facing Gudalur ID matching
  `GD-YYYY-XXXXXX` (regex enforced in `src/context/AuthContext.tsx#isRealGudalurId`).
- `officials` is a **separate** ledger; migration `006_official_password_auth.sql` added password
  authentication for officials.
- Social identity is currently denormalised **onto the `users` row** as `provider` +
  `provider_subject` (migration `020_social_auth_columns.sql`) — not in a separate accounts table.
- A resident may hold both a Google and a Telegram link, which "one row, one provider" cannot express.
  That is precisely why `signature_authorizations` (migration `023`) exists as the many-provider record.

### 4.3 The social-sign-in invariant (product rule, already implemented)

**[VERIFIED]** — `server/routes/auth.ts#findSocialResident`:

> Social sign-in is **AUTHENTICATION ONLY** — no new ID generation. Users MUST first register through
> normal data filling to get a Gudalur ID. Google/Telegram are used ONLY to sign in and sign the petition.

Resolution order, **throwing `NO_ACCOUNT` when nothing matches**:

1. `WHERE provider = $1 AND provider_subject = $2`
2. for Google, `WHERE email = $1`
3. `WHERE phone = $1`
4. otherwise `throw new Error('NO_ACCOUNT')` → HTTP 404 with a human-readable message

It then back-fills `provider`/`provider_subject` **only if they are empty**, so an existing link is
never overwritten.

Existing provider verification **[VERIFIED]**:

- **Google** — `verifyGoogleIdToken()` does the JWKS dance by hand: fetch
  `https://www.googleapis.com/oauth2/v3/certs`, match `header.kid`, build an RSA public key via
  `crypto.createPublicKey({ format: 'jwk' })`, verify `RSA-SHA256`, then check
  `aud === GOOGLE_CLIENT_ID`, `iss` against `accounts.google.com` / `https://accounts.google.com`, and
  `exp`. There is also a full `GET /google/url` → `GET /google/callback` authorization-code flow.
- **Telegram** — `verifyTelegramHash()` computes
  `HMAC-SHA256(key = sha256(TELEGRAM_BOT_TOKEN))` over the alphabetically sorted, newline-joined
  `k=v` fields excluding `hash`, and compares hex digests. `POST /api/auth/telegram` additionally
  enforces a **24-hour replay window** on `auth_date`
  (`authAge < 0 || authAge > 86400` → reject).

Note the intent already recorded in migration 023: Telegram is treated as **mobile-number validation**
(`phone_matched`), while Google is treated as **identity authentication**. A generic provider
integration would erase this distinction.
### 4.4 Privacy posture on provider subjects (a constraint, not a preference)

**[VERIFIED]** — `server/db/migrations/023_signature_authorizations.sql`, `server/security/vouTokens.ts`:

Only a **keyed hash** of the provider subject is ever stored:
`sha256("authorization:<provider>:<subject>:<secret>")` via `generateProviderSubjectKey`. The raw Google
`sub` and the raw Telegram id are **never persisted**; `subject_label` holds a masked display hint.

By contrast, Better Auth's `account.accountId` stores the **raw provider subject in plaintext** as a
required column. This is the single most important privacy divergence between the two systems, and it
is addressed in §8.4 and §10.4. Not a blocker — but it must be a deliberate, recorded decision rather
than an accident of adopting a library.

### 4.5 Database access, and the truth about Prisma

**[VERIFIED]** — repository-wide search for `PrismaClient` and `@prisma/client` across `src/`, `server/`, `scripts/`.

The **only** occurrence is in `server/security/vouAudit.ts`:

```ts
import type { Prisma } from "@prisma/client";
type DbClient = Prisma.TransactionClient;
```

That is a **type-only import** used to name a type alias. **There is no `new PrismaClient()` anywhere
in the codebase.** All runtime database access is raw SQL over `pg` (`db.queryOne(...)`,
`db.execute(...)` in `server/routes/auth.ts`).

Stated explicitly because it invalidates the otherwise-attractive assumption that "Prisma is already
here, so use the Prisma adapter". Prisma exists as (a) a dev-time CLI (`prisma generate`, `prisma
studio`) and (b) a source of type declarations. It is **not** a live data-access layer. Choosing the
Prisma adapter would mean *introducing* a runtime PrismaClient and a full model set — a far larger
change than the Kysely route (§7).

### 4.6 Existing tables (complete list, for collision analysis)

**[VERIFIED]** — every `CREATE TABLE` in `server/db/migrations/*.sql`:

```
alerts, animal_sightings, app_config, audit_events, external_supports,
identity_verification_transactions, locality, manifesto_signatures, manifesto_stats,
manifesto_submissions, media_posts, officials, otp_tokens, petition_batches,
petition_mobile_signs, petition_signs, petition_stats, petition_supports, petitions,
push_log, push_subscriptions, sessions, signature_authorizations, signatures,
social_consent_log, sync_idempotency, users, validation_links, validation_witnesses,
voice_petitions, wildlife_incidents
```

Note what is **not** in that list: no `account`, no `verification`, no singular `user`, no singular
`session`. This is the foundation of §6.

### 4.7 Authentication-relevant environment contract

**[VERIFIED]** — `.env.staging.example`:

| Variable | Req | Relevance to Better Auth |
|---|---|---|
| `SESSION_SECRET` | REQ | Better Auth needs its own `secret`; **do not reuse** (§14.2) |
| `SESSION_TTL_SECONDS=86400` | OPT | maps to Better Auth `session.expiresIn` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OPT | reusable for the Google provider (§8.2) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | OPT | custom integration only (§9) |
| `TRUST_PROXY_HOPS=1` | REQ | **coexists with** Better Auth's separate proxy model (§14.4) |
| `DATABASE_URL` (CockroachDB `:26257`, `sslmode=verify-full`) | REQ | shared with Better Auth's engine |
| `DATABASE_SSL_CA=/etc/vog/cockroach-ca.crt` | REQ | must also apply to any Better Auth connection |
| `APP_ENV`, `STAGING_ALLOW_WRITES=false` | REQ | the Phase 2 safety boundary (§13) |

The same file records that **no isolated staging database exists yet**, and that `SESSION_SECRET` /
`PETITION_IDENTITY_SECRET` must be **regenerated per environment** so that a token can never be
replayed against the live site.

---

## 5. Capability-by-capability compatibility matrix

| # | Capability needed | Existing implementation | Better Auth 1.7.5 | Verdict |
|---|---|---|---|---|
| 1 | Resident registration by phone + OTP | `routes/auth.ts`, `otp_tokens` | `phone-number` plugin exists | **Coexist, do not switch** |
| 2 | Official password login | `006_official_password_auth.sql` | `emailAndPassword` + `password.{hash,verify}` | **Adaptable — hash reuse possible** |
| 3 | Google sign-in (existing users only) | hand-rolled JWKS verify | `socialProviders.google` + `disableSignUp` | **Compatible with intent** |
| 4 | Telegram sign-in | hand-rolled HMAC verify | **absent from package** | **Custom code required** |
| 5 | Social sign-in must not create accounts | `throw NO_ACCOUNT` | `disableSignUp` / `disableImplicitSignUp` | **Compatible, needs wiring** |
| 6 | Google `sub` must never be stored raw | `subject_hash` only | `account.accountId` is plaintext | **DIVERGENCE — decide explicitly** |
| 7 | Session as JWT + opaque refresh | `sessions` table | session token + cookie | **DIVERGENCE — bridge in §12** |
| 8 | Bespoke `csrfToken` | login response field | Origin + Sec-Fetch checks | **Two systems coexist** |
| 9 | Post-signature provider authorization | `signature_authorizations` | no equivalent | **Keep ours** |
| 10 | Officials as a separate identity kind | `identity_kind='official'` | single `user` model | **Cannot be modelled — §10.5** |
| 11 | CockroachDB | `pg` + raw SQL | Kysely/Postgres dialect | **[UNVERIFIED] §7** |
| 12 | Rate limiting | `express-rate-limit` 8.7.0 | own counter + storage | **Two systems coexist** |
| 13 | Telemetry must not leak | n/a | opt-in, default off | **Compatible** |

### 5.1 The Express mounting problem — blocker #2

`toNodeHandler` returns `(req: IncomingMessage, res: ServerResponse) => Promise<void>` **[VERIFIED]**.
It reads the **raw** request stream. This repository's `server.ts` builds a conventional Express
pipeline, which consumes that stream with body-parsing middleware before routes run.

Consequence: if the Better Auth mount is placed **after** body parsing, Better Auth receives an
already-drained stream and cannot parse its own request bodies or verify signatures over raw bytes.
The mount must therefore be registered **before** the body parser — or explicitly re-buffered.

This ordering constraint is **[UNVERIFIED]** empirically: Better Auth has not been run inside this
pipeline. It is a **hard prerequisite** for implementation and is spike **S2** in §16 with a concrete
acceptance test. It is recorded as a blocker rather than a note because getting it wrong produces
intermittent, hard-to-diagnose failures (GET works, POST fails) rather than a clean error.

### 5.2 "No account creation" is natively expressible — the key positive finding

The existing `NO_ACCOUNT` behaviour is not a fight against the library. The shipped Google provider
surface accepts **[VERIFIED]** (enumerated by `@better-auth/telemetry`'s detector, which reads the real
option shape):

```
disableImplicitSignUp, disableSignUp, mapProfileToUser, disableIdTokenSignIn,
overrideUserInfoOnSignIn, getUserInfo, verifyIdToken, refreshAccessToken, scope, prompt
```

- `disableSignUp: true` on the provider blocks account creation outright.
- `disableImplicitSignUp: true` is the more precise fit: sign-in succeeds for an existing user, but an
  unknown identity cannot silently provision one.

The product invariant can therefore be *enforced by configuration* rather than reimplemented — the
first genuinely encouraging compatibility result in this audit. Implementation detail in §8.3.

### 5.3 Where Better Auth must not be allowed to take over

Three areas where adopting Better Auth's model would **regress** the product, and which are therefore
out of scope for the parallel integration:

1. **Provider-subject privacy** (§4.4). Better Auth stores `accountId` in plaintext. If Better Auth
   becomes the authority for provider links, the privacy property of migration 023 is lost.
2. **The `official` identity kind** (§4.2). Better Auth's schema has one `user` model and a
   `session.userId` FK. The polymorphic `identity_kind` has no equivalent, so officials cannot be
   represented without either a second Better Auth instance or a synthetic user per official.
3. **Ordered, hash-chained audit** (`server/security/vouAudit.ts` → `audit_events`). Better Auth's
   activity surface is not a tamper-evident chain, and Phase 1 established that property. Better Auth
   events must feed *into* the existing chain, never replace it.

---

## 6. Schema collision analysis — the decisive compatibility question

Question asked: *can Better Auth coexist with the current `users`/`sessions` tables without collisions?*

### 6.1 Answer: yes, under one absolute rule

**[VERIFIED]** — comparing §4.6 against §3.3:

| Better Auth default model | Default physical name | Does this repo already have it? |
|---|---|---|
| `user` | `user` | **No** (repo has plural `users`) |
| `session` | `session` | **No** (repo has plural `sessions`) |
| `account` | `account` | **No** |
| `verification` | `verification` | **No** |
| rate limit | `rateLimit` | **No** |

With **defaults**, Better Auth creates five *new, singular* tables beside the existing *plural* ones and
touches nothing else. **No collision.**

### 6.2 The absolute rule: `usePlural` must never be enabled

**[VERIFIED]** — `get-default-model-name.mjs`:

```js
if (usePlural && model.charAt(model.length - 1) === "s") {
  const m = resolve(model.slice(0, -1));
  if (m) return m;
}
```

`usePlural: true` makes Better Auth address `users` and `sessions` — **our production tables, with our
column names**. Better Auth would then attempt to read and write columns such as `email_verified`,
`token`, and `user_id` that do not exist on those tables, and would treat `users.uid` as `user.id`.

Consequences would include failing auth requests and, worse, stray writes to the resident ledger by a
library that does not understand its invariants.

**Rule: `usePlural: false` (the default) is mandatory. Any pull request that sets it must be rejected.**
Record it as a permanent guardrail next to the Better Auth configuration, not just in this document.

### 6.3 Two secondary naming hazards

1. **`user` is a reserved word in the Postgres/SQL dialect family** (`SELECT current_user`). Whether
   CockroachDB accepts an unquoted table literally named `user` has **not** been tested here
   **[UNVERIFIED]**, and is folded into spike S1. Mitigation regardless: set `user.modelName` to
   something explicit (e.g. `ba_user`) so no quoting question ever arises.
2. **`rateLimit` is camelCase.** A table with an uppercase letter requires quoting in every query.
   Since `rateLimit.modelName` is configurable, name it explicitly (e.g. `ba_rate_limit`).

**Recommendation:** set explicit model names for all five models up front. It costs nothing, removes
both hazards, and makes the Better Auth tables instantly identifiable in a shared CockroachDB schema.

### 6.4 Field-level divergence that matters even with no collision

Even with disjoint table names, some mappings are *semantically* different, not just differently named:

| Concept | Ours | Better Auth | Note |
|---|---|---|---|
| Session secret | `refresh_token` + `refresh_token_hash` | `session.token` | ours is opaque refresh; theirs is the cookie value |
| Session subject | `identity_id` + `identity_kind` (polymorphic) | `session.userId` (single FK) | officials have no home |
| Provider link | `users.provider` + `provider_subject` | `account.providerId` + `accountId` | theirs is one-row-per-provider |
| Provider subject storage | **keyed hash only** | **plaintext** | see §4.4 |

These are the reasons a *bridge* (§12) is needed rather than a simple column rename.

---

## 7. Database adapter route and the CockroachDB question

### 7.1 The three viable routes

Better Auth 1.7.5 ships five adapters **[VERIFIED]** (`drizzle`, `kysely`, `memory`, `mongo`, `prisma`).
For this repository exactly two are realistic.

**Route A — Kysely over the existing `pg` pool. RECOMMENDED.**
- `kysely ^0.28.17 || ^0.29.0` is already a direct dependency of `better-auth` **[VERIFIED]**, so no new
  top-level dependency is introduced.
- `pg` is already this repository's driver, and Better Auth declares `pg ^8.0.0` as a peer **[VERIFIED]**.
- `better-auth/db/adapter` resolves to `dist/db/adapter-kysely.mjs` exporting
  `getAdapter(options): Promise<DBAdapter>` **[VERIFIED]** — the Kysely path is the built-in default,
  not an add-on.
- Blast radius: a *new* Kysely connection pool beside the existing one, pointed at the same cluster.
  Our raw-SQL code paths are untouched.
- Kysely has a `PostgresDialect`, so wiring is conventional.

**Route B — Prisma adapter. REJECTED for now.**
- The peer range is satisfied (`@prisma/client` 6.19.3) **[VERIFIED]**, but §4.5 established that
  Prisma is **not used at runtime** in this repository.
- Adopting it would require adding every Better Auth model to `prisma/schema.prisma`, generating a
  client, and instantiating a PrismaClient in production for the first time — a new data-access
  paradigm introduced solely for one library, against a database (CockroachDB) whose Prisma connector
  support is a further unknown.
- Verdict: possible in principle, unjustifiable in blast radius for a parallel integration.

**Route C — custom adapter.**
- `@better-auth/core/db/adapter` exposes an adapter contract (`DBAdapter`, `supportsNumericIds`,
  `generateId` interplay — see the adapter type comments **[VERIFIED]**). Writing one is feasible.
- Verdict: hold as the fallback **only if Route A fails the CockroachDB spike (S1)**. It is the
  highest-effort option and should not be the starting point.

### 7.2 CockroachDB: what the package says

**[VERIFIED]** — text search across both packed tarballs: **zero** occurrences of `cockroach`.

This is not a claim that CockroachDB will fail. It is a claim that **Better Auth knows nothing about
it**. Every query Better Auth emits goes through Kysely's Postgres dialect and whatever DDL its
migration generator produces. Two specific unknowns follow:

1. **DDL acceptance.** Better Auth's generated `CREATE TABLE` statements may use constructs that
   CockroachDB rejects or interprets differently (identity/serial columns, `ON CONFLICT` variants,
   index syntax, transactional-DDL wrapping). Untested here.
2. **Query-shape acceptance.** Kysely's generated SQL assumes Postgres. CockroachDB is wire-compatible
   but not feature-identical. Most queries will work; "most" is not an acceptance criterion for
   authentication code.

### 7.3 Isolation from the existing system — the important architectural point

Because Better Auth would own **its own five tables** (§6.1), its compatibility problem is *contained*.
It does not need to read or write `users`, `sessions`, `otp_tokens`, `officials`, or `signatures`.

Therefore a CockroachDB incompatibility in Better Auth's own tables is **survivable and reversible**,
whereas an incompatibility in a shared table would be neither. This containment is precisely what makes
the parallel integration safe to attempt, and it is the reason §6's naming rule matters so much.

### 7.4 Verdict on the database route

- Route A (Kysely + `pg`) is the correct starting point.
- **CockroachDB acceptance is [UNVERIFIED] and is blocker #1.** Nothing in the package settles it.
- It must be settled by spike S1 (§16) against a *non-production* CockroachDB instance before any
  Better Auth code is merged. The acceptance test is stated there explicitly.

---

## 8. Google provider — design for a parallel integration

### 8.1 What exists today vs. what Better Auth offers

Today the server hand-rolls JWKS retrieval, RSA verification, `aud`/`iss`/`exp` checks, and a separate
authorization-code flow **[VERIFIED]**. Better Auth ships a `google` social provider that performs
token exchange, ID-token verification, userinfo retrieval, and account linking **[VERIFIED]** — it is
not implemented in this repo.

The value of switching is real: hand-rolled JWKS/crypto code is exactly the kind of surface that
silently rots (key rotation, algorithm confusion). But the switch is **not** free: §4.4's privacy rule
and §4.3's no-creation rule must both survive.

### 8.2 Environment is already compatible

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are already declared in `.env.staging.example`
**[VERIFIED]**, and `SITE_URL` already drives the redirect URI (`/api/auth/google/callback`).
A Better Auth Google provider consumes exactly these. **No new secrets are required.**

### 8.3 The no-creation rule, translated into configuration

**[VERIFIED]** options: `disableImplicitSignUp` and `disableSignUp` are real provider options (§5.2).

```text
socialProviders.google = {
  clientId:     GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  disableSignUp:        true,   // hard: never provision
  disableImplicitSignUp: true,  // belt and braces
}
```

**Behavioural contract to test (and to assert in a regression test):** with both flags set, an
authentication attempt for an identity with no resident record must **fail closed** and must not
insert into either `user` or `account`. That is the direct analogue of today's
`throw NO_ACCOUNT` → HTTP 404.

**Gap that configuration alone cannot close:** Better Auth's failure mode will not be a 404 carrying
our message. A custom error hook, or an explicit post-check on the Better Auth response, is required to
reproduce the current `"Please register first..."` response so the frontend keeps working. This is a
small, bounded piece of code — but it is **required**, and it is why §5.2's "compatible" does not mean
"zero code".

### 8.4 Provider-subject privacy must be preserved

**[VERIFIED]**: `account.accountId` is `z.string()` and stores the raw provider subject. Our rule (§4.4)
is keyed-hash only.

Design: use a `databaseHooks.account.create.before` / `account.update.before` hook **[VERIFIED]** —
the `databaseHooks` surface includes per-model `create`/`update` × `before`/`after` — to either

- (a) rewrite the incoming `accountId` to the keyed hash before persistence, or
- (b) reject the write and delegate to the existing `signature_authorizations` path.

Option (a) is preferred: it keeps Better Auth self-consistent (its own lookups still work) while never
persisting a raw subject. It does mean `account.accountId` holds a hash — acceptable, since our own
`subject_hash` column holds exactly that today.

**This hook is not optional.** Shipping Better Auth Google sign-in without it would silently and
permanently introduce plaintext Google `sub` values into the database — a regression of a deliberate
Phase 1 privacy control.

### 8.5 Verdict

Google is **compatible and worth doing**, with three mandatory pieces of wiring: the two no-creation
flags, an error-path shim for the 404 contract, and the subject-hash hook. All three are configuration
or small custom code — none is an architectural concession.

---

## 9. Telegram — a custom integration, not a configuration

### 9.1 The finding that determines everything here

**[VERIFIED]** — text search of the packed `better-auth@1.7.5` and `@better-auth/core@1.7.5` trees:
**zero** occurrences of `telegram`.

There is no Telegram provider, no plugin, no documentation string, no test fixture. Telegram sign-in
cannot be configured into Better Auth 1.7.5. Any statement to the contrary would be fabrication.

### 9.2 What Telegram actually means in this codebase

**[VERIFIED]** — migration 023: Telegram is *mobile-number validation*, not identity authentication.
`signature_authorizations.phone_matched` records whether the number shared with the bot matched the
number on the resident record. That is a business rule about **petition trust level**, not an
authentication-provider detail, and no generic OAuth-style provider could express it.

### 9.3 Design: keep Telegram entirely in our own code

1. **Keep** `verifyTelegramHash()` and the 24-hour `auth_date` replay window **exactly as they are**
   **[VERIFIED]**. They are correct, small, and already reviewed.
2. **Do not** route Telegram through Better Auth's session creation. Let it continue to call
   `createSession()` and set our cookies (§12 handles dual acceptance).
3. **Do** call the shared *identity-resolution service* (§10.2) from the Telegram path, so that
   Telegram and Better Auth resolve identity identically rather than duplicating lookup rules.

Rationale for (2): Telegram's value here is the `phone_matched` trust signal. Wrapping it in Better
Auth would add a second session authority for no benefit, and Better Auth has no concept of
`phone_matched`.

### 9.4 The one place Better Auth could legitimately help

If a *native* Telegram provider is ever wanted, the route would be Better Auth's generic custom
provider mechanism — but **[UNVERIFIED]** whether 1.7.5 exposes a generic provider configurable enough
for Telegram's model. Telegram is **not** OAuth2: it is a signed form POST from the Login Widget. That
mismatch is structural, not cosmetic.

**Conclusion: treat Telegram as out of Better Auth's scope for the whole of this phase.** Any future
native provider work is a separate, separately-reviewed design. Recording this explicitly prevents a
future contributor from assuming a "Telegram plugin" exists and hunting for one.

### 9.5 Env contract

`TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` are declared `[OPT]` in `.env.staging.example`
**[VERIFIED]**. The staging file already advises leaving them **unset** so that no real third-party
account is linked from a test environment — advice that should carry over unchanged, since Telegram
links residents to real phone numbers.

---

## 10. Identity mapping between the two systems

### 10.1 The mechanism exists and is verified

**[VERIFIED]** — `@better-auth/core/dist/types/init-options.d.mts`:

```ts
type GenerateIdFn = (options: { model: ModelNames; size?: number | undefined }) => string | false;
```

Reachable as `advanced.database.generateId`. It receives `model`, so mapping can be done **per model**
— exactly what is needed. Returning `string` supplies the id; returning `false` defers to the adapter.

Also verified on the same option surface: `user.additionalFields`, `user.fields`, `user.modelName`,
`session.additionalFields`, `session.fields`, `account.modelName`, `account.fields` — i.e. both
*names* and *extra columns* are configurable.

### 10.2 The mapping table (the core of this design)

| Existing | Better Auth | Mechanism | Note |
|---|---|---|---|
| `users.uid` (STRING) | `user.id` | see §10.3 | |
| `users.email` | `user.email` | value copy | BA lower-cases emails (§3.3) — check against our `WHERE email = $1` |
| `users.name` | `user.name` | value copy | BA `name` is **required**; needs a fallback |
| `users.photo_url` | `user.image` | value copy | |
| `users.provider` | `account.providerId` | import script | one row per provider |
| `users.provider_subject` | `account.accountId` | **keyed hash** (§8.4) | never plaintext |
| `users.phone` | `user.additionalFields` | config | residents may have **no email** |
| `users.role` | `user.additionalFields` | config | drives authorisation; must not be lost |
| `users.gudalur_id` | `user.additionalFields` | config | the product's public identity |

Two asymmetries deserve emphasis:

- **`user.email` is not nullable in Better Auth's schema** (§3.3) while our residents can be
  phone-only. Either supply a synthetic value, or relax `email` via `user.fields`. **[UNVERIFIED]**
  whether `user.fields` can relax nullability — folded into spike S4.
- **`user.name` is required.** Residents registered without a display name need a deterministic fallback.

### 10.3 Recommended identity strategy: never mint a second authoritative id

**Option 1 (preferred): one-directional, no shared id.**
Better Auth owns its `user.id`; we add an explicit `ba_user_id` column (or mapping table) linking
`users.uid` → Better Auth's `user.id`. Nothing is overwritten; rollback is a dropped column.

**Option 2 (only if a shared key is mandatory): `generateId` returns the existing `uid`.**
Then `user.id === users.uid` and joins are trivial. Cost: both systems now assume ownership of the same
key, and rollback must not delete it. Higher coupling.

**Recommendation: Option 1.** The guiding principle is that the parallel integration must be removable.
A shared primary key is the single hardest thing to unwind later.

### 10.4 Linking, and the rule that protects our data

**[VERIFIED]** — `options.account.accountLinking` accepts `enabled`, `trustedProviders`,
`updateUserInfoOnLink`, `allowUnlinkingAll`.

Set `accountLinking.enabled: false` during the parallel phase. Our provider links are currently
authoritative (`users.provider`/`provider_subject`, §4.2). Automatic account linking can silently merge
two residents — an unacceptable risk for a petition ledger where a signature's validity depends on
identity integrity.

### 10.5 Officials: explicitly unresolvable inside Better Auth

**[VERIFIED]**: Better Auth's `session.userId` is a single FK to `user`; there is no polymorphic
identity concept. Our `sessions.identity_kind` distinguishes `'user'` from `'official'`, and officials
have their own ledger plus password auth from migration 006.

- **(a) Leave officials entirely on our system. RECOMMENDED.** Officials keep the existing password
  flow; Better Auth serves residents only.
- (b) A second Better Auth instance with its own tables. Two secrets, two cookie domains, double surface.
- (c) Model officials as `user` rows with a role field. Puts privileged identities into the resident
  table and changes the meaning of `user`. Rejected.

**Decision: (a).** This matches the Telegram decision (§9.3) and keeps the blast radius bounded.

### 10.6 Audit integration

`server/security/vouAudit.ts` implements a hash-chained, tamper-evident audit log **[VERIFIED]**. Any
Better Auth-originated identity event must be written into that chain via the existing audit service —
never into a parallel log. Concretely: emit `identity.authenticated` on successful Better Auth sign-in,
with `actorType`/`actorId` resolved to our `uid`. If skipped, the parallel integration creates an
un-audited authentication path — a security regression.

---

## 11. User migration (back-fill into Better Auth's tables)

### 11.1 Scope discipline first

Only residents ever need to appear in Better Auth (§10.5). No officials, and — per §8.4 — only keyed
hashes of provider subjects, never raw subjects.

### 11.2 Migration shape

A one-shot, **idempotent** back-fill script, run against the staging database only:

1. Read residents from `users`.
2. For each, upsert a `user` row in Better Auth's table.
3. Where `users.provider` is non-empty, upsert an `account` row with
   `providerId = users.provider` and `accountId = <keyed hash>` (§8.4).
4. Write back the resulting Better Auth `user.id` into `users.ba_user_id` (§10.3 Option 1).

**Idempotency is a hard requirement.** The script must be safe to re-run: key on
`users.ba_user_id IS NULL` and never create a second Better Auth user for a resident already migrated.
A non-idempotent back-fill against a live petition ledger is how duplicate identities are born.

### 11.3 Data-quality gates that must run before the migration

- **Email normalisation.** Better Auth lower-cases `email` on write (§3.3). If our `users.email`
  values are mixed-case, a pre-pass must normalise them, otherwise email-based dedupe will disagree
  between the two systems.
- **Residents with no email.** Decide the representation *before* migrating (§10.2). Migrating first
  and deciding later means a destructive re-migration.
- **Residents with no display name.** `user.name` is required (§3.3). Pick the fallback (e.g. the
  phone-derived default used elsewhere in the app) and record it.
- **Duplicate emails.** Our Google path already treats `email` as a lookup key (`WHERE email = $1`,
  §4.3). Duplicates must be resolved or explicitly tolerated before back-fill, because two residents
  sharing an email produce two Better Auth users indistinguishable to a Google sign-in.

### 11.4 What must NOT be migrated

- **Passwords.** Officials' password hashes stay exactly where they are. Do not copy password material
  into Better Auth's `account.password` for residents — residents do not authenticate by password
  today, and inventing a credential store for them widens the attack surface for no requirement.
- **Raw provider subjects.** Enforced by §8.4.
- **Sessions.** Migration is deliberately excluded; §12 explains why bridging is preferred.

### 11.5 Reversibility

Because Option 1 (§10.3) is used, rollback is: stop writing to Better Auth tables, then drop
`users.ba_user_id` and the five Better Auth tables. The `users` ledger is untouched by the migration —
it is only *read*. That property should be asserted in the migration script's own test: **the script
must contain no `UPDATE`/`DELETE` against `users` other than setting `ba_user_id`.**

---

## 12. Session dual-read / dual-write bridge

### 12.1 The problem in one sentence

Today a request is authenticated by *our* JWT plus *our* `sessions` row; Better Auth would authenticate
by *its* session cookie plus *its* `session` row. During the parallel phase both must be valid, and
neither may be able to forge the other.

### 12.2 Why session migration is rejected

Migrating existing sessions into Better Auth's format is attractive and wrong:

- Our `sessions` rows are polymorphic over `identity_kind` (§4.1) — officials cannot be represented
  (§10.5).
- Our refresh tokens are opaque and hashed; Better Auth's `session.token` is the cookie value. The
  semantics differ, so a "copy" is really a re-issue, which means **a logout of every user** —
  precisely what a parallel, zero-downtime phase must avoid.

### 12.3 Recommended design: both validators accept both token kinds

`server/middleware/auth.ts` becomes a *dispatcher*:

```text
resolveSession(request):
  1. try existing JWT/opaque-refresh validation   (unchanged, authoritative)
  2. if absent/invalid, try Better Auth session validation
  3. normalise whichever succeeded into req.user
```

Normalisation is the safety-critical step: `req.user` must end up with the same shape
(`uid`, `phone`, `gudalurId`, `name`, `role`, `kind`) whichever path produced it. Downstream code
(`server/routes/admin.ts`, `server/routes/authorization.ts`, petition signing) must not need to know
which validator ran.

### 12.4 The cross-reference that makes this safe

For a Better Auth session to authorise anything, it must be translatable into a resident. That requires
the mapping from §10.2: `user.id` → `users.uid` via `users.ba_user_id`.

**Failure mode to design for:** a Better Auth session whose `user.id` has no `ba_user_id` match (e.g.
created by Better Auth *before* the back-fill ran, or by a signup we did not intend). The correct
behaviour is **fail closed** — reject the request — never silently fabricate a resident. Same
philosophy as `NO_ACCOUNT` (§4.3); must be tested explicitly.

### 12.5 Cookie domain and prefix must not collide

**[VERIFIED]** — Better Auth exposes `advanced.cookiePrefix` and `advanced.defaultCookieAttributes`;
our cookies are set by `setSessionCookies()` with our own names.

- Different cookie **names** (distinct prefix), so the two systems never overwrite each other.
- Same `Path` and domain scope, so both are sent on every request.
- Consistent `Secure`/`SameSite` — see §14.3. One system's cookie at `SameSite=Lax` and the other at
  `SameSite=None; Secure` is a silent CSRF hole.

### 12.6 Dual-write, and when to stop

During the parallel phase, prefer **dual-write on session creation**: when a Better Auth sign-in
succeeds, also mint our own session (or at minimum record the linkage) so the existing middleware,
audit chain, and admin tooling continue to see a `sessions` row. This keeps one source of truth for
"who is logged in" for reporting and revocation.

**Exit criterion:** the parallel phase ends when Better Auth is the sole writer and our sessions are
only read for revocation — or the integration is rolled back. Dual-write is a *transition* state, not a
destination; leaving it permanently doubles the revocation surface.

---

## 13. Staging database isolation — a hard precondition, carried forward from Phase 2

### 13.1 The verified blocker

**[VERIFIED]** — `.env.staging.example` states it in its own words:

> **[BLOCKER]** There is currently NO isolated staging database. Until one exists this MUST point at
> the shared production cluster — which is precisely why the staging guard exists.

And `STAGING_ALLOW_WRITES=false` is `[REQ]`, documented as:

> true = **DISABLES** the staging safety boundary. Only ever set if this container points at an
> ISOLATED staging database.

### 13.2 What this means for Better Auth, specifically

A parallel Better Auth integration **cannot be developed or verified** against the shared cluster,
because its very first step is DDL: creating five new tables. Creating Better Auth's tables inside the
production database from a staging container is exactly the class of accident the Phase 2 staging guard
was built to prevent.

Therefore the ordering is fixed: **isolated staging database → Better Auth tables → back-fill → any
traffic.**

### 13.3 Secrets must not be shared across environments

**[VERIFIED]** — `.env.staging.example` requires `SESSION_SECRET` and `PETITION_IDENTITY_SECRET` to be
regenerated per environment so a token issued on staging can never be replayed against production.

The same rule applies to Better Auth's `secret`: a **separate** value from `SESSION_SECRET`, per
environment, so a Better Auth artefact minted on staging is worthless in production and vice versa.

### 13.4 The database trust boundary and connection budget

**[VERIFIED]** — staging uses `sslmode=verify-full` with a mounted Cockroach Cloud CA
(`DATABASE_SSL_CA=/etc/vog/cockroach-ca.crt`), and `DATABASE_POOL_MAX=10` deliberately below
production's 20.

Any Better Auth connection must obey the same three constraints (verify-full, the CA, a bounded pool).
Two independent pools against one cluster also means **double the connection count**; the combined
total must be checked against the cluster's connection limit. A Better Auth pool that ignores the
existing budget can exhaust CockroachDB connections and take down the *existing* system — the opposite
of a safe parallel integration.

---

## 14. Security analysis

### 14.1 Secrets: separate, and never reused

Better Auth requires a `secret`. Rules:

1. Generate a **new** 48-byte random value; never reuse `SESSION_SECRET` (§13.3).
2. Same lifetime rules as the existing secrets — per-environment, never committed, supplied by the
   orchestrator.
3. Note in the staging env file that `SESSION_SECRET` and the Better Auth secret are independent, so a
   future reader does not "helpfully" consolidate them.

### 14.2 Two CSRF mechanisms will coexist — document, do not disable

**[VERIFIED]** — Better Auth's CSRF protection comprises Origin-header validation plus Fetch Metadata
checks (`Sec-Fetch-Site`, `Sec-Fetch-Mode`, `Sec-Fetch-Dest`), controlled by
`advanced.disableCSRFCheck` (default `false`), and URL validation against `trustedOrigins` controlled
by `advanced.disableOriginCheck` (default `false`).

Ours is a bespoke `csrfToken` returned in the login body (§4.1).

**Rule: leave both of Better Auth's toggles at their defaults (`false`).** Disabling either trades a
real defence for convenience. The two mechanisms protect different code paths and can coexist; what
must not happen is one being switched off to make the other's tests pass.

`trustedOrigins` must be set explicitly to the deployed origin(s) (`APP_URL`/`SITE_URL`), since the
default is unlikely to match the Cloudflare-fronted staging domain.

### 14.3 Cookies

**[VERIFIED]** — `advanced.useSecureCookies` (default `false`, though "cookies are secure in production
environments" by default), `advanced.defaultCookieAttributes` (`secure`, `sameSite`, `httpOnly`,
`domain`, `path`, `expires`), `advanced.crossSubDomainCookies`.

- **`NODE_ENV=production` is deliberately retained on staging** (§4.7), which is what makes our own
  cookies `Secure`. Verify that Better Auth's cookies are `Secure` under the same conditions — do not
  "fix" a missing `Secure` flag by enabling `useSecureCookies` unconditionally and thereby breaking
  local development.
- `httpOnly: true` for session cookies, matching current behaviour.
- `SameSite` must match our own cookies' policy (§12.5).

### 14.4 Reverse-proxy trust: two independent models must agree

**[VERIFIED]** — Better Auth exposes its *own* proxy-trust model:
`advanced.ipAddress.trustedProxies?: string[]` and `advanced.ipAddress.ipv6Subnet` (default `64`),
plus `ipAddressHeaders` and `disableIpTracking`.

Its own documentation of `trustedProxies` is explicit, and describes the same trap we already guard
against:

> This only interprets the forwarded header chain and cannot verify the direct sender. It is safe only
> when your origin is reachable through these proxies and clients cannot set forwarded headers directly.

Ours is `TRUST_PROXY_HOPS=1` (§4.7), documented as: *Cloudflare → Traefik → container is exactly ONE
hop. If this is wrong, every visitor shares one rate-limit bucket and the app emits 429s under trivial
load.*

**Consequence:** two independent proxy-trust configurations now describe the same one-hop topology. If
they disagree, one system attributes requests to the proxy and the other to the client — silently
breaking per-IP rate limiting and polluting `session.ipAddress` / audit actor data.

**Rule:** derive Better Auth's `trustedProxies` from the same source of truth as `TRUST_PROXY_HOPS` and
document them together. Never hard-code two separate truths.

### 14.5 Telemetry — verified safe by default, with a precise explanation

**[VERIFIED]** — `@better-auth/telemetry` is a direct dependency of `better-auth@1.7.5`; its
`createTelemetry()` behaves as follows:

```js
const telemetryEnabled = options.telemetry?.enabled !== void 0 ? options.telemetry.enabled : false;
return (getBooleanEnvVar("BETTER_AUTH_TELEMETRY", false) || telemetryEnabled) && ...;

const telemetryEndpoint = ENV.BETTER_AUTH_TELEMETRY_ENDPOINT;
if (!telemetryEndpoint && !context?.customTrack) return { publish: noop };
```

Read precisely, **telemetry is opt-in and inert by default**:

- Disabled unless `options.telemetry.enabled === true` **or** `BETTER_AUTH_TELEMETRY` is truthy.
- Even when enabled, it transmits **nothing** unless `BETTER_AUTH_TELEMETRY_ENDPOINT` is also set;
  without it the tracker is replaced by a no-op.

Why this matters for a civic petition platform: had telemetry been opt-out, adopting Better Auth would
have meant an undocumented outbound call from an election-adjacent server. It is not.

**What would be sent if it were ever enabled** (so the decision is informed, not blind): a config
*shape* — boolean flags and option names — plus `runtime` (Node version), `database` (driver detected
by checking installed packages: `pg` → `postgresql`, `@prisma/client` → `prisma`), `framework`
(`express`), `environment`, OS/package-manager details, and an `anonymousId` derived as
`sha256(baseURL + projectName)`. Notably `user.fields` and `user.additionalFields` are sent **as
objects, not boolean-coerced** — custom field definitions would leak their *names*.

**Rule:** set `BETTER_AUTH_TELEMETRY=0` explicitly in the environment contract, and never set
`BETTER_AUTH_TELEMETRY_ENDPOINT`. Belt and braces, since the default is already off.

### 14.6 Rate limiting: two systems, one real hazard

**[VERIFIED]** — `rateLimit` options: `enabled`, `max`, `window`, `storage`, `modelName`,
`customStorage`; plus `advanced.database.defaultFindManyLimit`.

Ours is `express-rate-limit@8.7.0` with `redis` available.

1. **Double limiting.** If Better Auth's limiter is also enabled on the same mount, a legitimate burst
   is counted twice and users see 429s neither config explains. Decide **which** system owns the auth
   path; ours must exclude that path, or vice versa.
2. **Shared key space.** Better Auth's default rate-limit model (`key`, `count`, `lastRequest`, §3.3)
   is its own table. If we point `rateLimit.storage` at our own store, the two limiters share a
   namespace — do not do that unless keys are namespaced apart.

**Recommendation:** keep `express-rate-limit` as the authority at the edge (it already has the correct
`TRUST_PROXY_HOPS` behaviour) and leave Better Auth's limiter **disabled** for the parallel phase.

### 14.7 Fail-closed posture must be preserved everywhere

Every divergence in this document resolves to the same instruction: when the two systems disagree about
identity, **fail closed**. Concretely:

- Unknown Better Auth session with no `ba_user_id` → reject (§12.4).
- Google identity with no resident → reject, never provision (§8.3).
- Any error in the bridge → reject, never fall back to an unauthenticated-but-privileged default.

This is the posture the codebase already takes (`NO_ACCOUNT`, fail-closed signing), and it is the
reason the parallel integration can be attempted at all.

---

## 15. Rollback plan

### 15.1 Principle

The parallel integration is only acceptable if, at every stage, the *existing* system can be restored by
removing new code and new tables — without touching `users`, `sessions`, `signatures`, `officials`, or
the audit chain.

### 15.2 What is created, and therefore what is removed

| Created | Removal | Data loss? |
|---|---|---|
| 5 Better Auth tables (`user`, `session`, `account`, `verification`, rate-limit — or explicit names) | `DROP TABLE` each | Better Auth state only |
| `users.ba_user_id` column | `ALTER TABLE users DROP COLUMN ba_user_id` | none (mapping only) |
| Better Auth mount in `server.ts` | remove the mount | none |
| Dispatcher in `server/middleware/auth.ts` | restore the single-validator version | none |
| Google/Telegram route changes | restore prior routes | none |
| New env vars (`BETTER_AUTH_*`) | remove from orchestrator | none |

### 15.3 Order of operations for a rollback

1. **Stop writing.** Disable the Better Auth mount (feature flag or remove the route). Existing Better
   Auth cookies become inert immediately.
2. **Verify the legacy path.** Confirm our JWT + `sessions` validation still authenticates every
   request. Because §12.3 keeps the legacy validator authoritative and unchanged, this should hold by
   construction.
3. **Reconcile.** For any resident who signed in *only* via Better Auth during the parallel phase and
   gained a `ba_user_id` with no legacy session, decide whether their provider link needs to be written
   back into `users.provider`/`provider_subject`. This is the one genuinely lossy step, and it is why
   §12.6 (dual-write) is recommended: dual-write means step 3 is usually empty.
4. **Drop schema.** `DROP TABLE` the five Better Auth tables and `ALTER TABLE users DROP COLUMN
   ba_user_id`.
5. **Remove dependencies.** `better-auth` (and its transitive `kysely`/`jose`/`zod@4`) from
   `package.json`; verify `npm ls` is clean.

### 15.4 The rollback test that must exist before launch

A single test that asserts the *pre-Better-Auth* behaviour is unchanged:

- our session cookie still authenticates;
- `NO_ACCOUNT` still returns the documented 404 for an unknown Google identity;
- officials still authenticate by password;
- the audit chain still accepts `identity.authenticated`.

If such a test does not exist before the integration starts, it must be written first — otherwise
"rollback works" is a claim, not a fact. This is the strongest single argument for writing the
regression tests *before* touching `server.ts`.

### 15.5 Residual risk after rollback

Anything learned *only* in Better Auth's tables is lost when they are dropped. That is acceptable and
intentional: the parallel phase exists to learn whether the integration is viable, not to accumulate
authoritative state. The `signature_authorizations` table (§4.4) remains the durable record of provider
authorisation, which is why §5.3 insists it is never superseded.

---

## 16. Open items — the exact list, with acceptance tests

These are the four items that separate *READY WITH RISKS* from *READY*. Each has a spike number, a
scope, and a pass/fail test. None may be waived by review comment; each must produce evidence.

### S1 — CockroachDB acceptance of Better Auth's tables (blocker #1)

**Why it is open.** Zero `cockroach` references in the package (§7.2); Better Auth generates its own
DDL; nothing in this audit can prove that DDL runs on CockroachDB.

**Scope.** On a **non-production** CockroachDB instance: run Better Auth's migration/DDL for its five
default models, then exercise create/read/update/delete through the Kysely adapter.

**Acceptance test.**
1. All five tables create without error on the target CockroachDB version.
2. A `user` row inserts and reads back with all fields intact (including a `null` `image`).
3. A `session` row inserts with `expiresAt` round-tripping as a timestamp with no drift > 1 s.
4. An `account` row inserts with a *hashed* `accountId` and reads back.
5. Concurrent inserts of 20 sessions for one user all succeed (CockroachDB serialisation is the risk
   here, not single-row writes).

**Fail action.** If DDL or CRUD fails: fall back to Route C (custom adapter, §7.1) **or** abandon the
parallel phase. Do not "patch around" a failing query inside a library that owns it.

### S2 — Express body-parser ordering with `toNodeHandler` (blocker #2)

**Why it is open.** `toNodeHandler` consumes the raw request stream (§3.2, §5.1). Behaviour behind this
app's `express.json()` pipeline is untested.

**Scope.** In a local integration test: mount `toNodeHandler` at `/api/ba` **before** body-parser
middleware, issue a real `POST` with a JSON body, and confirm the handler parses it.

**Acceptance test.**
1. A `POST /api/ba/...` with a JSON body reaches Better Auth with a readable body.
2. A `GET` through the same mount succeeds.
3. Requests to *all other* routes still parse normally (body-parser still works for legacy paths).
4. A request with `Content-Type: application/json` but a malformed body produces a clean 400, not a hang.

**Fail action.** If mounting before the parser is impossible in this app's pipeline, buffer-then-replay
or route Better Auth to a separate listener; document which, explicitly.

### S3 — `zod` v3/v4 duplication (accepted risk, with a guard)

**Why it is open.** Better Auth needs `zod ^4.5.4`; the repo pins `zod ^3.23.0` (§2.3). npm will nest
`zod@4`.

**Scope.** Not a spike to *run* so much as a rule to *enforce*.

**Acceptance test.**
1. After `npm install better-auth`, `npm ls zod` shows two versions — root `3.25.76` and a nested
   `4.x` — with no other unexpected change.
2. `npx tsc --noEmit` passes.
3. The test suite passes (currently 306 tests / 27 files).
4. **No file in `server/` or `src/` imports `zod` from inside `better-auth`.** Enforced by code review
   or a lint rule; a grep for `better-auth` imports in files that also import `zod` is the cheap check.

**Fail action.** If Better Auth's API *requires* handing it a repo-authored `zod` schema, that feature
is out of scope for the parallel phase — do not upgrade the repo's `zod` to v4 as a side effect; that
is a separate, separately-reviewed migration.

### S4 — Field optionality for email-less residents (blocker, found during audit)

**Why it is open.** Better Auth's `user.email` is not nullable in the shipped schema (§3.3), while this
repo has phone-only residents (§10.2). Whether `user.fields` can relax this is unverified.

**Scope.** Configure the user model with `email` relaxed and/or a synthetic email; attempt to create a
user with no email via the adapter; confirm what persists.

**Acceptance test.**
1. A user with `phone` and no `email` persists successfully.
2. That user completes a full Better Auth sign-in round-trip.
3. The chosen representation (null vs synthetic) is recorded in the mapping table (§10.2) and is
   consistent between the back-fill script and live sign-in.

**Fail action.** If email is structurally required with no relaxation, the back-fill must generate a
deterministic synthetic email per resident (e.g. `<uid>@noemail.voiceofgudalur.space`) and the mapping
table records it as a documented, reversible transform.

### 16.1 Roll-up

| Item | Blocks | Effort | Risk if skipped |
|---|---|---|---|
| S1 CockroachDB DDL/CRUD | any DB work | ~1 day with a scratch instance | schema errors discovered in production |
| S2 Express mount order | any route work | hours, local only | intermittent POST failures, very hard to diagnose |
| S3 `zod` duplication guard | any config work | a lint rule | runtime shape errors that look like library bugs |
| S4 email-less residents | back-fill script | small; mostly a decision | destructive re-migration later |

---

## 17. Final status

### 17.1 Verdict

**READY WITH RISKS.**

- No structural incompatibility was found between `better-auth@1.7.5` and the existing system.
- The decisive architectural fact — Better Auth owning its own five singular-named tables beside our
  plural ones — makes coexistence genuinely low-risk *if and only if* `usePlural` stays `false` (§6.2).
- The four open items are all closable with bounded effort, and all four have explicit acceptance
  tests (§16).

`READY` (not "with risks") requires: S1 and S2 passed with evidence, the S3 guard in place, S4 decided
and recorded, and an isolated staging database existing (§13). Nothing less.

### 17.2 What must never be done (the permanent guardrails)

1. `usePlural: true` — never. It points Better Auth at our production tables (§6.2).
2. Storing a raw provider subject (`account.accountId` in plaintext) — never (§4.4, §8.4).
3. Reusing `SESSION_SECRET` as Better Auth's `secret` — never (§13.3).
4. Disabling `disableCSRFCheck`/`disableOriginCheck` to make tests pass — never (§14.2).
5. Migrating officials into Better Auth — not in this phase (§10.5).
6. Routing Telegram through Better Auth — not in this phase (§9.3).
7. Pointing any Better Auth work at the shared production cluster — never (§13.2).
8. Letting Better Auth write to `users` beyond `ba_user_id` — never (§11.5).

### 17.3 Required order of implementation

```text
 1. Regression tests for current behaviour        (§15.4)  — BEFORE anything else
 2. Isolated staging database                     (§13)    — Phase 2 blocker, still open
 3. S1 spike: CockroachDB DDL + CRUD              (§16/S1)
 4. S2 spike: Express mount order                 (§16/S2)
 5. S4 decision: email-less residents             (§16/S4)
 6. Add better-auth; verify S3 guard              (§16/S3)
 7. Back-fill script (staging only, idempotent)   (§11)
 8. Google provider with no-creation flags        (§8.3)
    + subject-hash hook                           (§8.4)
    + 404-contract shim
 9. Session dispatcher with fail-closed mapping   (§12)
10. Audit-chain integration                       (§10.6)
11. Only after all of the above: consider whether
    a cutover is worth doing at all
```

### 17.4 Verification performed for this audit

Ran on the working tree at tip `ec5c8d0`, with no code changes:

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | **pass** (exit 0) |
| Test suite | `npx vitest run` | **pass** — 27 files, **306/306 tests** |
| Production build | `npm run build` | **pass** (exit 0), PWA precache 41 entries |

### 17.5 Evidence artifacts (reproducible)

```powershell
npm pack better-auth@1.7.5             # → %TEMP%\ba
npm pack @better-auth/core@1.7.5       # → %TEMP%\bacore
npm pack @better-auth/telemetry@1.7.5  # → %TEMP%\batele
# All §2/§3/§14 claims are readable directly in the extracted dist/ files.
```

Primary files cited: `server/routes/auth.ts`, `server/services/authService.ts`,
`server/middleware/auth.ts`, `server/security/vouTokens.ts`, `server/security/vouAudit.ts`,
`prisma/schema.prisma`, `server/db/migrations/{001,006,020,023}_*.sql`,
`src/context/AuthContext.tsx`, `.env.staging.example`, and the packed tarballs above.

---

*End of audit. The next action is §17.3 step 1: write the regression tests that prove the current
system's behaviour, so that every later claim of "safe" or "reversible" is testable rather than
asserted.*
