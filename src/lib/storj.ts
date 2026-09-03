/**
 * storj.ts — Storj object storage client (browser side).
 * Storj DCS is a decentralized, S3-compatible cloud object storage network.
 *
 * Flow:  1. Ask the Express server for a short-lived PRESIGNED PUT URL.
 *        2. Stream the blob DIRECTLY to Storj (media never touches our server).
  *        3. Persist only the permanent public URL via the Express API (CockroachDB).
 *
 * Uploads go to the S3 gateway:    https://gateway.storjshare.io/<bucket>/<key>
 * Public playback uses Linkshare:  https://link.storjshare.io/raw/<access-id>/<bucket>/<key>
 */

export type StorageMediaKind = 'voice' | 'image';

export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  contentType: string;
  expiresIn: number;
}

/** Request a presigned PUT URL for a new object in Storj. */
export async function requestPresignedUpload(
  kind: StorageMediaKind,
  ext: string,
  contentType: string
): Promise<PresignResponse> {
  const params = new URLSearchParams({ type: kind, ext, contentType });
  const res = await fetch(`/api/storage/presign?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || 'Could not reach the object-storage gateway.');
  }
  return res.json();
}

/**
 * Upload a blob/file directly to Storj via the presigned URL.
 * Returns the permanent public URL on success.
 */
export async function uploadToStorj(
  kind: StorageMediaKind,
  blob: Blob,
  ext: string,
  contentType: string
): Promise<string> {
  const { uploadUrl, publicUrl } = await requestPresignedUpload(kind, ext, contentType);
  const put = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
    signal: AbortSignal.timeout(60000),
  });
  if (!put.ok) {
    throw new Error(`Storj upload failed (HTTP ${put.status}). Please retry.`);
  }
  return publicUrl;
}

/** Browser-safe extension + mime resolution for recorded audio. */
export function audioBlobMeta(blob: Blob): { ext: string; contentType: string } {
  if (blob.type.includes('ogg')) return { ext: 'ogg', contentType: 'audio/ogg' };
  if (blob.type.includes('mp4')) return { ext: 'm4a', contentType: 'audio/mp4' };
  if (blob.type.includes('mp3')) return { ext: 'mp3', contentType: 'audio/mpeg' };
  return { ext: 'webm', contentType: 'audio/webm' }; // default: MediaRecorder opus/webm
}