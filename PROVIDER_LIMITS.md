# Voice of Gudalur — Provider Limits & Emergency Scaling

**Date:** 2026-09-11  
**Last verified:** 2026-09-11 (check current provider docs before deployment)

## 1. Netlify

| Attribute | Value |
|-----------|-------|
| **Service** | Netlify Functions (v1, event format) + CDN |
| **Function timeout** | 10 s (free) / 260 s (paid) per invocation |
| **Function memory** | 1024 MB (default) |
| **Function payload** | ~6 MB response body limit (serverless-http) |
| **Concurrent functions** | Auto-scales; cold starts add 1-2s |
| **Bandwidth** | 100 GB/month (free) / unlimited (paid) |
| **Edge cache** | Global CDN, configurable per-route via `netlify.toml` headers |
| **Overage behavior** | Functions may be throttled or blocked if limits exceeded |
| **Emergency upgrade path** | Upgrade plan in Netlify dashboard → immediate capacity increase |
| **Migration path** | Express app is portable — can deploy to Cloud Run, Vercel, AWS Lambda |

### Netlify environment variables
- `DATABASE_URL`, `SESSION_SECRET`, `DATABASE_POOL_MAX` (2 build, 5 serverless)
- `MAX_IN_FLIGHT` (150), `NODE_ENV` (production), `EMERGENCY_MODE` (0/1)
- `SNAPSHOT_BUILD_HOOK_URL` — build hook for cron snapshot refresh

## 2. CockroachDB Cloud

| Attribute | Value |
|-----------|-------|
| **Service** | CockroachDB Cloud (Serverless or Dedicated) |
| **Cluster** | `voiceofgudalur-33111.j77.aws-ap-south-1.cockroachlabs.cloud` |
| **Database** | `vog_test` |
| **Connection limit** | 50,000 (serverless) / varies (dedicated) |
| **RU limit** | 50 RU/s burst (free tier serverless) — verify current plan |
| **SSL mode** | `verify-full` |
| **Emergency upgrade path** | Increase RU budget in console → immediate |
| **Migration path** | Standard PostgreSQL wire protocol — portable |

## 3. Storj (Object Storage)

| Attribute | Value |
|-----------|-------|
| **Endpoint** | `https://gateway.storjshare.io` |
| **Bucket** | `vog` |
| **Delivery** | 302 redirect to Storj raw link or presigned GET URL |
| **Presigned URL expiry** | 60 min (reused 50 min in-process) |
| **Emergency upgrade path** | Migrate to Cloudflare R2 |
| **Migration path** | S3-compatible API — portable to R2, S3, Backblaze B2 |

## 4. Cloudflare (Recommended Edge — NOT YET DEPLOYED)

| Attribute | Value |
|-----------|-------|
| **Workers Free** | 100,000 req/day — **DO NOT route all API traffic through Free** |
| **Workers Paid** | No general request-count limit — scales globally |
| **WAF/DDoS** | Always-on, managed rulesets |
| **Emergency upgrade path** | DNS cutover → Cloudflare in front of Netlify |

## 5. External Dependencies

| Service | Timeout | Rate Limit | Fallback |
|---------|---------|------------|----------|
| Open-Meteo (weather) | 5 s circuit breaker | Fair use | Hardcoded values |
| Ollama (LLM) | 60 s (should reduce to 5-10 s) | 10/15min/IP | 503 + fallback message |

## 6. Cost Protection

| Risk | Mitigation |
|------|-----------|
| Runaway DB RU | `DATABASE_POOL_MAX` + rate limiting |
| Runaway Storj egress | 302 redirect (zero API egress) |
| Malicious request storm | Rate limiting + load shedding (MAX_IN_FLIGHT=150) |
| Retry storms | `Retry-After` header on 429 |
| AI cost explosion | 10 req/15min/IP + circuit breaker |
