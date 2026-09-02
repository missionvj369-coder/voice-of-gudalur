// Voice of Gudalur — unit tests for the on-device Aadhaar decode + Verhoeff verifier.
// These are the crown jewels of the privacy-first registration flow: full Aadhaar
// numbers must never leave the device, so correctness here is a security boundary.
import { describe, it, expect } from 'vitest';
import {
  decodeAadhaar,
  validateAadhaarNumber,
  verhoeffCheck,
  aadhaarAddress,
  verifyAadhaarSecureQr,
  setUidaiSpkiKeys,
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

describe('Aadhaar Secure QR (v2, signed) — on-device structural decode', () => {
  const enc = new TextEncoder();
  const u16 = (n: number) => new Uint8Array([(n >> 8) & 0xff, n & 0xff]);
  const str = (s: string) => {
    const b = enc.encode(s);
    const out = new Uint8Array(2 + b.length);
    out.set(u16(b.length), 0);
    out.set(b, 2);
    return out;
  };
  const concat = (...parts: Uint8Array[]) => {
    const len = parts.reduce((a, p) => a + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  };

  /** Build the full decimal Secure QR string (unsigned → signature can't verify). */
  async function buildSecureQrString(opts?: { refId?: number; corruptHash?: boolean }): Promise<string> {
    const refId = opts?.refId ?? 0x1234;
    const fields = concat(
      new Uint8Array([2, 0]), // version=2, emailMobileStatus=0
      u16(refId),
      str('SARAVANA KUMAR'),
      str('01-01-1990'),
      str('M'),
      str('S/O MURUGAN'),
      str('12, temple street, near bus stand, GUDALUR, GUDALUR PO, GUDALUR, THE NILGIRIS, TAMIL NADU, 643212'),
      str('4321'), // share code
    );
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', fields));
    if (opts?.corruptHash) digest[0] ^= 0xff;
    const sig = new Uint8Array(256).fill(0xab); // fake signature — we lack UIDAI's private key
    const all = new Uint8Array(fields.length + 32 + 256);
    all.set(fields, 0);
    all.set(digest, fields.length);
    all.set(sig, fields.length + 32);
    let hex = '';
    for (const b of all) hex += b.toString(16).padStart(2, '0');
    return BigInt('0x' + hex).toString();
  }

  it('decodes the modern pure-digit Secure QR (mAadhaar / e-Aadhaar style)', async () => {
    const qr = await buildSecureQrString();
    expect(qr).toMatch(/^\d{400,}$/); // pure numeric, long
    const r = decodeAadhaar(qr);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('SARAVANA KUMAR');
    expect(r.last4).toBe('1234'); // from reference id 0x1234
    expect(r.state).toBe('TAMIL NADU');
    expect(r.pc).toBe('643212');
  });

  it('detects tampering via the embedded SHA-256 integrity hash', async () => {
    const good = await buildSecureQrString();
    const bad = await buildSecureQrString({ corruptHash: true });
    const vGood = await verifyAadhaarSecureQr(decodeAadhaar(good));
    const vBad = await verifyAadhaarSecureQr(decodeAadhaar(bad));
    expect(vGood.integrityOk).toBe(true);
    expect(vBad.integrityOk).toBe(false);
    // Without UIDAI keys registered, the signature check is unavailable (null).
    expect(vGood.signatureOk).toBeNull();
  });

  it('rejects short numeric strings and non-numeric garbage', () => {
    expect(decodeAadhaar('12345')).toEqual(expect.objectContaining({ ok: false }));
    expect(decodeAadhaar('<foo/>')).toEqual(expect.objectContaining({ ok: false }));
  });
});

describe('UIDAI public key registry', () => {
  it('accepts registered SPKI keys and filters junk entries', () => {
    expect(() =>
      setUidaiSpkiKeys(['short', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A' + 'A'.repeat(300)]),
    ).not.toThrow();
  });
});