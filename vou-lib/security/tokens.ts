/**
 * Cryptographically secure token generation and hashing.
 * 
 * - At least 128 bits of entropy
 * - Uses Web Crypto API (crypto.randomBytes)
 * - Only token hashes are stored, never raw tokens
 * - No sequential IDs, no embedded user data
 */

import { createHash, randomBytes } from "crypto";

/**
 * Generate a cryptographically secure random token.
 * Returns the raw token (to be sent to user) and its hash (to be stored).
 * 32 bytes = 256 bits of entropy (exceeds 128-bit minimum).
 */
export function generateSecureToken(): { rawToken: string; tokenHash: string } {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

/**
 * Hash a token using SHA-256 for secure storage.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generate a session ID.
 * 32 bytes = 256 bits of entropy.
 */
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Generate a request ID for tracing.
 */
export function generateRequestId(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Hash an idempotency key for storage.
 */
export function hashIdempotencyKey(key: string): string {
  return createHash("sha256").update(`idempotency:${key}`).digest("hex");
}

/**
 * Hash a request body for idempotency verification.
 */
export function hashRequestBody(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}
