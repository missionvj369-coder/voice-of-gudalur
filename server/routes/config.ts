/**
 * Voice of Gudalur — Config / public-metadata routes.
 *
 * GET /api/config/uidai-keys  — public Aadhaar verification keys (RSA SPKI).
 * GET /api/config/localities  — locality picker options.
 */
import { Router } from 'express';
import { db } from '../db/client';

const router = Router();

router.get('/uidai-keys', async (_req, res) => {
  const row = await db.queryOne<{ value: string }>('SELECT value FROM app_config WHERE key = $1', ['uidai_spki_keys']);
  res.json({ keys: row ? JSON.parse(row.value || '[]') : [] });
});

router.get('/localities', async (_req, res) => {
  const rows = await db.query<{ id: string; name: string; pincode: string; lat: number; lng: number }>(
    'SELECT id, name, pincode, lat, lng FROM locality ORDER BY name',
  );
  res.json({ localities: rows.rows });
});

router.get('/health', async (_req, res) => {
  const ok = await import('../db/client').then((m) => m.ping());
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degraded', db: ok });
});

export default router;
