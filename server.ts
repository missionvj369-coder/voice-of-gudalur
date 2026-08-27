import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

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
      "script-src 'self' 'unsafe-inline' https://onegudalur.org; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "connect-src 'self' https://*.supabase.co https://api.open-meteo.com https://air-quality-api.open-meteo.com; " +
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
      system: 'ONE GUDALUR Living Intelligence Platform', 
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
            : 'ONE GUDALUR Civic Navigator: For urgent civic grievances use CM Helpline 1100, TNEB Minnal 94987 94987, and Gudalur Forest Division 1800 425 6100. Localities SS Nagar, First Mile, Kasimvayal, and Thorapalli are connected.'
        });
      }

      const ai = getGeminiClient();
      const langContext = lang === 'ta' ? 'Tamil' : lang === 'ml' ? 'Malayalam' : 'English';
      
      const systemInstruction = `
You are ONE GUDALUR's official AI Civic Navigator and Agricultural Advisor for Gudalur Taluk, The Nilgiris, Tamil Nadu.
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
    console.log(`[ONE GUDALUR Alert Broadcast] "${alert?.title || 'Alert'}" dispatched to localities:`, affectedLocalities);
    res.json({ success: true, dispatchedAt: Date.now() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
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
    console.log(`ONE GUDALUR Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
