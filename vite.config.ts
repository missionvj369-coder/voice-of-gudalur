import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
/**
 * Enterprise security headers applied to dev + preview servers.
 * HSTS / nosniff / frame-deny / referrer & permissions policy,
 * plus a CSP tuned for this app: Google Fonts,
 * Hugging Face model CDN (on-device Whisper), leaflet map tiles, blob: PDFs.
 */
const securityHeadersPlugin = (): Plugin => ({
  name: 'security-headers',
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      Object.entries(securityHeaders).forEach(([k, v]) => res.setHeader(k, v));
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((_req, res, next) => {
      Object.entries(securityHeaders).forEach(([k, v]) => res.setHeader(k, v));
      next();
    });
  },
});

const securityHeaders: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "frame-src 'self' blob: https://cmhelpline.tnega.org",
    "connect-src 'self' https://huggingface.co https://*.huggingface.co https://gateway.storjshare.io",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};



export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      securityHeadersPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        // We register the service worker ourselves from main.tsx (virtual:pwa-register)
        // so updates auto-skipWaiting and auto-refresh in every browser — Safari
        // included. The plugin must NOT inject its own registration script.
        injectRegister: false,
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        manifest: {
          name: 'Voice of Gudalur - Wildlife & Citizen Platform',
          short_name: 'VOG',
          description: 'Citizen-powered wildlife monitoring and community voice platform for Gudalur, Nilgiris',
          theme_color: '#059669',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          categories: ['government', 'utilities', 'lifestyle'],
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
          screenshots: [
            { src: 'screenshot-wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide' },
            { src: 'screenshot-narrow.png', sizes: '720x1280', type: 'image/png', form_factor: 'narrow' },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          disableDevLogs: true,
          // Precache the app shell + the small ZBar wasm (~100 KB) so QR
          // scanning works offline. The heavy HuggingFace ort-wasm AI model
          // (23+ MB) is loaded on-demand at runtime — exclude it from
          // precache (it also exceeds workbox's default 2 MiB limit).
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
          globIgnores: ['**/ort-wasm*', '**/qrDecode/*.worker.*', '**/qrDecode/cameraFusion.*'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'osm-tiles-cache',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'weather-api-cache',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 12 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
          navigateFallback: '/index.html',
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    worker: {
      format: 'es' as const,
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'motion'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
            'vendor-icons': ['lucide-react'],
            'vendor-pdf': ['jspdf'],
            'vendor-ai': ['@huggingface/transformers'],
          },
        },
      },
    },
  };
});
