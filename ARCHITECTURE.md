# Voice of Gudalur — Architecture

## Two-Layer Design

This repository implements **two layers**:

| Layer | Name | Purpose |
|-------|------|---------|
| A | Voice of Gudalur | The first production civic campaign |
| B | Open Civic Signature Protocol | Reusable civic-signature infrastructure |

**Layer A is the reference implementation of Layer B.** The protocol is not tightly coupled to Gudalur-specific logic — it lives under `server/services/identity/` and can eventually be extracted into its own package.

## Deployment Topology

```
                ┌─────────────────────────────────────────┐
                │            Cloudflare DNS + WAF          │
                │         (DDoS, bot management)           │
                └──────────────────┬──────────────────────┘
                                   │
                ┌──────────────────▼──────────────────────┐
                │              Netlify CDN                 │
                │    (edge cache, static assets, SPA)       │
                └──────────────────┬──────────────────────┘
                                   │
         ┌─────────────────────────┼──────────────────────────┐
         │                         │                          │
┌────────▼────────┐   ┌────────────▼────────────┐   ┌────────▼────────┐
│  Static assets   │   │   Netlify Functions     │   │   Storj (S3)    │
│  (cached HTML,   │   │   (Express API server)  │   │   (media,       │
│   JS, CSS,       │   │                         │   │    presigned    │
│   data snapshots)│   │   - REST endpoints      │   │    GET URLs)    │
│                  │   │   - Petition signing    │   │                 │
│                  │   │   - Civic verification  │   │                 │
│                  │   │   - Media management    │   │                 │
└──────────────────┘   └────────────┬────────────┘   └─────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │       CockroachDB       │
                       │  (Cloud serverless,     │
                       │   ap-south-1)           │
                       │                         │
                       │  - petitions            │
                       │  - petition_signs       │
                       │  - petition_stats       │
                       │  - verification_tx      │
                       │  - civic_signatures     │
                       │  - audit_log            │
                       └─────────────────────────┘
```

## Data Flow (Petition Signing)

```
Browser                  Netlify Function            CockroachDB          Provider
   │                          │                          │                    │
   │  POST /api/civic/sign    │                          │                    │
   │  (name, mobile, consent, │                          │                    │
   │   antibot challenge,     │                          │                    │
   │   idempotency-key)       │                          │                    │
   │─────────────────────────>│                          │                    │
   │                          │  normalizeMobile()       │                    │
   │                          │  identityKeyHash()       │                    │
   │                          │  verifyChallenge()       │                    │
   │                          │  rate-limit gate         │                    │
   │                          │                          │                    │
   │                          │  startVerification()     │                    │
   │                          │  (allocate single-use    │                    │
   │                          │   tx: CREATED)           │                    │
   │                          │─────────────────────────>│                    │
   │                          │                          │                    │
   │                          │  completeVerification()  │                    │
   │                          │  (provider adapter)      │                    │
   │                          │───────────────────────────────────────────────>│
   │                          │                          │                    │
   │                          │  (tx → VERIFIED/FAILED)  │                    │
   │                          │─────────────────────────>│                    │
   │                          │                          │                    │
   │                          │  consumeForSignature()   │                    │
   │                          │  (atomic CONSUMED +      │                    │
   │                          │   INSERT signature)      │                    │
   │                          │─────────────────────────>│                    │
   │                          │                          │                    │
   │                          │  computeSignatureHash()  │                    │
   │                          │  generateCivicSignId()   │                    │
   │                          │  increment aggregate     │                    │
   │                          │─────────────────────────>│                    │
   │                          │                          │                    │
   │  201 { ok, civicSignId,  │                          │                    │
   │       count, signHash }  │                          │                    │
   │<─────────────────────────│                          │                    │
```
```

## Provider Abstraction

The signature engine never imports a concrete provider. It resolves a verifier through the registry:

```
Civic Signature Engine
        │
        ▼
Identity Verification Interface (MobileIdentityVerifier)
        │
        ▼
Provider Registry (server/services/identity/registry.ts)
        │
        ├── camara ─────────► CamaraNumberVerification
        │                      (CAMARA Number Verification API)
        │
        └── self-asserted ──► SelfAssertedVerifier
                               (consent-based fallback)
```

Adding a new provider means:
1. Implementing `MobileIdentityVerifier` in `server/services/identity/providers/<name>/`
2. Registering it in `server/services/identity/registry.ts`

No changes to the signature engine, routes, or database schema are required.

## Module Layout

```
server/
├── services/
│   └── identity/                  ← Open Civic Signature Protocol (Layer B)
│       ├── types.ts               (interfaces, constants, assurance levels)
│       ├── registry.ts            (provider registry + resolution)
│       ├── identityHash.ts        (HMAC-SHA-256 identity normalization)
│       ├── signatureHash.ts       (server-generated audit hash)
│       ├── verificationService.ts (lifecycle orchestrator)
│       ├── verificationTxConsume.ts
│       ├── selfAsserted.ts        (consent-based fallback provider)
│       └── providers/
│           ├── index.ts
│           ├── errors.ts          (provider error taxonomy)
│           └── camara/
│               ├── index.ts
| Media | Storj S3 presigned GET URLs — media never touches the app server |

## Key Design Decisions

1. **Database is authoritative.** The frontend never decides uniqueness. `UNIQUE(petition_id, mobile_identity_hash)` is the final authority.

2. **Single-use transactions.** A verification transaction can be consumed exactly once. Concurrent second consume returns null → signature creation refuses.

3. **No PII in logs.** Raw phone numbers, provider subjects, and HMAC secrets never appear in logs or audit entries. Only the non-reversible HMAC prefix (`identityLogPrefix`) is logged.

4. **Aggregate count is maintained.** `petition_stats.signature_count` is incremented by a database trigger on every insert into `petition_mobile_signs`. No COUNT(*) queries on the hot path.

5. **Self-asserted is the fallback.** When CAMARA is not configured, the system falls back to consent-based verification — never blocks legitimate signers.

6. **Sandbox-first for CAMARA.** CAMARA_MODE defaults to off. Sandbox mode is explicit and clearly labeled. Production operator access requires onboarding.

│               ├── camaraConfig.ts
│               ├── camaraTypes.ts
│               ├── camaraClient.ts
│               └── camaraNumberVerification.ts
├── routes/
│   ├── civic.ts                   ← protocol endpoints
│   ├── petitionPublic.ts          ← Gudalur petition endpoints
│   ├── petitions.ts               ← admin/count endpoints
│   └── ...
├── middleware/
│   ├── circuitBreaker.ts
│   ├── emergencyMode.ts
│   ├── requestId.ts
│   └── ...
├── db/
│   ├── migrations/
│   │   ├── 015_petition_stats_aggregate.sql
│   │   ├── 016_petition_mobile_signs.sql
│   │   ├── 017_identity_verification_transactions.sql
│   │   └── 018_civic_signature_hash.sql
│   └── repositories/
│       ├── civicSignatureRepository.ts
│       ├── verificationTransactionRepository.ts
│       └── ...
└── utils/
    ├── antibotChallenge.ts
    ├── petitionIdentity.ts
    └── ...
```

## Existing Hardening (Preserved)

The Open Civic Protocol builds on top of existing production hardening, not instead of it:

| Concern | Implementation |
|---------|---------------|
| Emergency mode | `server/middleware/emergencyMode.ts` — feature-flagged load shedding |
| Circuit breaker | `server/middleware/circuitBreaker.ts` — wraps external provider calls |
| Rate limiting | `express-rate-limit` per endpoint, per-IP |
| Request IDs | `server/middleware/requestId.ts` — `X-Request-Id` on every response |
| CSRF | Double-submit cookie pattern on all state-changing routes |
| Turnstile | `server/middleware/turnstile.ts` — Cloudflare Turnstile validation |
| Idempotency | `server/db/idempotency.ts` — deterministic dedup for retries |
| Aggregate stats | `petition_stats` maintained table — no COUNT(*) on hot path |
| Media | Storj S3 presigned GET URLs — media never touches the app server |

