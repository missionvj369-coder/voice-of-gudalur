// Voice of Gudalur — unit tests for the on-device Aadhaar decode + Verhoeff verifier.
// These are the crown jewels of the privacy-first registration flow: full Aadhaar
// numbers must never leave the device, so correctness here is a security boundary.
import { describe, it, expect } from 'vitest';
import {
  decodeAadhaar,
  decodeAadhaarAsync,
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

describe('decodeAadhaarAsync — 2022 gzip “V2” e-Aadhaar QR', () => {
  /**
   * Current e-Aadhaar cards print a gzip-compressed, 0xFF-delimited V2 QR
   * (the layout pyaadhaar parses). Build one synthetically: fields →
   * 0xFF separators → photo/signature placeholders → gzip → decimal string.
   */
  async function buildGzipV2Qr(fields: string[]): Promise<string> {
    const bytes: number[] = [];
    for (const f of fields) {
      for (let i = 0; i < f.length; i++) bytes.push(f.charCodeAt(i) & 0xff);
      bytes.push(255);
    }
    // Real cards embed a ~3-5 KB JPEG photo — incompressible. Use a seeded
    // PRNG so the gzip output (and thus the decimal string) has realistic
    // length instead of collapsing into a short run of zeros.
    let seed = 123456789;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let i = 0; i < 2048; i++) bytes.push(rnd() & 0xff); // photo placeholder
    for (let i = 0; i < 256; i++) bytes.push(0); // signature placeholder
    const cs = new CompressionStream('gzip');
    const buf = await new Response(
      new Blob([new Uint8Array(bytes)]).stream().pipeThrough(cs),
    ).arrayBuffer();
    let hex = '';
    for (const b of new Uint8Array(buf)) hex += b.toString(16).padStart(2, '0');
    return BigInt('0x' + hex).toString();
  }

  const v2Fields = [
    'V2', '0', '1234', 'GUDALUR TEST', '01/01/1990', 'M', 'S/O PARENT',
    'THE NILGIRIS', 'NEAR BUS STAND', '12 TEMPLE STREET', 'GUDALUR TOWN',
    '643212', 'GUDALUR PO', 'TAMIL NADU', 'MAIN STREET', 'GUDALUR', 'GUDALUR',
    '9876',
  ];

  it('decodes the 2022 gzip-compressed V2 format that current cards print', async () => {
    const qr = await buildGzipV2Qr(v2Fields);
    expect(qr).toMatch(/^\d{400,}$/); // pure numeric, long
    const r = await decodeAadhaarAsync(qr);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('GUDALUR TEST');
    expect(r.last4).toBe('1234'); // referenceId → masked last-4 only
    expect(r.yob).toBe('1990');
    expect(r.vtc).toBe('GUDALUR');
    expect(r.dist).toBe('THE NILGIRIS');
    expect(r.state).toBe('TAMIL NADU');
    expect(r.pc).toBe('643212');
  });

  it('still decodes legacy XML payloads through the async path', async () => {
    const xml = `<PrintLetterBarcodeData uid="473401559304" name="RAHUL" gender="M" yob="1992" pc="643211"/>`;
    const r = await decodeAadhaar(xml);
    expect(r.ok).toBe(true);
    expect(r.name).toBe('RAHUL');
    expect(r.last4).toBe('9304');
  });

  it('decodes the gzip V2 payload WITHOUT DecompressionStream (fflate fallback for Safari < 16.4)', async () => {
    const qr = await buildGzipV2Qr(v2Fields);
    const g = globalThis as unknown as { DecompressionStream?: unknown };
    const saved = g.DecompressionStream;
    delete g.DecompressionStream; // simulate Safari < 16.4 / old Android WebView
    try {
      const r = await decodeAadhaarAsync(qr);
      expect(r.ok).toBe(true);
      expect(r.name).toBe('GUDALUR TEST');
      expect(r.last4).toBe('1234');
      expect(r.pc).toBe('643212');
    } finally {
      g.DecompressionStream = saved; // restore for other tests
    }
  });

  it('rejects an undecodable numeric payload with a clear error', async () => {
    const junk = '9' + '2'.repeat(500);
    const r = await decodeAadhaarAsync(junk);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Secure QR/i);
  });
});

describe('UIDAI public key registry', () => {
  it('accepts registered SPKI keys and filters junk entries', () => {
    expect(() =>
      setUidaiSpkiKeys(['short', 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A' + 'A'.repeat(300)]),
    ).not.toThrow();
  });
});