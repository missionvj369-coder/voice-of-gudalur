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
 */
export function getPublicUrl(key: string): string {
  const base = process.env.STORJ_PUBLIC_LINK_BASE;
  if (!base) return '';
  return `${base.replace(/\/$/, '')}/${key}`;
}

/**
 * Get the media URL to serve to clients. Prefers the public immutable URL
 * (fast, cacheable). Falls back to a presigned URL only if public links are
 * not configured.
 */
export async function getMediaUrl(key: string): Promise<string> {
  const pub = getPublicUrl(key);
  if (pub) return pub;
  // Fallback: presigned URL (unique per request, not cacheable)
  return presignGet(key);
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
};