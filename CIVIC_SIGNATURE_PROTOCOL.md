# Open Civic Signature Protocol — Specification

**Version:** 0.1
**Status:** Draft (reference implementation)
**Scope:** Reusable civic-signature infrastructure for public-interest campaigns.

---

## 1. Purpose

This protocol defines a reusable architecture for collecting authenticated signatures on civic petitions. It separates concerns so that:

- The **signature engine** handles uniqueness, counting, and audit.
- The **identity verification** layer is provider-agnostic.
- The **provider adapter** performs the actual verification (network, self-asserted, or future methods).

Voice of Gudalur is the first production reference implementation.

## 2. Assurance Levels

| Level | Name | Claim |
|-------|------|-------|
| 0 | UNVERIFIED | No verification performed |
| 1 | ANTI_BOT | Passed anti-bot challenge (e.g. Cloudflare Turnstile) |
| 2 | SELF_ASSERTED_MOBILE | Submitter confirmed control of a mobile number via explicit consent |
| 3 | NETWORK_VERIFIED | Mobile identity verified through a network provider (e.g. CAMARA Number Verification) |
| 4 | TRUSTED_CREDENTIAL | Verified through a trusted third-party credential (future) |

**Important:** No assurance level proves "one phone = one human." Each level supports a specific, documented claim. Level 3 (NETWORK_VERIFIED) confirms the submitter demonstrated control of a mobile number through a participating network operator.

## 3. Verification Transaction

Every signature attempt begins with a **single-use verification transaction**.

### States

```
CREATED → STARTED → VERIFIED → CONSUMED
                     ↓
                   FAILED
                     ↓
                   EXPIRED
```

| State | Meaning |
|-------|---------|
| CREATED | Transaction allocated, provider call pending |
| STARTED | Provider call in progress |
| VERIFIED | Provider confirmed the identity claim |
| FAILED | Provider rejected or errored |
| EXPIRED | Transaction passed TTL without completion |
| CONSUMED | Successfully used for exactly one signature |

### Properties

- **Unique transaction ID** — `VOG-<timestamp>-<random>` format
- **Provider** — which adapter performed verification
- **State** — current lifecycle state
- **Timestamps** — created, started, verified, expired, consumed
- **Expiry** — transactions auto-expire after TTL (default 10 minutes)
- **Request ID** — correlation with the originating HTTP request
- **Provider reference** — opaque reference from the provider (never raw PII)
- **Result integrity reference** — HMAC of the raw provider response

### Replay Prevention

- A VERIFIED transaction can be consumed **exactly once**.
- Concurrent consume attempts: only one succeeds; the rest receive `CONSUMED` state and are rejected.
- Expired transactions cannot be consumed.
- Failed transactions cannot be consumed.

## 4. Identity Normalization

The protocol uses a **privacy-preserving identity key**:

```
identity_key_hash = HMAC-SHA-256(secret, canonical_provider_subject)
```

Where:
- `secret` is a server-side key (environment variable `VERIFICATION_IDENTITY_SECRET`)
- `canonical_provider_subject` is the normalized mobile number (E.164 format)

**Properties:**
- Deterministic: same input always produces same hash
- Non-reversible: cannot recover the original number from the hash
- Unique per secret: changing the secret invalidates all hashes

**Storage:**
- Only the hash is stored in the database
- Raw numbers are never persisted or logged
- Only a 16-character prefix of the hash (`identityLogPrefix`) appears in logs

## 5. Uniqueness

The database enforces:

```sql
UNIQUE(petition_id, mobile_identity_hash)
```

This is the **final authority** on whether a signature is unique. The frontend never decides.

### Concurrent Duplicate Prevention

When two requests attempt to sign with the same identity simultaneously:

The database unique constraint is the backstop — even if the application logic has a race, the constraint prevents duplicates.

## 6. Signature Hash

Each signature receives a **server-generated cryptographic hash**:

```
signature_hash = HMAC-SHA-256(secret, canonical_input)
```

Where `canonical_input` includes:
- petition_id
- identity_key_hash
- civic_sign_id
- provider name
- assurance level

**Purpose:** The signature hash is an **audit identifier**. It proves a specific signature was created by the server without revealing the signer's identity.

**NOT a uniqueness mechanism.** The database unique constraint handles uniqueness; the signature hash provides tamper-evidence.

## 7. Public Signature Identifiers

Each signature receives a **civic sign ID**:

```
VOG-<random-alphanumeric>
```

**Purpose:** Allows signers to verify their signature was recorded without revealing their identity.

**What it does NOT expose:**
- Mobile number
- Email
- Provider subject
- IP address
- Identity hash
- Database primary key
- Security metadata

## 8. Provider Abstraction

The protocol defines a provider interface:

```typescript
interface MobileIdentityVerifier {
  getCapabilities(): VerificationCapabilities;
  verify(request: VerificationRequest): Promise<VerificationResult>;
}
```

### Provider Capabilities

```typescript
interface VerificationCapabilities {
  provider: string;
  maxAssurance: AssuranceLevel;
  production: boolean;
  sandbox: boolean;
  description: string;
}
```

### Provider Resolution

The signature engine resolves a provider by:
1. Explicit provider name (from configuration)
2. Requested assurance level (find best provider ≥ requested)
3. Fallback to self-asserted when no network provider is available

## 9. Anti-Bot Protection

The protocol requires **server-side** anti-bot validation:

- Cloudflare Turnstile (or equivalent challenge)
- Signed challenge tokens verified server-side
- Honeypot fields to catch simple bots
- Per-IP rate limiting per endpoint

Anti-bot is **independent** from identity verification. A user may pass anti-bot but fail identity verification (or vice versa).

## 10. Privacy Principles

1. **Data minimization** — collect only what is necessary
2. **No Aadhaar** — this protocol does not use Aadhaar or equivalent national ID
3. **No public phone numbers** — numbers are never displayed publicly
4. **No unnecessary PII** — only the identity hash and last 4 digits are stored
5. **Secret handling** — HMAC keys are environment variables, never in source
6. **Logging restrictions** — raw subjects, tokens, and secrets never logged
7. **Retention** — data retained only as long as necessary for the campaign
8. **Deletion** — signers can request deletion (implementation-specific)

## 11. Error Handling

All provider errors are mapped to a controlled vocabulary:

| Error | Meaning |
|-------|---------|
| provider_timeout | Provider did not respond in time |
| malformed_response | Provider returned invalid data |
| invalid_token | Auth token rejected or expired |
| verification_mismatch | Provider reported number not verified |
| provider_unavailable | Provider unreachable |
| provider_error | Unclassified provider error |

The signature engine never exposes raw provider errors to the client.

## 12. Observability

Structured events emitted for every verification lifecycle transition:

- verification_started
- verification_verified
- verification_failed
- verification_expired
- signature_attempted
- signature_created
- signature_duplicate
- signature_rejected
- provider_timeout
- provider_error
- rate_limited

Every request receives `X-Request-Id` header for correlation.

## 13. Emergency Mode

When `EMERGENCY_MODE=1`:
- Non-essential endpoints return 503 + Retry-After
- Auth, petitions, media, and health remain active
- Rate limits may be tightened
- Provider circuit breakers may open more aggressively

## 14. Portability

The protocol is designed for eventual extraction:

```
open-civic-signature-protocol/
├── core/
├── verification/
├── providers/
│   └── camara/
├── crypto/
├── database/
├── anti-abuse/
├── audit/
├── docs/
└── examples/
```

Module boundaries make extraction possible without rewriting the entire application.

1. Both pass verification (both get VERIFIED transactions).
2. The first to consume its transaction succeeds in creating a signature.
3. The second's consume returns null (transaction already CONSUMED).
4. The second request receives a deterministic "already signed" response.

The database unique constraint is the backstop — even if the application logic has a race, the constraint prevents duplicates.
