/**
 * Voice of Gudalur — Express auth routes (Phase 6).
 *
 * Session cookies (httpOnly, SameSite=Strict): access_token (JWT, 15m),
 * refresh_token (opaque, 24h). Non-httpOnly csrf_token backs the double-submit
 * CSRF guard.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { registerResident, loginResident, normalizePhone } from '../services/authService';
import { sendOtpSms } from '../services/smsService';
import {
  createSession, revokeSession, resolveSession, SessionUser,
  requireAuth,
} from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

const COOKIE_OPTS: Record<string, any> = {
  httpOnly: true, sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production', path: '/',
};

export function setSessionCookies(res: Response, session: { accessToken: string; refreshToken: string; csrfToken: string }) {
  res.cookie('access_token', session.accessToken, { ...COOKIE_OPTS, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', session.refreshToken, { ...COOKIE_OPTS, maxAge: 24 * 60 * 60 * 1000 });
  res.cookie('csrf_token', session.csrfToken, {
    httpOnly: false, sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production', path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });
}
function clearSessionCookies(res: Response) {
  res.clearCookie('access_token', COOKIE_OPTS);
  res.clearCookie('refresh_token', COOKIE_OPTS);
  res.clearCookie('csrf_token', { ...COOKIE_OPTS, httpOnly: false, maxAge: 0 });
}

async function findUserByPhone(phone: string) {
  return db.queryOne<{
    uid: string; phone: string; gudalur_id: string; name: string; role: string; verification_level: string;
  }>('SELECT uid, phone, gudalur_id, name, role, verification_level FROM users WHERE phone = $1', [phone]);
}

/** Map a `users` row to the public ResidentProfile shape returned to the client. */
function residentRowToProfile(row: any) {
  return {
    uid: row.uid,
    phone: row.phone,
    gudalurId: row.gudalur_id,
    name: row.name,
    email: row.email ?? undefined,
    localityId: row.locality_id ?? undefined,
    localityName: row.locality_name ?? undefined,
    customPlaceName: row.custom_place_name ?? undefined,
    pincode: row.pincode ?? undefined,
    role: row.role,
    verificationLevel: row.verification_level,
    isBloodDonor: row.is_blood_donor ?? false,
    bloodGroup: row.blood_group ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    issuesReported: row.issues_reported ?? 0,
    issuesSupported: row.issues_supported ?? 0,
    representationsCreated: row.representations_created ?? 0,
    alertsAcknowledged: row.alerts_acknowledged ?? 0,
  };
}

/** POST /api/auth/register - Resident completes registration after OTP verification. */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const created = await registerResident(req.body);
    if (!created) return res.status(400).json({ error: 'Registration failed' });
    setSessionCookies(res, created.session);
    res.status(201).json({ user: residentRowToProfile(created.resident), csrfToken: created.session.csrfToken });
  } catch (e: any) {
    logger.error('register:', e.message);
    res.status(e.message?.includes('unique') ? 409 : 400).json({ error: e.message });
  }
});

/** POST /api/auth/request-otp - Send a 6-digit code to a phone number. */
router.post('/request-otp', async (req: Request, res: Response) => {
  const phone = String(req.body?.phone || '').trim();
  const digits = phone.replace(/\D/g, '');
  if (!digits || digits.length !== 10) {
    return res.status(400).json({ error: 'A valid 10-digit mobile number is required' });
  }
  const normalized = digits;
  const code = crypto.randomInt(100000, 999999).toString();
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const salt = crypto.randomBytes(8).toString('hex');
  await db.execute(
    `INSERT INTO otp_tokens (recipient, channel, code_hash, salt, purpose, expires_at)
     VALUES ($1, 'phone', $2, $3, 'register', now() + INTERVAL '5 minutes')`,
    [normalized, codeHash, salt],
  );
  // In devel mode, return the code directly (dev/test ONLY — never production).
  // Any other value sends a real SMS via the configured provider (smsService).
  if (process.env.OTP_PROVIDER === 'devel' || !process.env.OTP_PROVIDER) {
    logger.info(`[OTP devel] code for ${normalized}: ${code}`);
    res.json({ message: 'OTP sent', otp: code });
  } else {
    try {
      await sendOtpSms(normalized, code);
      logger.info(`[OTP] code sent to ${normalized} via ${process.env.SMS_PROVIDER || 'sms'}`);
      res.json({ message: 'OTP sent' });
    } catch (e: any) {
      // Fail loudly so misconfiguration is visible immediately instead of
      // users waiting forever for an SMS that was never sent.
      logger.error('otp sms:', e.message);
      res.status(503).json({ error: `Could not send the OTP SMS — ${e.message}` });
    }
  }
});

/** POST /api/auth/verify-otp - Validate an OTP and establish a pending registration session. */
router.post('/verify-otp', async (req: Request, res: Response) => {
  const phone = String(req.body?.phone || '').trim();
  const digits = phone.replace(/\D/g, '');
  const code = String(req.body?.code || '').trim();
  if (!digits || digits.length !== 10) return res.status(400).json({ error: 'A valid 10-digit mobile number is required' });
  if (!code || code.length !== 6) return res.status(400).json({ error: 'A valid 6-digit code is required' });
  const normalized = digits;
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  const row = await db.queryOne<{ id: string; code_hash: string; salt: string; expires_at: Date; used_at: Date | null; attempts: number }>(
    `SELECT id, code_hash, salt, expires_at, used_at, attempts FROM otp_tokens
     WHERE recipient = $1 AND channel = 'phone' AND purpose = 'register'
     ORDER BY created_at DESC LIMIT 1`,
    [normalized],
  );
  if (!row) return res.status(400).json({ error: 'No OTP requested for this number' });
  if (row.used_at) return res.status(400).json({ error: 'OTP already used' });
  if (new Date(row.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired' });
  if (row.attempts >= 3) return res.status(400).json({ error: 'Too many attempts' });
  if (row.code_hash !== codeHash) {
    await db.execute(`UPDATE otp_tokens SET attempts = attempts + 1 WHERE id = $1`, [row.id]);
    return res.status(400).json({ error: 'Invalid code' });
  }
  await db.execute(`UPDATE otp_tokens SET used_at = now() WHERE id = $1`, [row.id]);
  // Look up existing user if phone is already registered
  const existing = await db.queryOne<{
    uid: string; phone: string; gudalur_id: string; name: string; role: string;
    verification_level: string; locality_name: string | null; email: string | null;
    locality_id: string | null; custom_place_name: string | null; pincode: string;
    lat: number | null; lng: number | null; is_blood_donor: boolean; blood_group: string | null;
    avatar_url: string | null; bio: string | null; created_at: Date; updated_at: Date;
    issues_reported: number; issues_supported: number; representations_created: number; alerts_acknowledged: number;
  }>('SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name, custom_place_name, pincode, role, verification_level, is_blood_donor, blood_group, avatar_url, bio, lat, lng, created_at, updated_at, issues_reported, issues_supported, representations_created, alerts_acknowledged FROM users WHERE phone = $1', [normalized]);
  if (existing) {
    const sessionUser = { uid: existing.uid, phone: existing.phone, gudalurId: existing.gudalur_id, name: existing.name, role: existing.role, kind: 'user' as const, localityName: existing.locality_name ?? undefined };
    const session = await createSession(sessionUser);
    setSessionCookies(res, session);
    return res.json({ user: residentRowToProfile(existing), isNew: false, csrfToken: session.csrfToken });
  }
  // Not registered yet — set a pending session cookie so client can complete registration
  res.cookie('pending_phone', normalized, { httpOnly: true, sameSite: 'strict' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 5 * 60 * 1000 });
  res.json({ isNew: true, phone: normalized });
});

/** POST /api/auth/logout */
router.post('/logout', async (req: Request, res: Response) => {
  const rf = req.cookies?.refresh_token as string | undefined;
  if (rf) await revokeSession(rf);
  clearSessionCookies(res);
  res.clearCookie('pending_phone', { path: '/' });
  res.json({ ok: true });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/** POST /api/auth/lookup - passwordless login by phone OR Gudalur ID, session issued immediately. */
router.post('/lookup', async (req: Request, res: Response) => {
  try {
    const rawPhone = req.body?.phone;
    const gudalurId = req.body?.gudalurId;
    const phone = rawPhone && String(rawPhone).trim() ? normalizePhone(String(rawPhone)) : undefined;
    const result = await loginResident(phone, gudalurId);
    if (!result) return res.status(404).json({ error: 'No resident found for this phone or Gudalur ID. Register first.' });
    setSessionCookies(res, result.session);
    res.json({ user: residentRowToProfile(result.resident), csrfToken: result.session.csrfToken });
  } catch (e: any) {
    logger.error('lookup:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** PATCH /api/auth/me — update the authenticated resident's profile fields. */
router.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (req.user!.kind !== 'user') return res.status(403).json({ error: 'Resident-only endpoint' });
    const f = req.body || {};
    const name = typeof f.name === 'string' ? f.name.trim() : undefined;
    const email = typeof f.email === 'string' && f.email.trim() ? f.email.trim() : undefined;
    const localityId = typeof f.localityId === 'string' ? f.localityId : undefined;
    const customPlaceName = typeof f.customPlaceName === 'string' ? f.customPlaceName : undefined;
    const pincode = typeof f.pincode === 'string' ? f.pincode : undefined;
    const lat = typeof f.lat === 'number' ? f.lat : undefined;
    const lng = typeof f.lng === 'number' ? f.lng : undefined;
    const phone = typeof f.phone === 'string' ? normalizePhone(f.phone) : undefined;

    let localityName: string | undefined;
    if (localityId) {
      localityName = (await db.queryOne<{ name: string }>('SELECT name FROM locality WHERE id = $1', [localityId]))?.name;
    }
    await db.execute(
      `UPDATE users SET
         name        = COALESCE($2, name),
         email       = COALESCE($3, email),
         phone       = COALESCE($4, phone),
         locality_id = COALESCE($5, locality_id),
         locality_name = COALESCE($6, locality_name),
         custom_place_name = COALESCE($7, custom_place_name),
         pincode     = COALESCE($8, pincode),
         lat         = COALESCE($9, lat),
         lng         = COALESCE($10, lng),
         updated_at  = now()
       WHERE uid = $1`,
      [req.user!.uid, name ?? null, email ?? null, phone ?? null, localityId ?? null,
       localityName ?? null, customPlaceName ?? null, pincode ?? null,
       lat ?? null, lng ?? null],
    );
        const row = await db.queryOne<any>(
      `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
              custom_place_name, pincode, role, verification_level,
              lat, lng,
              created_at, updated_at, issues_reported, issues_supported,
              representations_created, alerts_acknowledged,
              is_blood_donor, blood_group, avatar_url, bio
       FROM users WHERE uid = $1`,
      [req.user!.uid],
    );
    if (!row) return res.status(404).json({ error: 'Resident not found' });
    res.json({ user: residentRowToProfile(row) });
  } catch (e: any) {
    logger.error('update me:', e.message);
    res.status(e.message?.includes('unique') ? 409 : 500).json({ error: e.message });
  }
});

/** GET /api/auth/csrf */
router.get('/csrf', (_req: Request, res: Response) => {
  const token = crypto.randomUUID().replace(/-/g, '');
  res.cookie('csrf_token', token, { httpOnly: false, sameSite: 'strict', path: '/', maxAge: 86400000 });
  res.json({ csrfToken: token });
});

/** POST /api/auth/forgot — residents authenticate via OTP to their phone. */
router.post('/forgot', async (_req: Request, res: Response) => {
  res.json({
    message: 'Passwordless phone verification only. Enter your mobile number to request an OTP code.',
  });
});

/** POST /api/auth/refresh — exchange refresh_token for a new access_token (rotates). */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const rf = req.cookies?.refresh_token as string | undefined;
    if (!rf) return res.status(401).json({ error: 'No refresh token' });
    const resolved = await resolveSession(rf);
    if (!resolved) return res.status(401).json({ error: 'Invalid or expired session' });
    await revokeSession(rf);
    const session = await createSession(resolved.user, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.json({ user: resolved.user, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('refresh:', e.message);
    res.status(500).json({ error: 'Refresh failed' });
  }
});

export default router;
