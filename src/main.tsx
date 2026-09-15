// Record boot time early for controlling when service worker reloads happen
window.__vogBootTime = window.__vogBootTime || Date.now();

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
    // Only reload during initial app load (within first 10 seconds).
    // Extended from 3s to 10s to give AuthContext time to hydrate the session
    // (authApi.me() over httpOnly cookie) before a forced reload. This was
    // the root cause of the "Authentication required" flicker on deep-link
    // pages like /validate/:token — the 3s window fired before the session
    // resolved, bouncing a logged-in user onto the signup/login gate.
    const isInitialLoad = Date.now() - window.__vogBootTime < 10000;
    // Skip reload on witness-validation deep links — a forced reload mid-flow
    // discards in-progress auth hydration and resets the validate flow.
    const isDeepLink = /^\/validate\/[a-f0-9]/.test(window.location.pathname);
    if (isInitialLoad && !isDeepLink) {
      window.location.reload();
    }
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
    const GRACE_MS = 60 * 60 * 1000; // 1-hour no-reload grace window after boot

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
    // CRITICAL-FLOW GUARD: if the user is mid-registration / mid-signing / has a
    // modal open, DEFER the reload until they finish. Components set
    // sessionStorage['vog_user_active']='1' while a critical interaction is in
    // progress — never yank the page out from under them.
    try { if (sessionStorage.getItem('vog_user_active') === '1') return; } catch { /* ignore */ }
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
