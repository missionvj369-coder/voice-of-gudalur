/**
 * Official UIDAI Offline PKI public keys (SPKI, base64 DER), extracted from
 * UIDAI's published "Offline Aadhaar Verification" certificates — the same
 * keys UIDAI uses to sign the Secure QR on every modern Aadhaar card.
 *
 * Regenerate / rotate:  node scripts/extract-uidai-keys.mjs
 * Source certs:         scripts/certs/*.pem
 *
 * Newest first — verification tries each in order until one succeeds.
 */
export const UIDAI_SPKI_KEYS: readonly string[] = [
  // DS Unique Identification Authority of India 05 — valid to 2026-02-16
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmMIJKj28JcTN1B72p2/pgzDCoguhs/rbIXgN/ybNNh0NVOrZV2KllrmT5VOYlMrABpvIp7JU/n6hma3/O14n7nvngJ/y3colh8rk7msDwVAO7ZuVD+GCzfaYPLLkUS+wqH7M7FOHIn/pyJo1Rkxm98lO3dyox5RuLG2Uqm7JfVIomm0t7QKJoM5rf8JNvPXdwsxN89eWlT2Bf7BF//G3FKiF7ZHfvIyyqte/3orRRG/M80QqLrDP1RIeOa53ZTgILXcyQOb2yZOqNH3iN2uSKRsusNO17To5FOb2J9Hd5wIMuDv3zw4MWTrKAWuTYon90QSeGRKv1d5AQNRt0x5dSwIDAQAB',
  // DS UNIQUE IDENTIFICATION AUTHORITY OF INDIA 05 — valid to 2024-02-27
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAonIsDl8t5bpwftk/A27CsfC5VZMjkPrMDwvL8gyAoVwIi0iGhmty6yWrC/VaL+Brae29XMg7dMdwnbIUHmwHxovN+FnT2vfz/O0kHQcgVdwVSIR0tFwsmC+pVKpSqm//skgYYcZQhdhLZBWOn0PZ81ymm0jOkwBSIQKkyuCTv/1HSwjTLR0EBvaH9+Vb0iaiOEv1ikHDhMOXTxx8URWBnJJt463z7LuZBMSG8fXVMDl3vqY1hDZzKbXBaK/clRIXMff0jUOvfPMfabHju+eUnceosQwL3eurq96+oHahz4FmrfBqikHe3xQ7/4NdvSvVuwth0kcsI0ptRBG8m1NglQIDAQAB',
];

let initialized = false;

/** Register the UIDAI keys with the verifier exactly once per app session. */
export function initUidaiVerification(): void {
  if (initialized) return;
  // Imported lazily to keep this module tree-shakeable alongside the decoder.
  import('./aadhaarDecoder').then(({ setUidaiSpkiKeys }) => {
    setUidaiSpkiKeys([...UIDAI_SPKI_KEYS]);
    initialized = true;
  });
}