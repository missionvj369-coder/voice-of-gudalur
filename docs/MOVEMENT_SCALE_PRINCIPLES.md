# Voice of Gudalur — Movement Scale Principles

**Date:** 2026-09-10

---

## Core Principle

> NEVER SCALE THE DATABASE WHEN THE EDGE/CACHE CAN ABSORB THE LOAD.

Every public interaction must NOT become a database write. The architecture separates AUTHORITATIVE writes (rare, important, transactional) from AGGREGATABLE activity (frequent, cacheable, edge-absorbed).

---

## Architecture Layers

```
PUBLIC INTERNET
      ↓
  EDGE / CDN (Netlify CDN, browser cache, service worker)
      ↓
  PUBLIC READS + AGGREGATED EVENTS (in-process TTL cache, CDN cache)
      ↓
  AUTHORITATIVE API (Express, rate-limited, validated)
      ↓
  COCKROACHDB (transactional, pooled, indexed)
```

---

## AUTHORITATIVE Writes (must be transactional, idempotent, rare)

These touch the database directly and must be correct:

| Operation | Endpoint | Why Authoritative |
|-----------|----------|-------------------|
| Registration | POST /api/auth/account | Creates identity |
| Petition Signing | POST /api/petitions/sign | Legal proof, unique |
| External Support | POST /api/petitions/:id/external-support | New participation record |
| Official Submissions | POST /api/manifesto/submission | Civic record |
| Wildlife Reports | POST /api/wildlife/incident | Evidence record |
| Media Upload | POST /api/media | Published content |
| Admin Actions | POST /api/admin/* | Governance |

Properties:
- Always authenticated (except external-support which is anonymous-but-rate-limited)
- Always validated
- Always idempotent (idempotency keys or unique constraints)
- Always transactional
- Never cached in a way that hides the write

---

## AGGREGATABLE Activity (must NOT be one DB write per event)

These are high-volume, low-risk, and must be absorbed by edge/cache:

| Operation | Current Handling | Future |
|-----------|-----------------|--------|
| Page views | Not tracked server-side | CDN logs, edge analytics |
| Poster/video views | Not tracked server-side | CDN logs, periodic aggregation |
| Campaign opens | Not tracked | CDN logs |
| Share clicks | Not tracked | CDN logs |
| Link copies | Not tracked | — |
| Media requests | CDN cache + browser cache | Same |
| Petition list reads | 3s in-process cache + CDN 10s | Same |
| Sign stats reads | 6s in-process cache + CDN 10s | Same |
| Ledger reads | 6s in-process cache + CDN 10s | Same |

Principle: If the database is down, public campaign content (homepage, posters, videos, petition info) must remain accessible.

---

## MEDIA Architecture

```
MEDIA SOURCE (admin upload)
      ↓
OBJECT STORAGE (Storj S3)
      ↓
CACHE / CDN (Netlify CDN, browser 1 year immutable)
      ↓
PUBLIC (redirect to Storj URL, media never transits API)
```

- Media files are immutable once uploaded
- URL changes only when file changes
- Browser caches aggressively (1 year)
- API redirects to Storj URL (302) — media bytes never transit the function layer
- Fallback: base64 data URL in DB for legacy rows (streamed directly)

---

## Scaling Levers (in order of preference)

1. **CDN edge cache** — absorb repeat reads at the edge (already configured)
2. **Browser cache** — immutable assets cached 1 year (already configured)
3. **In-process TTL cache** — collapse identical DB reads (3-10s TTL, already implemented)
4. **Connection pooling** — share DB connections across requests (pg.Pool, already implemented)
5. **Rate limiting** — bound write throughput per IP (already implemented)
6. **Read replicas** — if read load exceeds single-node capacity (future)
7. **CQRS** — separate read/write models if read scaling demands it (future)

---

## What NOT to Do

- Do NOT add Redis — the in-process cache + CDN already absorb public reads
- Do NOT add Kafka/NATS — no event stream is needed for current scale
- Do NOT add a new database — CockroachDB scales horizontally
- Do NOT write every page view to the database
- Do NOT make media transit the API server
- Do NOT remove caching to "simplify" — caching IS the architecture

---

## Measurement-Driven Evolution

After launch, measure:
- Requests/second per endpoint
- Cache hit ratio (in-process + CDN)
- DB connection pool utilization
- P95/P99 latency per endpoint
- Error rate per endpoint

The next scaling layer is determined by real measurements, not theory.
