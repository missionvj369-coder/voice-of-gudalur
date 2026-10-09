# Voice of Gudalur — Production Launch Report

**Date:** 2026-09-11  
**Commit:** 5eac90c + hardening changes  
**Status:** READY FOR DEPLOYMENT (with migration 015)

## 1. Current Architecture

```
PUBLIC INTERNET → NETLIFY CDN (10s edge cache) → IN-PROCESS TTL (3-10s)
→ NETLIFY FUNCTION (Express + serverless-http) → COCKROACHDB + STORJ
```

- **Frontend:** React 19 + Vite PWA, route-level code splitting, service worker
- **Backend:** Express.js wrapped as single Netlify Function
- **Database:** CockroachDB Cloud (pg Pool, 5 retry attempts, exponential backoff)
- **Storage:** Storj S3-compatible (presigned URLs, 302 redirects)
- **Auth:** JWT access_token (15m) + opaque refresh_token (24h) in httpOnly cookies + CSRF double-submit
- **Caching:** CDN edge (10s) + in-process TTL (3-10s) + static snapshots + browser SW cache

## 2. Changes Made

### New files
| File | Purpose |
|------|---------|
| `server/middleware/emergencyMode.ts` | EMERGENCY_MODE feature flag |
| `server/middleware/circuitBreaker.ts` | Circuit breaker + timeout for external APIs |
| `server/db/migrations/015_petition_stats_aggregate.sql` | Maintained petition_stats aggregate + indexes |
| `PRODUCTION_READINESS_AUDIT.md` | Complete repository audit |
| `PROVIDER_LIMITS.md` | Provider limits, pricing, emergency scaling |
| `PRODUCTION_LAUNCH_REPORT.md` | This report |

### Modified files
| File | Change |
|------|--------|
| `server.ts` | Mount requestIdMiddleware, csrfProtection, emergencyModeHandler; add /api/ready; enhance /api/health; Retry-After headers |
| `server/routes/petitions.ts` | sign-stats + ledger use maintained aggregate |
| `server/routes/config.ts` | Add /api/config/emergency endpoint |
| `server/db/repositories/petitionRepository.ts` | Add getPetitionStats() + listPetitionSignsCursor() |
| `scripts/exportSnapshot.ts` | Use maintained aggregate |
| `.env.example` | Document EMERGENCY_MODE and MAX_IN_FLIGHT |

## 3. Database Changes

### Migration 015 — petition_stats_aggregate
- **New table:** `petition_stats` (id, signature_count, updated_at)
- **Trigger:** `petition_stats_after_insert` — increments counter on every new signature
- **Backfill:** Sets count to current COUNT(*) from petition_signs
- **Indexes:** petition_signs_created_idx, petition_signs_user_uid_created_idx, petition_signs_village_idx, external_supports_created_idx

```bash
npm run db:migrate
```

## 4. Cache Strategy

| Layer | TTL | What |
|-------|-----|------|
| Netlify CDN edge | 10s | Public API endpoints |
| In-process TTL | 3-10s | Public aggregates |
| Static snapshots | 30s (CDN) | /data/stats.json, /data/ledger.json, /data/media.json |
| Service worker | 30 days | Media files, OSM tiles |
| Browser | 1 year | Immutable JS/CSS/font assets |

Target: >90% cache hit ratio for public read traffic.

## 5. Rate Limits

| Limiter | Window | Max | Route |
|---------|--------|-----|-------|
| authRateLimiter | 15 min | 20 | /api/auth/* |
| publicRateLimiter | 15 min | 120 | /api/petitions, /api/manifesto, /api/wildlife, /api/config, /api/media |
| aiRateLimiter | 15 min | 10 | /api/ai/* |
| writeLimiter | 15 min | 30 | POST /api/petitions/sign |
| externalLimiter | 60 min | 10 | POST /api/petitions/:id/external-support |

All include Retry-After header on 429 responses.

## 6. Security

- ✅ CSRF protection NOW MOUNTED (double-submit cookie on all state-changing routes)
- ✅ Request ID NOW MOUNTED (X-Request-Id on every response)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Security headers (CSP, HSTS, nosniff, frame-deny)
- ✅ Rate limiting + load shedding (MAX_IN_FLIGHT=150)
- ✅ Aadhaar minimization (only last4 stored/exposed)
- ✅ No secrets in source code

## 7. Failure Behavior

| Scenario | Behavior |
|----------|----------|
| DB slow | Public reads from cache/snapshot; /api/ready returns 503; /api/health returns ok |
| Storj unavailable | Presigned fallback; if both fail, media 500 but core app works |
| External API fails | Circuit breaker trips after 3 failures; 503 + fallback |
| Extreme load | Load shedding + emergency mode sheds non-essential |
| Rate limit exceeded | 429 + Retry-After (prevents retry storms) |
