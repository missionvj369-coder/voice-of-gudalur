import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// PWA — register with auto-update (registerType: 'autoUpdate'). Whenever this
// site is rebuilt and deployed, every open tab — Safari, iOS, Android — finds
// the new service worker, lets it take control automatically (skipWaiting) and
// refreshes itself once. No manual "refresh from settings" is ever needed.
//
// Single-refresh guarantee: when a NEW service worker takes control of this
// tab (skipWaiting + clientsClaim), reload exactly once per session so the
// tab swaps to the new build. The sessionStorage guard prevents reload loops.
let swReloaded = false;
try {
  if (sessionStorage.getItem('vog_sw_reloaded') === '1') swReloaded = true;
} catch { /* private mode */ }
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloaded) return;
    // Don't reload if the user has already seen the intro animation
    try {
      if (localStorage.getItem('VoiceOfGudalur_lang_chosen') === '1') return;
    } catch { /* ignore */ }
    swReloaded = true;
    try { sessionStorage.setItem('vog_sw_reloaded', '1'); } catch { /* ignore */ }
    window.location.reload();
  });
}

// ─── FINAL-SAFETY auto-update: version.json poll ─────────────────────────────
// vog-version-marker writes dist/version.json with a fresh buildId on every
// deploy. We fetch it (cache-busted) on each visibility/focus return plus every
// 5 minutes while visible, and hard-reload when it changes — so a user who has
// the app open in the background (or sits on a tab all day) automatically gets
// the current live version without ever pressing refresh.
//
// Anti-interrupt guards:
//  1. NEVER reload within the first 2 minutes of page load — protects the VOG
//     intro animation and a visitor's first impression from a mid-deploy reload.
//  2. Only reload when the tab REGAINS focus/visibility — never while the user
//     is actively reading/signing on the page.
{
  let currentBuild: string | null = null;
  let reloading = false;
  const bootedAt = Date.now();
  const GRACE_MS = 2 * 60 * 1000; // 2-minute no-reload grace window after boot

  const readVersion = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return typeof data?.buildId === 'string' ? data.buildId : null;
    } catch {
      return null;
    }
  };

  const checkVersion = async () => {
    if (reloading || document.visibilityState === 'hidden') return;
    if (Date.now() - bootedAt < GRACE_MS) return;   // grace window — never interrupt a fresh visit
    const build = await readVersion();
    if (!build) return;
    if (currentBuild === null) { currentBuild = build; return; }   // first read — baseline
    if (build !== currentBuild && !reloading) {
      reloading = true;
      window.location.reload();
    }
  };

  // Baseline is captured immediately (cheap, no reload risk).
  void (async () => {
    const build = await readVersion();
    if (build) currentBuild = build;
  })();

  const onVisible2 = () => { if (document.visibilityState === 'visible') void checkVersion(); };
  document.addEventListener('visibilitychange', onVisible2);
  window.addEventListener('focus', checkVersion);
  const versionTimer = window.setInterval(checkVersion, 5 * 60 * 1000);
}

registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => {
    // Long-lived tabs: check for updates when the tab regains focus/visibility
    // and once an hour, so visitors who keep the app open still get the newest
    // build without touching settings.
    if (!registration) return;
    const check = () => { registration.update().catch(() => { /* offline */ }); };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    const hourly = window.setInterval(check, 60 * 60 * 1000);
    // Clean up listeners on teardown (fast-refresh safety).
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
      window.clearInterval(hourly);
    };
  },
  onOfflineReady() {
    console.info('[PWA] Voice of Gudalur is ready to work offline.');
  },
});

// NOTE: React.StrictMode removed — it causes the opening animation to run twice
// in development mode (mount → unmount → remount), which makes the VOG dots
// animation restart and overlay the language selection screen. The animation
// effect already has proper cleanup (cancelAnimationFrame), so StrictMode is
// not needed here.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
