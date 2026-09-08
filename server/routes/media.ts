/**
 * Voice of Gudalur — Media posts (posters + videos) for "Support the Movement".
 *
 *   GET    /api/media            — public list of active posters & videos (METADATA ONLY)
 *   GET    /api/media/:id/file   — redirect to the media URL (Storj) or stream from DB
 *   POST   /api/media            — admin upload (multipart: file, kind, title, description)
 *   DELETE /api/media/:id        — admin delete (soft)
 *
 * STORAGE MODEL (migrated from base64-in-DB to Storj object storage):
 *   - When STORJ_* env is configured, uploads go straight to Storj and the row
 *     stores only `file_url` (the permanent public link). `data_url` stays NULL,
 *     which keeps CockroachDB small — base64 blobs were the #1 space consumer.
 *     GET /:id/file issues a 302 redirect to the Storj URL so media never
 *     transits the API/Netlify function layer (which has a ~6 MB response cap).
 *   - When Storj is NOT configured (legacy/dev), uploads are stored as base64
 *     data URLs in the DB and served as before. The migration script
 *     (scripts/migrate-media-to-storj.ts) converts existing rows in place.
 *   - Both paths coexist: a row with `file_url` is served by redirect, a row
 *     with only `data_url` is streamed from the DB. This means migration can
 *     run gradually without downtime.
 *
 * All writes require an ADMIN / PLATFORM_ADMIN session.
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';
import storj from '../services/storj';
import { cacheWrap, cacheDel } from '../utils/ttlCache';

// Public media list is fetched on every page load + by the AI greeter. Cache
// it (metadata + presigned URLs) so a crowd hits the DB/Storj once per window.
const MEDIA_LIST_TTL_MS = 10 * 1000;
const MEDIA_LIST_KEY = 'media:list';

const router = Router();

const MAX_FILE_BYTES = Math.floor(4.5 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: (err: Error | null, ok: boolean) => void) => {
    const ok = /^image\/(png|jpe?g|webp|gif|avif)$/.test(file.mimetype) || /^video\/(mp4|webm|quicktime)$/.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image (png/jpg/webp) or video (mp4/webm) files are accepted.'), false);
  },
});

interface MediaRow {
  id: string;
  kind: string;
  title: string;
  description: string | null;
  data_url: string | null;
  file_url: string | null;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
}

/** Parse `data:<mime>;base64,<payload>` → { mime, buffer } or null. */
function parseDataUrl(dataUrl: string | null): { mime: string; buffer: Buffer } | null {
  if (!dataUrl) return null;
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  if (m[2]) return { mime, buffer: Buffer.from(m[3], 'base64') };
  return { mime, buffer: Buffer.from(m[3], 'utf8') };
}

/** GET /api/media — metadata ONLY (no payloads), newest first. */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const payload = await cacheWrap(MEDIA_LIST_KEY, MEDIA_LIST_TTL_MS, async () => {
      const rows = await db.query<MediaRow>(
        `SELECT id, kind, title, description, mime, size_bytes, file_url, created_at
         FROM media_posts WHERE active = TRUE ORDER BY created_at DESC`,
      );
      // For Storj-hosted items, generate a fresh presigned URL (the public link
      // grant is often misconfigured → 401, but presigned URLs always work).
      const media: Array<Record<string, unknown>> = [];
      for (const r of rows.rows) {
        let url: string;
        if (r.file_url && storj.isStorjConfigured()) {
          try {
            const key = storj.urlToKey(r.file_url);
            url = await storj.presignGet(key);
          } catch {
            url = r.file_url; // fall back to stored URL
          }
        } else {
          url = r.file_url || `/api/media/${encodeURIComponent(r.id)}/file`;
        }
        media.push({
          id: r.id, kind: r.kind, title: r.title, description: r.description,
          mime: r.mime, sizeBytes: r.size_bytes, url, createdAt: r.created_at,
        });
      }
      return { media };
    });
    res.json(payload);
  } catch (e: any) {
    logger.error('media list:', e.message);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

/** GET /api/media/:id/file — serve one media file. */
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const row = await db.queryOne<MediaRow>(
      `SELECT id, kind, title, description, data_url, file_url, mime, size_bytes, created_at
       FROM media_posts WHERE id = $1 AND active = TRUE`,
      [req.params.id],
    );
    if (!row) return res.status(404).json({ error: 'Media not found' });

    // Storj-hosted: redirect to a fresh presigned URL (reliable, no 401).
    if (row.file_url && storj.isStorjConfigured()) {
      try {
        const key = storj.urlToKey(row.file_url);
        const signed = await storj.presignGet(key);
        return res.redirect(302, signed);
      } catch (e: any) {
        logger.warn(`media file presign failed for ${req.params.id}: ${e?.message}`);
        // fall through to legacy handling
      }
    }

    // Legacy DB-hosted (base64 data URL) — stream it directly.
    if (row.data_url) {
      const parsed = parseDataUrl(row.data_url);
      if (!parsed) return res.status(404).json({ error: 'Media payload unavailable' });
      res.setHeader('Content-Type', parsed.mime || row.mime || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Length', String(parsed.buffer.length));
      return res.send(parsed.buffer);
    }

    return res.status(404).json({ error: 'Media payload unavailable' });
  } catch (e: any) {
    logger.error('media file:', e.message);
    res.status(500).json({ error: 'Failed to load media file' });
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

    // Insert the row first to get an id, then decide storage.
    const created = await db.queryOne<{ id: string }>(
      `INSERT INTO media_posts (kind, title, description, data_url, file_url, mime, size_bytes, created_by)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, $6) RETURNING id`,
      [kind, title, description || null, req.file.mimetype, req.file.size, req.user!.uid],
    );
    const id = created?.id;
    if (!id) return res.status(500).json({ error: 'Failed to create media record' });

    if (storj.isStorjConfigured()) {
      // Upload to Storj and store the public link. No base64 in the DB.
      try {
        const { url, size } = await storj.uploadMedia(id, req.file.buffer, req.file.mimetype);
        await db.query(
          'UPDATE media_posts SET file_url = $1, size_bytes = $2 WHERE id = $3',
          [url, size, id],
        );
      } catch (e: any) {
        // Roll back the row so we don't leave an orphan.
        await db.query('DELETE FROM media_posts WHERE id = $1', [id]);
        logger.error('media upload (storj):', e.message);
        return res.status(502).json({ error: `Upload to object storage failed: ${e?.message || e}` });
      }
    } else {
      // Legacy path: store as base64 data URL in the DB.
      const dataUrl = `data:${(req.file.mimetype || 'application/octet-stream')};base64,${req.file.buffer.toString('base64')}`;
      await db.query(
        'UPDATE media_posts SET data_url = $1 WHERE id = $2',
        [dataUrl, id],
      );
    }

    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'UPLOAD_MEDIA',
      target: `media_posts/${id}`, detail: { kind, title, storj: storj.isStorjConfigured() }, ip: req.ip,
    });

    // New media is public — invalidate the cached list so the AI greeter and
    // the "new poster/video" notice see it immediately.
    cacheDel(MEDIA_LIST_KEY);

    res.status(201).json({ id, ok: true, message: `${kind === 'video' ? 'Video' : 'Poster'} published on the public frontend.` });
  } catch (e: any) {
    logger.error('media upload:', e.message);
    if (String(e?.message || '').includes('larger than')) {
      return res.status(400).json({ error: 'File too large. Maximum allowed size is 4.5 MB per file.' });
    }
    res.status(500).json({ error: e.message || 'Upload failed' });
  }
});

/** DELETE /api/media/:id — admin removes a poster/video (soft delete). */
router.delete('/:id', requireAuth, requireRole('ADMIN', 'PLATFORM_ADMIN'), async (req: Request, res: Response) => {
  try {
    const row = await db.queryOne<{ file_url: string | null }>(
      'SELECT file_url FROM media_posts WHERE id = $1 AND active = TRUE',
      [req.params.id],
    );
    // Best-effort Storj cleanup (idempotent — safe if already gone).
    if (row?.file_url) {
      await storj.deleteMedia(row.file_url).catch(() => {});
    }
    const result = await db.query(
      'UPDATE media_posts SET active = FALSE WHERE id = $1 AND active = TRUE',
      [req.params.id],
    );
    await logAudit({
      actorId: req.user!.uid, actorKind: 'user', action: 'DELETE_MEDIA',
      target: `media_posts/${req.params.id}`, ip: req.ip,
    });
    cacheDel(MEDIA_LIST_KEY);
    res.json({ ok: (result.rowCount ?? 0) > 0 });
  } catch (e: any) {
    logger.error('media delete:', e.message);
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;