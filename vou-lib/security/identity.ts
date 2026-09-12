/**
 * Identity key generation using HMAC-SHA256.
 * 
 * For phone-verified identities:
 *   identity_key = HMAC_SHA256(server_secret, normalized_E164_phone_number)
 * 
 * For non-phone providers:
 *   identity_key = HMAC_SHA256(server_secret, provider + ":" + provider_subject_hash)
 * 
 * Never use plain unsalted hashes.
 */

import { createHmac, randomBytes } from "crypto";

function getIdentitySecret(): string {
  const secret = process.env.IDENTITY_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      "IDENTITY_HMAC_SECRET environment variable is required. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    );
  }
  return secret;
}

function getSecret(): string {
  return getIdentitySecret();
}

/**
 * Generate canonical identity key for a phone-verified identity.
 * Uses HMAC-SHA256 with a server-side secret.
 */
export function generatePhoneIdentityKey(normalizedE164: string): string {
  return createHmac("sha256", getSecret())
    .update(`phone:${normalizedE164}`)
    .digest("hex");
}

/**
 * Generate canonical identity key for a provider-based identity.
 * Uses HMAC-SHA256 with a server-side secret.
 */
export function generateProviderIdentityKey(
  provider: string,
  providerSubjectHash: string
): string {
  return createHmac("sha256", getSecret())
    .update(`provider:${provider}:${providerSubjectHash}`)
    .digest("hex");
}

/**
 * Hash a provider subject ID for storage.
 * Uses SHA-256 (one-way, no secret needed — this is just for dedup, not authentication).
 */
export function hashProviderSubject(subject: string): string {
  return createHmac("sha256", getSecret())
    .update(`subject:${subject}`)
    .digest("hex");
}

/**
 * Hash a normalized E.164 phone number for deduplication.
 * Uses HMAC-SHA256 so it cannot be reversed without the server secret.
 */
export function hashPhoneE164(normalizedE164: string): string {
  return createHmac("sha256", getSecret())
    .update(`phone_hash:${normalizedE164}`)
    .digest("hex");
}

/**
 * Normalize a phone number to E.164 format.
 * Strips all non-digit characters, ensures it starts with +.
 * Returns null if the number is invalid.
 */
export function normalizePhoneE164(raw: string): string | null {
  // Strip all non-digit characters except leading +
  const cleaned = raw.replace(/[^\d+]/g, "");
  
  // Must start with + and country code
  if (!cleaned.startsWith("+")) {
    return null;
  }
  
  const digits = cleaned.replace(/\D/g, "");
  
  // E.164: max 15 digits, min 7 (short codes excluded)
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }
  
  return `+${digits}`;
}

/**
 * Generate a cryptographically secure public reference.
 * Format: VOG-XXXXXX (alphanumeric, unambiguous characters).
 */
export function generatePublicReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1
  let result = "VOG-";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}
