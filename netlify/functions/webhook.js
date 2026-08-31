/**
 * VOICE OF GUDALUR — WhatsApp Voice Intake Webhook (Netlify Function)
 * -------------------------------------------------------------------
 * Endpoint:  https://<site>.netlify.app/.netlify/functions/webhook
 *
 * GET  — Meta webhook verification handshake (hub.challenge echo).
 * POST — Receives WhatsApp messages from the Meta Cloud API and turns
 *        voice notes / text / location pins into wildlife_incidents rows:
 *
 *   1. Verify X-Hub-Signature-256 (HMAC-SHA256 of the raw body with the
 *      Meta App Secret) so only Meta can post here.
 *   2. Deduplicate on the WhatsApp message id (Meta retries deliveries).
 *   3. GATE the sender — only residents whose phone number is registered
 *      (users.gudalur_id) AND who signed the petition (manifesto_signatures)
 *      AND hold an official email docket (manifesto_submissions) are accepted.
 *   4. audio/voice -> download from Graph API -> Groq Whisper transcription
 *      (Tamil / Malayalam / Kannada / English) -> Groq Llama JSON extraction
 *      (animal, herd size, area, urgency, description) -> Supabase insert.
 *   5. Auto-reply to the reporter with the incident reference.
 *
 * Required environment variables (Netlify → Site settings → Environment):
 *   WHATSAPP_VERIFY_TOKEN     handshake secret you type into Meta
 *   WHATSAPP_APP_SECRET       Meta App secret (signature verification)
 *   WHATSAPP_TOKEN            Meta permanent/system user access token
 *   WHATSAPP_PHONE_NUMBER_ID  Meta phone number id (for replies)
 *   GROQ_API_KEY              Groq key (whisper-large-v3-turbo + llama-3.3-70b)
 *   SUPABASE_URL              Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY service-role key (server-only! bypasses RLS)
 */

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_secret_token_123';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || '';
const GRAPH_TOKEN = process.env.WHATSAPP_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const GRAPH_API = 'https://graph.facebook.com/v21.0';
const GROQ_API = 'https://api.groq.com/openai/v1';
const WHISPER_MODEL = 'whisper-large-v3-turbo';
const LLM_MODEL = 'llama-3.3-70b-versatile';

/** Locality registry (kept in sync with src/constants AREAS). */
const AREAS = [
  'Gudalur Town',
  "O'Valley",
  'Nelliyalam',
  'Devarshola',
  'Padanthurai',
  'Thorapalli',
  'Masinagudi',
  'Cherambadi',
  'Pandalur',
  'Other',
];

const json = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** "O'Valley" -> "o-valley" (matches the kebab-case locality ids in master data). */
const slugifyArea = (area) =>
  String(area || 'Other')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'other';

let supabaseClient = null;
function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

/** HMAC-SHA256 signature check — only genuine Meta traffic passes. */
function verifySignature(rawBody, header) {
  if (!APP_SECRET) return true; // not configured yet — allow but Meta console will warn
  if (!header) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody, 'utf8').digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** fetch with a hard deadline so the 10s function limit is never blown by a hang. */
const fetchT = (url, options = {}, ms = 8000) =>
  fetch(url, { ...options, signal: AbortSignal.timeout(ms) });

/** GET — Meta webhook verification handshake. */
function handleVerify(params) {
  const mode = params && params['hub.mode'];
  const token = params && params['hub.verify_token'];
  const challenge = params && params['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return { statusCode: 200, body: challenge };
  }
  return { statusCode: 403, body: 'Forbidden' };
}

/**
 * GATE — only registered residents who signed AND dispatched the official
 * email may file voice reports. Unknown numbers are rejected here.
 */
async function gateSender(sb, phone) {
  const { data: user, error: uErr } = await sb
    .from('users')
    .select('name, gudalur_id')
    .eq('phone', phone)
    .limit(1)
    .maybeSingle();
  if (uErr || !user || !user.gudalur_id) {
    return { ok: false, reason: 'not_registered' };
  }
  const { data: sig } = await sb
    .from('manifesto_signatures')
    .select('id')
    .eq('gudalur_id', user.gudalur_id)
    .limit(1)
    .maybeSingle();
  if (!sig) return { ok: false, reason: 'not_signed' };
  const { data: sub } = await sb
    .from('manifesto_submissions')
    .select('docket_ref')
    .eq('gudalur_id', user.gudalur_id)
    .limit(1)
    .maybeSingle();
  if (!sub) return { ok: false, reason: 'no_docket' };
  return { ok: true, name: user.name || 'Verified Resident', gudalurId: user.gudalur_id };
}

/** POST — receive WhatsApp messages and run the intake pipeline. */
async function handleEvent(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  if (!verifySignature(raw, event.headers && (event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256']))) {
    console.warn('[VOG webhook] invalid signature — rejected');
    return json(401, { error: 'invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return json(400, { error: 'bad json' });
  }

  const sb = getSupabase();
  if (!sb) {
    // Never fail loudly toward Meta — it would retry forever. Log loudly instead.
    console.error('[VOG webhook] Supabase env vars missing — message dropped. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.');
  }

  const entries = (payload && payload.entry) || [];
  let accepted = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value || {};
      const messages = value.messages || [];
      const contactName =
        value.contacts && value.contacts[0] && value.contacts[0].profile
          ? value.contacts[0].profile.name
          : '';
      for (const msg of messages) {
        try {
          const result = await processMessage(sb, msg, contactName);
          if (result) accepted += 1;
        } catch (err) {
          console.error('[VOG webhook] message processing error:', err && err.message);
        }
      }
    }
  }
  return json(200, { received: accepted });
}

/** Routes one WhatsApp message through the intake pipeline. Returns incident id or null. */
async function processMessage(sb, msg, contactName) {
  if (!msg || !msg.id || !msg.from) return null;

  if (!sb) return null;

  // Dedupe — Meta retries deliveries; the message id is the natural key.
  const { data: existing } = await sb
    .from('wildlife_incidents')
    .select('id')
    .eq('source_ref', msg.id)
    .limit(1)
    .maybeSingle();
  if (existing) return null;

  const phone = String(msg.from);
  const gate = await gateSender(sb, phone);
  if (!gate.ok) {
    console.warn(`[VOG webhook] rejected ${phone.slice(-4)}: ${gate.reason}`);
    await sendReply(
      phone,
      gate.reason === 'not_registered'
        ? 'This voice desk is reserved for verified residents of the Voice of Gudalur movement. Register your Gudalur Resident ID at https://voiceofgudalur.org first.'
        : 'Voice reports are open only to residents who signed the Right to Life petition and sent the official email. Complete those steps on https://voiceofgudalur.org, then try again.'
    );
    return null;
  }

  const msgType = msg.type;
  if (msgType === 'audio' || msgType === 'voice') {
    return processVoice(sb, msg, gate, contactName);
  }
  if (msgType === 'location') {
    return processLocation(sb, msg, gate);
  }
  if (msgType === 'text' && msg.text && msg.text.body) {
    return processText(sb, msg, gate, msg.text.body);
  }
  // Unsupported type — acknowledge politely, do not store.
  await sendReply(
    phone,
    'Thanks! This desk currently accepts voice notes, text descriptions, and location pins about wildlife movement.'
  );
  return null;
}

/** Downloads the voice media bytes from the WhatsApp Graph API. */
async function downloadMedia(mediaId) {
  if (!GRAPH_TOKEN) throw new Error('WHATSAPP_TOKEN not configured');
  const meta = await fetchT(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${GRAPH_TOKEN}` },
  }).then((r) => r.json());
  if (!meta || !meta.url) throw new Error('media metadata unavailable');
  const res = await fetchT(meta.url, {
    headers: { Authorization: `Bearer ${GRAPH_TOKEN}` },
  }, 9000);
  if (!res.ok) throw new Error(`media download failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/** Groq Whisper transcription — handles Tamil, Malayalam, Kannada, English. */
async function transcribeGroq(buffer) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'audio/ogg' }), 'voice.ogg');
  form.append('model', WHISPER_MODEL);
  form.append('response_format', 'json');
  const res = await fetchT(`${GROQ_API}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  }, 9000);
  if (!res.ok) throw new Error(`transcription failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data && data.text ? data.text : '').trim();
}

/** Groq Llama extraction — turns free-form speech into a structured incident. */
async function extractIncident(text) {
  if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
  const system = [
    'You are the intake officer for the Voice of Gudalur wildlife alert network (Gudalur, The Nilgiris, Tamil Nadu).',
    'Extract a JSON object from the citizen report (which may be Tamil, Malayalam, Kannada or English).',
    'Schema: {"animal_type": one of ELEPHANT|TIGER|LEOPARD|SLOTH_BEAR|GAUR|WILD_DOG|OTHER,',
    ' "herd_size": integer>=1, "area": one of ' + JSON.stringify(AREAS) + ',',
    ' "location_description": short English summary of the place mentioned,',
    ' "urgency": one of CRITICAL|HIGH|MEDIUM|LOW, "mentioned_time": when it happened or "now"}',
    'Rules: choose the closest area from the list; never invent facts; default herd_size=1, urgency=MEDIUM, area="Other".',
    'Reply with ONLY the JSON object.',
  ].join('\n');
  const res = await fetchT(`${GROQ_API}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    }),
  }, 9000);
  if (!res.ok) throw new Error(`extraction failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '{}';
  let parsed = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const animal = String(parsed.animal_type || 'OTHER').toUpperCase();
  const ANIMALS = ['ELEPHANT', 'TIGER', 'LEOPARD', 'SLOTH_BEAR', 'GAUR', 'WILD_DOG', 'OTHER'];
  const area = AREAS.includes(parsed.area) ? parsed.area : 'Other';
  const urgency = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(parsed.urgency)
    ? parsed.urgency
    : 'MEDIUM';
  return {
    animal_type: ANIMALS.includes(animal) ? animal : 'OTHER',
    herd_size: Number(parsed.herd_size) > 0 ? Math.floor(Number(parsed.herd_size)) : 1,
    area,
    location_description: String(parsed.location_description || '').slice(0, 400),
    urgency,
    mentioned_time: String(parsed.mentioned_time || 'now').slice(0, 120),
  };
}

/** Inserts the incident row; tolerates databases without the intake columns yet. */
async function insertIncident(sb, row) {
  const attempt = async (r) => {
    const { data, error } = await sb.from('wildlife_incidents').insert(r).select('id').single();
    if (error) throw error;
    return data.id;
  };
  try {
    return await attempt(row);
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (/source_ref|transcript|reporter_phone|column/i.test(msg)) {
      const { source_ref, transcript, reporter_phone, ...core } = row;
      return await attempt(core);
    }
    throw err;
  }
}

/** Builds the standard incident row shared by all intake paths. */
function buildRow(msg, gate, fields) {
  const now = new Date().toISOString();
  return {
    id: 'wa_' + msg.id,
    type: fields.animal_type,
    locality_id: slugifyArea(fields.area),
    generalized_area: fields.area,
    lat: fields.lat ?? null,
    lng: fields.lng ?? null,
    urgency: fields.urgency || 'MEDIUM',
    reported_by: `${gate.name} (${gate.gudalurId})`,
    verified_by_forest_dept: false,
    timestamp: now,
    media_url: null,
    behavior_notes: fields.notes,
    herd_size: fields.herd_size || 1,
    source_ref: msg.id,
    transcript: fields.transcript || null,
    reporter_phone: String(msg.from || ''),
  };
}

/** Voice note -> Whisper -> Llama -> incident. */
async function processVoice(sb, msg, gate, contactName) {
  const mediaId = msg.audio ? msg.audio.id : msg.voice.id;
  const buffer = await downloadMedia(mediaId);
  const transcript = await transcribeGroq(buffer);
  if (!transcript) throw new Error('empty transcript');
  const info = await extractIncident(transcript);
  const notes = `Voice report${contactName ? ` from ${contactName}` : ''}: "${transcript}"${
    info.location_description ? ` — ${info.location_description}` : ''
  } (time mentioned: ${info.mentioned_time})`;
  const row = buildRow(msg, gate, { ...info, notes, transcript });
  const incidentId = await insertIncident(sb, row);
  await sendReply(
    msg.from,
    `🚨 Wildlife report received and published to the Voice of Gudalur live alert network.\n\n` +
      `Incident: ${incidentId}\nAnimal: ${info.animal_type.replace('_', ' ')}\nArea: ${info.area}\nUrgency: ${info.urgency}\n\n` +
      `Thank you, ${gate.name}. Verified residents protecting Gudalur together. 🇮🇳`
  );
  return incidentId;
}

/** Location pin -> immediate incident (asks the reporter to describe the animal). */
async function processLocation(sb, msg, gate) {
  const loc = msg.location || {};
  const row = buildRow(msg, gate, {
    animal_type: 'OTHER',
    area: 'Other',
    urgency: 'HIGH',
    herd_size: 1,
    lat: typeof loc.latitude === 'number' ? loc.latitude : null,
    lng: typeof loc.longitude === 'number' ? loc.longitude : null,
    notes: `Location pin shared via WhatsApp${loc.address ? `: ${loc.address}` : ''}. Awaiting voice description.`,
    transcript: null,
  });
  const incidentId = await insertIncident(sb, row);
  await sendReply(
    msg.from,
    `📍 Location received (${incidentId}). Please send a short voice note describing which animal you saw and what it was doing — that completes the alert.`
  );
  return incidentId;
}

/** Text description -> same Llama extraction path as voice. */
async function processText(sb, msg, gate, body) {
  const info = await extractIncident(body);
  const row = buildRow(msg, gate, {
    ...info,
    notes: `Text report: "${body}"${info.location_description ? ` — ${info.location_description}` : ''}`,
    transcript: body,
  });
  const incidentId = await insertIncident(sb, row);
  await sendReply(
    msg.from,
    `✅ Report recorded (${incidentId}). ${info.animal_type.replace('_', ' ')} — ${info.area} — urgency ${info.urgency}. It is now live on the Voice of Gudalur alert network.`
  );
  return incidentId;
}

/** Auto-reply through the Cloud API (silently skipped when unconfigured). */
async function sendReply(to, body) {
  if (!GRAPH_TOKEN || !PHONE_NUMBER_ID) return;
  try {
    await fetchT(`${GRAPH_API}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${GRAPH_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    }, 6000);
  } catch (err) {
    console.error('[VOG webhook] reply failed:', err && err.message);
  }
}

/** Netlify Function entrypoint (ESM handler export — package "type": "module"). */
export const handler = async (event) => {
  try {
    if (event.httpMethod === 'GET') {
      return handleVerify(event.queryStringParameters);
    }
    if (event.httpMethod === 'POST') {
      return await handleEvent(event);
    }
    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('[VOG webhook] fatal:', err);
    // 200 keeps Meta from retry-storming; the error is logged for Netlify Functions preview.
    return json(200, { received: 0, error: 'internal' });
  }
};
