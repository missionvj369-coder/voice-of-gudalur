/**
 * Voice of Gudalur — Storj S3-compatible object storage for media files.
 *
 * Media (posters + videos) is uploaded directly to a Storj bucket; only the
 * permanent public URL is stored in CockroachDB. This keeps the database
 * small (base64 blobs are the #1 space consumer) and serves media from a
 * global CDN instead of through the API/Netlify function layer (which has a
 * ~6 MB response cap).
 *
 * Environment (see .env.example):
 *   STORJ_ACCESS_KEY        — S3 access key from a Storj Access Grant
 *   STORJ_SECRET_ACCESS_KEY — S3 secret key
 *   STORJ_BUCKET            — bucket name
 *   STORJ_ENDPOINT          — https://gateway.storjshare.io
 *   STORJ_PUBLIC_LINK_BASE  — public URL prefix, e.g.
 *                             https://link.storjshare.io/s/<access-id>/<bucket>
 *   STORJ_REGION            — us-east-1 (Storj ignores this but SDK requires it)
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const ACCESS_KEY = process.env.STORJ_ACCESS_KEY || '';
const SECRET_KEY = process.env.STORJ_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.STORJ_BUCKET || '';
const ENDPOINT = (process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io').replace(/\/+$/, '');
const PUBLIC_LINK_BASE = (process.env.STORJ_PUBLIC_LINK_BASE || '').replace(/\/+$/, '');
const REGION = process.env.STORJ_REGION || 'us-east-1';

let _client: S3Client | null = null;

/** Lazily build the S3 client (Storj is S3-compatible). */
function getClient(): S3Client {
  if (_client) return _client;
  if (!ACCESS_KEY || !SECRET_KEY || !BUCKET) {
    throw new Error('[storj] STORJ_ACCESS_KEY, STORJ_SECRET_ACCESS_KEY and STORJ_BUCKET must be set.');
  }
  _client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: true, // Storj requires path-style bucket access
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return _client;
}

/** True when Storj is configured (so routes can fall back to DB storage otherwise). */
export function isStorjConfigured(): boolean {
  return !!(ACCESS_KEY && SECRET_KEY && BUCKET);
}

/** Build a unique, collision-resistant object key for a media item. */
export function makeMediaKey(id: string, mime: string | null): string {
  const ext = mimeToExt(mime);
  return `media/${id}${ext}`;
}

function mimeToExt(mime: string | null): string {
  if (!mime) return '';
  if (mime.includes('png')) return '.png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('gif')) return '.gif';
  if (mime.includes('avif')) return '.avif';
  if (mime.includes('mp4')) return '.mp4';
  if (mime.includes('webm')) return '.webm';
  if (mime.includes('quicktime')) return '.mov';
  return '';
}

/**
 * Upload a media buffer to Storj. Returns the public URL that the browser can
 * use directly (no API round-trip). Throws on failure.
 */
export async function uploadMedia(
  id: string,
  body: Buffer,
  mime: string | null,
): Promise<{ key: string; url: string; size: number }> {
  const key = makeMediaKey(id, mime);
  const contentType = mime || 'application/octet-stream';
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  const url = publicUrl(key);
  logger.info(`[storj] uploaded ${key} (${body.length} bytes) → ${url}`);
  return { key, url, size: body.length };
}

/** Delete a media object from Storj (best-effort; logs on failure). */
export async function deleteMedia(keyOrUrl: string): Promise<void> {
  const key = keyOrUrl.includes('/') && !keyOrUrl.startsWith('media/') ? urlToKey(keyOrUrl) : keyOrUrl;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.info(`[storj] deleted ${key}`);
  } catch (e: any) {
    // Object may already be gone — don't fail the delete for that.
    logger.warn(`[storj] delete ${key}: ${e?.message || e}`);
  }
}

/** Verify the bucket is reachable (used by the migration script's preflight). */
export async function checkBucket(): Promise<boolean> {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (e: any) {
    logger.error(`[storj] bucket ${BUCKET} not reachable: ${e?.message || e}`);
    return false;
  }
}

/**
 * Permanent public URL for an object key (browser-ready, no API hop).
 * Uses /raw/ so the browser receives the actual file bytes, not an HTML page.
 * (Storj link /s/ = HTML viewer, /raw/ = raw file content)
 */
export function publicUrl(key: string): string {
  if (PUBLIC_LINK_BASE) {
    // Normalize: /s/ → /raw/ (the /s/ shape returns an HTML viewer page)
    const normalized = PUBLIC_LINK_BASE.includes('/s/')
      ? PUBLIC_LINK_BASE.replace(/\/s\//, '/raw/')
      : PUBLIC_LINK_BASE;
    return `${normalized}/${key}`;
  }
  // Fallback: gateway path-style URL.
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

/** Convert a stored file_url back to its object key (handles both link shapes). */
export function urlToKey(url: string): string {
  // Known public-link base?
  if (PUBLIC_LINK_BASE && url.startsWith(PUBLIC_LINK_BASE)) {
    return url.slice(PUBLIC_LINK_BASE.length + 1); // strip ".../base/"
  }
  // Gateway shape: https://gateway.storjshare.io/<bucket>/media/<id>.ext
  const m = /\/([^/]+\/media\/[^/]+)$/i.exec(url);
  if (m) return m[1];
  // Already a key?
  return url;
}

export default {
  isStorjConfigured,
  makeMediaKey,
  uploadMedia,
  deleteMedia,
  checkBucket,
  publicUrl,
  urlToKey,
};
