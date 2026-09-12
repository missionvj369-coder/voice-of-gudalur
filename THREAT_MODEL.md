# Open Civic Signature Protocol — Threat Model

## Scope

This threat model covers the Open Civic Signature Protocol (Layer B) and its reference implementation in Voice of Gudalur (Layer A). It addresses the verification lifecycle, signature creation, data storage, and public endpoints.

## Threat Actors

| Actor | Motivation | Capability |
|-------|-----------|-----------|
| Spammer | Inflate/deflate signature counts | Low — manual or simple scripts |
| Bot operator | Automated mass signing | Medium — botnets, automation tools |
| Malicious signer | Sign multiple times, disrupt | Medium — technical knowledge |
| Network attacker | Intercept verification traffic | High — network position |
| Provider insider | Access raw phone numbers | High — provider access |
| Application insider | Access signer data | High — database/server access |
| State-level adversary | Identify signers, suppress | Very high — legal + technical |

## Threat Matrix

### T1 — Automated Bot Signing

| Field | Value |
|-------|-------|
| Likelihood | High |
| Impact | High — undermines petition legitimacy |
| Mitigation | Cloudflare Turnstile, signed anti-bot challenge, per-IP rate limiting, honeypot fields |
| Residual risk | Determined bot operators can bypass Turnstile with human solvers |

### T2 — Duplicate Signing (Same Identity)

| Field | Value |
|-------|-------|
| Likelihood | High |
| Impact | High — inflates count |
| Mitigation | UNIQUE(petition_id, mobile_identity_hash) constraint, single-use verification transactions, atomic consume + insert |
| Residual risk | None at the database level; the constraint is authoritative |

### T3 — Replay Attack

| Field | Value |
|-------|-------|
| Likelihood | Medium |
| Impact | Medium — reuse a previous verification |
| Mitigation | Single-use transactions with state machine, idempotency keys on signature creation, request-scoped verification |
| Residual risk | None within transaction TTL |

### T4 — Stolen/Recycled Phone Numbers

| Field | Value |
|-------|-------|
| Likelihood | Medium |
| Impact | Medium — wrong person signs |
| Mitigation | Self-asserted consent requires active confirmation; CAMARA verifies control at time of verification |
| Residual risk | SIM swap attacks, recycled numbers assigned to new users |

### T5 — Provider Compromise

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | High — mass fake verifications |
| Mitigation | Provider abstraction allows switching; verification transactions are single-use; audit log tracks provider |
| Residual risk | Undetected provider compromise could enable fake verifications |

### T6 — Token Theft (Provider Credentials)

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | High — unauthorized verification calls |
| Mitigation | Credentials stored in environment variables (never in source), short-lived OAuth tokens, audit logging |
| Residual risk | Compromised environment (server breach) exposes credentials |

### T7 — Frontend Manipulation

| Field | Value |
|-------|-------|
| Likelihood | Medium |
| Impact | Medium — bypass client-side validation |
| Mitigation | All validation is server-side; frontend is purely a presentation layer; HMAC secrets never reach the browser |
| Residual risk | None — the server never trusts the client |

### T8 — Database Race Condition

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | High — duplicate signatures |
| Mitigation | Atomic SQL transitions on transaction consume, UNIQUE constraint as backstop, idempotency keys |
| Residual risk | CockroachDB serialization conflicts handled with retries |

### T9 — Log Leakage (PII)

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | High — expose signer phone numbers |
| Mitigation | Raw subjects never logged; only HMAC prefixes in audit logs; structured logging with allowlist |
| Residual risk | Developer error could log sensitive data; code review required |

### T10 — Denial of Service

| Field | Value |
|-------|-------|
| Likelihood | Medium |
| Impact | Medium — service unavailable |
| Mitigation | Cloudflare WAF, rate limiting, circuit breaker, emergency mode, CDN caching for reads |
| Residual risk | Large-scale DDoS may overwhelm free-tier services |

### T11 — Insider Threat (Application)

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | High — data breach, signature manipulation |
| Mitigation | Minimal data collection (no raw PII stored), audit logging, principle of least privilege |
| Residual risk | Database admin can access identity hashes (but not raw numbers) |

### T12 — Cross-Petition Reuse

| Field | Value |
|-------|-------|
| Likelihood | Low |
| Impact | Medium — verify once, sign multiple petitions |
| Mitigation | Each petition has its own uniqueness scope; verification transactions are per-petition |
| Residual risk | A signer can sign multiple different petitions legitimately |

## Residual Risks

The following risks are accepted and not fully mitigated:

1. **Human solver farms** can bypass anti-bot measures
2. **SIM swap attacks** can redirect verification to an attacker
3. **Recycled numbers** may be assigned to a new person after campaign ends
4. **Determined state-level adversaries** with legal authority to the provider can identify signers
5. **Provider outage** temporarily disables network verification (self-asserted fallback remains)
