/**
 * VOICE OF GUDALUR — Object Storage API (Netlify Function)
 * -------------------------------------------------------------------
 * Production adapter for the Storj presign endpoint.
 * On the local Express dev server this route lives in server.ts
 * (GET /api/storage/presign). On Netlify it is served here via the
 * /api/storage/* rewrite in netlify.toml.
 *
 * GET /.netlify/functions/storage  →  /api/storage/presign
 *      Query: type=voice|image & ext=webm|jpg & contentType=audio/webm
 *      → { uploadUrl, publicUrl, contentType, expiresIn }
 *
 * The browser uploads the blob DIRECTLY to Storj's S3 gateway using the
 * presigned PUT URL (media never transits our server). Playback uses the
 * permanent Linkshare raw URL persisted in Supabase.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'node:crypto';

// Same configuration contract as server.ts — set these in the Netlify UI
// (Site configuration → Environment variables):
const STORJ_ACCESS_KEY = process.env.STORJ_ACCESS_KEY || process.env.STORJ_ACCESS_KEY_ID || '';
const STORJ_SECRET_ACCESS_KEY = process.env.STORJ_SECRET_ACCESS_KEY || '';
const STORJ_BUCKET = process.env.STORJ_BUCKET || 'voice-of-gudalur';
const STORJ_ENDPOINT = (process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io').replace(/\/+$/, '');
// The Storj gateway always signs in us-east-1, even though storage is globally distributed.
const STORJ_REGION = process.env.STORJ_REGION || 'us-east-1';
// Public anonymous reads go through Storj Linkshare. In the Storj web console:
// Objects → <bucket> → "Create Public Access Link", then set STORJ_PUBLIC_LINK_BASE
// to the generated link. Accepts either form:
//   https://link.storjshare.io/s/<access-id>[/<bucket>]    (console "Copy link")
//   https://link.storjshare.io/raw/<access-id>[/<bucket>]
const STORJ_PUBLIC_LINK_BASE = (process.env.STORJ_PUBLIC_LINK_BASE || '').replace(/\/+$/, '');
// Media tags (<audio>/<img>) need RAW object bytes, not the /s/ viewer page —
// normalize /s/ → /raw/, and strip the bucket name if it was included
// (it is re-appended per-object below).
const STORJ_LINK_PREFIX = STORJ_PUBLIC_LINK_BASE
  ? STORJ_PUBLIC_LINK_BASE
      .replace(/^https:\/\/link\.storjshare\.io\/s\//, 'https://link.storjshare.io/raw/')
      .replace(new RegExp(`/${STORJ_BUCKET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
  : '';

let s3 = null;
if (STORJ_ACCESS_KEY && STORJ_SECRET_ACCESS_KEY) {
  s3 = new S3Client({
    region: STORJ_REGION,
    endpoint: STORJ_ENDPOINT,
    forcePathStyle: true, // Storj gateway is path-style: https://gateway.storjshare.io/<bucket>/<key>
    // Newer AWS SDK v3 defaults append x-amz-checksum-crc32 (of an empty payload) to
    // presigned PUT URLs — Storj's S3 gateway mishandles that. Only checksum when required.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: STORJ_ACCESS_KEY,
      secretAccessKey: STORJ_SECRET_ACCESS_KEY,
    },
  });
}

export async function handler(event) {
  // CORS for the browser client (mirrors voice.js).
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!s3) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Object storage is not configured on this server.' }),
    };
  }

  try {
    const q = event.queryStringParameters || {};
    const type = q.type === 'image' ? 'image' : 'voice';
    const ext =
      String(q.ext || (type === 'image' ? 'jpg' : 'webm'))
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase() || (type === 'image' ? 'jpg' : 'webm');
    const contentType = String(q.contentType || (type === 'image' ? 'image/jpeg' : 'audio/webm'));

    const key = `${type}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    const command = new PutObjectCommand({ Bucket: STORJ_BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutes

    // Public anonymous reads use the Storj Linkshare raw form:
    //   https://link.storjshare.io/raw/<access-id>/<bucket>/<key>
    const publicUrl = STORJ_LINK_PREFIX
      ? `${STORJ_LINK_PREFIX}/${STORJ_BUCKET}/${key}`
      : `https://link.storjshare.io/raw/${STORJ_BUCKET}/${key}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadUrl, publicUrl, contentType, expiresIn: 300 }),
    };
  } catch (err) {
    console.error('[storage] presign error:', err?.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Could not issue an upload URL. Please try again shortly.' }),
    };
  }
}