/**
 * Voice of Gudalur — Media posts (posters + videos) for "Support the Movement".
 *
 *   GET    /api/media            — public list of active posters & videos (METADATA ONLY)
 *   GET    /api/media/:id/file   — binary payload of a single poster/video
 *   POST   /api/media            — admin upload (multipart: file, kind, title, description)
 *   DELETE /api/media/:id        — admin delete (soft)
 *
 * WHY metadata-only list? The Netlify Functions response payload is capped at
 * ~6 MB. Media is stored as base64 data URLs INSIDE CockroachDB, so returning
 * every file's payload inline blew past that cap ("Function.ResponseSizeTooLarge"
 * → 502) the moment more than a single small poster existed — the frontend then
 * silently showed zero media. The list therefore returns tiny metadata and each
 * file is streamed individually through GET /api/media/:id/file (one item per
 * request, always well under the cap). Uploads are capped at 5 MB so a single
 * item's binary response also stays within the limit.
 *
 * All writes require an ADMIN / PLATFORM_ADMIN session.
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../db/client';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Netlify Functions response ceiling is 6,291,556 bytes. We cap every uploaded
// file at 4.5 MB: base64 inflates 4/3× (→ ~6.0 MB) and the JSON wrapper adds a
// little more, so a single item's response always fits inside the cap.
const MAX_FILE_BYTES = Math.floor(4.5 * 1024 * 1024);

/** True when running inside the Netlify Functions runtime. */
function isNetlify(): boolean {
  return process.env.NETLIFY === 'true' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

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
    const rows = await db.query<MediaRow>(
      `SELECT id, kind, title, description, mime, size_bytes, created_at
       FROM media_posts WHERE active = TRUE ORDER BY created_at DESC`,
    );
    res.json({
      media: rows.rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        description: r.description,
        mime: r.mime,
        sizeBytes: r.size_bytes,
        createdAt: r.created_at,
      })),
    });
  } catch (e: any) {
    logger.error('media list:', e.message);
    res.status(500).json({ error: 'Failed to load media' });
  }
});

/** GET /api/media/:id/file — stream a single media file as binary. */
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const row = await db.queryOne<MediaRow>(
      `SELECT id, kind, title, description, data_url, file_url, mime, size_bytes, created_at
       FROM media_posts WHERE id = $1 AND active = TRUE`,
      [req.params.id],
    );
    if (!row) return res.status(404).json({ error: 'Media not found' });

    // External URL (legacy Storj) → redirect the browser there.
    if (!row.data_url && row.file_url) {
      return res.redirect(302, row.file_url);
    }

    const parsed = parseDataUrl(row.data_url);
    if (!parsed) return res.status(404).json({ error: 'Media payload unavailable' });

    res.setHeader('Content-Type', parsed.mime || row.mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (isNetlify()) {
      // serverless-http stringifies Buffer bodies via Buffer.toString('utf8'),
      // which inflates binary past Netlify's 6 MB response cap. So on Netlify
      // send the payload as a BASE64 STRING plus an internal marker header; the
      // wrapper in netlify/functions/api.ts flips it to isBase64Encoded:true so
      // Netlify serves the decoded bytes back to the browser. Local/dev still
      // sends real binary (our test server decodes nothing).
      res.setHeader('X-VOG-Binary', '1');
      return res.send(parsed.buffer.toString('base64'));
    }

    res.setHeader('Content-Length', String(parsed.buffer.length));
    res.send(parsed.buffer);
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
    if (String(e?.message || '').includes('larger than')) {
      return res.status(400).json({ error: 'File too large. Maximum allowed size is 4.5 MB per file.' });
    }
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