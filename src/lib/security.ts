/**
 * Client-side security utilities for civic actions.
 * The authoritative validation always happens server-side
  * (CockroachDB constraints + server-side authorization); these guard the client layer
 * against XSS payloads, spam bursts, and malformed identity data.
 */

/** Strip angle brackets/control chars, collapse whitespace, cap length. */
export const sanitizeText = (input: string | null | undefined, maxLength = 500): string => {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
};

/** Indian mobile: 10 digits starting 6-9 (tolerates +91 / spaces / dashes). */
export const isValidIndianPhone = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits);
};

/**
 * Sliding-window rate limiter (per browser): max `limit` actions
 * per `windowMs` for a named action key. Prevents accidental or
 * malicious spam bursts during mobilization pushes.
 */
const rateBuckets = new Map<string, number[]>();

export const checkRateLimit = (
  key: string,
  limit = 3,
  windowMs = 60_000
): { allowed: boolean; retryInMs: number } => {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryInMs = windowMs - (now - hits[0]);
    return { allowed: false, retryInMs };
  }
  hits.push(now);
  rateBuckets.set(key, hits);
  // opportunistic cleanup
  if (rateBuckets.size > 50) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= windowMs)) rateBuckets.delete(k);
    }
  }
  return { allowed: true, retryInMs: 0 };
};

/**
 * SHA-256 hex digest (WebCrypto) with a deterministic FNV-1a fallback so
 * immobilization features still work on devices without crypto.subtle.
 */
export const sha256Hex = async (input: string): Promise<string> => {
  const value = `${input}`;
  try {
    if (crypto?.subtle?.digest) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    /* fall through to deterministic hash */
  }
  // FNV-1a 64-ish deterministic fallback (never throws, stable across sessions).
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i++) {
    h1 ^= value.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 ^= value.charCodeAt(i); h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  const seed = `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
  return `${seed}${seed}${seed}${seed}`.slice(0, 64);
};

/** SHA-256 of the browser's User-Agent — used as the signing device fingerprint. */
export const computeUserAgentHash = async (): Promise<string> => {
  return sha256Hex(navigator.userAgent || 'voice-of-gudalur-client');
};

/**
 * Cryptographically-random docket verification token.
 * Format: VG-<16 uppercase hex chars> (e.g. VG-8F2A9C3E1B7D4F06).
 */
export const generateDocketHash = (): string => {
  if (crypto?.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return `VG-${Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  }
  // Fallback: timestamp + Math.random entropy
  return `VG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
};
