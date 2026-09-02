// Voice of Gudalur — unit tests for the on-device Aadhaar decode + Verhoeff verifier.
// These are the crown jewels of the privacy-first registration flow: full Aadhaar
// numbers must never leave the device, so correctness here is a security boundary.
import { describe, it, expect } from 'vitest';
import {
  decodeAadhaar,
  validateAadhaarNumber,
  verhoeffCheck,
  aadhaarAddress,
  type AadhaarDecodeResult,
} from '../aadhaarDecoder';

describe('verhoeffCheck', () => {
  it('accepts a valid 12-digit Aadhaar number', () => {
    // 800000000008 passes the Verhoeff checksum (verified against the implementation).
    expect(verhoeffCheck('800000000008')).toBe(true);
  });

  it('rejects an invalid checksum', () => {
    expect(verhoeffCheck('800000000009')).toBe(false);
  });

  it('rejects non-12-digit input', () => {
    expect(verhoeffCheck('123')).toBe(false);
    expect(verhoeffCheck('')).toBe(false);
    expect(verhoeffCheck('800000000')).toBe(false); // 9 digits
    expect(verhoeffCheck('8000000000088')).toBe(false); // 13 digits
  });

  it('ignores non-digit characters', () => {
    expect(verhoeffCheck('8000-0000 0008')).toBe(true);
  });
});

describe('validateAadhaarNumber', () => {
  it('returns last4 and ok for a valid number', () => {
    const r = validateAadhaarNumber('800000000008');
    expect(r.ok).toBe(true);
    expect(r.last4).toBe('0008');
    expect(r.uid).toBe('800000000008');
    expect(r.error).toBeUndefined();
  });

  it('returns a helpful error for an invalid number', () => {
    const r = validateAadhaarNumber('123456789012');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
    expect(r.last4).toBeUndefined();
  });

  it('returns an error for a non-numeric string', () => {
    const r = validateAadhaarNumber('abc');
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/12-digit/i);
  });
});

describe('decodeAadhaar', () => {
  // Minimal e-Aadhaar XML payload as produced by UIDAI (k="v" html-escaped attrs).
  const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<PrintLetterBarcodeData uid="473401559304" name="RAHUL &amp; RAJ" gender="M" yob="1992"
  co="S/O SATHEESAN" house="H NO 12" street="NEHRU STREET" loc="TOWN" vtc="GUDALUR"
  po="GUDALUR" dist="THE NILGIRIS" state="TAMIL NADU" pc="643211" email="r@x.in" phone="9876543210"/>`;

  it('decodes name with HTML-escaped entities (UIDAI payloads are XML-escaped)', () => {
    const r = decodeAadhaar(sampleXml);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('RAHUL & RAJ');
  });

  it('exposes a short last4 that can be safely persisted (full uid never leaves device)', () => {
    const r = decodeAadhaar(sampleXml);
    expect(r.ok).toBe(true);
    expect(r.last4).toBe('9304');
  });

  it('extracts address parts for the human-readable address', () => {
    const r = decodeAadhaar(sampleXml);
    const addr = aadhaarAddress(r as unknown as AadhaarDecodeResult);
    expect(addr).toContain('GUDALUR');
    expect(addr).toContain('THE NILGIRIS');
    expect(addr).toContain('643211');
  });

  it('returns ok=false for non-Aadhaar payloads', () => {
    const r = decodeAadhaar('<foo bar="baz"/>');
    expect(r.ok).toBe(false);
    expect(r.error).toBeTruthy();
  });

  it('handles malformed input without throwing', () => {
    const r = decodeAadhaar('not xml at all');
    expect(r.ok).toBe(false);
  });
});