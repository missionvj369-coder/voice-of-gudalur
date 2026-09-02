// Voice of Gudalur — open-source Aadhaar eKYC decoder (offline, privacy-first)
// Decodes the XML payload of an e-Aadhaar QR code entirely on-device.
// The full Aadhaar number never leaves the device. Zero PII sent to any server.

export interface AadhaarDecodeResult {
  ok: boolean;
  raw?: string;
  name?: string;
  gender?: string;
  yob?: string;
  uid?: string;
  co?: string;
  house?: string;
  street?: string;
  loc?: string;
  vtc?: string;
  po?: string;
  dist?: string;
  state?: string;
  pc?: string;
  email?: string;
  phone?: string;
  referenceId?: string;
  last4?: string;
  error?: string;
}

/** Strip XML declarations/namespaces and pull k="v" attributes. */
function parseXmlAttributes(xml: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(xml)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

/** Verhoeff checksum — validates a 12-digit Aadhaar number (open-source algorithm). */
const V_D: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const V_P: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];
const V_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

export function verhoeffCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) return false;
  let c = 0;
  const arr = digits.split("").reverse();
  for (let i = 0; i < arr.length; i++) {
    c = V_D[c][V_P[i % 8][parseInt(arr[i], 10)]];
  }
  return c === 0;
}

/* ===================== UIDAI Secure QR (v2, signed) ===================== */
/**
 * Modern Aadhaar QR codes (mAadhaar app / e-Aadhaar PDF) are a pure numeric
 * string — NOT the legacy XML. Layout (big-endian byte lengths):
 *   [version 1B][emailMobileStatus 1B][referenceId/last4 2B]
 *   [name 2B+len][dob 2B+len][gender 2B+len][careOf 2B+len][fullAddress 2B+len]
 *   [mobileHash 2B+len]?[emailHash 2B+len]?   (depends on emailMobileStatus)
 *   [shareCode 2B+len]
 *   [SHA-256 of everything above — 32B]
 *   [RSA-2048 signature over payload+hash — 256B]
 * We decode structurally on-device, verify the SHA-256 integrity hash via
 * WebCrypto, and verify the UIDAI RSA signature when the public key is set.
 * Zero PII ever leaves the device. Works fully offline.
 */

const SECURE_QR_SIG_BYTES = 256;
const SECURE_QR_HASH_BYTES = 32;

/** Internal carrier for raw verification material (never persisted/sent). */
interface SecureQrBytes extends AadhaarDecodeResult {
  _fieldBytes?: Uint8Array;
  _hashBytes?: Uint8Array;
  _sigBytes?: Uint8Array;
}

/** Decimal QR string → big-endian bytes (version byte is 2, so no lost leading zeros). */
function decimalToBytes(value: string): Uint8Array {
  const hex = BigInt(value).toString(16);
  const padded = hex.length % 2 ? `0${hex}` : hex;
  const out = new Uint8Array(padded.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

const readU16 = (b: Uint8Array, p: number): number => (b[p] << 8) | b[p + 1];
const UTF8 = new TextDecoder();

/** Legacy XML QRs contain '<'; secure QRs are pure digits (~3000+). */
function looksLikeSecureQr(value: string): boolean {
  return /^\d{400,}$/.test(value);
}

/** Public helper for UI feedback — did the camera see an Aadhaar secure QR it couldn't parse? */
export function looksLikeAadhaarSecureQr(value: string): boolean {
  return looksLikeSecureQr((value ?? "").trim());
}

export function decodeAadhaarSecureQr(input: string): AadhaarDecodeResult | null {
  try {
    // Scanners occasionally return the payload with stray whitespace.
    const value = (input ?? "").replace(/\D/g, "");
    if (value.length < 400) return null;
    const all = decimalToBytes(value);
    if (all.length < SECURE_QR_SIG_BYTES + SECURE_QR_HASH_BYTES + 10) return null;
    const sigBytes = all.slice(all.length - SECURE_QR_SIG_BYTES);
    const message = all.slice(0, all.length - SECURE_QR_SIG_BYTES);
    const hashBytes = message.slice(message.length - SECURE_QR_HASH_BYTES);
    const fields = message.slice(0, message.length - SECURE_QR_HASH_BYTES);

    let p = 0;
    const version = fields[p++];
    if (version < 1 || version > 3) return null; // v2 is current; tolerate 1–3 for rotation
    const emailMobileStatus = fields[p++];
    const refId = readU16(fields, p); p += 2;
    const readStr = (): string => {
      if (p + 2 > fields.length) throw new Error("truncated");
      const len = readU16(fields, p); p += 2;
      if (p + len > fields.length) throw new Error("truncated");
      const s = UTF8.decode(fields.subarray(p, p + len));
      p += len;
      return s;
    };
    const name = readStr();
    const dob = readStr();
    const genderRaw = readStr();
    const co = readStr();
    const fullAddress = readStr();
    if (!name) return null;

    // Best-effort skip of mobile/email hashes + read the share code.
    let shareCode = "";
    try {
      if (emailMobileStatus === 3) { p += readU16(fields, p) + 2; p += readU16(fields, p) + 2; }
      else if (emailMobileStatus === 2 || emailMobileStatus === 1) { p += readU16(fields, p) + 2; }
      const scLen = readU16(fields, p);
      shareCode = UTF8.decode(fields.subarray(p + 2, p + 2 + scLen));
    } catch { /* optional tail — ignore */ }

    // fullAddress is comma-separated (UIDAI order):
    // house, street, landmark, locality, VTC, PO, subdist, dist, state, pc
    const parts = fullAddress.split(",").map((s) => s.trim()).filter(Boolean);
    const rev = [...parts].reverse();
    const pc = rev.length > 0 && /^\d{6}$/.test(rev[0]) ? rev[0] : rev.find((s) => /^\d{6}$/.test(s));
    const tail = (i: number) => (rev.length > i ? rev[i] : undefined);
    const state = tail(1);
    const dist = tail(2);
    const vtc = tail(3);
    const po = tail(4);

    // UIDAI packs the last 4 Aadhaar digits one per nibble (BCD) into the
    // 2-byte reference id — 0x1234 means "1234", not decimal 4660.
    const last4 = `${(refId >> 12) & 0xf}${(refId >> 8) & 0xf}${(refId >> 4) & 0xf}${refId & 0xf}`;
    return {
      ok: true,
      raw: value,
      name,
      gender: genderRaw === "M" ? "Male" : genderRaw === "F" ? "Female" : genderRaw || undefined,
      yob: dob && dob.length >= 4 ? dob.slice(-4) : undefined,
      co,
      house: parts[0],
      street: parts[1],
      loc: parts[2],
      vtc,
      po,
      dist,
      state,
      pc,
      referenceId: shareCode || undefined,
      last4,
      _fieldBytes: fields,
      _hashBytes: hashBytes,
      _sigBytes: sigBytes,
    } as SecureQrBytes;
  } catch {
    return null;
  }
}

/** XML payload → unescaped value (UIDAI legacy XML payloads are XML-escaped). */
function unescapeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(parseInt(code, 10)));
}

export function decodeAadhaar(value: string): AadhaarDecodeResult {
  const xml = (value ?? "").trim();
  // UIDAI Secure QR (modern cards) — pure digit string
  if (looksLikeSecureQr(xml)) {
    const secure = decodeAadhaarSecureQr(xml);
    return secure ?? { ok: false, error: "UIDAI Secure QR detected but could not be decoded" };
  }
  try {
    const attrs = parseXmlAttributes(xml);
    if (!attrs.uid && !attrs.name) {
      return { ok: false, error: "Not an e-Aadhaar QR payload" };
    }
    const clean = (v?: string) => (v ? unescapeXmlEntities(v) : v);
    return {
      ok: true,
      raw: xml,
      name: clean(attrs.name),
      gender: clean(attrs.gender),
      yob: clean(attrs.yob),
      uid: clean(attrs.uid),
      co: clean(attrs.co),
      house: clean(attrs.house),
      street: clean(attrs.street),
      loc: clean(attrs.loc),
      vtc: clean(attrs.vtc),
      po: clean(attrs.po),
      dist: clean(attrs.dist),
      state: clean(attrs.state),
      pc: clean(attrs.pc),
      email: clean(attrs.email),
      phone: clean(attrs.phone),
      referenceId: clean(attrs.referenceid || attrs.ref),
      last4: attrs.uid ? attrs.uid.slice(-4) : undefined,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Decode failed" };
  }
}

/** 12-digit number check: Verhoeff + last4 extraction. No PII leaves device. */
export function validateAadhaarNumber(number: string): AadhaarDecodeResult {
  const digits = number.replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) {
    return { ok: false, error: "Enter a valid 12-digit Aadhaar number" };
  }
  if (!verhoeffCheck(digits)) {
    return { ok: false, error: "Checksum validation failed — re-check the number" };
  }
  return { ok: true, uid: digits, last4: digits.slice(-4), raw: digits };
}

/** Human-readable address from decoded parts (includes the PIN code). */
export function aadhaarAddress(r: AadhaarDecodeResult): string {
  return [r.co, r.house, r.street, r.loc, r.vtc, r.po, r.dist, r.state, r.pc]
    .filter(Boolean)
    .join(", ");
}

export interface AadhaarVerification {
  /** SHA-256 embedded in the QR matches the decoded fields (tamper check). */
  integrityOk: boolean | null;
  /** UIDAI RSA-2048 signature result; null = no key/legacy QR/crypto unavailable. */
  signatureOk: boolean | null;
}

/**
 * UIDAI Offline PKI certificates (SubjectPublicKeyInfo, SPKI base64 DER).
 * UIDAI rotates keys every ~2 years; we try each until one verifies.
 * Populated by setUidaiSpkiKeys() from uidaiPublicKeys.ts.
 */
let uidaiSpkiKeys: string[] = [];

/** Register UIDAI SPKI public keys (base64 DER) for signature verification. */
export function setUidaiSpkiKeys(keys: string[]): void {
  uidaiSpkiKeys = keys.filter((k) => k.length > 100);
}

/** Async verification pass — call right after a successful structural decode. */
export async function verifyAadhaarSecureQr(r: AadhaarDecodeResult): Promise<AadhaarVerification> {
  const sd = r as SecureQrBytes;
  if (!sd._fieldBytes || !sd._hashBytes) {
    return { integrityOk: null, signatureOk: null }; // legacy XML path — nothing to verify
  }
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return { integrityOk: null, signatureOk: null };
  try {
    const digest = await subtle.digest("SHA-256", sd._fieldBytes);
    const got = new Uint8Array(digest);
    const integrityOk =
      got.length === sd._hashBytes.length && got.every((b, i) => b === sd._hashBytes![i]);
    let signatureOk: boolean | null = null;
    if (uidaiSpkiKeys.length > 0 && sd._sigBytes) {
      const signed = new Uint8Array(sd._fieldBytes.length + sd._hashBytes.length);
      signed.set(sd._fieldBytes);
      signed.set(sd._hashBytes, sd._fieldBytes.length);
      for (const spkiB64 of uidaiSpkiKeys) {
        try {
          const der = Uint8Array.from(atob(spkiB64), (c) => c.charCodeAt(0));
          const key = await subtle.importKey(
            "spki",
            der,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            false,
            ["verify"],
          );
          if (await subtle.verify("RSASSA-PKCS1-v1_5", key, sd._sigBytes, signed)) {
            signatureOk = true;
            break;
          }
          signatureOk = false;
        } catch {
          signatureOk = null; // try next key
        }
      }
    }
    return { integrityOk, signatureOk };
  } catch {
    return { integrityOk: false, signatureOk: null };
  }
}