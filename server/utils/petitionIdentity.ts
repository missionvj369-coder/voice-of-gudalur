import crypto from 'crypto';

/**
 * Voice of Gudalur — Public petition identity (Name + Mobile signing).
 *
 * The authoritative uniqueness key is NOT the raw mobile number and NOT
 * anything the browser controls. It is:
 *
 *     mobile_identity_hash = HMAC-SHA256(PETITION_IDENTITY_SECRET, canonical_mobile)
 *
 * - The raw mobile NEVER reaches storage or logs; only phone_last4 (display)
 *   and the HMAC (lookup/uniqueness) are persisted.
 * - The HMAC secret is server-only (no VITE_ prefix), loaded from the
 *   environment, and must be 32+ chars of entropy.
 * - Normalization happens HERE, server-side, immediately before hashing —
 *   the client's formatting is advisory only and never trusted.
 */

/** Canonical form: 10-digit Indian national mobile number (e.g. 9876543210). */
const CANONICAL_RE = /^[6-9][0-9]{9}$/;

export interface MobileNormalizeOk {
  ok: true;
  /** Canonical 10-digit national number — the HMAC input. */
  canonical: string;
  /** Display-only last 4 digits (the ONLY part ever persisted). */
  last4: string;
}
export interface MobileNormalizeErr {
  ok: false;
  /** Stable machine reason — safe to return to the client. */
  reason: 'invalid_mobile';
}

/**
 * Server-side mobile normalization. Never trust the client's version.
 * Accepts: 9876543210 · 09876543210 · +919876543210 · 919876543210 ·
 *          "98765 43210" · "+91-98765-43210"
 * Rejects: wrong length, non-Indian country codes, numbers not starting 6-9.
 */
export function normalizeMobile(raw: unknown): MobileNormalizeOk | MobileNormalizeErr {
  if (typeof raw !== 'string') return { ok: false, reason: 'invalid_mobile' };
  let digits = raw.replace(/[^0-9]/g, '');
  // Strip international/trunk prefixes down to the 10-digit national number.
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  else if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  if (!CANONICAL_RE.test(digits)) return { ok: false, reason: 'invalid_mobile' };
  return { ok: true, canonical: digits, last4: digits.slice(-4) };
}

function identitySecret(): string | null {
  const secret = process.env.PETITION_IDENTITY_SECRET;
  // A missing or short secret must NEVER silently weaken the identity scheme.
  return secret && secret.length >= 32 ? secret : null;
}

/** True when the server can compute mobile identity hashes at all. */
export function isPetitionIdentityConfigured(): boolean {
  return identitySecret() !== null;
}

/**
 * HMAC-SHA-256 over the canonical mobile with the server-only secret.
 * Throws (fail closed) when PETITION_IDENTITY_SECRET is missing/weak —
 * callers translate that into a 503 "temporarily unavailable" response.
 */
export function mobileIdentityHash(canonicalMobile: string): string {
  const secret = identitySecret();
  if (!secret) {
    throw new Error('PETITION_IDENTITY_SECRET is not configured (need 32+ chars)');
  }
  // Domain-separated (prefix) so this HMAC can never be confused with any
  // other HMAC computed with the same secret elsewhere in the app.
  return crypto.createHmac('sha256', secret).update('vog-mobile-identity-v1:' + canonicalMobile, 'utf8').digest('hex');
}

/** Safe log prefix — enough to correlate, never reversible to the number. */
export function identityLogPrefix(hash: string): string {
  return hash.slice(0, 12) + '…';
}
