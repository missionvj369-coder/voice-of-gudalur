/* ─────────────────────────────────────────────────────────
 * sw.js — Service Worker for Voice of Gudalur
 * Handles push notifications, notification clicks, and offline fallback.
 * ───────────────────────────────────────────────────────── */

const CACHE_NAME = 'voice-of-gudalur-v1';
const OFFLINE_URL = '/offline.html';

// Install: pre-cache offline fallback
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, '/favicon.svg'])),
  );
  self.skipWaiting();
});

// Activate: clean stale caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))),
    ),
    self.clients.claim(),
  );
});

// Push: display a notification AND forward the payload to open windows
self.addEventListener('push', (e) => {
  const data = e.data?.json() || {};
  const title = data.title || 'VOICE OF GUDALUR';

  // Forward the payload to any open tabs so the page can show an in-app toast
  // (the page's `message` listener in VoiceIncidentListener handles this).
  e.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      allClients.forEach((client) => client.postMessage(data));

      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: data.icon || '/favicon.svg',
        badge: '/favicon.svg',
        tag: data.incident_id || 'voice-alert',
        data: { url: data.url || '/manifesto' },
        actions: [
          { action: 'open', title: 'View Details' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      });
    })(),
  );
});

// Notification click: focus existing tab or open new window
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const targetUrl = e.notification.data?.url || '/manifesto';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matching = clients.find((c) => c.url.includes(targetUrl.split('#')[0]));
      if (matching) {
        matching.focus().then((w) => w.postMessage({ type: 'NAVIGATE', url: targetUrl }));
      } else {
        self.clients.openWindow(targetUrl);
      }
    }),
  );
});

// Message: skipWaiting from the page
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Fetch: offline fallback for navigation
self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
  }
});