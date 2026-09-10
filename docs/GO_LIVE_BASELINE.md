# Voice of Gudalur — Go-Live Baseline

**Date:** 2026-09-10
**Commit:** 0345239544c641f6e33cc1d9cce0f16a4bb3c590 (HEAD -> main)
**Working tree:** Modified (Phase 1 audit fixes uncommitted)

---

## Build Result

`npm run build` → PASS (vite v6.4.3, 2420 modules, PWA generated, 34 precache entries)

## Test Result

`npx vitest run` → 42 tests passed (7 test files)

- server/middleware/validate.test.ts (8)
- server/utils/cache.test.ts (7)
- server/db/repositories/petitionRepository.test.ts (8)
- server/db/repositories/manifestoRepository.test.ts (6)
- server/db/repositories/wildlifeRepository.test.ts (5)
- src/services/__tests__/auth.test.ts (2)
- src/services/__tests__/placeCluster.test.ts (6)

## Migration State

- 001 base_schema.sql — Applied
- 002 indexes_constraints.sql — Applied
- 003 petition_system.sql — Applied
- 004 wildlife_system.sql — Applied
- 005 add_aadhaar_to_users.sql — Applied
- 006 official_password_auth.sql — Applied (Phase 1: credential removed)
- 007 media_posts.sql — Applied
- 008 auth_schema_converge.sql — Applied
- 009 pincode_aadhaar.sql — Applied
- 010 media_responsive_variants.sql — Applied
- 011 aadhaar_sign_gate.sql — Applied
- 012 env_bootstrap_supports.sql — PENDING (new migration)

---

## Runtime Routes

### Authentication
- POST /api/auth/register — resident registration (Aadhaar optional)
- POST /api/auth/lookup — passwordless login by phone or Gudalur ID
- POST /api/auth/refresh — rotate session
- POST /api/auth/logout — revoke session
- POST /api/auth/update-aadhaar — add/update Aadhaar
- GET  /api/auth/csrf — CSRF token
- POST /api/admin/login — PLATFORM_ADMIN login
- POST /api/officials/login — official email+password login

### Petitions
- POST /api/petitions/sign — resident signs (Aadhaar REQUIRED, auth REQUIRED)
- GET  /api/petitions/verify/:hash — public verification (masked fields only)
- GET  /api/petitions/list — lightweight metadata
- GET  /api/petitions/:id — petition detail
- GET  /api/petitions/sign-stats — public totals + leaderboard
- GET  /api/petitions/ledger — public hash ledger
- GET  /api/petitions/my-sign — resident's own signature
- POST /api/petitions/:id/support — endorse (auth REQUIRED)

### Other
- Manifesto: signature, submission, stats, my-status, official list
- Wildlife: incident, sighting, voice, incidents list, sightings list, nearby
- Media: list, upload (admin), delete (admin), file redirect
- Config: localities, uidai-keys, health
- Admin: login, logout, officials, approve, reject, reset-password, audit, stats, signs

---

## Authentication Flow
## Authentication Flow

1. Session model: httpOnly cookies (access_token JWT 15m, refresh_token opaque 24h, csrf_token non-httpOnly)
2. Registration: Instant — phone + name, Gudalur ID issued immediately
3. Login: Passwordless — phone OR Gudalur ID, session issued
4. Authorization: requireAuth() + requireRole(...roles) middleware
5. CSRF: Double-submit cookie pattern on state-changing requests

---

## Registration Flow

1. POST /api/auth/register with { name, phone, address?, aadhaarNumber? }
2. Phone normalized to 10 digits
3. Gudalur ID allocated (GD-YYYY-XXXXXX)
4. Aadhaar optional: if provided (12 digits), full + last4 + ref stored; verification_level = AADHAAR_VERIFIED. If absent: PHONE_VERIFIED.
5. Row inserted into users table
6. Session cookies set immediately

---

## Aadhaar Flow

| Stage | Requirement | Stored | Exposed |
|-------|-------------|--------|---------|
| Registration | OPTIONAL | aadhaar_number, aadhaar_last4, aadhaar_ref, has_aadhaar_on_file | No |
| Petition Signing | REQUIRED | (must be on file) | aadhaar_last4 only |
| Public Verify | N/A | — | aadhaar_last4 only |

Sign gate: petitions.ts checks verification_level !== AADHAAR_VERIFIED, returns 403.
Privacy: Full Aadhaar NEVER returned by any API. Only aadhaar_last4 in /verify/:hash.
Future-ready: users table has aadhaar_number, aadhaar_last4, aadhaar_ref, has_aadhaar_on_file. Adding verification_status, verification_timestamp, verification_method later requires no redesign.

---

## Petition Integrity

- Unique constraint on petition_signs(user_uid) and petition_signs(gdr_id)
- Idempotency key gives same response on retry
- CockroachDB transaction retry (5 attempts, exponential backoff)
- Server-side hash generation (never client)
- Safe under double-click, browser retry, network retry, concurrent requests

---

## Known Risks

1. No external supporter flow — only registered residents can participate
2. Petition counts conflate resident + authenticated-supporter endorsements
3. Migration 012 pending — not yet applied to production DB
4. Pre-existing type errors in _base template files (not actual source)
5. No E2E test for full resident, Aadhaar, sign flow
