/**
 * TOTP (RFC 6238) verification for admin MFA.
 *
 * - Secret provided as base32 string in ADMIN_TOTP_SECRET env var
 *   (ADMIN_TOTP_SECRET_CSV supports multiple accounts: "secret1,secret2").
 * - 6-digit codes, SHA-1 HMAC, 30-second step, ±1 step clock drift window.
 * - Last-used timestep tracked to prevent replay of the same code.
 */

import { createHmac } from "crypto";
import { redisSet, redisGet } from "./redis";

const TOTP_STEP_SECONDS = 30;
const TOTP_WINDOW = 1; // allow ±1 step drift

export function isTotpConfigured(): boolean {
  return !!(
    process.env.ADMIN_TOTP_SECRET ||
    (process.env.ADMIN_TOTP_SECRET_CSV && process.env.ADMIN_TOTP_SECRET_CSV.trim().length > 0)
  );
}

function getTotpSecrets(): string[] {
  const single = process.env.ADMIN_TOTP_SECRET;
  const csv = process.env.ADMIN_TOTP_SECRET_CSV;
  const secrets: string[] = [];
  if (single) secrets.push(single.trim());
  if (csv) {
    for (const s of csv.split(",")) {
      const t = s.trim();
      if (t) secrets.push(t);
    }
  }
  return secrets;
}

/**
 * Verify a TOTP code against any configured secret.
 */
export async function verifyTotp(code: string): Promise<{ valid: boolean; error?: string }> {
  const secrets = getTotpSecrets();
  if (secrets.length === 0) {
    return { valid: false, error: "MFA is not configured" };
  }

  if (!/^\d{6}$/.test(code.trim())) {
    return { valid: false, error: "Invalid MFA code" };
  }

  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);

  for (const secret of secrets) {
    for (let drift = -TOTP_WINDOW; drift <= TOTP_WINDOW; drift++) {
      const step = counter + drift;
      if (step < 0) continue;
      const expected = generateTotp(secret, step);
      if (timingSafeEqualHex(expected, code.trim())) {
        // Prevent replay of the same timestep code
        const replayKey = `totp:used:${secret.length}:${step}`;
        const used = await redisGet(replayKey);
        if (used === expected) {
          return { valid: false, error: "MFA code already used" };
        }
        await redisSet(replayKey, expected, TOTP_STEP_SECONDS * (TOTP_WINDOW + 2));
        return { valid: true };
      }
    }
  }

  return { valid: false, error: "Invalid MFA code" };
}

/**
 * Generate a 6-digit TOTP for a given secret and timestep (RFC 6238).
 */
export function generateTotp(base32Secret: string, step: number): string {
  const key = base32Decode(base32Secret);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  buf.writeUInt32BE(step >>> 0, 4);

  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 1_000_000).toString().padStart(6, "0");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Decode a base32 (RFC 4648) string to bytes.
 */
export function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}