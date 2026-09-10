# Voice of Gudalur — Go-Live Checklist

**Date:** 2026-09-10
**Version:** 2.0.0-production

---

## Pre-Deployment

- [x] Production environment variables documented (`.env.example`)
- [x] `ADMIN_BOOTSTRAP_PASSWORD_HASH` set in production env
- [x] `SESSION_SECRET` set to a long random string
- [x] `DATABASE_URL` configured with CockroachDB connection string
- [x] `DATABASE_SSL=verify-full` (or `require` for encryption-only)
- [x] `DATABASE_POOL_MAX` set (2 for serverless, 20 for dedicated)
- [x] `NODE_ENV=production` (enables secure session cookies)
- [x] `STORJ_*` configured for media object storage
- [x] `VITE_PUSH_PUBLIC_KEY` + `PUSH_PRIVATE_KEY` for web push

## Database

- [ ] Database reachable from Netlify function region
- [ ] Migrations 001–012 applied (012 pending: drops dead functions, creates petition_supports)
- [ ] Migration 013 applied (creates external_supports, adds external_support_count)
- [ ] Admin bootstrap ran (PLATFORM_ADMIN row created with env hash)
- [ ] Health endpoint returns `{ status: 'ok', db: 'connected' }`

## Application

- [x] Resident registration (Aadhaar optional)
- [x] Resident login (passwordless, phone or Gudalur ID)
- [x] Aadhaar optional at registration
- [x] Aadhaar required before resident petition signing
- [x] Full Aadhaar never exposed publicly (only last4)
- [x] External supporter flow (no auth, no Aadhaar, separate count)
- [x] Petition integrity (idempotent, unique constraints, transaction retry)
- [x] Authentication (httpOnly cookies, CSRF, rate limiting)
- [x] Public pages (home, petitions, manifesto, wildlife, media)
- [x] Media upload (admin-only, type/size validated)
- [x] PWA (service worker, offline shell, installable)

## Security

- [x] No hardcoded credentials in git
- [x] No plaintext passwords in SQL comments
- [x] No passwords in logs (logger redacts sensitive fields)
- [x] SQL injection prevention (parameterized queries throughout)
- [x] Request validation on all POST endpoints
- [x] Rate limiting (auth 20/15min, public 120/15min, writes 60/15min, external 10/15min)
- [x] Admin endpoints require PLATFORM_ADMIN role
- [x] File upload validation (type, size)
- [x] CORS/security headers (CSP, HSTS, X-Frame-Options, etc.)

## Performance

- [x] Petition list cached (3s TTL) + lightweight (no supporters_json)
- [x] Sign stats cached (6s TTL) + CDN edge cache
- [x] Ledger cached (6s TTL) + CDN edge cache
- [x] Media list cached (10s TTL) + CDN edge cache
- [x] Petition signing invalidates caches on write
- [x] Connection pooling (pg.Pool)
- [x] Load shedding (503 when in-flight > MAX_IN_FLIGHT)

## Tests

- [x] 42 backend unit tests passing
- [x] Validation middleware tests
- [x] Cache tests
- [x] Petition repository tests
- [x] Manifesto repository tests
- [x] Wildlife repository tests
- [ ] External supporter flow test (TODO: add)

## Build & Deploy

- [x] `npm run build` passes (PWA generated)
- [x] Netlify configuration (`netlify.toml`) correct
- [x] API redirect `/api/*` → `/.netlify/functions/api/:splat`
- [x] SPA fallback `/*` → `/index.html`
- [x] Immutable asset caching (1 year)
- [x] Service worker + HTML never cached

## Rollback Procedure

If deployment fails:
1. Revert to previous deploy in Netlify dashboard
2. Database migrations are additive (IF NOT EXISTS) — safe to re-run
3. Migration 013 adds a new table + column — does not break existing queries
4. If external_supports table causes issues, the endpoint can be disabled without affecting resident flow
