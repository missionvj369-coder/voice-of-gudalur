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
import { createOtp, verifyOtp, registerResident, normalizePhone } from '../services/authService';
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
    aadhaarVerified: row.aadhaar_verified ?? false,
    aadhaarLast4: row.aadhaar_last4 ?? undefined,
    aadhaarRef: row.aadhaar_ref ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    issuesReported: row.issues_reported ?? 0,
    issuesSupported: row.issues_supported ?? 0,
    representationsCreated: row.representations_created ?? 0,
    alertsAcknowledged: row.alerts_acknowledged ?? 0,
  };
}

/** POST /api/auth/register — resident signs up with phone; OTP dispatched. */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const created = await registerResident(req.body);
    if (!created) return res.status(400).json({ error: 'Registration failed' });
    const devOtp = (process.env.OTP_PROVIDER || 'devel') === 'devel' ? created.otp.code : undefined;
    res.status(201).json({ resident: created.resident, otp: devOtp ? { ...created.otp } : undefined });
  } catch (e: any) {
    logger.error('register:', e.message);
    res.status(e.message?.includes('unique') ? 409 : 400).json({ error: e.message });
  }
});

/** POST /api/auth/verify-otp — validates OTP and creates a session. */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phone, code, purpose = 'register' } = req.body;
    const p = normalizePhone(phone || '');
    if (p.length !== 10 || !/^\d{6}$/.test(code || '')) {
      return res.status(400).json({ error: 'Invalid phone or code' });
    }
    const identityId = await verifyOtp(p, purpose, code);
    if (!identityId) return res.status(401).json({ error: 'Invalid or expired OTP' });

    const user = await findUserByPhone(p);
    if (!user) return res.status(401).json({ error: 'No resident found for this number' });

    const sessionUser: SessionUser = {
      uid: user.uid, phone: user.phone, gudalurId: user.gudalur_id,
      name: user.name, role: user.role, verificationLevel: user.verification_level, kind: 'user',
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);
    res.json({ user: sessionUser, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('verify-otp:', e.message);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

/** POST /api/auth/logout */
router.post('/logout', async (req: Request, res: Response) => {
  const rf = req.cookies?.refresh_token as string | undefined;
  if (rf) await revokeSession(rf);
  clearSessionCookies(res);
  res.json({ ok: true });
});

/** GET /api/auth/me */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});

/** POST /api/auth/lookup — resolve a resident by phone OR Gudalur ID (login start). */
router.post('/lookup', async (req: Request, res: Response) => {
  try {
    const phone = normalizePhone(req.body?.phone || '');
    const gid = String(req.body?.gudalurId || '').trim().toUpperCase();
    if (!phone && !gid) return res.status(400).json({ error: 'Provide a mobile number OR a Gudalur ID' });
    const base = `SELECT uid, phone, gudalur_id, name, email, locality_id, locality_name,
                         custom_place_name, pincode, role, verification_level,
                         aadhaar_verified, aadhaar_last4, aadhaar_ref, lat, lng,
                         created_at, updated_at, issues_reported, issues_supported,
                         representations_created, alerts_acknowledged,
                         is_blood_donor, blood_group, avatar_url, bio
                  FROM users`;
    const row = phone
      ? await db.queryOne<any>(`${base} WHERE phone = $1`, [phone])
      : await db.queryOne<any>(`${base} WHERE gudalur_id = $1`, [gid]);
    if (!row) return res.status(404).json({ error: 'No resident found for these details. Check your mobile number / Gudalur ID, or register first.' });

    const otp = await createOtp(row.phone, 'login', 'phone');
    res.json({
      resident: residentRowToProfile(row),
      ...((process.env.OTP_PROVIDER || 'devel') === 'devel'
        ? { otp: { id: otp.id, code: otp.code } }
        : { message: 'OTP sent to your registered mobile number' }),
    });
  } catch (e: any) {
    logger.error('lookup:', e.message);
    res.status(500).json({ error: 'Login lookup failed' });
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
              aadhaar_verified, aadhaar_last4, aadhaar_ref, lat, lng,
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

/** POST /api/auth/forgot — issue a login OTP for an existing resident. */
router.post('/forgot', async (req: Request, res: Response) => {
  try {
    const p = normalizePhone(req.body?.phone || '');
    const user = await findUserByPhone(p);
    if (!user) return res.status(404).json({ error: 'No resident for this number' });
    const otp = await createOtp(p, 'login', 'phone');
    res.json({ message: 'OTP sent', ...((process.env.OTP_PROVIDER || 'devel') === 'devel' ? { otp: { id: otp.id, code: otp.code } } : {}) });
  } catch (e: any) {
    logger.error('forgot:', e.message);
    res.status(500).json({ error: 'Could not issue OTP' });
  }
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
