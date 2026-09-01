/**
 * VOICE OF GUDALUR — Voice Notification API (Netlify Function)
 * -------------------------------------------------------------------
 * Production adapter for the self-hosted voice notification system.
 * On the local Express dev server these routes live in server.ts
 * (/api/voice/incident, /api/push/*). On Netlify they are served here.
 *
 * Endpoints (rewritten from /api/… via netlify.toml):
 *   POST /.netlify/functions/voice  →  /api/voice/incident
 *        Body: multipart/form-data { audio, type, urgency, locality, lat, lng, description, transcript }
 *        → Uses the client's on-device Whisper transcript when present,
 *          falls back to the self-hosted Whisper server, inserts a
 *          wildlife_incidents row, and sends a Web Push to every
 *          push_subscriptions subscriber.
 *   GET  /.netlify/functions/voice  →  /api/push/public-key
 *        → Returns the VAPID public key for browser subscription.
 *
 * Generate VAPID keys:  npx web-push generate
 */

import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';
import webPush from 'web-push';

// busboy is a dependency of multer (already present in node_modules).
const require = createRequire(import.meta.url);
const busboy = require('busboy');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
// Self-hosted, open-source speech-to-text (Apache-2.0 / MIT stacks:
// faster-whisper-server, speaches, whisper.cpp server — all OpenAI-compatible).
const WHISPER_URL = process.env.WHISPER_URL || '';
const WHISPER_MODEL = process.env.WHISPER_MODEL || 'whisper-small';
const VAPID_PUBLIC = process.env.VITE_PUSH_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.PUSH_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || '';

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  return supabase;
}

if (VAPID_PUBLIC && VAPID_PRIVATE && VAPID_EMAIL) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

/** Parse a multipart/form-data Netlify function event into { fields, files }. */
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body || '');
      const bb = busboy({ headers: { 'content-type': event.headers['content-type'] || 'multipart/form-data' } });

      bb.on('field', (name, val) => { fields[name] = val; });
      bb.on('file', (name, file, info) => {
        const chunks = [];
        file.on('data', (c) => chunks.push(c));
        file.on('end', () => {
          files.push({ name, filename: info.filename, mimeType: info.mimeType, buffer: Buffer.concat(chunks) });
        });
      });
      bb.on('error', reject);
      bb.on('finish', () => resolve({ fields, files }));
      bb.end(raw);
    } catch (e) {
      reject(e);
    }
  });
}

/** Transcribe an audio buffer via the self-hosted Whisper server (resilient on failure). */
async function transcribeAudio(buffer, mimeType) {
  if (!WHISPER_URL || !buffer || buffer.length === 0) return '';
  try {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), 'voice.webm');
    form.append('model', WHISPER_MODEL);
    const res = await fetch(WHISPER_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`Whisper server ${res.status}`);
    const data = await res.json();
    return data.text || '';
  } catch (e) {
    console.error('[voice] transcription failed:', e.message);
    return '';
  }
}

/** Send the web push notification to every subscriber. */
async function broadcastPush({ title, body, incidentId, locality }) {
  let sent = 0, delivered = 0, failed = 0;
  if (!VAPID_PUBLIC) return { sent, delivered, failed };

  const { data: subs, error } = await getSupabase()
    .from('push_subscriptions')
    .select('endpoint, keys_auth, keys_p256dh');

  if (error || !subs) return { sent, delivered, failed };

  for (const sub of subs) {
    sent++;
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
        JSON.stringify({
          title,
          body,
          icon: '/favicon.svg',
          incident_id: incidentId,
          url: `/manifesto#incident-${incidentId}`,
        }),
      );
      delivered++;
    } catch (e) {
      failed++;
      if (e.statusCode === 410 || e.statusCode === 404) {
        await getSupabase().from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  // Audit log (best-effort)
  try {
    await getSupabase().from('push_log').insert({ title, body, sent_to: sent, delivered, failures: failed });
  } catch { /* non-fatal */ }

  return { sent, delivered, failed };
}

export async function handler(event) {
  // CORS for the browser client.
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // ── GET: expose the VAPID public key (/api/push/public-key) ──
  if (event.httpMethod === 'GET') {
    if (!VAPID_PUBLIC) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Push not configured.' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ key: VAPID_PUBLIC }) };
  }

  // ── POST: voice incident intake (/api/voice/incident) ──
  if (event.httpMethod === 'POST') {
    try {
      const { fields, files } = await parseMultipart(event);
      const audio = files.find((f) => f.name === 'audio');

      const type = fields.type || 'human-wildlife';
      const urgency = fields.urgency || 'MEDIUM';
      const locality = fields.locality || 'gudalur';
      const lat = fields.lat ? Number(fields.lat) : null;
      const lng = fields.lng ? Number(fields.lng) : null;

      // 1. Transcript: browser runs Whisper on-device (Transformers.js);
      //    fall back to the self-hosted Whisper server if configured.
      let transcript = (fields.transcript || '').trim();
      if (!transcript && audio) transcript = await transcribeAudio(audio.buffer, audio.mimeType);

      // 2. Insert incident
      const { data: incident, error: insErr } = await getSupabase()
        .from('wildlife_incidents')
        .insert({
          type,
          locality_id: locality,
          generalized_area: locality,
          lat,
          lng,
          urgency,
          reported_by: 'voice-note',
          behavior_notes: transcript || fields.description || 'Voice incident report',
        })
        .select('id, type, urgency')
        .single();

      if (insErr) throw insErr;

      // 3. Broadcast push
      const push = await broadcastPush({
        title: incident.type === 'human-wildlife' ? '🐘 Wildlife Alert' : '🚨 Incident Reported',
        body: transcript || `${incident.type} • ${incident.urgency} in ${locality}`,
        incidentId: incident.id,
        locality,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          incident_id: incident.id,
          transcript: transcript || null,
          push_sent: push.delivered,
          push_total: push.sent,
          push_failed: push.failed,
        }),
      };
    } catch (e) {
      console.error('[voice] handler error:', e);
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message || 'Internal error' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
}