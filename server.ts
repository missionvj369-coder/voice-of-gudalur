import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy initialization for Gemini AI
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }
  return geminiClient;
}

// In-memory cache for weather snapshot
let weatherCache: { data: any; timestamp: number } | null = null;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://voiceofgudalur.space; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "media-src 'self' blob: https: data:; " +
      "frame-src 'self' blob:; " +
      "connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://air-quality-api.open-meteo.com https://gateway.storjshare.io; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Health route
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      system: 'VOICE OF GUDALUR Living Intelligence Platform', 
      version: '2.0.0-production' 
    });
  });

  // Weather & Environmental Ingestion API (Gudalur, Nilgiris: 11.5034Â° N, 76.4925Â° E)
  app.get('/api/weather', async (req, res) => {
    try {
      const now = Date.now();
      if (weatherCache && now - weatherCache.timestamp < 1000 * 60 * 15) {
        return res.json(weatherCache.data);
      }

      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=11.5034&longitude=76.4925&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,uv_index&timezone=Asia%2FKolkata';
      const aqiUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=11.5034&longitude=76.4925&current=european_aqi,pm2_5,pm10';

      const [weatherRes, aqiRes] = await Promise.allSettled([
        axios.get(weatherUrl, { timeout: 4000 }),
        axios.get(aqiUrl, { timeout: 4000 })
      ]);

      let temp = 21.5;
      let code = 2;
      let humidity = 78;
      let windSpeed = 8.2;
      let rainProbability = 15;
      let uv = 6.2;
      let aqi = 24; // Nilgiris clean mountain air

      if (weatherRes.status === 'fulfilled' && weatherRes.value.data?.current) {
        const cur = weatherRes.value.data.current;
        temp = Math.round(cur.temperature_2m * 10) / 10;
        code = cur.weather_code || 0;
        humidity = cur.relative_humidity_2m || 75;
        windSpeed = Math.round(cur.wind_speed_10m * 10) / 10;
        if (weatherRes.value.data.hourly?.precipitation_probability?.[0]) {
          rainProbability = weatherRes.value.data.hourly.precipitation_probability[0];
        }
      }

      if (aqiRes.status === 'fulfilled' && aqiRes.value.data?.current) {
        aqi = Math.round(aqiRes.value.data.current.european_aqi || aqiRes.value.data.current.pm2_5 || 24);
      }

      const payload = {
        temp,
        code,
        aqi,
        uv,
        humidity,
        windSpeed,
        rainProbability,
        location: 'Gudalur Taluk (Nilgiris Western Plateau)',
        altitudeMeters: 1000,
        timestamp: now
      };

      weatherCache = { data: payload, timestamp: now };
      res.json(payload);
    } catch (err: any) {
      console.warn('OpenMeteo weather fetch error, returning Nilgiris standard baseline:', err?.message);
      res.json({
        temp: 22.0,
        code: 1,
        aqi: 22,
        uv: 5.5,
        humidity: 80,
        windSpeed: 7.5,
        rainProbability: 20,
        location: 'Gudalur, The Nilgiris',
        timestamp: Date.now()
      });
    }
  });

  // AI Civic Guide & Crop Doctor API
  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, lang = 'en', category = 'general' } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message query is required' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          reply: lang === 'ta' 
            ? 'à®•à¯‚à®Ÿà®²à¯‚à®°à¯ à®¤à®•à®µà®²à¯ à®®à¯ˆà®¯à®®à¯: à®•à¯‚à®Ÿà®²à¯‚à®°à¯ à®¨à®•à®°à®¾à®Ÿà¯à®šà®¿ à®®à®±à¯à®±à¯à®®à¯ à®¨à¯€à®²à®•à®¿à®°à®¿ à®®à®¾à®µà®Ÿà¯à®Ÿ à®…à®°à®šà¯ à®•à¯à®±à¯ˆà®¤à¯€à®°à¯à®ªà¯à®ªà¯ à®Žà®£à¯: 1100 (à®®à¯à®¤à®²à¯à®µà®°à®¿à®©à¯ à®®à¯à®•à®µà®°à®¿), à®®à®¿à®©à¯à®¤à¯à®±à¯ˆ à®‰à®¤à®µà®¿ à®Žà®£à¯: 94987 94987, à®µà®©à®¤à¯à®¤à¯à®±à¯ˆ à®…à®µà®šà®° à®Žà®£à¯: 1800 425 6100.'
            : 'VOICE OF GUDALUR Civic Navigator: For urgent civic grievances use CM Helpline 1100, TNEB Minnal 94987 94987, and Gudalur Forest Division 1800 425 6100. Localities SS Nagar, First Mile, Kasimvayal, and Thorapalli are connected.'
        });
      }

      const ai = getGeminiClient();
      const langContext = lang === 'ta' ? 'Tamil' : lang === 'ml' ? 'Malayalam' : 'English';
      
      const systemInstruction = `
You are VOICE OF GUDALUR's official AI Civic Navigator and Agricultural Advisor for Gudalur Taluk, The Nilgiris, Tamil Nadu.
Context:
- Geographic domain: Gudalur Municipality, Nelliyalam, Devala, O'Valley, Thorapalli, Kasimvayal, SS Nagar, First Mile, Second Mile, Vedanvayal, Chembala, Nandatti.
- Neighboring regions: Mudumalai Tiger Reserve, Wayanad (Kerala), Bandipur (Karnataka), Ooty (Nilgiris).
- Key crops: Tea, cardamom, black pepper, ginger, coffee, areca nut, vegetables.
- Official Grievance systems: Mudhalvarin Mugavari (CM Helpline 1100), TANGEDCO Minnal (94987 94987), Gudalur Forest Wildlife Rapid Response Team (1800 425 6100 / 04262-261262), Gudalur Municipality Office (04262-261234).
- Night traffic rule: Mudumalai & Bandipur Tiger Reserve roads close between 9:00 PM and 6:00 AM.

Role:
1. Provide accurate, clear, and grounded guidance on local civic procedures, bus connectivity, road safety, and government channels.
2. For crop diseases (tea blister blight, ginger soft rot, pepper quick wilt): offer practical organic/IPM mitigation suitable for Nilgiris high-rainfall conditions.
3. Be respectful, authoritative, civic-minded, and non-defamatory.
4. Respond in ${langContext}. Keep answers structured with bullet points where appropriate.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: message,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ reply: response.text || 'Information updated.' });
    } catch (error: any) {
      console.error('Gemini Server Error:', error);
      res.status(500).json({ 
        error: 'Unable to connect to AI Navigator right now.',
        fallback: 'For emergency assistance in Gudalur, please contact 108 (Ambulance), 100 (Police), or 1800 425 6100 (Forest Squad).'
      });
    }
  });

  // Simulated Alert Broadcast endpoint
  app.post('/api/alerts/broadcast', async (req, res) => {
    const { alert, affectedLocalities } = req.body;
    console.log(`[VOICE OF GUDALUR Alert Broadcast] "${alert?.title || 'Alert'}" dispatched to localities:`, affectedLocalities);
    res.json({ success: true, dispatchedAt: Date.now() });
    });

  // ────────────────────────────────────────────────────────────────
  // SELF-HOSTED VOICE NOTIFICATION SYSTEM
  // ────────────────────────────────────────────────────────────────

  // Supabase admin client (service_role for server-side writes / reads)
  const supabaseAdmin = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  );

  // Configure Web Push — VAPID keys generated once via `npx web-push generate`
  if (process.env.PUSH_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webPush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.VITE_PUSH_PUBLIC_KEY || '',
      process.env.PUSH_PRIVATE_KEY,
    );
    console.log('[VOICE] Web Push configured.');
  } else {
    console.warn('[VOICE] PUSH_PRIVATE_KEY not set — push notifications disabled.');
  }

  // Multer: parse multipart/form-data (audio uploads)
  const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: express.Request, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) => {
      if (file.mimetype.startsWith('audio/')) cb(null, true);
      else cb(new Error('Only audio files accepted.'), false);
    },
  });

  // GET VAPID public key (browser needs this to subscribe)
  app.get('/api/push/public-key', (_req, res) => {
    const key = process.env.VITE_PUSH_PUBLIC_KEY;
    if (!key) return res.status(503).json({ error: 'Push not configured.' });
    res.json({ key });
  });

  // POST browser push subscription to Supabase
  app.post('/api/push/subscribe', express.json(), async (req, res) => {
    const { endpoint, keys, userAgent, localityId } = req.body;
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({ error: 'endpoint + keys required' });
    }
    const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
      endpoint,
      keys_auth: keys.auth,
      keys_p256dh: keys.p256dh,
      user_agent: userAgent || null,
      locality_id: localityId || null,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'endpoint' });
    if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
  });

  // POST /api/voice/incident — receive audio, transcribe via Gemini, store + broadcast
  app.post('/api/voice/incident', upload.single('audio'), async (req, res) => {
    try {
      const { type, urgency, locality, lat, lng, description, durationMs } = req.body;
      // 1. Transcribe audio with Gemini
      let transcript = '';
      if (req.file) {
        const b64 = req.file.buffer.toString('base64');
        const ai = getGeminiClient();
        const prompt = type === 'human-wildlife'
          ? 'Transcribe this wildlife incident voice report. Output ONLY a JSON object: {"description":"...","animal_type":"...","location":"...","urgency":"..."}'
          : 'Transcribe this incident voice report. Output ONLY JSON: {"description":"...","urgency":"..."}';
        const gen = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: req.file.mimetype || 'audio/webm', data: b64 } }] }],
          config: { temperature: 0.3, maxOutputTokens: 512 },
        });
        try { transcript = JSON.parse(gen.text || '{}').description || gen.text || ''; }
        catch { transcript = gen.text || ''; }
      }

      // 2. Insert into wildlife_incidents
      const { data: incident, error: insErr } = await supabaseAdmin
        .from('wildlife_incidents')
        .insert({
          type: type || 'human-wildlife',
          locality_id: locality || 'gudalur-town',
          generalized_area: locality || 'Gudalur',
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          urgency: urgency || 'MEDIUM',
          reported_by: 'voice-note',
          behavior_notes: transcript || description || 'Voice incident report',
        })
        .select('id, type, urgency, locality_id, generalized_area')
        .single();
      if (insErr) throw insErr;

      // 3. Fetch all subscriptions + send push
      let delivered = 0, sent = 0, failed = 0;
      const { data: subs } = await supabaseAdmin.from('push_subscriptions')
        .select('endpoint, keys_auth, keys_p256dh');
      const pubKey = process.env.VITE_PUSH_PUBLIC_KEY;
      if (subs && pubKey) {
        const title = incident.type === 'human-wildlife' ? '🐘 Wildlife Alert' : '🚨 Incident Reported';
        const body = transcript || `${incident.type} • ${incident.urgency} in ${locality || 'Gudalur'}`;
        for (const sub of subs) {
          sent++;
          try {
            await webPush.sendNotification(
              { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
              JSON.stringify({ title, body, icon: '/favicon.svg', incident_id: incident.id, url: `/manifesto#incident-${incident.id}` }),
            );
            delivered++;
          } catch (e) {
            failed++;
            if ((e as any).statusCode === 410 || (e as any).statusCode === 404) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
          }
        }
        await supabaseAdmin.from('push_log').insert({ title, body, sent_to: sent, delivered, failures: failed });
      }

      res.json({ success: true, incident_id: incident.id, transcript: transcript || null, push_sent: delivered, push_total: sent, push_failed: failed });
      console.log(`[Voice] ${incident.id} — "${transcript?.slice(0, 60) || '(no transcript)'}" — push ${delivered}/${sent}`);
    } catch (err: any) {
      console.error('[Voice] Error:', err.message);
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // Enhanced alert broadcast (now also sends push)
  app.post('/api/alerts/broadcast-enhanced', async (req, res) => {
    const { title, body, locality, url } = req.body;
    let delivered = 0, sent = 0;
    const pubKey = process.env.VITE_PUSH_PUBLIC_KEY;
    if (pubKey) {
      let q = supabaseAdmin.from('push_subscriptions').select('endpoint, keys_auth, keys_p256dh, locality_id');
      if (locality) q = q.eq('locality_id', locality);
      const { data: subs } = await q;
      if (subs) {
        for (const sub of subs) {
          sent++;
          try {
            await webPush.sendNotification(
              { endpoint: sub.endpoint, keys: { auth: sub.keys_auth, p256dh: sub.keys_p256dh } },
              JSON.stringify({ title: title || 'Gudalur Alert', body: body || '', icon: '/favicon.svg', url: url || '/manifesto' }),
            );
            delivered++;
          } catch {}
        }
      }
    }
    res.json({ success: true, push_sent: delivered, push_total: sent });
  });

// ────────────────────────────────────────────────────────────────
  // STORJ OBJECT STORAGE — presigned browser uploads (S3-compatible)
  // (community voice recordings + verified sighting photo evidence)
  // ────────────────────────────────────────────────────────────────

  const STORJ_ACCESS_KEY = process.env.STORJ_ACCESS_KEY || process.env.STORJ_ACCESS_KEY_ID || '';
  const STORJ_SECRET_ACCESS_KEY = process.env.STORJ_SECRET_ACCESS_KEY || '';
  const STORJ_BUCKET = process.env.STORJ_BUCKET || 'voice-of-gudalur';
  const STORJ_ENDPOINT = (process.env.STORJ_ENDPOINT || 'https://gateway.storjshare.io').replace(/\/+$/, '');
  // The Storj gateway always signs in us-east-1, even though storage is globally distributed.
  const STORJ_REGION = process.env.STORJ_REGION || 'us-east-1';
  // Public anonymous reads go through Storj Linkshare. In the Storj web console:
  // Objects -> <bucket> -> "Create Public Access Link", then set STORJ_PUBLIC_LINK_BASE
  // to the generated link. Accepts either form:
  //   https://link.storjshare.io/s/<access-id>[/<bucket>]    (console "Copy link")
  //   https://link.storjshare.io/raw/<access-id>[/<bucket>]
  const STORJ_PUBLIC_LINK_BASE = (process.env.STORJ_PUBLIC_LINK_BASE || '').replace(/\/+$/, '');
  // Media tags (<audio>/<img>) need RAW object bytes, not the /s/ viewer page —
  // normalize /s/ -> /raw/, and strip the bucket name if the user included it
  // (it is re-appended per-object below).
  const STORJ_LINK_PREFIX = STORJ_PUBLIC_LINK_BASE
    ? STORJ_PUBLIC_LINK_BASE
        .replace(/^https:\/\/link\.storjshare\.io\/s\//, 'https://link.storjshare.io/raw/')
        .replace(new RegExp(`/${STORJ_BUCKET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '')
    : '';

  const storjConfigured = Boolean(STORJ_ACCESS_KEY && STORJ_SECRET_ACCESS_KEY);
  let storageClient: S3Client | null = null;
  if (storjConfigured) {
    storageClient = new S3Client({
      region: STORJ_REGION,
      endpoint: STORJ_ENDPOINT,
      forcePathStyle: true,   // Storj gateway is path-style: https://gateway.storjshare.io/<bucket>/<key>
      // Newer AWS SDK v3 defaults append x-amz-checksum-crc32 (of an empty payload) to
      // presigned PUT URLs — Storj's S3 gateway mishandles that. Only checksum when required.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: STORJ_ACCESS_KEY,
        secretAccessKey: STORJ_SECRET_ACCESS_KEY,
      },
    });
    console.log('[Storj] S3-compatible object storage configured (' + STORJ_ENDPOINT + ').');
    if (!STORJ_PUBLIC_LINK_BASE) {
      console.warn('[Storj] STORJ_PUBLIC_LINK_BASE not set — public playback URLs will 404 until a Public Access Link is created and its prefix is configured.');
    } else {
      console.log('[Storj] Public link prefix: ' + (STORJ_LINK_PREFIX || '(empty)'));
    }
  } else {
    console.warn('[Storj] STORJ_ACCESS_KEY / STORJ_SECRET_ACCESS_KEY missing — presigned uploads disabled.');
  }

  /**
   * GET /api/storage/presign?type=voice|image&ext=webm|jpg&contentType=audio/webm
   * Issues a short-lived presigned PUT URL + permanent public object URL.
   * The browser uploads the blob DIRECTLY to Storj (media never transits our server).
   */
  app.get('/api/storage/presign', async (req, res) => {
    try {
      const type: 'voice' | 'image' = req.query.type === 'image' ? 'image' : 'voice';
      const ext = String(req.query.ext || (type === 'image' ? 'jpg' : 'webm'))
        .replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || (type === 'image' ? 'jpg' : 'webm');
      const contentType = String(req.query.contentType || (type === 'image' ? 'image/jpeg' : 'audio/webm'));
      if (!storageClient) {
        return res.status(503).json({ error: 'Object storage is not configured on this server.' });
      }
      const key = `${type}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      const command = new PutObjectCommand({ Bucket: STORJ_BUCKET, Key: key, ContentType: contentType });
      const uploadUrl = await getSignedUrl(storageClient, command, { expiresIn: 60 * 5 }); // 5 minutes
      // Public anonymous reads use Storj Linkshare raw form:
      //   https://link.storjshare.io/raw/<access-id>/<bucket>/<key>
      const publicUrl = STORJ_LINK_PREFIX
        ? `${STORJ_LINK_PREFIX}/${STORJ_BUCKET}/${key}`
        : `https://link.storjshare.io/raw/${STORJ_BUCKET}/${key}`;
      res.json({ uploadUrl, publicUrl, contentType, expiresIn: 300 });
    } catch (err: any) {
      console.error('[Storj] Presign error:', err?.message);
      res.status(500).json({ error: 'Could not issue an upload URL. Please try again shortly.' });
    }
  });

  // ────────────────────────────────────────────────────────────────
  // AI TRANSCRIPTION — Gemini converts voice reports to civic text
  // Accepts multipart/form-data `audio` OR JSON { audioUrl }
  // ────────────────────────────────────────────────────────────────
  app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    try {
      let b64 = '';
      let mimeType = 'audio/webm';
      if (req.file) {
        b64 = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype || 'audio/webm';
      } else if (req.body?.audioUrl) {
        const remote = await axios.get(String(req.body.audioUrl), { responseType: 'arraybuffer', timeout: 20000 });
        b64 = Buffer.from(remote.data).toString('base64');
        mimeType = String(remote.headers['content-type'] || 'audio/webm').split(';')[0];
      }
      if (!b64) return res.status(400).json({ error: 'An audio file or audioUrl is required.' });

      if (!process.env.GEMINI_API_KEY) {
        // No AI key — the recording itself remains valid civic evidence.
        return res.json({ transcript: null, note: 'AI transcription not configured.' });
      }

      const ai = getGeminiClient();
      const prompt = "You are Voice of Gudalur's civic-integrity AI. Transcribe the following voice report faithfully. Output ONLY plain text transcription, then on a final line: LOCATION: <exact place mentioned, if any>. If nothing clearly spoken, output ONLY: (no clear speech detected).";
      const gen = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType, data: b64 } }] }],
        config: { temperature: 0.2, maxOutputTokens: 800 },
      });
      res.json({ transcript: (gen.text || '').trim() || null });
    } catch (err: any) {
      console.error('[Transcribe] Error:', err?.message);
      res.status(500).json({ error: 'Transcription failed. Your voice recording on the map remains valid — you may retry AI text later.' });
    }
  });
  // ────────────────────────────────────────────────────────────────
  // AADHAAR VERIFICATION — real pyaadhaar decode of Aadhaar QR codes.
  // Accepts { qrData } (raw secure/old QR string captured by the browser)
  // or { aadhaarNumber } (12-digit, Verhoeff-checked). The Python process
  // decodes OFFLINE; only masked data (last-4 digits) is ever returned.
  // ────────────────────────────────────────────────────────────────
  const AADHAAR_SERVICE = path.join(__dirname, 'server', 'aadhaar_service.py');
  app.post('/api/aadhaar/verify', express.json(), (req, res) => {
    const { qrData, aadhaarNumber } = req.body || {};
    const mode = qrData ? 'qr' : aadhaarNumber ? 'number' : null;
    if (!mode) {
      return res.status(400).json({ verified: false, error: 'Provide qrData (scanned Aadhaar QR) or aadhaarNumber.' });
    }
    if (qrData && String(qrData).length > 20000) {
      return res.status(400).json({ verified: false, error: 'QR payload too large.' });
    }
    if (aadhaarNumber && !/^\d{12}$/.test(String(aadhaarNumber))) {
      return res.status(400).json({ verified: false, error: 'Aadhaar number must be exactly 12 digits.' });
    }

    const py = spawn(process.env.PYTHON_BIN || 'python', [AADHAAR_SERVICE], { windowsHide: true });
    let out = '';
    let errText = '';
    const timer = setTimeout(() => {
      try { py.kill(); } catch { /* already dead */ }
    }, 15000);

    py.stdout.on('data', (d) => { out += String(d); });
    py.stderr.on('data', (d) => { errText += String(d); });
    py.on('error', (e) => {
      clearTimeout(timer);
      res.status(500).json({ verified: false, error: `Python runtime unavailable: ${e.message}` });
    });
    py.on('close', (code) => {
      clearTimeout(timer);
      if (res.headersSent) return;
      const lines = out.trim().split('\n').filter(Boolean);
      const last = lines[lines.length - 1] || '';
      try {
        const parsed = JSON.parse(last);
        if (parsed && typeof parsed === 'object' && 'verified' in parsed) {
          return res.json(parsed);
        }
        res.status(500).json({ verified: false, error: errText.trim() || `Aadhaar service exited (${code}).` });
      } catch {
        res.status(500).json({ verified: false, error: errText.trim() || `Aadhaar service exited (${code}).` });
      }
    });
    py.stdin.write(JSON.stringify({ mode, payload: qrData || aadhaarNumber }));
    py.stdin.end();
  });

  // Serve the production build when deployed (NODE_ENV=production) or when
  // explicitly requested (`npm run preview` → `tsx server.ts --serve-dist`).
  // Everything else (npm run dev) uses Vite middleware — both modes expose the
  // real /api backend on the same origin.
  const serveDist = process.env.NODE_ENV === 'production' || process.argv.includes('--serve-dist');
  if (!serveDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VOICE OF GUDALUR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
