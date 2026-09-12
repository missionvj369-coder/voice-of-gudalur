# Open Civic Signature Protocol — Privacy

## Principles

1. **Data Minimization** — Collect only what is necessary for the verification purpose.
2. **Purpose Limitation** — Data is used only for petition signing, never for marketing or profiling.
3. **Storage Limitation** — Data is retained only as long as the campaign requires.
4. **Security** — Data is protected by encryption at rest and in transit.
5. **Transparency** — Signers know what is collected and why.
6. **Accountability** — Every data access is logged in the audit trail.

## What We Collect

| Data | Purpose | Storage |
|------|---------|---------|
| Full name | Display alongside signature (if public) | Plaintext in `petition_mobile_signs.full_name` |
| Mobile number (last 4 digits) | Allow signer to recognize their signature | Plaintext in `petition_mobile_signs.phone_last4` |
| Identity key hash | Enforce one-signature-per-identity | HMAC-SHA-256 in `petition_mobile_signs.mobile_identity_hash` |
| Verification metadata | Audit trail, provider reference | `verification_transactions` table |
| Civic sign ID | Public verification of signature | `petition_mobile_signs.civic_sign_id` |
| Signature hash | Tamper-evidence | `petition_mobile_signs.sign_hash` |
| Timestamp | When the signature was created | `petition_mobile_signs.created_at` |

## What We Do NOT Collect

| Data | Reason |
|------|--------|
| Raw mobile number (full) | Not stored — only the HMAC hash is persisted |
| Email address | Not needed for verification |
| Aadhaar / national ID | Explicitly excluded by design |
| IP address | Hashed for rate limiting, not stored long-term |
| Geolocation | Not collected |
| Device fingerprint | Not collected |
| Browser user agent | Hashed for abuse detection, not stored as plaintext |

## What We Do NOT Expose Publicly

| Data | Reason |
|------|--------|
| Full mobile number | Privacy — never displayed |
| Email address | Not collected |
| Identity key hash | Internal uniqueness mechanism |
| Database primary key | Prevents enumeration attacks |
| Provider subject | Raw provider identifier |
| IP address | Privacy |
| Audit log entries | Internal use only |

## Identity Hash Construction

```
identity_key_hash = HMAC-SHA-256(secret, canonical_mobile)
```

- **Deterministic:** Same mobile always produces the same hash.
- **Non-reversible:** Cannot recover the mobile number from the hash.
- **Secret-dependent:** Changing the secret invalidates all hashes.
- **Not a password hash:** This is a keyed fingerprint, not a bcrypt/argon2 hash.

## Logging Restrictions

The following are **never** logged:

- Raw mobile numbers
- Raw provider subjects
- Provider OAuth tokens
- Client secrets
- HMAC signing keys
- Turnstile secrets

Only the following may appear in logs:

- Identity hash prefix (first 16 characters)
- Transaction references
- Civic sign IDs
- Request IDs
- Error codes (without sensitive detail)

## Data Retention

- **Active campaign:** Data retained for the duration of the campaign.
- **Post-campaign:** Data may be archived or deleted per campaign policy.
- **Signer request:** Signers may request deletion by contacting the campaign.
- **Verification transactions:** Auto-expired after TTL; expired records may be swept.

## Data Deletion

Signers can request deletion by:
1. Providing their civic sign ID (or last 4 digits of their mobile).
2. The campaign operator verifies the request.
3. The signature record is deleted from `petition_mobile_signs`.
4. The identity hash is irrecoverable (no backup of raw numbers exists).

## Third-Party Providers

When CAMARA (or another provider) is used:
- The provider receives the mobile number for verification.
- The provider's privacy policy applies to their processing.
- We do not store the provider's raw response.
- We store only an opaque provider reference and an HMAC integrity hash.

## No Aadhaar

This protocol **does not** use Aadhaar, India's national biometric ID, or any equivalent national identity system. Verification is based on mobile identity only.

## No Advertising or Profiling

- Data is never sold.
- Data is never shared with advertisers.
- Data is never used for profiling.
- Data is never used for purposes other than the petition campaign.

## Security Contact

For security or privacy concerns, contact the campaign operator through the official Voice of Gudalur channels.
