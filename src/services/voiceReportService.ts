/**
 * voiceReportService.ts
 * Self-hosted voice notification pipeline (browser-side).
 *
 * WHAT IT DOES
 *  1. Asks the browser for push-notification permission.
 *  2. Creates a Web Push subscription and stores its endpoint + P-256 keys
 *     in Supabase (table: push_subscriptions) so the server can address this
 *     device later.
 *  3. Lets the user record a short voice note (microphone → Opus/WebM blob).
 *  4. Transcribes the recording ON-DEVICE with open-source Whisper
 *     (Transformers.js — Apache-2.0; audio never leaves the phone, works
 *     offline after the model is cached) and uploads the recording together
 *     with incident metadata + transcript to POST /api/voice/incident, which
 *     records a row in `wildlife_incidents` and fans out a push notification
 *     to every subscriber in the affected locality.
 */

import { supabase } from '../lib/supabase';
import { transcribeAudioBlob } from './transcriptionService';

// ── 1. Web Push subscription (browser side) ──────────────────────────

/** VAPID public key injected at build time via Vite's import.meta.env. */
export const PUSH_PUBLIC_KEY: string =
  import.meta.env.VITE_PUSH_PUBLIC_KEY || '';

/**
 * Converts a base64url-encoded VAPID key into the Uint8Array that the
 * PushManager.subscribe() call expects.
 */
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const raw = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const out = new Uint8Array(atob(raw).length);
  for (let i = 0; i < raw.length; ++i) out[i] = atob(raw).charCodeAt(i);
  return out;
}

export interface SavedSubscription {
  endpoint: string;
  keys_auth: string;
  keys_p256dh: string;
}

/** Subscribe the browser to push and persist the subscription to Supabase. */
export async function subscribeToPush(localityId?: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !PUSH_PUBLIC_KEY) {
    console.warn('[VoiceNotify] Push not supported or VAPID key missing.');
    return null;
  }

  // Never prompt on app load — only ever subscribe if the user has already granted permission
  // (the prompt is triggered explicitly elsewhere, e.g. after the user opts in to wildlife alerts).
  if (Notification.permission !== 'granted') {
    return null;
  }

  const sw = await navigator.serviceWorker.ready;
  const sub = await sw.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(PUSH_PUBLIC_KEY),
  });

  // Persist to Supabase so the Express server can address this endpoint.
  const authKey = sub.getKey('auth');
  const p256Key = sub.getKey('p256dh');
  const payload: SavedSubscription = {
    endpoint: sub.endpoint,
    keys_auth: authKey ? btoa(String.fromCharCode(...new Uint8Array(authKey))) : '',
    keys_p256dh: p256Key ? btoa(String.fromCharCode(...new Uint8Array(p256Key))) : '',
  };

  const { error } = await supabase.from('push_subscriptions').upsert({
    endpoint: payload.endpoint,
    keys_auth: payload.keys_auth,
    keys_p256dh: payload.keys_p256dh,
    user_agent: navigator.userAgent,
    locality_id: localityId || null,
    last_seen: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

    if (error) console.error('[VoiceNotify] Save subscription failed:', error.message);
  return sub;
}

// ── 2. Voice recording utility (browser side) ────────────────────────

export interface VoiceRecording {
  blob: Blob;
  durationMs: number;
  transcript?: string;
}

/**
 * Records a single voice note (max `maxSeconds` long) from the user's
 * microphone and resolves with an audio Blob ready to be uploaded.
 */
export async function recordVoiceNote(maxSeconds = 60): Promise<VoiceRecording | null> {
  if (!navigator.mediaDevices?.getUserMedia) {
    console.error('[VoiceNotify] MediaDevices not supported.');
    return null;
  }

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    console.error('[VoiceNotify] Microphone access denied:', e);
    return null;
  }

  return new Promise((resolve) => {
    const start = Date.now();
    const chunks: BlobPart[] = [];
    const mediaRecorder = new MediaRecorder(stream!, { mimeType: 'audio/webm;codec=opus' });

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const durationMs = Date.now() - start;
      resolve({ blob: new Blob(chunks, { type: 'audio/webm' }), durationMs });
      stream?.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    setTimeout(() => {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }, maxSeconds * 1000);
  });
}

// ── 3. Incident submission ────────────────────────────────────────────

export type IncidentType = 'human-wildlife' | 'fire' | 'traffic' | 'medical' | 'other';
export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface VoiceIncident {
  type: IncidentType;
  urgency: Urgency;
  locality?: string;
  lat?: number;
  lng?: number;
  description?: string;
  recording?: VoiceRecording;
}

/**
 * Uploads a voice note + metadata to POST /api/voice/incident.
 * Pipeline:
 *   1. Transcribe the audio ON-DEVICE with open-source Whisper (offline-capable)
 *   2. Insert a row into wildlife_incidents
 *   3. Broadcast a Web Push notification to all subscribers in the locality
 */
export async function submitVoiceIncident(incident: VoiceIncident): Promise<{
  incidentId: string | null;
  transcript: string | null;
  pushSent: number;
  error: string | null;
}> {
  try {
    // 1. On-device transcription first (private + works with zero network).
    let transcript: string | null = null;
    if (incident.recording?.blob) {
      try {
        const result = await transcribeAudioBlob(incident.recording.blob);
        transcript = result.text || null;
      } catch (e) {
        console.warn('[VoiceNotify] On-device transcription failed:', e);
      }
    }
    if (!transcript && incident.description) transcript = incident.description;

    const formData = new FormData();
    if (incident.recording?.blob) {
      formData.append('audio', incident.recording.blob, 'voice.webm');
    }
    formData.append('type', incident.type);
    formData.append('urgency', incident.urgency);
    formData.append('locality', incident.locality || 'gudalur');
    if (incident.lat) formData.append('lat', String(incident.lat));
    if (incident.lng) formData.append('lng', String(incident.lng));
    if (incident.description) formData.append('description', incident.description);
    if (transcript) formData.append('transcript', transcript);
    formData.append('durationMs', String(incident.recording?.durationMs || 0));

    const res = await fetch('/api/voice/incident', {
      method: 'POST',
      body: formData,
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Voice submission failed');

    return {
      incidentId: result.incident_id ?? null,
      transcript: result.transcript ?? null,
      pushSent: result.push_sent ?? 0,
      error: null,
    };
  } catch (e: any) {
    return { incidentId: null, transcript: null, pushSent: 0, error: e.message };
  }
}
