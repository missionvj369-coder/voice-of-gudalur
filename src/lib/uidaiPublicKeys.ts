/**
 * Official UIDAI Offline PKI public keys (SPKI, base64 DER), extracted from
 * UIDAI's published "Offline Aadhaar Verification" certificates — the same
 * keys UIDAI uses to sign the Secure QR on every modern Aadhaar card.
 *
 * Regenerate / rotate:  node scripts/extract-uidai-keys.mjs
 * Source certs:         scripts/certs/*.pem
 * Runbook:              docs/UIDAI_KEY_ROTATION.md
 *
 * Newest first — verification tries each in order until one succeeds.
 *
 * ⚠️ KEY EXPIRATION NOTICE:
 * The bundled keys below have expired. RSA signature verification will fail
 * for cards signed with newer keys. The SHA-256 integrity check (which does
 * NOT depend on these keys) still guards every scan against tampering.
 *
 * To add the current UIDAI key:
 *   1. Download the current "Offline Aadhaar Verification" certificate from
 *      UIDAI's official portal (https://uidai.gov.in → QR Code / Offline Verification)
 *   2. Save it as scripts/certs/uidai_offline_publickey_<DDMMYYYY>.pem
 *   3. Run: node scripts/extract-uidai-keys.mjs
 *   4. Add the printed SPKI base64 to the TOP of the array below (newest first)
 *
 * Alternatively, publish the key to CockroachDB app_config.uidai_spki_keys
 * (served via GET /api/config/uidai-keys) to rotate WITHOUT a new release.
 */
export const UIDAI_SPKI_KEYS: readonly string[] = [
  // ── CURRENT KEY GOES HERE ──────────────────────────────────────────────
  // Download the current UIDAI Offline e-KYC public key certificate and
  // extract its SPKI using scripts/extract-uidai-keys.mjs, then paste the
  // base64 DER here. This is the ONLY key needed for new cards.
  // ──────────────────────────────────────────────────────────────────────

  // DS Unique Identification Authority of India 05 — valid to 2026-02-16 (EXPIRED — kept for older cards)
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmMIJKj28JcTN1B72p2/pgzDCoguhs/rbIXgN/ybNNh0NVOrZV2KllrmT5VOYlMrABpvIp7JU/n6hma3/O14n7nvngJ/y3colh8rk7msDwVAO7ZuVD+GCzfaYPLLkUS+wqH7M7FOHIn/pyJo1Rkxm98lO3dyox5RuLG2Uqm7JfVIomm0t7QKJoM5rf8JNvPXdwsxN89eWlT2Bf7BF//G3FKiF7ZHfvIyyqte/3orRRG/M80QqLrDP1RIeOa53ZTgILXcyQOb2yZOqNH3iN2uSKRsusNO17To5FOb2J9Hd5wIMuDv3zw4MWTrKAWuTYon90QSeGRKv1d5AQNRt0x5dSwIDAQAB',
  // DS UNIQUE IDENTIFICATION AUTHORITY OF INDIA 05 — valid to 2024-02-27 (EXPIRED — kept for older cards)
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAonIsDl8t5bpwftk/A27CsfC5VZMjkPrMDwvL8gyAoVwIi0iGhmty6yWrC/VaL+Brae29XMg7dMdwnbIUHmwHxovN+FnT2vfz/O0kHQcgVdwVSIR0tFwsmC+pVKpSqm//skgYYcZQhdhLZBWOn0PZ81ymm0jOkwBSIQKkyuCTv/1HSwjTLR0EBvaH9+Vb0iaiOEv1ikHDhMOXTxx8URWBnJJt463z7LuZBMSG8fXVMDl3vqY1hDZzKbXBaK/clRIXMff0jUOvfPMfabHju+eUnceosQwL3eurq96+oHahz4FmrfBqikHe3xQ7/4NdvSvVuwth0kcsI0ptRBG8m1NglQIDAQAB',
];

let initialized = false;

/**
 * Zero-release rotation: overlay newer UIDAI keys published to the server's
 * `app_config.uidai_spki_keys` (CockroachDB, exposed via GET
 * /api/config/uidai-keys). Best-effort and fully fail-silent — offline or
 * missing-config builds simply keep the bundled keys. Public keys are public,
 * so the endpoint is unauthenticated; writes are server-side only.
 */
export async function refreshUidaiKeysFromServer(): Promise<void> {
  try {
    const res = await fetch('/api/config/uidai-keys', { credentials: 'same-origin' });
    if (!res.ok) return;
    const payload = (await res.json()) as { keys?: unknown };
    if (!Array.isArray(payload.keys)) return;
    const remoteKeys = payload.keys.filter(
      (k): k is string => typeof k === 'string' && k.length > 100,
    );
    if (remoteKeys.length === 0) return;
    const merged = Array.from(new Set([...remoteKeys, ...UIDAI_SPKI_KEYS]));
    const { setUidaiSpkiKeys } = await import('./aadhaarDecoder');
    setUidaiSpkiKeys(merged);
  } catch {
    /* offline / endpoint missing — bundled keys remain active */
  }
}

/** Register the UIDAI keys with the verifier exactly once per app session. */
export function initUidaiVerification(): void {
  if (initialized) return;
  initialized = true;
  // Imported lazily to keep this module tree-shakeable alongside the decoder.
  import('./aadhaarDecoder').then(({ setUidaiSpkiKeys }) => {
    setUidaiSpkiKeys([...UIDAI_SPKI_KEYS]);
    // Fire-and-forget overlay of any newer keys published via app_config.
    void refreshUidaiKeysFromServer();
  });
}