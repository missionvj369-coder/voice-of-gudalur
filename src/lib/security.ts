/**
 * Client-side security utilities for civic actions.
 * The authoritative validation always happens server-side
 * (Supabase RLS + constraints); these guard the client layer
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
