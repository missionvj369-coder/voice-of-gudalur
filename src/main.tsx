import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// PWA — register with auto-update (registerType: 'autoUpdate'). Whenever this
// site is rebuilt and deployed, every open tab — Safari, iOS, Android — finds
// the new service worker, lets it take control automatically (skipWaiting) and
// refreshes itself once. No manual "refresh from settings" is ever needed.
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
