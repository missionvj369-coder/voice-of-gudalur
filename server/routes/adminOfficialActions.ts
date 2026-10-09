/**
 * Voice of Gudalur — Admin official actions routes.
 *
 *   POST /api/admin/officials/:id/approve  — approve pending official
 *   POST /api/admin/officials/:id/reject   — reject + remove official
 *   POST /api/admin/officials/:id/reset-password — reset official password
 *   GET  /api/admin/audit                  — recent audit events
 *
 * All routes require PLATFORM_ADMIN session.
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/** POST /api/admin/officials/:id/approve — approve a pending official request. */
router.post('/officials/:id/approve', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const ok = await db.query(
      `UPDATE officials SET status = 'APPROVED', approved_at = now(), approved_by = $1
       WHERE id = $2::int AND status = 'PENDING'`,
      [req.user!.uid, id],
    );
    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'APPROVE_OFFICIAL',
      target: `officials/${id}`, ip: req.ip,
    });
    res.json({ approved: (ok.rowCount ?? 0) > 0 });
  } catch (e: any) {
    logger.error('approve official:', e.message);
    res.status(500).json({ error: 'Approval failed' });
  }
});

/** POST /api/admin/officials/:id/reject — reject and remove an official. */
router.post('/officials/:id/reject', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const row = await db.queryOne<{ email: string }>('SELECT email FROM officials WHERE id = $1::int', [id]);
    if (!row) return res.status(404).json({ error: 'Official not found' });

    await db.execute('DELETE FROM officials WHERE id = $1::int', [id]);
    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'REJECT_OFFICIAL',
      target: `officials/${id}`, detail: { email: row.email }, ip: req.ip,
    });
    res.json({ rejected: true });
  } catch (e: any) {
    logger.error('reject official:', e.message);
    res.status(500).json({ error: 'Rejection failed' });
  }
});

/** POST /api/admin/officials/:id/reset-password — admin resets official's password. */
router.post('/officials/:id/reset-password', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const official = await db.queryOne<{ email: string; name: string }>(
      'SELECT email, name FROM officials WHERE id = $1::int', [id],
    );
    if (!official) return res.status(404).json({ error: 'Official not found' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    await db.execute(
      `UPDATE officials SET password_hash = NULL, password_set_at = NULL,
              reset_token = $1, reset_token_expires = now() + interval '24 hours'
       WHERE id = $2::int`,
      [resetToken, id],
    );

    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'RESET_OFFICIAL_PASSWORD',
      target: `officials/${id}`, detail: { email: official.email }, ip: req.ip,
    });

    res.json({
      message: `Password reset for ${official.email}. They will be prompted to set a new password on next login.`,
      resetToken,
    });
  } catch (e: any) {
    logger.error('reset official password:', e.message);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

/** GET /api/admin/audit — recent audit events (admin only). */
router.get('/audit', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const rows = await db.query<{
      id: string; actor_id: string; actor_kind: string; action: string;
      target: string; detail: string; ip: string; created_at: string;
    }>(
      'SELECT id, actor_id, actor_kind, action, target, detail, ip, created_at FROM audit_events ORDER BY created_at DESC LIMIT 50',
    );
    res.json({ events: rows.rows });
  } catch (e: any) {
    logger.error('audit log:', e.message);
    res.status(500).json({ error: 'Failed to load audit log' });
  }
});

export default router;
