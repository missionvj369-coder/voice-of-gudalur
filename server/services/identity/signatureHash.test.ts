import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  computeSignatureHash,
  generateCivicSignId,
  isSignatureHashConfigured,
} from './signatureHash';

const SECRET = 'verification-secret-with-32+chars-entropy!!';

describe('computeSignatureHash (server-side audit identifier)', () => {
  const input = {
    petitionId: 'global',
    identityKeyHash: 'a'.repeat(64),
    civicSignId: 'VOG-ABC123',
    provider: 'self-asserted',
    assuranceLevel: 2,
  };

  beforeEach(() => { process.env.VERIFICATION_IDENTITY_SECRET = SECRET; });
  afterEach(() => { delete process.env.VERIFICATION_IDENTITY_SECRET; delete process.env.PETITION_IDENTITY_SECRET; });

  it('is a deterministic 64-hex HMAC', () => {
    const h = computeSignatureHash(input);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSignatureHash(input)).toBe(h);
  });

  it('is canonical-serialization stable across identical inputs', () => {
    expect(computeSignatureHash({ ...input, petitionId: 'global' }))
      .toBe(computeSignatureHash({ ...input, petitionId: 'global' }));
  });

  it('changes when ANY canonical field changes (collision resistance)', () => {
    const base = computeSignatureHash(input);
    expect(computeSignatureHash({ ...input, petitionId: 'other' })).not.toBe(base);
    expect(computeSignatureHash({ ...input, identityKeyHash: 'b'.repeat(64) })).not.toBe(base);
    expect(computeSignatureHash({ ...input, civicSignId: 'VOG-DEF456' })).not.toBe(base);
    expect(computeSignatureHash({ ...input, provider: 'camara' })).not.toBe(base);
    expect(computeSignatureHash({ ...input, assuranceLevel: 3 })).not.toBe(base);
  });

  it('does not include name or any raw subject in the hash input (PII-free)', () => {
    // The function has no name/serialization parameter at all — nothing PII-dependent can leak.
    const h = computeSignatureHash(input);
    expect(h).not.toContain('Aadhaar');
    expect(h).not.toContain('9876');
  });

  it('fails CLOSED when identity secret is missing', () => {
    delete process.env.VERIFICATION_IDENTITY_SECRET;
    delete process.env.PETITION_IDENTITY_SECRET;
    expect(isSignatureHashConfigured()).toBe(false);
    expect(() => computeSignatureHash(input)).toThrow(/VERIFICATION_IDENTITY_SECRET/);
  });
});

describe('generateCivicSignId (public anonymized identifier)', () => {
  it('produces VOG-XXXXXXXX-format (16 hex chars, 64-bit)', () => {
    const id = generateCivicSignId();
    expect(id).toMatch(/^VOG-[0-9A-F]{16}$/);
  });

  it('supports a custom petition tag', () => {
    expect(generateCivicSignId('OCSP')).toMatch(/^OCSP-[0-9A-F]{16}$/);
  });

  it('is unique across many draws (64-bit space — collisions negligible)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 2000; i++) set.add(generateCivicSignId());
    expect(set.size).toBe(2000);
  });
});