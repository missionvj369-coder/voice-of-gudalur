# Voice of Gudalur — Open Movement Architecture

**Date:** 2026-09-10

---

## Design Goal

Build a completely open-source public movement platform capable of supporting extremely large participation, activity and media reach without designing the architecture around a fixed user limit.

## Core Architecture

```
PUBLIC INTERNET
      ↓
  EDGE / CACHE (Netlify CDN, browser cache, service worker)
      │  ← absorbs repeat reads, media delivery, public content
      ↓
  PUBLIC READS + AGGREGATED EVENTS (in-process TTL cache 3-10s)
      │  ← collapses identical DB reads, bounds write throughput
      ↓
  AUTHORITATIVE API (Express, rate-limited, validated, request-ID tagged)
      │  ← only authoritative writes reach here
      ↓
  COCKROACHDB (transactional, pooled, indexed, horizontally scalable)
```

## Why This Works at Scale

### 1. Edge/CDN Absorbs Public Traffic
- Public reads (petition list, stats, ledger, media) are cached at the CDN edge for 10s
- Repeat requests from thousands of users hit the CDN, not the function
- Media files are served from Storj with 1-year immutable browser cache

### 2. In-Process Cache Collapses Identical Reads
- Petition list: 3s TTL → one DB read per 3s regardless of user count
- Sign stats: 6s TTL → one DB read per 6s
- Ledger: 6s TTL → one DB read per 6s
- These are PUBLIC, NON-PERSONAL aggregates — safe to cache

### 3. Authoritative Writes Are Bounded
- Registration: one write per new user (rare)
- Petition signing: one write per resident (once, idempotent)
- External support: one write per email (deduplicated, rate-limited 10/15min/IP)
- All writes are transactional, validated, and idempotent

### 4. Media Never Transits the API
- Upload → Storj object storage → 302 redirect to public URL
- Download → browser fetches from Storj/CDN directly
- API only handles metadata (cached 10s)

### 5. Stateless Application
- No server-side session state (sessions stored in DB)
- Any instance can handle any request
- Horizontal scaling = more Netlify function instances

## Participant Model

```
RESIDENT (Gudalur)
  ├── Registered with phone + name
  ├── Has Gudalur ID (GD-YYYY-XXXXXX)
  ├── Aadhaar optional at registration
  ├── Aadhaar REQUIRED for petition signing
  ├── Signs petition → petition_signs table (authoritative, unique)
  └── Counted in resident petition totals

EXTERNAL_SUPPORTER (outside Gudalur)
  ├── No registration required
  ├── No Aadhaar required
  ├── No Gudalur ID issued
  ├── Supports via lightweight endpoint
  ├── Stored in external_supports table
  └── Counted SEPARATELY from resident signatures
```

## Data Sepitation

### AUTHORITATIVE (transactional, rare)
- `users` — resident accounts
- `petition_signs` — resident petition signatures (unique per resident)
- `petition_supports` — authenticated endorsements
- `external_supports` — non-resident supports (unique per email)
- `manifesto_signatures` — manifesto endorsements
- `manifesto_submissions` — email docket submissions
- `wildlife_incidents` — incident reports
- `animal_sightings` — sighting reports
- `voice_petitions` — community voice petitions
- `media_posts` — published media metadata
- `sessions` — active sessions
- `audit_events` — audit trail

### AGGREGATABLE (edge-absorbed, high-volume)
- Page views → CDN logs
- Media views → CDN logs
- Share clicks → CDN logs
- Campaign opens → CDN logs
- Public reads → in-process cache + CDN

## Scaling Levers (in order)

1. **CDN edge cache** — already configured (10s TTL on public APIs)
2. **Browser cache** — already configured (1 year on immutable assets)
3. **In-process TTL cache** — already implemented (3-10s on public reads)
4. **Connection pooling** — already implemented (pg.Pool)
5. **Rate limiting** — already implemented (per-IP buckets)
6. **CockroachDB horizontal scale** — add nodes as needed (future)
7. **Read replicas** — if read load exceeds single-node capacity (future)
8. **CQRS** — separate read/write models (future, only if measured need)

## What We Do NOT Do

- Do NOT write every page view to the database
- Do NOT make media transit the API server
- Do NOT add Redis (in-process cache + CDN already absorb reads)
- Do NOT add Kafka/NATS (no event stream needed at current scale)
- Do NOT add a new database (CockroachDB scales horizontally)
- Do NOT remove caching to "simplify" (caching IS the architecture)

## Measurement-Driven Evolution

After launch, measure:
- Requests/second per endpoint
- Cache hit ratio (in-process + CDN)
- DB connection pool utilization
- P95/P99 latency per endpoint
- Error rate per endpoint

The next scaling layer is determined by real measurements, not theory.

## Future Evolution

The architecture supports adding:
- Aadhaar QR/image verification (new columns on users, new verification service)
- SMS OTP (new provider integration)
- Analytics platform (CDN logs + periodic aggregation, not per-event DB writes)
- Internationalization (already has i18n framework)
- Offline-first PWA enhancements (already has service worker)
- Real-time features (only if measured need, via WebSockets or SSE)

Each addition follows the same principle: authoritative writes are rare and transactional; everything else is cached or aggregated.
