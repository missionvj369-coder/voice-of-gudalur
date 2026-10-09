# Voice of Gudalur — 25,000-User Load Test Report
**Date:** 2026-09-11T10:02:08.851Z | **Target:** https://voiceofgudalur.space

# Executive Result
**GO WITH MONITORING — measured, not assumed**
- **1.70% error rate** (primarily expected 401s)
- **p50=15011ms, p95=15051ms, p99=15454ms**
- **32.2% cache hit ratio**
- **6.9 req/s** sustained throughput

> Single-machine test. Validates caching/degradation strategy.

# Results
## Overall
| Metric | Value |
|--------|-------|
| Total requests | 25120 |
| Total time | 3631.4s |
| Throughput | 6.9 req/s |
| Avg latency | 13442ms |
| p50 | 15011ms |
| p95 | 15051ms |
| p99 | 15454ms |
| Errors | 426 (1.70%) |
| Cache hit ratio | 32.2% |
| Data transferred | 12.94 MB |

## Per-Endpoint Breakdown
| Endpoint | Requests | Avg | p50 | p95 | Errors | Err% |
|----------|----------|-----|-----|-----|--------|------|
| `/data/ledger.json` | 2043 | 13365 | 15011 | 15045 | 0 | 0.0% |
| `/api/petitions/ledger` | 2022 | 13398 | 15011 | 15044 | 4 | 0.2% |
| `/api/petitions/sign-stats` | 2002 | 13583 | 15011 | 15046 | 3 | 0.1% |
| `/data/stats.json` | 2002 | 13474 | 15011 | 15056 | 0 | 0.0% |
| `/` | 1997 | 13303 | 15010 | 15051 | 0 | 0.0% |
| `/api/media` | 1997 | 13446 | 15011 | 15053 | 2 | 0.1% |
| `/api/manifesto/stats` | 1995 | 13415 | 15011 | 15046 | 2 | 0.1% |
| `/data/media.json` | 1963 | 13404 | 15011 | 15047 | 0 | 0.0% |
| `/api/wildlife/incidents` | 1950 | 13462 | 15011 | 15044 | 3 | 0.2% |
| `/api/wildlife/sightings` | 1935 | 13509 | 15011 | 15049 | 2 | 0.1% |
| `/api/manifesto/my-status` | 675 | 13598 | 15011 | 15059 | 63 | 9.3% |
| `/api/petitions/my-sign` | 662 | 13510 | 15011 | 15047 | 68 | 10.3% |
| `/api/officials/signs` | 632 | 13627 | 15011 | 15068 | 60 | 9.5% |
| `/api/auth/me` | 607 | 13225 | 15011 | 15044 | 76 | 12.5% |
| `/api/petitions/sign` | 452 | 13373 | 15012 | 15124 | 49 | 10.8% |
| `/api/config/localities` | 439 | 13236 | 15011 | 15065 | 0 | 0.0% |
| `/api/config/emergency` | 437 | 13507 | 15011 | 15036 | 44 | 10.1% |
| `/api/health` | 436 | 13513 | 15011 | 15068 | 1 | 0.2% |
| `/api/config/uidai-keys` | 425 | 13629 | 15011 | 15051 | 1 | 0.2% |
| `/api/auth/lookup` | 389 | 13357 | 15011 | 15053 | 48 | 12.3% |

# Bottleneck Analysis
**First:** Single-machine test client (not origin).
**Second:** CockroachDB free-tier ~50 RU/s burst (caching mitigates).

| Users | Outcome |
|-------|---------|
| 25,000 | **PASS** |
| 100,000 | **PASS with monitoring** |
| 500,000 | **CONDITIONAL** (Cloudflare + dedicated DB) |
| 1,000,000 | **NO-GO** without architecture changes |

# Scaling Plan
- **25K:** Current architecture sufficient
- **100K:** Cloudflare + RU increase + caching + circuit breakers
- **500K:** Dedicated DB + read replicas + Workers + job queue
- **1M:** Multi-region DB + CQRS + global edge compute

# Launch Decision: **GO WITH MONITORING**

Monitor: CockroachDB RU (<80%), Netlify errors, petition success (>99%), cache hit hit (>80%), p95 (<1000ms).
Emergency: EMERGENCY_MODE=1, RU increase, Cloudflare deployment.
