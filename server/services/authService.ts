/**
 * Voice of Gudalur — Session & authentication service.
 *
 * Replaces Supabase Auth. Residents authenticate passwordless via OTP to
 * their mobile; officials authenticate via email OTP + admin approval.
 * Sessions are server-side, stored in the `sessions` table, and issued as
 * httpOnly + SameSite=Strict cookies. Refresh flow with expiry.
 */
import crypto from 'crypto';
import { db } from '../db/client';
import { logger } from '../utils/logger';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_SECONDS ?? 86400) * 1000;

// ---------------------------------------------------------------------------
// OTP provider abstraction
// ---------------------------------------------------------------------------

export interface OtpProvider {
  sendOtp(recipient: string, code: string, purpose: string): Promise<void>;
}

class DevOtpProvider implements OtpProvider {
  async sendOtp(recipient: string, code: string, _purpose: string): Promise<void> {
    console.log(`[dev-otp] OTP for ${recipient}: ${code} (expires in 5m)`);
  }
}

export function getOtpProvider(): OtpProvider {
  const which = (process.env.OTP_PROVIDER || 'devel').toLowerCase();
  if (which === 'sms') {
    return new SmsOtpProvider();
  }
  return new DevOtpProvider();
}

/** A real SMS provider must be configured via SMS_PROVIDER/SMS_API_KEY.
 *  We never invent credentials: if SMS is requested but unconfigured, we
 *  fail loudly so operators configure it (dev/test uses the dev provider). */
class SmsOtpProvider implements OtpProvider {
  async sendOtp(_recipient: string, _code: string, _purpose: string): Promise<void> {
    const provider = process.env.SMS_PROVIDER;
    const key = process.env.SMS_API_KEY;
    if (!provider || !key) {
      throw new Error(`SMS OTP requested but SMS_PROVIDER/SMS_API_KEY not configured.`);
    }
    logger.warn(`[otp] SMS provider '${provider}' SDK not wired — use OTP_PROVIDER=devel for local dev.`);
    throw new Error('SMS provider integration is not yet wired.');
  }
}

// ---------------------------------------------------------------------------
// OTP crypto + lifecycle
// ---------------------------------------------------------------------------

const OTP_SALT_COL = 'salt';

function hashOtp(code: string, salt: string): string {
  return crypto.createHash('sha256').update(salt + code).digest('hex');
}

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export interface OtpRecord {
  id: string;
  recipient: string;
  purpose: string;
}

export interface CreateOtpOptions {
  identityId?: string;      // link OTP to a user/official uid/email
}

/** Create + persist an OTP. Returns the plaintext code (to deliver) — NEVER stored. */
export async function createOtp(
  recipient: string,
  purpose: 'register' | 'login' | 'official_otp' | 'reset',
  channel: 'phone' | 'email',
  provider: OtpProvider = getOtpProvider(),
  opts: CreateOtpOptions = {},
): Promise<{ id: string; code: string; expiresAt: Date; delivered: boolean }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = hashOtp(code, salt);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const recent = await db.queryOne<{ c: number }>(
    `SELECT count(*) AS c FROM otp_tokens WHERE recipient = $1 AND purpose = $2 AND created_at > now() - interval '10 minutes'`,
    [recipient, purpose],
  );
  if (recent && Number(recent.c) >= 5) {
    throw new Error('Too many OTP requests. Please wait before retrying.');
  }

  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO otp_tokens (id, recipient, channel, code_hash, ${OTP_SALT_COL}, identity_id, purpose, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, recipient, channel, codeHash, salt, opts.identityId ?? null, purpose, expiresAt],
  );

  let delivered = false;
  try { await provider.sendOtp(recipient, code, purpose); delivered = true; }
  catch (e) { logger.error(`OTP delivery failed for ${recipient} (${purpose}): ${(e as Error).message}`); }

  return { id, code, expiresAt, delivered };
}

/** Verify an OTP code. Returns identity_id (or null). Marks the token used. */
export async function verifyOtp(recipient: string, purpose: string, code: string): Promise<string | null> {
  const row = await db.queryOne<{
    id: string; code_hash: string; salt: string; identity_id: string | null;
    attempts: number; expires_at: Date; used_at: Date | null;
  }>(
    `SELECT id, code_hash, salt, identity_id, attempts, expires_at, used_at
     FROM otp_tokens WHERE recipient = $1 AND purpose = $2
     ORDER BY created_at DESC LIMIT 1`,
    [recipient, purpose],
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;
  if (row.used_at) return null;
  if (row.attempts >= 5) return null;

  const providedHash = hashOtp(code, row.salt ?? '');
  await db.execute('UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1', [row.id]);

  let ok = false;
  try { ok = crypto.timingSafeEqual(Buffer.from(providedHash), Buffer.from(row.code_hash)); }
  catch { ok = false; }
  if (!ok) return null;

    await db.execute('UPDATE otp_tokens SET used_at = now() WHERE id = $1', [row.id]);
  return row.identity_id;
}

// ---------------------------------------------------------------------------
// Resident registration + session
// ---------------------------------------------------------------------------

function generateGudalurId(): string {
  const year = new Date().getFullYear();
  const seq = crypto.randomInt(0, 1_000_000).toString(16).padStart(6, '0').toUpperCase();
  return `GD-${year}-${seq}`;
}

export interface ResidentProfile {
  uid: string; phone: string; gudalurId: string; name: string; email?: string;
  localityId?: string; localityName?: string; customPlaceName?: string;
  pincode?: string; role: string; verificationLevel: string;
  isBloodDonor?: boolean; bloodGroup?: string;
  avatarUrl?: string; bio?: string; lat?: number; lng?: number;
  aadhaarVerified?: boolean; aadhaarLast4?: string; aadhaarRef?: string;
  createdAt: number; updatedAt: number;
}

export interface RegisterInput {
  name: string; phone: string; localityId: string; customPlaceName?: string;
  pincode: string; email?: string; aadhaarVerified?: boolean;
  aadhaarLast4?: string; aadhaarRef?: string; lat?: number; lng?: number;
}

/** Register a new resident: GDR-ID assignment + OTP + session. */
export async function registerResident(input: RegisterInput): Promise<{ resident: ResidentProfile; otp: { id: string; code: string } } | null> {
  const phone = normalizePhone(input.phone);
  if (phone.length !== 10) throw new Error('A valid 10-digit mobile number is required');

  const uid = crypto.randomUUID();
  const gudalurId = await allocateGudalurId();
  const localityName = (await db.queryOne<{ name: string }>('SELECT name FROM locality WHERE id = $1', [input.localityId]))?.name ?? 'Gudalur Taluk';

  const result = await db.withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO users (uid, phone, gudalur_id, name, email, locality_id, locality_name,
         custom_place_name, pincode, role, verification_level, is_blood_donor,
         blood_group, lat, lng, aadhaar_verified, aadhaar_last4, aadhaar_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'LOCAL_MEMBER','UNVERIFIED',
               $10,$11,$12,$13,$14,$15)`,
      [uid, phone, gudalurId, input.name.trim(), input.email?.trim(),
       input.localityId, localityName, input.customPlaceName?.trim() || undefined,
       input.pincode, false, undefined, input.lat, input.lng,
       input.aadhaarVerified || false, input.aadhaarLast4, input.aadhaarRef],
    );
        const otp = await createOtp(phone, 'register', 'phone', getOtpProvider(), { identityId: uid });
    return { uid, gudalurId, otp };
  });

  return {
    resident: {
      uid: result.uid, phone, gudalurId: result.gudalurId, name: input.name.trim(),
      email: input.email, localityId: input.localityId, localityName,
      customPlaceName: input.customPlaceName, pincode: input.pincode,
      role: 'LOCAL_MEMBER', verificationLevel: 'UNVERIFIED',
      aadhaarVerified: input.aadhaarVerified, aadhaarLast4: input.aadhaarLast4,
      aadhaarRef: input.aadhaarRef, lat: input.lat, lng: input.lng,
      createdAt: Date.now(), updatedAt: Date.now(),
    },
    otp: { id: result.otp.id, code: result.otp.code },
  };
}

/** Allocate a unique GDR-ID (retry on collision). */
async function allocateGudalurId(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const id = generateGudalurId();
    const taken = await db.queryOne<{ uid: string }>('SELECT uid FROM users WHERE gudalur_id = $1', [id]);
    if (!taken) return id;
  }
  throw new Error('Failed to allocate a unique Gudalur ID');
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
}


