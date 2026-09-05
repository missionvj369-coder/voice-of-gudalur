/**
 * Voice of Gudalur — Admin overview routes (dashboard stats + downloadable/shared petition docket).
 *
 *   GET /api/admin/stats   — total registered users, total petitions signed (admin)
 *   GET /api/admin/signs   — every petition signature (hash-ledger) for download/share (admin)
 *
 * Both require ADMIN / PLATFORM_ADMIN session.
 */
import { Router, Request, Response } from 'express';
import { db } from '../db/client';
import { requireAuth, requireRole } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/** GET /api/admin/stats — dashboard headline numbers. */
router.get('/stats', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const [users, signatures, batches] = await Promise.all([
      db.queryOne<{ count: string }>('SELECT COUNT(*)::int AS count FROM users'),
      db.queryOne<{ count: string }>('SELECT COUNT(*)::int AS count FROM petition_signs'),
      db.queryOne<{ batch_no: string }>('SELECT COALESCE(MAX(batch_no), 0) AS batch_no FROM petition_batches'),
    ]);
    // Latest signature hash for the admin glance.
    const latest = await db.queryOne<{ sign_hash: string }>(
      'SELECT sign_hash FROM petition_signs ORDER BY created_at DESC LIMIT 1',
    );
    res.json({
      totalUsers: Number(users?.count ?? 0),
      totalSigns: Number(signatures?.count ?? 0),
      latestBatch: Number(batches?.batch_no ?? 0),
      latestHash: latest?.sign_hash ?? null,
    });
  } catch (e: any) {
    logger.error('admin stats:', e.message);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/** GET /api/admin/signs — the full hash-ledger (petition signatures) for download/share. */
router.get('/signs', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (_req: Request, res: Response) => {
  try {
    const rows = await db.query<{
      sign_hash: string; full_name: string; village: string; phone_last4: string | null;
      aadhaar_last4: string | null; batch_no: number; created_at: string;
    }>(
      `SELECT sign_hash, full_name, village, phone_last4, aadhaar_last4, batch_no, created_at
       FROM petition_signs ORDER BY created_at DESC`,
    );
    res.json({
      signs: rows.rows.map((r) => ({
        hash: r.sign_hash,
        name: r.full_name,
        village: r.village,
        phoneLast4: r.phone_last4,
        aadhaarLast4: r.aadhaar_last4,
        batchNo: r.batch_no,
        signedAt: r.created_at,
        verifyUrl: `/verify-sign?id=${encodeURIComponent(r.sign_hash)}`,
      })),
      total: rows.rowCount,
    });
  } catch (e: any) {
    logger.error('admin signs:', e.message);
    res.status(500).json({ error: 'Failed to load signatures' });
  }
});

export default router;