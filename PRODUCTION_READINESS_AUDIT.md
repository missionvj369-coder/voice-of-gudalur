# Voice of Gudalur — Production Readiness Audit

**Date:** 2026-09-11
**Commit:** 5eac90c5d1e94692e17a7f44b36e5fd069c4da78 (HEAD → main)
**Auditor:** Lead Production Infrastructure Engineer
**Working tree:** Clean (no uncommitted changes)

## 1. Executive Summary

The Voice of Gudalur application is a React 19 + Vite PWA whose backend is an Express.js app served as a single Netlify Function via `serverless-http`, backed by CockroachDB and Storj object storage.

The repository shows **extensive prior hardening** from recent commits. Public read endpoints are cached at the CDN edge and in-process. Petition signing is idempotent with DB-level uniqueness. Media redirects to Storj (never transits the API). Connection pooling, retry logic, security headers, rate limiting, and load shedding are all in place.

**Critical gaps discovered:**

1. `requestIdMiddleware` defined but **NOT mounted** — no request correlation IDs
2. `csrfProtection` defined but **NOT mounted** — CSRF guard is dead code
3. `sign-stats` runs `COUNT(*)` every 6s TTL — not a maintained aggregate
4. Rate limiting is **IP-only** — no account/device dimension
5. Rate-limited responses return **no `Retry-After`** header
6. **No `EMERGENCY_MODE`** feature flag
7. External API calls (Open-Meteo, LLM) have **no circuit breaker**
8. No `/api/ready` readiness probe
9. No centralized error handler — raw errors can leak
10. `listPetitionSigns` uses OFFSET pagination on large tables
11. `.env` file with real credentials exists locally — must be rotated