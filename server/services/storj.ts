/**
 * Voice of Gudalur — Storj S3-compatible object storage for media files.
 *
 * Media is uploaded directly to a Storj bucket; only the object key is stored
 * in CockroachDB. Files are served via presigned URLs (signed with the same
 * credentials used to upload) — this is reliable regardless of the public link
 * grant, which is often misconfigured.
 *
 * Environment:
 *   STORJ_ACCESS_KEY        — S3 access key
 *   STORJ_SECRET_ACCESS_KEY — S3 secret key
 *   STORJ_BUCKET            — bucket name
 *   STORJ_ENDPOINT          — https://gateway.storjshare.io
 *   STORJ_REGION            — us-east-1
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

const ACCESS_KEY = process.env.STORJ_ACCESS_KEY || '';
const SECRET_KEY = process.env.STORJ_SECRET_ACCESS_KEY || '';
const BUCKET = process.env.STORJ_BUCKET || '';
const ENDPOINT = (process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io').replace(/\/+$/, '');
const REGION = process.env.STORJ_REGION || 'us-east-1';

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  if (!ACCESS_KEY || !SECRET_KEY || !BUCKET) {
    throw new Error('[storj] STORJ_ACCESS_KEY, STORJ_SECRET_ACCESS_KEY and STORJ_BUCKET must be set.');
  }
  _client = new S3Client({
    region: REGION,
    endpoint: ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return _client;
}

export function isStorjConfigured(): boolean {
  return !!(ACCESS_KEY && SECRET_KEY && BUCKET);
}

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
 * Generate a presigned GET URL (default 1 hour). This is the reliable way to
 * serve Storj files — signed with the same credentials that uploaded them.
 */
export async function presignGet(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

/** Upload a media buffer to Storj. */
export async function uploadMedia(
  id: string,
  body: Buffer,
  mime: string | null,
): Promise<{ key: string; url: string; size: number }> {
  const key = makeMediaKey(id, mime);
  const contentType = mime || 'application/octet-stream';
  await getClient().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  const url = await presignGet(key);
  logger.info(`[storj] uploaded ${key} (${body.length} bytes)`);
  return { key, url, size: body.length };
}

/** Delete a media object (best-effort). */
export async function deleteMedia(keyOrUrl: string): Promise<void> {
  const key = keyOrUrl.includes('/') && !keyOrUrl.startsWith('media/') ? urlToKey(keyOrUrl) : keyOrUrl;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.info(`[storj] deleted ${key}`);
  } catch (e: any) {
    logger.warn(`[storj] delete ${key}: ${e?.message || e}`);
  }
}

/** Verify the bucket is reachable. */
export async function checkBucket(): Promise<boolean> {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: BUCKET }));
    return true;
  } catch (e: any) {
    logger.error(`[storj] bucket ${BUCKET} not reachable: ${e?.message || e}`);
    return false;
  }
}

/** Convert a stored file_url back to its object key. */
export function urlToKey(url: string): string {
  if (url.startsWith('media/')) return url.split('?')[0];
  const idx = url.lastIndexOf('/media/');
  if (idx >= 0) return url.slice(idx + 1).split('?')[0];
  return url.split('?')[0];
}

/**
 * Build a public, immutable URL from an object key. These URLs are the SAME
 * for every user and never change (until the file changes), so browsers and
 * CDNs can cache them forever. This eliminates per-request presigned URL
 * generation — the #1 scaling bottleneck.
 *
 * Uses STORJ_PUBLIC_LINK_BASE (e.g. https://link.storjshare.io/raw/<access-id>/vog).
 * Returns empty string if not configured.
 *
 * DEFENSIVE NORMALIZATION: Storj's /s/ path is the HTML share-viewer PAGE, not
 * the file. An <img src> pointing at /s/ renders a broken image ("media not
 * found") — this shipped to production once. If the base was configured with
 * /s/, rewrite it to /raw/ (raw file content) here so the code is correct no
 * matter how the environment variable was filled in.
 */
export function getPublicUrl(key: string): string {
  let base = process.env.STORJ_PUBLIC_LINK_BASE;
  if (!base) return '';
  base = base
    .replace(/\/+$/, '')
    // Defensive: a base configured with a trailing "/media" (easy mistake —
    // Storj's share UI copies the full folder link) would double the key's
    // "media/" segment and 404 every file. The key already carries it.
    .replace(/\/media\/?$/i, '')
    .replace('link.storjshare.io/s/', 'link.storjshare.io/raw/');
  return `${base}/${key}`;
}

/**
 * Get the media URL to serve to clients. Prefers the public immutable URL
 * (fast, cacheable) — but ONLY after verifying the public-link grant actually
 * serves files. Falls back to presigned URLs (cached) otherwise.
 *
 * WHY THE PROBE: the public link grant is configured in Storj's UI and can be
 * revoked/misconfigured silently. When it breaks, every public URL returns
 * 401 — which blanked every poster on the live site even with correct /raw/
 * paths. The probe (HEAD on the public URL, result cached in-process for 10
 * minutes) detects that and presigns instead — the scheme that always works
 * since it uses the same credentials that uploaded the file.
 */
export async function getMediaUrl(key: string): Promise<string> {
  const pub = getPublicUrl(key);
  if (pub && (await publicLinkWorks(pub))) return pub;
  return presignCached(key);
}

// In-process state: is the Storj public-link grant actually serving files?
// null = unknown (probed on first request after boot).
let publicLinksHealthy: boolean | null = null;
let publicLinkCheckedAt = 0;
const PUBLIC_LINK_RECHECK_MS = 10 * 60 * 1000;

// Presigned URLs are signed for 60 min; reuse each for 50 min so repeat list
// builds never re-sign. This keeps presigning off the scaling path (one
// presign per media item per hour, not one per viewer per request).
const presignCache = new Map<string, { url: string; exp: number }>();
const PRESIGN_REUSE_MS = 50 * 60 * 1000;

async function publicLinkWorks(pub: string): Promise<boolean> {
  const now = Date.now();
  if (publicLinksHealthy !== null && now - publicLinkCheckedAt < PUBLIC_LINK_RECHECK_MS) {
    return publicLinksHealthy;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(pub, { method: 'HEAD', signal: ctrl.signal });
    clearTimeout(timer);
    publicLinksHealthy = res.ok;
  } catch {
    // Network error / timeout / probe blocked — assume unhealthy and presign.
    publicLinksHealthy = false;
  }
  publicLinkCheckedAt = Date.now();
  logger.info(`[storj] public-link probe: ${publicLinksHealthy ? 'healthy' : 'unhealthy — falling back to presigned URLs'}`);
  return publicLinksHealthy;
}

function presignCached(key: string): Promise<string> {
  const cached = presignCache.get(key);
  if (cached && cached.exp > Date.now()) return Promise.resolve(cached.url);
  return presignGet(key).then((url) => {
    presignCache.set(key, { url, exp: Date.now() + PRESIGN_REUSE_MS });
    return url;
  });
}

/**
 * Bounded, cached probe of the public-link grant. Reused by getMediaUrl() and
 * by the admin-only storage-health diagnostic. Never called per media item —
 * the in-process cache short-circuits for PUBLIC_LINK_RECHECK_MS.
 */
export async function probePublicLink(pub: string): Promise<boolean> {
  return publicLinkWorks(pub);
}

/** Safe diagnostic snapshot — no credentials, no signed URLs, nothing private. */
export function getPublicLinkStatus() {
  const configured = !!process.env.STORJ_PUBLIC_LINK_BASE;
  return {
    publicGrantConfigured: configured,
    publicGrantHealthy: configured ? (publicLinksHealthy === null ? 'unknown' : publicLinksHealthy) : false,
    lastHealthCheckAt: publicLinkCheckedAt ? new Date(publicLinkCheckedAt).toISOString() : null,
    presignedFallbackActive: !(configured && publicLinksHealthy === true),
  };
}

export default {
  isStorjConfigured,
  makeMediaKey,
  uploadMedia,
  deleteMedia,
  checkBucket,
  presignGet,
  urlToKey,
  getPublicUrl,
  getMediaUrl,
  probePublicLink,
  getPublicLinkStatus,
};