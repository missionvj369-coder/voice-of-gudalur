/**
 * Open Civic Signature Protocol — privacy-preserving identity normalization.
 *
 * The engine persists ONLY:
 *   identity_key_hash = HMAC-SHA-256(version-specific-secret, domain:canonical_subject)
 *
 * KEY VERSIONING:
 *   Each hash carries an explicit version (identity_key_version). Rotating
 *   VERIFICATION_IDENTITY_SECRET produces a NEW version; historical hashes
 *   remain valid under their original version. Duplicate detection checks the
 *   active version plus all historical versions back to the configured retention.
 *
 * Rules (hard):
 *  - The raw provider subject (phone/MSISDN) is NEVER persisted, logged, or
 *    returned to the browser by this layer.
 *  - VERIFICATION_IDENTITY_SECRET is server-only (no VITE_ prefix) and must be
 *    >= 32 chars; failure to configure it FAILS CLOSED (throws).
 *  - Domain separation: every HMAC is prefixed with a stable domain string so
 *    the same secret can never produce a collision across unrelated uses.
 *  - Versioned secrets: VERIFICATION_IDENTITY_SECRET_ACTIVE (current writes),
 *    VERIFICATION_IDENTITY_SECRET_V<n> (historical, for duplicate detection).
 */
import crypto from 'crypto';

const MIN_SECRET_LENGTH = 32;

/** Domain prefixes — NEVER change a prefix that is already in production. */
export const IDENTITY_HASH_DOMAIN = 'open-civic-signature:v1:identity';
export const SUBJECT_LOG_DOMAIN = 'open-civic-signature:v1:log-subject';

/** Current active version — incremented on each key rotation. */
export const ACTIVE_KEY_VERSION = Number(process.env.VERIFICATION_KEY_VERSION || 1);

function secretForVersion(version: number): string | null {
  if (version === ACTIVE_KEY_VERSION) {
    const active = process.env.VERIFICATION_IDENTITY_SECRET_ACTIVE
      || process.env.VERIFICATION_IDENTITY_SECRET
      || process.env.PETITION_IDENTITY_SECRET
      || null;
    return active && active.length >= MIN_SECRET_LENGTH ? active : null;
  }
    const historical = process.env['VERIFICATION_IDENTITY_SECRET_V' + version] || null;
  return historical && historical.length >= MIN_SECRET_LENGTH ? historical : null;
}

export function isIdentityHashConfigured(): boolean {
  return secretForVersion(ACTIVE_KEY_VERSION) !== null;
}

export function validKeyVersions(): number[] {
  const versions: number[] = [];
  for (let v = 1; v <= ACTIVE_KEY_VERSION; v++) {
    if (secretForVersion(v) !== null) versions.push(v);
  }
  return versions;
}

export function identityKeyHash(canonicalSubject: string, version: number = ACTIVE_KEY_VERSION): string {
    const secret = secretForVersion(version);
  if (!secret) throw new Error('VERIFICATION_IDENTITY_SECRET v' + version + ' not configured (need 32+ chars)');
  return crypto.createHmac('sha256', secret).update(IDENTITY_HASH_DOMAIN + ':v:' + version + ':' + canonicalSubject, 'utf8').digest('hex');
}

export function identityKeyHashAllVersions(canonicalSubject: string): Array<{ version: number; hash: string }> {
  return validKeyVersions().map((v) => ({ version: v, hash: identityKeyHash(canonicalSubject, v) }));
}

export function identityLogPrefix(hash: string): string {
  return hash.slice(0, 10) + '…';
}

export function normalizeIdentity(canonicalSubject: string, version: number = ACTIVE_KEY_VERSION): {
  identityKeyHash: string; identityKeyVersion: number; logPrefix: string;
} {
  const identityKeyHashValue = identityKeyHash(canonicalSubject, version);
  return { identityKeyHash: identityKeyHashValue, identityKeyVersion: version, logPrefix: identityLogPrefix(identityKeyHashValue) };
}
