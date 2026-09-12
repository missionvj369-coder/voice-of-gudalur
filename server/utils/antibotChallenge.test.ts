import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { issueChallenge, verifyChallenge, MIN_INTERACTION_MS } from './antibotChallenge';

const SECRET = 'test-secret-with-more-than-32-chars-of-entropy!';

function makeChallengeBody(): { challenge: string; sig: string } {
  const c = issueChallenge();
  if (!c) throw new Error('challenge not issued');
  return { challenge: c.challenge, sig: c.sig };
}

describe('antibotChallenge (single-use, signed, shared by petition + civic flows)', () => {
  beforeEach(() => { process.env.PETITION_IDENTITY_SECRET = SECRET; });
  afterEach(() => { delete process.env.PETITION_IDENTITY_SECRET; });

  it('issues a base64url challenge with an exp in the future', () => {
    const c = issueChallenge();
    expect(c).not.toBeNull();
    expect(c!.exp).toBeGreaterThan(Date.now());
    expect(c!.sig).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('rejects a missing or malformed challenge', () => {
    expect(verifyChallenge({})).toBe('challenge_missing');
    expect(verifyChallenge({ challenge: 'not-base64url!!!', sig: 'x' })).toBe('challenge_malformed');
  });

  it('rejects a tampered signature', () => {
    const { challenge, sig } = makeChallengeBody();
    const bad = sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
    expect(verifyChallenge({ challenge, sig: bad })).toBe('challenge_invalid');
  });

  it('rejects an expired challenge', () => {
    const c = issueChallenge(Date.now() - 10 * 60 * 1000)!;
    const now = Date.now();
    expect(verifyChallenge({ challenge: c.challenge, sig: c.sig }, now)).toBe('challenge_expired');
  });

  it('rejects a too-fast submission (below minimum interaction time)', () => {
    const c = issueChallenge()!;
    const payload = JSON.parse(Buffer.from(c.challenge, 'base64url').toString('utf8'));
    expect(verifyChallenge({ challenge: c.challenge, sig: c.sig }, payload.iat + 10)).toBe('too_fast');
  });

  it('accepts a valid challenge after the minimum interaction time', () => {
    const c = issueChallenge()!;
    const payload = JSON.parse(Buffer.from(c.challenge, 'base64url').toString('utf8'));
    expect(verifyChallenge({ challenge: c.challenge, sig: c.sig }, payload.iat + MIN_INTERACTION_MS + 100)).toBeNull();
  });

  it('is single-use: a second verification of the same nonce fails', () => {
    const c = issueChallenge()!;
    const payload = JSON.parse(Buffer.from(c.challenge, 'base64url').toString('utf8'));
    const now = payload.iat + MIN_INTERACTION_MS + 200;
    expect(verifyChallenge({ challenge: c.challenge, sig: c.sig }, now)).toBeNull();
    expect(verifyChallenge({ challenge: c.challenge, sig: c.sig }, now + 1)).toBe('challenge_used');
  });

  it('fails closed when the HMAC secret is missing', () => {
    delete process.env.PETITION_IDENTITY_SECRET;
    expect(issueChallenge()).toBeNull();
    expect(verifyChallenge({ challenge: 'x', sig: 'y' })).toBe('service_unavailable');
  });
});