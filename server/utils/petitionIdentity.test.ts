import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { normalizeMobile, mobileIdentityHash, isPetitionIdentityConfigured } from './petitionIdentity';

describe('normalizeMobile (server-side, authoritative)', () => {
  it('accepts a plain 10-digit Indian number', () => {
    const r = normalizeMobile('9876543210');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.canonical).toBe('9876543210');
      expect(r.last4).toBe('3210');
    }
  });

  it('normalizes +91 / 91 / 0 prefixes to the 10-digit national number', () => {
    expect(normalizeMobile('+91 98765 43210')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
    expect(normalizeMobile('919876543210')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
    expect(normalizeMobile('09876543210')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
    expect(normalizeMobile('+91-98765-43210')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
  });

  it('strips spaces, dashes and dots but never trusts the client format', () => {
    expect(normalizeMobile('987 654 3210')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
    expect(normalizeMobile('   98765.43210   ')).toEqual({ ok: true, canonical: '9876543210', last4: '3210' });
  });

  it('rejects non-Indian country codes and wrong lengths', () => {
    expect(normalizeMobile('+91 98765 43210 999')).toMatchObject({ ok: false });
    expect(normalizeMobile('19076543210')).toMatchObject({ ok: false }); // 11 digits, not a 0-prefix
    expect(normalizeMobile('98765')).toMatchObject({ ok: false });
    expect(normalizeMobile('1234567890')).toMatchObject({ ok: false }); // must start 6-9
    expect(normalizeMobile('')).toMatchObject({ ok: false });
    expect(normalizeMobile(9876543210)).toMatchObject({ ok: false }); // must be a string
    expect(normalizeMobile('+44 7911 123456')).toMatchObject({ ok: false }); // UK
  });
});

describe('mobileIdentityHash (HMAC-SHA-256, deterministic + secret-bound)', () => {
  const SECRET = 'test-secret-with-more-than-32-chars-of-entropy!';

  beforeEach(() => { process.env.PETITION_IDENTITY_SECRET = SECRET; });
  afterEach(() => { delete process.env.PETITION_IDENTITY_SECRET; });

  it('is a 64-char hex HMAC (never the raw mobile)', () => {
    const h = mobileIdentityHash('9876543210');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain('9876543210');
  });

  it('is deterministic for the same canonical mobile', () => {
    expect(mobileIdentityHash('9876543210')).toBe(mobileIdentityHash('9876543210'));
  });

  it('produces the same hash for every formatting of the same number', () => {
    const canonical = (m: string) => { const r = normalizeMobile(m); return r.ok ? r.canonical : m; };
    const base = mobileIdentityHash('9876543210');
    expect(mobileIdentityHash(canonical('+91 98765 43210'))).toBe(base);
    expect(mobileIdentityHash(canonical('919876543210'))).toBe(base);
    expect(mobileIdentityHash(canonical('09876543210'))).toBe(base);
    expect(mobileIdentityHash(canonical('987-654-3210'))).toBe(base);
  });

  it('differs across different mobiles', () => {
    expect(mobileIdentityHash('9876543210')).not.toBe(mobileIdentityHash('9876543211'));
  });

  it('changes when the server secret changes (never keyed to the number alone)', () => {
    const a = mobileIdentityHash('9876543210');
    process.env.PETITION_IDENTITY_SECRET = SECRET + 'different';
    expect(mobileIdentityHash('9876543210')).not.toBe(a);
  });

  it('detects a missing or weak secret (fail closed)', () => {
    delete process.env.PETITION_IDENTITY_SECRET;
    expect(isPetitionIdentityConfigured()).toBe(false);
    expect(() => mobileIdentityHash('9876543210')).toThrow(/PETITION_IDENTITY_SECRET/);
  });
});