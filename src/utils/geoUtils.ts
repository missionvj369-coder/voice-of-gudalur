// Geolocation and Proximity Utility for Voice of Gudalur

/**
 * Calculates the great-circle distance between two coordinates in kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
}

/**
 * Formats distance into a human-readable string with contextual warning.
 */
export function formatProximityWarning(
  distanceKm: number,
  lang: 'en' | 'ta' = 'en'
): { label: string; severity: 'CRITICAL' | 'WARNING' | 'CAUTION' | 'SAFE'; color: string } {
  if (distanceKm <= 1.0) {
    return {
      label:
        lang === 'ta'
          ? `⚠️ மிக அருகில் (${distanceKm} கி.மீ) - உடனடி பாதுகாப்பு தேவை!`
          : `⚠️ IMMINENT DANGER (${distanceKm} km away) - Take immediate shelter!`,
      severity: 'CRITICAL',
      color: 'bg-red-600 text-white animate-pulse'
    };
  }
  if (distanceKm <= 3.0) {
    return {
      label:
        lang === 'ta'
          ? `🚨 அதிக எச்சரிக்கை (${distanceKm} கி.மீ) - உங்கள் பகுதி அருகில் நடமாட்டம்`
          : `🚨 HIGH ALERT (${distanceKm} km away) - Active movement near your area`,
      severity: 'WARNING',
      color: 'bg-amber-500 text-slate-950 font-bold'
    };
  }
  if (distanceKm <= 6.0) {
    return {
      label:
        lang === 'ta'
          ? `⚡ எச்சரிக்கை (${distanceKm} கி.மீ) - தோட்டப்பாதைகளில் கவனம் தேவை`
          : `⚡ CAUTION (${distanceKm} km away) - Stay alert along plantation routes`,
      severity: 'CAUTION',
      color: 'bg-yellow-100 text-yellow-900 border border-yellow-300'
    };
  }
  return {
    label:
      lang === 'ta'
        ? `📍 ${distanceKm} கி.மீ தொலைவில்`
        : `📍 ${distanceKm} km away`,
    severity: 'SAFE',
    color: 'bg-slate-100 text-slate-700'
  };
}

/**
 * Synthesizes a safe dual-tone acoustic emergency alert using Web Audio API.
 */
export function playEmergencyAlertSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.6);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.9);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.0);
  } catch (e) {
    console.warn('Web Audio playback error:', e);
  }
}

/**
 * Sends a native browser push notification if permitted.
 */
export function sendBrowserWildlifeNotification(
  title: string,
  body: string,
  tag: string = 'wildlife-alert'
) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.png',
      tag
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/icon.png',
          tag
        });
      }
    });
  }
}
