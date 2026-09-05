/**
 * Voice of Gudalur — Media posts (posters + videos) for "Support the Movement".
 *
 *   GET    /api/media        — public list of active posters & videos
 *   POST   /api/media        — admin upload (multipart: file, kind, title, description)
 *   DELETE /api/media/:id    — admin delete
 *
 * All writes require an ADMIN / PLATFORM_ADMIN session. Media is stored in
 * CockroachDB as a base64 data URL (no external object storage).
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// In-memory storage: the file is read straight into a buffer, base64-encoded
// and saved in the database as a data URL. Limit — posters 8 MB, videos 40 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: (err: Error | null, ok: boolean) => void) => {
    const ok = /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image (png/jpg/webp) or video (mp4/webm) files are accepted.'), false);
  },
});

/** GET /api/media — public list (active only, newest first). */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.query<{
      id: string; kind: string; title: string; description: string | null;
      data_url: string | null; file_url: string | null; mime: string | null;
      created_at: string;
    }>(
      `SELECT id, kind, title, description, data_url, file_url, mime, created_at
       FROM media_posts WHERE active = TRUE ORDER BY created_at DESC`,
    );
    res.json({
      media: rows.rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        description: r.description,
        url: r.data_url || r.file_url,
        mime: r.mime,
        createdAt: r.created_at,
      })),
    });
  } catch (e: any) {
    logger.error('media list:', e.message);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

/** POST /api/media — admin uploads a poster or video. */
router.post('/', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const kind = String(req.body?.kind || 'poster');
    if (!['poster', 'video'].includes(kind)) {
      return res.status(400).json({ error: 'kind must be "poster" or "video"' });
    }
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!req.file) return res.status(400).json({ error: 'A file is required' });

    const dataUrl = `data:${(req.file.mimetype || 'application/octet-stream')};base64,${req.file.buffer.toString('base64')}`;

    const row = await db.queryOne<{ id: string }>(
      `INSERT INTO media_posts (kind, title, description, data_url, mime, size_bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [kind, title, description || null, dataUrl, req.file.mimetype, req.file.size, req.user!.uid],
    );

    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'UPLOAD_MEDIA',
      target: `media_posts/${row?.id ?? ''}`, detail: { kind, title }, ip: req.ip,
    });

    res.status(201).json({ id: row?.id, ok: true, message: `${kind === 'video' ? 'Video' : 'Poster'} published on the public frontend.` });
  } catch (e: any) {
    logger.error('media upload:', e.message);
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

/** DELETE /api/media/:id — admin removes a poster/video (soft delete). */
router.delete('/:id', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      'UPDATE media_posts SET active = FALSE WHERE id = $1 AND active = TRUE',
      [req.params.id],
    );
    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'DELETE_MEDIA',
      target: `media_posts/${req.params.id}`, ip: req.ip,
    });
    res.json({ ok: (result.rowCount ?? 0) > 0 });
  } catch (e: any) {
    logger.error('media delete:', e.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;