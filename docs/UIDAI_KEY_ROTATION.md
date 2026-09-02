# 🔑 UIDAI Secure-QR key rotation — runbook

> **Honest note (known limitation):** the 2026 UIDAI cert expired **Feb 2026**
> and UIDAI's site 404s the newer file, so very-recent cards may show
> *"signature key not matched (key rotation)"*. The **SHA-256 integrity check
> still guards every scan**, and adding the next cert is a **one-file drop
> into `scripts/certs/`** — or, with no release at all, a single Supabase row
> update (see [2. Zero-release rotation](#2-zero-release-rotation-supabase)).

## Current status

| Cert (in `scripts/certs/`) | Valid to | Bundled SPKI | Seeded in `app_config` |
|---|---|---|---|
| `uidai_offline_publickey_26022021.pem` | 2024-02-27 | ✅ (fallback) | — |
| `uidai_offline_publickey_17022026.pem` | 2026-02-16 | ✅ (newest) | ✅ |
| next UIDAI cert | — | ❌ not yet published by UIDAI | ❌ |

**Impact while all bundled keys are expired:** signature verification reports
`signatureOk: false/null` and the UI shows *"signature key not matched (key
rotation)"*. Structural decode, last-4 extraction and the embedded
**SHA-256 integrity check remain fully effective** — tampered or forged QRs
are still rejected. This is a degradation of assurance level, not a security hole.

## What still protects every scan (defence in depth)

1. **Structural decode** — Secure-QR v2 binary layout (fields + share code + hash + 256-byte signature).
2. **SHA-256 integrity** — the digest embedded in the QR must match the decoded fields (WebCrypto). Forged/altered QRs fail here.
3. **RSA-2048 signature** — binds the QR to UIDAI's Offline PKI. Requires a current trusted key — the part affected by rotation.

## 1. Release-based rotation (bundled keys)

1. Obtain the new official UIDAI "Offline Aadhaar Verification" public key
   (UIDAI portal → QR Code / Offline Verification page; also mirrored by the
   anon-aadhaar project when they update `packages/react/src/publicKeys.ts`).
2. Save it as `scripts/certs/uidai_offline_publickey_<DDMMYYYY>.pem`.
3. Extract the SPKI: `node scripts/extract-uidai-keys.mjs`
4. Paste the printed `SPKI base64` at the **top** of `UIDAI_SPKI_KEYS` in
   `src/lib/uidaiPublicKeys.ts` (newest first — the verifier tries each in order).
5. Note the validity window in the inline comment; ship the release.

## 2. Zero-release rotation (Supabase)

The app reads `public.app_config` row `uidai_spki_keys` once per registration
session (`refreshUidaiKeysFromDb()`) and overlays those keys on top of the
bundled ones — **no app release required**.

One-time setup (Supabase SQL editor):

```sql
-- run supabase/UIDAI_KEYS_SCHEMA.sql
```

Then to rotate:

```sql
update public.app_config
   set value = '["<NEW-SPKI-BASE64>"]',
       updated_at = now()
 where key = 'uidai_spki_keys';
```

Residents' devices pick the new key up on the next Aadhaar scan. The SHA-256
integrity check keeps protecting scans in the meantime.

**Security:** anon may SELECT (public keys are public) but has **no** write
policies — rotations are performed via the dashboard or `service_role` key.

## 3. Verifying a card locally

Scan a real Aadhaar in the registration modal → the Verified screen lists:

- ✅ *"Integrity verified (SHA-256)"* — always expected
- ✅ / ⚠️ *"Digitally signed by UIDAI"* vs *"signature key not matched (key rotation)"*

## Files involved

| File | Role |
|---|---|
| `scripts/certs/*.pem` | Official UIDAI certificates (source of truth) |
| `scripts/extract-uidai-keys.mjs` | cert → SPKI base64 extractor |
| `src/lib/uidaiPublicKeys.ts` | bundled SPKI registry + `refreshUidaiKeysFromDb()` |
| `src/lib/aadhaarDecoder.ts` | structural decode + SHA-256 + RSA verify |
| `supabase/UIDAI_KEYS_SCHEMA.sql` | `app_config` table + seed (zero-release path) |
