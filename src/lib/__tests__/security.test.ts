// Voice of Gudalur — unit tests for client-side security utilities.
// These guard the civic layer against XSS payloads, spam bursts, and malformed
// identity data (authoritative validation always remains server-side via RLS).
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  sanitizeText,
  isValidIndianPhone,
  checkRateLimit,
  sha256Hex,
  generateDocketHash,
} from '../security';

describe('sanitizeText', () => {
  it('strips angle brackets and control characters (XSS hardening)', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeText('a\x00b\x1fc')).toBe('a b c');
  });

  it('collapses whitespace and trims', () => {
    expect(sanitizeText('   hello     world   ')).toBe('hello world');
  });

  it('caps length and tolerates null/undefined', () => {
    expect(sanitizeText('x'.repeat(1000), 50)).toHaveLength(50);
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText('')).toBe('');
  });
});

describe('isValidIndianPhone', () => {
  it('accepts valid 10-digit mobiles with common prefixes', () => {
    expect(isValidIndianPhone('9876543210')).toBe(true);
    expect(isValidIndianPhone('+919876543210')).toBe(true);
    expect(isValidIndianPhone('98765 43210')).toBe(true);
    expect(isValidIndianPhone('98765-43210')).toBe(true);
  });

  it('rejects invalid numbers and non-Indian ranges', () => {
    expect(isValidIndianPhone('1234567890')).toBe(false); // starts with 1
    expect(isValidIndianPhone('5987654321')).toBe(false); // starts with 5
    expect(isValidIndianPhone('98765')).toBe(false); // too short
    expect(isValidIndianPhone('')).toBe(false);
    expect(isValidIndianPhone(null)).toBe(false);
  });
});

describe('checkRateLimit', () => {
  it('allows actions up to the limit then blocks within the window', () => {
    expect(checkRateLimit('ops', 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit('ops', 2, 60_000).allowed).toBe(true);
    const third = checkRateLimit('ops', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.retryInMs).toBeGreaterThan(0);
  });

  it('uses distinct buckets per action key', () => {
    expect(checkRateLimit('a', 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit('a', 1, 60_000).allowed).toBe(false);
    expect(checkRateLimit('b', 1, 60_000).allowed).toBe(true);
  });
});

describe('sha256Hex', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns a 64-char lowercase hex digest', async () => {
    const digest = await sha256Hex('hello');
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('falls back deterministically when crypto.subtle is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);
    const d1 = await sha256Hex('gudalur');
    const d2 = await sha256Hex('gudalur');
    expect(d1).toMatch(/^[0-9a-f]{64}$/);
    expect(d1).toBe(d2); // stable across calls
  });
});

describe('generateDocketHash', () => {
  it('produces a VG- prefixed 18-char verification token', () => {
    const token = generateDocketHash();
    expect(token).toMatch(/^VG-[0-9A-F]{16}$/);
  });
});