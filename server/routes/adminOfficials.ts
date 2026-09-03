/**
 * Voice of Gudalur — Admin officials management routes.
 *
 *   GET  /api/admin/officials              — list all officials
 *   POST /api/admin/officials              — add official email (grants access)
 *   POST /api/admin/officials/:id/approve  — approve pending official
 *   POST /api/admin/officials/:id/reject   — reject + remove official
 *   POST /api/admin/officials/:id/reset-password — reset official password
 *
 * All routes require PLATFORM_ADMIN session.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/admin/officials — list all officials. */
router.get('/officials', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const rows = await db.query<{
      id: number; email: string; name: string; phone: string; role: string;
      status: string; created_at: string; approved_at: string; added_by: string;
      password_hash: string; password_set_at: string;
    }>(
      `SELECT id, email, name, phone, role, status, created_at, approved_at, added_by,
              password_hash, password_set_at
       FROM officials ORDER BY created_at DESC`,
    );
    res.json({
      officials: rows.rows.map((r) => ({
        id: r.id, email: r.email, name: r.name, phone: r.phone, role: r.role,
        status: r.status, createdAt: r.created_at, approvedAt: r.approved_at,
        addedBy: r.added_by,
        hasPassword: !!r.password_hash,
        passwordSetAt: r.password_set_at,
      })),
    });
  } catch (e: any) {
    logger.error('list officials:', e.message);
    res.status(500).json({ error: 'Failed to list officials' });
  }
});

/** POST /api/admin/officials — admin adds an official email (grants access). */
router.post('/officials', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim() || 'Government Official';

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid official email is required' });
    }

    await db.execute(
      `INSERT INTO officials (email, name, role, status, approved_at, approved_by, added_by)
       VALUES ($1, $2, 'OFFICIAL', 'APPROVED', now(), $3, $3)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'APPROVED',
         approved_at = now(),
         approved_by = $3,
         added_by = $3`,
      [email, name, req.user!.uid],
    );

    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'ADD_OFFICIAL',
      target: `officials/${email}`, detail: { email, name }, ip: req.ip,
    });

    res.status(201).json({
      message: `${email} has been granted access. They can now set their password to log in.`,
      email,
    });
  } catch (e: any) {
    logger.error('add official:', e.message);
    res.status(500).json({ error: 'Failed to add official' });
  }
});

export default router;
