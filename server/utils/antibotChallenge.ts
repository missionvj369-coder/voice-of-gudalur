/**
 * Voice of Gudalur — shared server-issued anti-bot challenge (stateless,
 * single-use, HMAC-signed). Reused by the public petition flow AND the
 * Open Civic Signature protocol flow — one implementation, no duplication.
 *
 * Design:
 *  - payload  = { n: nonce, iat, exp }, NOT serializable to a forged state:
 *    any client-visible value is covered by HMAC-SHA-256(PETITION_IDENTITY_SECRET).
 *  - single-use via an in-memory nonce registry (multi-instance deployment
 *    tolerates a few lost single-use checks; the DATABASE uniqueness
 *    constraint remains the absolute guard).
 *  - minimum-interaction check: a flood submits instantly; humans read.
 */
import crypto from 'crypto';
import { isPetitionIdentityConfigured } from './petitionIdentity';

export const CHALLENGE_TTL_MS = 3 * 60 * 1000; // 3 minutes to complete the flow
export const MIN_INTERACTION_MS = 2 * 1000;    // bots submit instantly; humans read

export interface ChallengePayload {
  n: string;
  iat: number;
  exp: number;
}

const usedNonces = new Map<string, number>(); // nonce → expiry (swept lazily)

function sweepUsedNonces(now: number): void {
  if (usedNonces.size < 500) return; // sweep only when it grows past a burst
  for (const [nonce, exp] of usedNonces) {
    if (exp < now - CHALLENGE_TTL_MS) usedNonces.delete(nonce);
  }
}

export function challengeSecretConfigured(): boolean {
  return isPetitionIdentityConfigured();
}

export function signChallenge(payload: object): string {
  return crypto
    .createHmac('sha256', process.env.PETITION_IDENTITY_SECRET as string)
    .update(JSON.stringify(payload), 'utf8')
    .digest('base64url');
}

/** Issue a fresh challenge { challenge, sig, exp }. Fails closed (null) when
 *  the HMAC secret is not configured. */
export function issueChallenge(now: number = Date.now()):
  | { challenge: string; sig: string; exp: number }
  | null {
  if (!challengeSecretConfigured()) return null;
  const payload: ChallengePayload = { n: crypto.randomBytes(12).toString('base64url'), iat: now, exp: now + CHALLENGE_TTL_MS };
  const sig = signChallenge(payload);
  return { challenge: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url'), sig, exp: payload.exp };
}

/** Verify + burn a challenge. Returns null when valid, else a client-safe reason. */
export function verifyChallenge(body: any, now: number = Date.now()): string | null {
  if (!challengeSecretConfigured()) return 'service_unavailable';
  const raw = typeof body?.challenge === 'string' ? body.challenge : '';
  const sig = typeof body?.sig === 'string' ? body.sig : '';
  if (!raw || !sig) return 'challenge_missing';
  let payload: ChallengePayload;
  try {
    payload = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as ChallengePayload;
  } catch {
    return 'challenge_malformed';
  }
  if (!payload?.n || typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return 'challenge_malformed';
  if (sig !== signChallenge(payload)) return 'challenge_invalid';
  if (payload.exp < now) return 'challenge_expired';
  if (payload.iat > now + 5_000) return 'challenge_invalid'; // clock-skew tolerance
  if (payload.exp - payload.iat > CHALLENGE_TTL_MS + 1_000) return 'challenge_invalid';
  if (now - payload.iat < MIN_INTERACTION_MS) return 'too_fast';
  if (usedNonces.has(payload.n)) return 'challenge_used';
  usedNonces.set(payload.n, payload.exp);
  sweepUsedNonces(now);
  return null;
}