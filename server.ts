import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

const __filename = typeof (import.meta as any)?.url === 'string'
  ? fileURLToPath((import.meta as any).url)
  : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

// â”€â”€ 100% open-source AI backend (no proprietary API keys) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chat:   any OpenAI-compatible local LLM via Ollama (MIT) â€” llama3.2 default.
// Speech: self-hosted Whisper (Speaches/faster-whisper, Apache-2.0) â€” optional;
//         the browser already transcribes on-device via Transformers.js.
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/v1';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const WHISPER_URL = process.env.WHISPER_URL || ''; // e.g. http://127.0.0.1:8000/v1/audio/transcriptions
import webPush from 'web-push';
import { spawn } from 'child_process';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import authRoutes from './server/routes/auth';
import petitionRoutes from './server/routes/petitions';
import manifestoRoutes from './server/routes/manifesto';
import wildlifeRoutes from './server/routes/wildlife';
import officialsRoutes from './server/routes/officials';
import adminRoutes from './server/routes/admin';
import adminOfficialsRoutes from './server/routes/adminOfficials';
import adminOfficialActionsRoutes from './server/routes/adminOfficialActions';
import adminStatsRoutes from './server/routes/adminStats';
import mediaRoutes from './server/routes/media';
import configRoutes from './server/routes/config';

// â”€â”€ Open-source AI clients (no proprietary API keys) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface ChatMessage { role: 'system' | 'user' | 'assistant'; content: string; }

/** Chat via any OpenAI-compatible endpoint (Ollama by default, MIT license). */
async function ollamaChat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const res = await axios.post(
    `${OLLAMA_URL}/chat/completions`,
    { model: OLLAMA_MODEL, messages, temperature, stream: false },
    { timeout: 60000 }
  );
  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty LLM response');
  return text;
}

/** Transcription via self-hosted Whisper (Speaches / faster-whisper, Apache-2.0). */
async function whisperTranscribe(audioBase64: string, language?: string): Promise<string> {
  if (!WHISPER_URL) throw new Error('WHISPER_URL not configured');
  const buffer = Buffer.from(audioBase64, 'base64');
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: 'audio/webm' }), 'audio.webm');
  form.append('model', process.env.WHISPER_MODEL || 'whisper-small');
  if (language) form.append('language', language);
  const res = await axios.post(WHISPER_URL, form, {
    timeout: 120000,
    headers: (typeof (form as any).getHeaders === 'function' ? (form as any).getHeaders() : undefined) as any,
  } as any);
  return res.data?.text || '';
}

// In-memory cache for weather snapshot
let weatherCache: { data: any; timestamp: number } | null = null;

/**
 * Build the full Express app (middleware + every /api route). Exported so the
 * Netlify Function (netlify/functions/api.ts) can serve this exact backend
 * serverlessly; `startServer()` below is the local standalone entrypoint.
 */
export async function createApp() {
  const app = express();

  // Behind a reverse proxy (Netlify /api/* rewrite → Cloud Run load balancer)
  // the socket address is the proxy, not the visitor. Trust the proxy chain so
  // req.ip (and therefore the rate limiters below) resolves to the real client
  // — without this every visitor shares ONE bucket (20 OTP requests / 15 min)
  // and registration 429s platform-wide. Tune the hop count to your host:
  // 2 = Netlify proxy → Cloud Run LB; 1 = direct Cloud Run / single proxy.
  app.set('trust proxy', 2);

    app.use(express.json());
  app.use(cookieParser());

  // â”€â”€ Rate limiting (abuse protection) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // In serverless (Netlify Function) runs the socket address can be absent;
  // key on req.ip with a safe fallback and skip the validations that throw
  // when IP info is missing. Behind Netlify, X-Forwarded-For + trust proxy
  // still resolve real client IPs (per-user buckets).
  // express-rate-limit v8 REQUIRES the ipKeyGenerator helper when a custom
  // keyGenerator reads req.ip — the plain form fails its IPv6 startup
  // validation (ERR_ERL_KEY_GEN_IPV6) and crashes the whole app/function.
  const clientKey = (req: any): string => {
    const ip: string = req.ip || req.socket?.remoteAddress || 'anonymous';
    if (!ip || ip === 'anonymous') return 'anonymous';
    try {
      return ipKeyGenerator(ip as any);
    } catch {
      // Not a valid IP (unix socket, unknown, …) — one shared bucket is safer
      // than crashing the request pipeline.
      return 'anonymous';
    }
  };
  const limiterOpts = { validate: { xForwardedForHeader: false, ip: false } as any };
  const authRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many requests', keyGenerator: clientKey, ...limiterOpts });
  const publicRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many requests', keyGenerator: clientKey, ...limiterOpts });
  const writeRateLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many requests', keyGenerator: clientKey, ...limiterOpts });

  // Security headers (CSP updated â€” no *.supabase.co, no Realtime websocket)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self), payment=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://voiceofgudalur.space; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "media-src 'self' blob: https: data:; " +
      "frame-src 'self' blob: https://cmhelpline.tnega.org; " +
      "connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
    );
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });

  // Health route — also reports DB reachability + required env config so a
  // broken deployment is diagnosable straight from the browser.
  app.get('/api/health', async (req, res) => {
    let dbUp = false;
    let dbError: string | undefined;
    try {
      const { ping } = await import('./server/db/client');
      dbUp = await ping();
    } catch (e: any) {
      dbError = e?.message;
    }
    res.json({
      status: dbUp ? 'ok' : 'degraded',
      system: 'VOICE OF GUDALUR Living Intelligence Platform',
      version: '2.0.0-production',
      db: dbUp ? 'connected' : 'unreachable',
      dbError,
      config: {
        databaseUrl: Boolean(process.env.DATABASE_URL),
        sessionSecret: Boolean(process.env.SESSION_SECRET),
        nodeEnv: process.env.NODE_ENV || null,
      },
      time: new Date().toISOString(),
    });
  });

  // Weather & Environmental Ingestion API (Gudalur, Nilgiris: 11.5034Ã‚Â° N, 76.4925Ã‚Â° E)
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

      const reply = await ollamaChat([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: message },
      ]);
      res.json({ reply: reply || 'Information updated.' });
    } catch (error: any) {
      console.error('[AI Chat] Error:', error);
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // SELF-HOSTED VOICE NOTIFICATION SYSTEM
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    // â”€â”€ Database client (CockroachDB via pg) â€” replaces Supabase admin client â”€â”€
  import('./server/db/client').then((m) => void m.ping().then((ok) => {
    console[ok ? 'log' : 'warn']('[VOICE] CockroachDB: ' + (ok ? 'connected' : 'UNREACHABLE â€” check DATABASE_URL'));
  }));

  // Configure Web Push â€” VAPID keys generated once via `npx web-push generate`
  if (process.env.PUSH_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webPush.setVapidDetails(
      process.env.VAPID_EMAIL,
      process.env.VITE_PUSH_PUBLIC_KEY || '',
      process.env.PUSH_PRIVATE_KEY,
    );
    console.log('[VOICE] Web Push configured.');
  } else {
    console.warn('[VOICE] PUSH_PRIVATE_KEY not set â€” push notifications disabled.');
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

  // POST browser push subscription â€” persisted to CockroachDB (was Supabase).
  app.post('/api/push/subscribe', express.json(), async (req, res) => {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({ error: 'endpoint + keys required' });
    }
    try {
      const { db: dbClient } = await import('./server/db/client');
      await dbClient.withTransaction(async (tx) => {
        await tx.query(
          `INSERT INTO push_subscriptions(endpoint, p256dh, auth, user_uid, device_label)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh,
                                                     auth = EXCLUDED.auth,
                                                     last_seen = now()`,
          [endpoint, keys.p256dh, keys.auth, (req as any).user?.uid ?? null, req.body.userAgent ?? null],
        );
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /api/voice/incident - record to CockroachDB + broadcast (was Supabase).
  app.post('/api/voice/incident', upload.single('audio'), async (req, res) => {
    try {
      const { type, urgency, locality, lat, lng, description, transcript: clientTranscript } = req.body;
      const { upsertWildlifeIncident } = await import('./server/db/repositories/wildlifeRepository');
      const { db: dbClient } = await import('./server/db/client');

      let transcript = typeof clientTranscript === 'string' && clientTranscript.trim()
        ? clientTranscript.trim()
        : (typeof description === 'string' ? description : '');
      if (!transcript && req.file && WHISPER_URL) {
        try {
          transcript = (await whisperTranscribe(req.file.buffer.toString('base64'))).trim() || transcript;
        } catch (err) {
          console.warn('[VoiceIncident] Whisper transcription failed:', err?.message);
        }
      }

      const incident = await upsertWildlifeIncident({
        type: type || 'human-wildlife',
        localityId: locality || 'gudalur-town',
        generalizedArea: locality || 'Gudalur',
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        urgency: urgency || 'MEDIUM',
        reportedBy: 'voice-note',
        behaviorNotes: transcript || description || 'Voice incident report',
        idempotencyKey: 'voice-' + (req.file ? crypto.randomUUID() : (transcript?.slice(0, 40) || crypto.randomUUID())),
      });

      let delivered = 0, sent = 0, failed = 0;
      const subsRows = await dbClient.query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
      const pubKey = process.env.VITE_PUSH_PUBLIC_KEY;
      if (subsRows.rows.length && pubKey) {
        const title = 'Wildlife Alert';
        const body = transcript || ((type || 'incident') + ' - ' + (urgency || 'MEDIUM') + ' in ' + (locality || 'Gudalur'));
        for (const sub of subsRows.rows) {
          sent++;
          try {
            await webPush.sendNotification(
              { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
              JSON.stringify({ title, body, icon: '/favicon.svg', incident_id: incident.id, url: '/manifesto#incident-' + incident.id }),
            );
            delivered++;
          } catch (e) {
            failed++;
            if (e.statusCode === 410 || e.statusCode === 404) {
              await dbClient.execute('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
            }
          }
        }
        await dbClient.execute(
          'INSERT INTO push_log(title, body, sent_count, status) VALUES ($1, $2, $3, $4)',
          [title, body, sent, sent - failed === 0 ? 'failed' : 'partial'],
        );
      }

      res.json({ success: true, incident_id: incident.id, is_new: incident.isNew, transcript: transcript || null, push_sent: delivered, push_total: sent, push_failed: failed });
      console.log('[Voice] ' + incident.id + ' - "' + (transcript?.slice(0, 60) || '(no transcript)') + '" - push ' + delivered + '/' + sent);
    } catch (err) {
      console.error('[Voice] Error:', err.message);
      res.status(500).json({ error: err.message || 'Internal error' });
    }
  });

  // Enhanced alert broadcast (now also sends push) - CockroachDB + web-push.
  app.post('/api/alerts/broadcast-enhanced', async (req, res) => {
    const { title, body, locality, url } = req.body;
    let delivered = 0, sent = 0;
    const { db: dbClient } = await import('./server/db/client');
    const pubKey = process.env.VITE_PUSH_PUBLIC_KEY;
    if (pubKey) {
      let subsRows;
      if (locality) {
        subsRows = await dbClient.query(
          'SELECT ps.endpoint, ps.p256dh, ps.auth FROM push_subscriptions ps JOIN users u ON u.uid = ps.user_uid WHERE u.locality_id = $1',
          [locality],
        );
      } else {
        subsRows = await dbClient.query('SELECT endpoint, p256dh, auth FROM push_subscriptions');
      }
      for (const sub of subsRows.rows) {
        sent++;
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
            JSON.stringify({ title: title || 'Gudalur Alert', body: body || '', icon: '/favicon.svg', url: url || '/manifesto' }),
          );
          delivered++;
        } catch {}
      }
    }
    res.json({ success: true, push_sent: delivered, push_total: sent });
  });

  // Mount the new CockroachDB-backed routers (replaces Supabase facades).
  app.use('/api/auth', authRateLimiter, authRoutes);
  app.use('/api/petitions', petitionRoutes);
  app.use('/api/manifesto', manifestoRoutes);
  app.use('/api/wildlife', wildlifeRoutes);
  app.use('/api/offline', wildlifeRoutes);
  app.use('/api/officials', officialsRoutes);
  // Admin portal routes (hidden /admin — PLATFORM_ADMIN only)
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin', adminOfficialsRoutes);
  app.use('/api/admin', adminOfficialActionsRoutes);
  app.use('/api/admin', adminStatsRoutes);

  app.use('/api/config', publicRateLimiter, configRoutes);
  // Media storage: using CockroachDB only (Storj object storage removed).
  app.use('/api/media', mediaRoutes);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AI TRANSCRIPTION â€” self-hosted Whisper (Apache-2.0) converts voice reports to civic text
  // Accepts multipart/form-data `audio` OR JSON { audioUrl }
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

      if (!WHISPER_URL) {
        // No server Whisper â€” the recording itself remains valid civic evidence.
        // (Browsers transcribe on-device via Transformers.js before upload.)
        return res.json({ transcript: null, note: 'Server transcription not configured.' });
      }

      const text = (await whisperTranscribe(b64)).trim();
      res.json({ transcript: text || null });
    } catch (err: any) {
      console.error('[Transcribe] Error:', err?.message);
      res.status(500).json({ error: 'Transcription failed. Your voice recording on the map remains valid â€” you may retry AI text later.' });
    }
  });
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AADHAAR VERIFICATION â€” real pyaadhaar decode of Aadhaar QR codes.
  // Accepts { qrData } (raw secure/old QR string captured by the browser)
  // or { aadhaarNumber } (12-digit, Verhoeff-checked). The Python process
  // decodes OFFLINE; only masked data (last-4 digits) is ever returned.
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  return app;
}

/** Local standalone entrypoint: attach Vite middleware (dev) or serve dist (preview). */
async function startServer() {
  const app = await createApp();
  const PORT = Number(process.env.PORT) || 3000;

  const serveDist = process.env.NODE_ENV === 'production' || process.argv.includes('--serve-dist');
  if (!serveDist) {
    // Dynamic import keeps Vite out of serverless bundles entirely.
    const { createServer: createViteServer } = await import('vite');
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

// Run the standalone server only when server.ts itself is the entrypoint
// (`npm run dev` / `npm run preview`). When imported by the Netlify Function,
// createApp() is served serverlessly: no listen, no Vite.
const invokedDirectly = (process.argv[1] || '').replace(/\\/g, '/').endsWith('/server.ts');
if (invokedDirectly) {
  void startServer();
}
