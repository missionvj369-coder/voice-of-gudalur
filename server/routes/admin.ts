/**
 * Voice of Gudalur — Admin routes (hidden /admin portal).
 *
 * The PLATFORM_ADMIN manages government official access:
 *   POST /api/admin/login              — admin login with GDR ID + password
 *   GET  /api/admin/officials          — list all officials (pending + approved)
 *   POST /api/admin/officials          — add an official email (grants access)
 *   POST /api/admin/officials/:id/approve  — approve a pending official
 *   POST /api/admin/officials/:id/reject   — reject + remove an official
 *   POST /api/admin/officials/:id/reset-password — reset an official's password
 *   GET  /api/admin/audit              — recent audit events
 *
 * All routes require admin session (PLATFORM_ADMIN role).
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit, createSession, SessionUser, revokeSession } from '../middleware/auth';
import { setSessionCookies } from './auth';
import { logger } from '../utils/logger';

const router = Router();

// ─── Password hashing (Node.js built-in scrypt) ───────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

// ─── Admin login ──────────────────────────────────────────────────────

/** POST /api/admin/login — admin login with GDR ID + password. */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const rawId = String(req.body?.gudalurId || '').trim().toUpperCase();
    const password = String(req.body?.password || '');
    const gudalurId = rawId.replace(/\s/g, '');

    if (!gudalurId || !password) {
      return res.status(400).json({ error: 'GDR ID and password are required' });
    }

    const admin = await db.queryOne<{
      uid: string; gudalur_id: string; name: string; email: string;
      role: string; verification_level: string; password_hash: string;
    }>(
      `SELECT uid, gudalur_id, name, email, role, verification_level, password_hash
       FROM users WHERE gudalur_id = $1 AND role IN ('ADMIN', 'PLATFORM_ADMIN')`,
      [gudalurId],
    );

    if (!admin || !admin.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!verifyPassword(password, admin.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionUser: SessionUser = {
      uid: admin.uid, phone: undefined, gudalurId: admin.gudalur_id,
      name: admin.name, role: admin.role, verificationLevel: admin.verification_level,
      kind: 'user',
    };
    const session = await createSession(sessionUser, req.get('user-agent'), req.ip);
    setSessionCookies(res, session);

    await logAudit({
      actorId: admin.uid, actorKind: 'user', action: 'ADMIN_LOGIN',
      target: `admin/${admin.uid}`, ip: req.ip, userAgent: req.get('user-agent'),
    });

    res.json({
      user: { uid: admin.uid, name: admin.name, email: admin.email, role: admin.role, gudalurId: admin.gudalurId },
      csrfToken: session.csrfToken,
    });
  } catch (e: any) {
    logger.error('admin login:', e.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** POST /api/admin/logout */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const rf = req.cookies?.refresh_token;
    if (rf) await revokeSession(rf);
  } catch { /* best-effort */ }
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.clearCookie('csrf_token');
  res.json({ ok: true });
});

export default router;
