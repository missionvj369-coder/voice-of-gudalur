/**
 * Voice of Gudalur — Officials portal routes (Phase 7).
 *
 * Access is gated server-side by requireRole — an endpoint's existence does
 * NOT grant access.
 *
 *   POST /api/officials/request   — official requests portal access
 *   POST /api/officials/approve/:id — ADMIN approves an official
 *   POST /api/officials/otp        — issue official email OTP
 *   POST /api/officials/verify     — verify official OTP, set session
 *   GET  /api/officials/signs      — APPROVED_OFFICIAL+
 *   GET  /api/officials/incidents   — APPROVED_OFFICIAL+
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { createOtp, verifyOtp } from '../services/authService';
import { createSession, SessionUser, requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';
import { listPetitionSigns } from '../db/repositories/petitionRepository';
import { listIncidents } from '../db/repositories/wildlifeRepository';
import { hashPassword, verifyPassword } from './admin';

const router = Router();

/** POST /api/officials/set-password — set password (first time after approval or after reset). */
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const resetToken = String(req.body?.resetToken || '');
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const official = await db.queryOne<{ id: number; email: string; name: string; role: string; status: string; password_hash: string; reset_token: string; reset_token_expires: string }>(
      'SELECT id, email, name, role, status, password_hash, reset_token, reset_token_expires FROM officials WHERE email = $1', [email]);
    if (!official) return res.status(404).json({ error: 'Official not found' });
    if (official.status !== 'APPROVED') return res.status(403).json({ error: 'Account not approved' });
    if (resetToken) {
      if (!official.reset_token || official.reset_token !== resetToken) return res.status(400).json({ error: 'Invalid reset token' });
      if (official.reset_token_expires && new Date(official.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset token expired' });
    }
    if (official.password_hash && !resetToken) {
      const oldPassword = String(req.body?.oldPassword || '');
      if (!verifyPassword(oldPassword, official.password_hash)) return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const passwordHash = hashPassword(password);
    await db.execute('UPDATE officials SET password_hash = $1, password_set_at = now(), reset_token = NULL, reset_token_expires = NULL WHERE id = $2::int', [passwordHash, official.id]);
    const sessionUser: SessionUser = { uid: String(official.id), name: official.name ?? official.email, role: official.role, verificationLevel: 'PHONE_VERIFIED', kind: 'official' };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    res.cookie('access_token', session.accessToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', session.refreshToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    res.cookie('csrf_token', session.csrfToken, { httpOnly: false, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    res.json({ message: 'Password set successfully. You are now logged in.', user: sessionUser, csrfToken: session.csrfToken });
  } catch (e: any) { logger.error('set official password:', e.message); res.status(500).json({ error: 'Failed to set password' }); }
});

/** POST /api/officials/login — login with email + password. */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const official = await db.queryOne<{ id: number; email: string; name: string; role: string; status: string; password_hash: string }>(
      'SELECT id, email, name, role, status, password_hash FROM officials WHERE email = $1', [email]);
    if (!official) return res.status(401).json({ error: 'Invalid credentials' });
    if (official.status !== 'APPROVED') return res.status(403).json({ error: 'Account not approved by admin' });
    if (!official.password_hash) return res.status(403).json({ error: 'Password not set. Please set your password first.' });
    if (!verifyPassword(password, official.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const sessionUser: SessionUser = { uid: String(official.id), name: official.name ?? official.email, role: official.role, verificationLevel: 'PHONE_VERIFIED', kind: 'official' };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    res.cookie('access_token', session.accessToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', session.refreshToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    res.cookie('csrf_token', session.csrfToken, { httpOnly: false, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    await logAudit({ actorId: String(official.id), actorKind: 'official', action: 'OFFICIAL_LOGIN', target: `officials/${official.id}`, ip: req.ip });
    res.json({ user: sessionUser, csrfToken: session.csrfToken });
  } catch (e: any) { logger.error('official login:', e.message); res.status(500).json({ error: 'Login failed' }); }
});

/** POST /api/officials/forgot-password — request password reset. */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const official = await db.queryOne<{ id: number }>('SELECT id FROM officials WHERE email = $1 AND status = \'APPROVED\'', [email]);
    if (!official) return res.json({ message: 'If this email is registered, a reset link will be sent.' });
    const resetToken = crypto.randomBytes(32).toString('hex');
    await db.execute('UPDATE officials SET reset_token = $1, reset_token_expires = now() + interval \'24 hours\' WHERE id = $2::int', [resetToken, official.id]);
    res.json({ message: 'Password reset initiated. Contact the admin to complete the reset.', ...((process.env.NODE_ENV !== 'production') ? { resetToken } : {}) });
  } catch (e: any) { logger.error('forgot password:', e.message); res.status(500).json({ error: 'Reset request failed' }); }
});

/** POST /api/officials/reset-password — reset password with token. */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const resetToken = String(req.body?.resetToken || '');
    const password = String(req.body?.password || '');
    if (!email || !resetToken || !password) return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const official = await db.queryOne<{ id: number; reset_token: string; reset_token_expires: string }>('SELECT id, reset_token, reset_token_expires FROM officials WHERE email = $1', [email]);
    if (!official || !official.reset_token || official.reset_token !== resetToken) return res.status(400).json({ error: 'Invalid reset token' });
    if (official.reset_token_expires && new Date(official.reset_token_expires) < new Date()) return res.status(400).json({ error: 'Reset token expired' });
    const passwordHash = hashPassword(password);
    await db.execute('UPDATE officials SET password_hash = $1, password_set_at = now(), reset_token = NULL, reset_token_expires = NULL WHERE id = $2::int', [passwordHash, official.id]);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (e: any) { logger.error('reset password:', e.message); res.status(500).json({ error: 'Password reset failed' }); }
});

/** POST /api/officials/request — official requests portal access. */
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { email, name, phone } = req.body;
    if (!email || !name) return res.status(400).json({ error: 'email and name required' });
    await db.execute(
      `INSERT INTO officials (email, name, phone, role, status)
       VALUES ($1, $2, $3, 'OFFICIAL', 'PENDING')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone`,
      [email.trim().toLowerCase(), name.trim(), phone ?? null],
    );
    res.status(201).json({ message: 'Access request submitted. An administrator will review it.' });
  } catch (e: any) {
    logger.error('official request:', e.message);
    res.status(500).json({ error: 'Request failed' });
  }
});

/** POST /api/officials/approve/:id — ADMIN approves an official. */
router.post('/approve/:id', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  const ok = await db.query(
    `UPDATE officials SET status = 'APPROVED', approved_at = now(), approved_by = $1
     WHERE id = $2::int AND status = 'PENDING'`,
    [req.user!.uid, req.params.id],
  );
  await logAudit({ actorId: req.user!.uid, actorKind: 'user', action: 'APPROVE_OFFICIAL', target: `officials/${req.params.id}`, ip: req.ip });
  res.json({ approved: (ok.rowCount ?? 0) > 0 });
});

/** POST /api/officials/otp — issue an email OTP (only for approved officials). */
router.post('/otp', async (req: Request, res: Response) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const official = await db.queryOne<{ id: number; email: string; name: string; status: string }>(
      'SELECT id, email, name, status FROM officials WHERE email = $1', [email],
    );
    if (!official) return res.status(404).json({ error: 'Official not found' });
    if (official.status !== 'APPROVED') return res.status(403).json({ error: 'Account not approved' });

    const otp = await createOtp(official.email, 'official_otp', 'email', undefined, { identityId: String(official.id) });
    res.json({ message: 'OTP sent', ...((process.env.OTP_PROVIDER || 'devel') === 'devel' ? { otp: { id: otp.id, code: otp.code } } : {}) });
  } catch (e: any) {
    logger.error('official otp:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/** POST /api/officials/verify — verify official OTP, set session. */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const code: string = req.body?.code;
    if (!/^\d{6}$/.test(code || '')) return res.status(400).json({ error: 'Invalid code' });

    const identityId = await verifyOtp(email, 'official_otp', code);
    if (!identityId) return res.status(401).json({ error: 'Invalid or expired OTP' });

    const official = await db.queryOne<{ id: number; email: string; name: string; role: string }>(
      'SELECT id, email, name, role FROM officials WHERE id = $1::int', [identityId],
    );
    if (!official) return res.status(404).json({ error: 'Official not found' });

    const sessionUser: SessionUser = {
      uid: String(official.id), phone: undefined, gudalurId: undefined,
      name: official.name ?? official.email, role: official.role,
      verificationLevel: 'PHONE_VERIFIED', kind: 'official',
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    res.cookie('access_token', session.accessToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', session.refreshToken, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    res.cookie('csrf_token', session.csrfToken, { httpOnly: false, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 86400000 });
    res.json({ user: sessionUser, csrfToken: session.csrfToken });
  } catch (e: any) {
    logger.error('official verify:', e.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/** GET /api/officials/signs — approved officials only. */
router.get('/signs', requireAuth, requireRole('OFFICIAL', 'APPROVED_OFFICIAL', 'ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  const rows = await listPetitionSigns(undefined, 200, 0);
  res.json({ signs: rows.rows });
});

/** GET /api/officials/incidents — approved officials only. */
router.get('/incidents', requireAuth, requireRole('OFFICIAL', 'APPROVED_OFFICIAL', 'ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  const rows = await listIncidents(500);
  res.json({ incidents: rows.rows });
});

export default router;

