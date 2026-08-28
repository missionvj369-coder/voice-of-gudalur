import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for weather snapshot
let weatherCache: { data: unknown; timestamp: number } | null = null;

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
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; " +
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
      system: 'VOICE OF GUDALUR — Civic Safety & Accountability Platform',
      version: '2.0.0',
    });
  });

  // Weather & Environmental snapshot (Gudalur, Nilgiris: 11.5034 N, 76.4925 E)
  // Uses the platform's global fetch — no third-party HTTP client required.
  app.get('/api/weather', async (req, res) => {
    try {
      const now = Date.now();
      if (weatherCache && now - weatherCache.timestamp < 1000 * 60 * 15) {
        return res.json(weatherCache.data);
      }

      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=11.5034&longitude=76.4925&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability,uv_index&timezone=Asia%2FKolkata';
      const aqiUrl = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=11.5034&longitude=76.4925&current=european_aqi,pm2_5,pm10';

      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetch(weatherUrl, { signal: AbortSignal.timeout(4000) }),
        fetch(aqiUrl, { signal: AbortSignal.timeout(4000) }),
      ]);

      let temp = 21.5;
      let code = 2;
      let humidity = 78;
      let windSpeed = 8.2;
      let rainProbability = 15;
      let uv = 6.2;
      let aqi = null;

      if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
        const cur = (await weatherRes.value.json()).current;
        if (cur) {
          if (typeof cur.temperature_2m === 'number') temp = cur.temperature_2m;
          if (typeof cur.weather_code === 'number') code = cur.weather_code;
          if (typeof cur.relative_humidity_2m === 'number') humidity = cur.relative_humidity_2m;
          if (typeof cur.wind_speed_10m === 'number') windSpeed = cur.wind_speed_10m;
          if (typeof cur.precipitation === 'number' && cur.precipitation > 0) rainProbability = Math.min(100, Math.round(cur.precipitation * 20));
        }
      }
      if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
        const cur = (await aqiRes.value.json()).current;
        if (cur && typeof cur.european_aqi === 'number') aqi = cur.european_aqi;
      }

      const data = {
        location: 'Gudalur, The Nilgiris',
        temperature: temp,
        weatherCode: code,
        humidity,
        windSpeed,
        rainProbability,
        uvIndex: uv,
        aqi,
        source: 'Open-Meteo (public weather)',
        cachedAt: now,
      };
      weatherCache = { data, timestamp: now };
      return res.json(data);
    } catch (error: any) {
      console.error('Weather Server Error:', error);
      return res.status(500).json({ error: 'Weather data is temporarily unavailable.' });
    }
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
    console.log(`VOICE OF GUDALUR server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();