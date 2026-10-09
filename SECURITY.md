# Open Civic Signature Protocol — Security

## Security Measures

### Transport Security

- All connections use HTTPS (TLS 1.2+).
- HSTS headers are set by Netlify/Cloudflare.
- API responses include `Strict-Transport-Security` header.

### Authentication & Authorization

- JWT access tokens for user sessions.
- Opaque refresh tokens in httpOnly cookies.
- CSRF double-submit cookie pattern on all state-changing routes.
- Turnstile challenge verification server-side.

### Identity Verification

- HMAC-SHA-256 identity hashing with server-side secret.
- Raw mobile numbers never stored or logged.
- Single-use verification transactions with state machine.
- Atomic consume + insert for signature creation.

### Database Security

- Parameterized queries (no SQL injection).
- UNIQUE constraints enforce data integrity.
- Database credentials stored in environment variables.
- Connection pooling with configurable limits.

### Rate Limiting

- Per-IP rate limiting per endpoint.
- Separate limits for reads vs. writes.
- Rate limit headers returned to clients.

### Anti-Bot

- Cloudflare Turnstile (server-side validation).
- Signed anti-bot challenges with expiry.
- Honeypot fields to catch simple bots.
- Per-IP request limits.

### Circuit Breaker

- External provider calls wrapped in circuit breaker.
- Configurable failure threshold and recovery timeout.
- Prevents cascading failures when provider is down.

### Emergency Mode

- Feature-flagged load shedding (`EMERGENCY_MODE=1`).
- Non-essential endpoints return 503 + Retry-After.
- Auth, petitions, media, and health remain active.

### Observability

- Structured security events emitted for every verification lifecycle transition.
- `X-Request-Id` on every response for correlation.
- Audit log for all signature operations.
- Sensitive data never logged.

## Secrets Management

| Secret | Storage | Access |
|--------|---------|--------|
| `VERIFICATION_IDENTITY_SECRET` | Environment variable | Server only |
| `PETITION_IDENTITY_SECRET` | Environment variable | Server only |
| `CAMARA_CLIENT_ID` | Environment variable | Server only |
| `CAMARA_CLIENT_SECRET` | Environment variable | Server only |
| `CAMARA_TOKEN` | Environment variable | Server only |
| `CF_TURNSTILE_SECRET` | Environment variable | Server only |
| `DATABASE_URL` | Environment variable | Server only |
| `SESSION_SECRET` | Environment variable | Server only |

**No secrets are committed to source control.** All secrets are injected at deploy time via Netlify environment configuration.

## Vulnerability Reporting

To report a security vulnerability:
1. Do NOT open a public GitHub issue.
2. Contact the campaign operator through official Voice of Gudalur channels.
3. Include a detailed description and reproduction steps.
4. Allow reasonable time for remediation before public disclosure.

## Security Checklist

- [x] No secrets in source code
- [x] No SQL injection (parameterized queries)
- [x] No XSS (React escaping + CSP headers)
- [x] No CSRF (double-submit cookie pattern)
- [x] No raw PII in logs
- [x] No raw PII in public responses
- [x] Rate limiting on all endpoints
- [x] Circuit breaker on external calls
- [x] Emergency mode for load shedding
- [x] HTTPS only
- [x] HSTS enabled
- [x] Audit logging
- [x] Idempotency for retries
- [x] Atomic transactions for signature creation
- [x] Single-use verification transactions
