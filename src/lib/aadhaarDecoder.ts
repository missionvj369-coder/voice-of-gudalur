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

/** XML payload → full Aadhaar identity (used only for the QR-resident info). */
export function decodeAadhaar(xml: string): AadhaarDecodeResult {
  try {
    const attrs = parseXmlAttributes(xml);
    if (!attrs.uid && !attrs.name) {
      return { ok: false, error: "Not an e-Aadhaar QR payload" };
    }
    return {
      ok: true,
      raw: xml,
      name: attrs.name,
      gender: attrs.gender,
      yob: attrs.yob,
      uid: attrs.uid,
      co: attrs.co,
      house: attrs.house,
      street: attrs.street,
      loc: attrs.loc,
      vtc: attrs.vtc,
      po: attrs.po,
      dist: attrs.dist,
      state: attrs.state,
      pc: attrs.pc,
      email: attrs.email,
      phone: attrs.phone,
      referenceId: attrs.referenceid || attrs.ref,
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

/** Human-readable address from decoded parts. */
export function aadhaarAddress(r: AadhaarDecodeResult): string {
  return [r.co, r.house, r.street, r.loc, r.vtc, r.po, r.dist, r.state]
    .filter(Boolean)
    .join(", ");
}