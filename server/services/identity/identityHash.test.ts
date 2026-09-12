import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  identityKeyHash,
  identityLogPrefix,
  isIdentityHashConfigured,
  normalizeIdentity,
} from './identityHash';

describe('identityKeyHash (privacy-preserving identity normalization)', () => {
  const SECRET = 'verification-secret-with-32+chars-entropy!!';

  beforeEach(() => { process.env.VERIFICATION_IDENTITY_SECRET = SECRET; });
  afterEach(() => { delete process.env.VERIFICATION_IDENTITY_SECRET; delete process.env.PETITION_IDENTITY_SECRET; });

  it('is a 64-char hex HMAC and never contains the subject', () => {
    const subject = '9876543210';
    const h = identityKeyHash(subject);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain(subject);
  });

  it('is deterministic for the same canonical subject', () => {
    expect(identityKeyHash('9876543210')).toBe(identityKeyHash('9876543210'));
  });

  it('differs across different subjects', () => {
    expect(identityKeyHash('9876543210')).not.toBe(identityKeyHash('9876543211'));
  });

  it('changes when the server secret changes', () => {
    const a = identityKeyHash('9876543210');
    process.env.VERIFICATION_IDENTITY_SECRET = SECRET + 'x';
    expect(identityKeyHash('9876543210')).not.toBe(a);
  });

  it('is not cross-usable with the older petitionIdentity domain (domain separation)', async () => {
    const { mobileIdentityHash } = await import('../../utils/petitionIdentity');
    process.env.PETITION_IDENTITY_SECRET = SECRET;
    const oldDomain = mobileIdentityHash('9876543210');
    expect(identityKeyHash('9876543210')).not.toBe(oldDomain);
  });

  it('fails CLOSED when no identity secret is configured', () => {
    delete process.env.VERIFICATION_IDENTITY_SECRET;
    delete process.env.PETITION_IDENTITY_SECRET;
    expect(isIdentityHashConfigured()).toBe(false);
    expect(() => identityKeyHash('9876543210')).toThrow(/VERIFICATION_IDENTITY_SECRET/);
  });

  it('fails CLOSED when the secret is weaker than 32 chars', () => {
    process.env.VERIFICATION_IDENTITY_SECRET = 'short';
    expect(isIdentityHashConfigured()).toBe(false);
    expect(() => identityKeyHash('9876543210')).toThrow(/VERIFICATION_IDENTITY_SECRET/);
  });

  it('falls back to PETITION_IDENTITY_SECRET when the verification secret is absent', () => {
    delete process.env.VERIFICATION_IDENTITY_SECRET;
    process.env.PETITION_IDENTITY_SECRET = SECRET;
    expect(isIdentityHashConfigured()).toBe(true);
    expect(() => identityKeyHash('9876543210')).not.toThrow();
  });

  it('normalizeIdentity returns hash + non-reversible log prefix', () => {
    const { identityKeyHash, logPrefix } = normalizeIdentity('9876543210');
    expect(identityKeyHash).toMatch(/^[0-9a-f]{64}$/);
    expect(logPrefix).toMatch(/^[0-9a-f]{10}…$/);
  });

  it('identityLogPrefix leaks nothing about the subject', () => {
    const prefix = identityLogPrefix(identityKeyHash('9876543210'));
    expect(prefix).not.toContain('9876543210');
  });
});