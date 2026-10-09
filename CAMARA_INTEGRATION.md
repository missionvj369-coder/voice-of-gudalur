# CAMARA Integration

## Overview

The Open Civic Signature Protocol uses the [CAMARA](https://camara.org/) Number Verification API as its primary network identity verification provider. CAMARA is an open-source API initiative under the GSMA Open Gateway program, providing standardized telecom operator APIs.

## Important Distinctions

| Concept | Status |
|---------|--------|
| CAMARA specification | Open standard, freely available |
| CAMARA open-source code | Available under open-source licenses |
| CAMARA sandbox | Available for testing with participating operators |
| Production network access | Requires operator/aggregator onboarding |
| Production credentials | Requires commercial agreement |

**This implementation does NOT pretend to have production operator access.** It implements the sandbox configuration first and documents the path to production.

## Architecture

```
Petition Signing Flow
        │
        ▼
Identity Verification Interface
        │
        ▼
Provider Registry
        │
        ├── camara ─────────► CamaraNumberVerification
        │                      ├── camaraConfig.ts (env-driven config)
        │                      ├── camaraClient.ts (HTTP + auth)
        │                      ├── camaraTypes.ts (API types)
        │                      └── camaraNumberVerification.ts (adapter)
        │
        └── self-asserted ──► SelfAssertedVerifier (fallback)
```

## Configuration

All CAMARA configuration is environment-driven:

| Variable | Required | Description |
|----------|----------|-------------|
| `CAMARA_MODE` | Yes | `off`, `sandbox`, or `production` |
| `CAMARA_BASE_URL` | Yes | API base URL |
| `CAMARA_NUMBER_VERIFY_PATH` | No | Override default path |
| `CAMARA_CLIENT_ID` | For sandbox/prod | OAuth client ID |
| `CAMARA_CLIENT_SECRET` | For sandbox/prod | OAuth client secret |
| `CAMARA_TOKEN` | No | Pre-fetched OAuth token |
| `CAMARA_TOKEN_URL` | For sandbox/prod | OAuth token endpoint |
| `CAMARA_TIMEOUT_MS` | No | Request timeout (default 8000) |
| `CAMARA_MAX_RETRIES` | No | Max retries (default 2) |

## Modes

### CAMARA_MODE=off (default)

- Adapter reports `maxAssurance: 0` (not capable).
- Engine falls back to self-asserted verification.
- No external API calls made.

### CAMARA_MODE=sandbox

- Reports `maxAssurance: NETWORK_VERIFIED` with `sandbox: true`.
- Clearly labeled as sandbox — does not claim production network verification.
- Uses sandbox operator endpoints.
- No real subscriber data processed.

### CAMARA_MODE=production

- Reports `maxAssurance: NETWORK_VERIFIED` with `production: true`.
- Requires valid production operator/aggregator endpoint.
- Requires production OAuth credentials.
- **Production access is NOT assumed.** See `CAMARA_PRODUCTION_ACCESS.md`.

## API Flow

```
1. OAuth token acquisition (client_credentials grant)
2. POST /number-verification/v0/verify
   Body: { phoneNumber: "+91XXXXXXXXXX" }
   Headers: Authorization: Bearer <token>
3. Response: { devicePhoneNumberVerified: true/false }
   (or { verificationResult: true/false } for v0.3)
4. Result mapped to VerificationResult
```

## Response Handling

| Scenario | Result |
|----------|--------|
| `verified: true` | `ok: true`, assurance = NETWORK_VERIFIED |
| `verified: false` | `ok: false`, reason = verification_mismatch |
| Malformed response | `ok: false`, reason = malformed_response |
| Timeout | `ok: false`, reason = provider_timeout |
| Auth failure | `ok: false`, reason = invalid_token |
| Network error | `ok: false`, reason = provider_unavailable |

## Privacy

- Raw phone numbers are sent to CAMARA for verification.
- CAMARA's privacy policy applies to their processing.
- We do not store the raw CAMARA response.
- We store only:
  - An opaque provider reference (`cam-<random>`)
  - An HMAC integrity hash of the response

## Error Handling

All CAMARA errors are mapped to the protocol's controlled vocabulary. Raw provider errors are never exposed to the client.

## Fallback Behavior

When CAMARA is unavailable or not configured:
1. The adapter reports `maxAssurance: 0`.
2. The engine falls back to self-asserted verification.
3. Signers can still sign (with consent).
4. The assurance level is recorded as SELF_ASSERTED_MOBILE.

This ensures the petition remains functional even when the network provider is down.

## Testing

- Unit tests mock the CAMARA HTTP client.
- Sandbox integration tests require valid sandbox credentials.
- Production tests are not included in the automated suite.
- All tests use fake phone numbers.
