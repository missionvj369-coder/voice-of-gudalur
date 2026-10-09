# 🎙️ Voice of Gudalur — Self-Hosted Voice Notification System

A complete, free (open-source) voice incident reporting + push notification
pipeline for the VOICE OF GUDALUR platform. Residents record a short voice
note in Tamil / Malayalam / Kannada / English, it is transcribed with Gemini,
stored as a `wildlife_incidents` row, and broadcast as a **Web Push
notification** to every subscribed device.

No paid "notification-as-a-service" provider is used — the whole system runs
on **your own Express server (or Netlify Functions) + Supabase + the browser
Push API + @google/genai**.

---

## Architecture

```
┌─────────────┐   getUserMedia()   ┌─────────────────┐  Multipart POST   ┌──────────────────────────┐
│   Browser   │ ─────────────────▶ │ recordVoiceNote │ ────────────────▶ │ /api/voice/incident      │
│  (React)    │   audio/webm blob  └─────────────────┘   audio + fields  │  (Express server or      │
│             │                                                  │       │   Netlify function)      │
│ VoiceReporter│                                                 ▼       └───────────┬──────────────┘
│ VoiceReport  │  Web Push (P-256)                       1. Gemini transcribe        │
└──────┬──────┘                                           2. Insert wildlife_incidents│
       │ pushManager.subscribe()                         3. web-push.sendNotification │
       ▼                                                        │                     ▼
┌──────────────┐   Save subscription row            ┌──────────▼───────┐   ┌───────────────────────┐
│ supabase     │   (upsert on endpoint)             │ push_subscriptions│   │  push_log (audit)     │
│ realtime     │ ◀────────────────────────────────── │  (endpoint, keys) │   └───────────────────────┘
└──────┬───────┘                                    └──────────────────┘
       │  INSERT wildlife_incidents
       ▼
VoiceIncidentListener (in-app toast)  +  sw.js (OS notification)
```

---

## What's included

| File | Purpose |
|------|---------|
| `supabase/voice_push_schema.sql` | Creates `push_subscriptions` + `push_log` tables, RLS, realtime, counts RPC |
| `src/services/voiceReportService.ts` | Browser helpers: push subscribe, voice recording, incident submission |
| `src/components/VoiceReportButton.tsx` | Floating gold mic button (bottom of every page) |
| `src/components/VoiceReporter.tsx` | Full modal: choose incident type → record → review → send |
| `src/components/VoiceIncidentListener.tsx` | Mounts once at root; handles in-app toasts + realtime events |
| `public/sw.js` | Service worker: shows push notifications, opens app on click |
| `public/offline.html` | Offline fallback for Ghat-network drops |
| `server.ts` | Express routes: `/api/voice/incident`, `/api/push/*`, enhanced broadcast |
| `netlify/functions/voice.js` | Netlify Functions port of the same API (production) |
| `netlify.toml` | Redirects `/api/voice/*` + `/api/push/*` → function |
| `.env.example` | All required + optional env vars documented |
---

## Setup (step by step)

### 1. Supabase

Run `supabase/voice_push_schema.sql` in the Supabase SQL Editor. It creates:

- `push_subscriptions(endpoint PK, keys_auth, keys_p256dh, user_agent, locality_id, last_seen)`
- `push_log(title, body, sent_to, delivered, failures, created_at)`
- Row Level Security policies (public insert/update/select — tighten before production)
- `get_push_subscriber_count()` helper RPC

### 2. Generate VAPID keys (once)

```bash
npx web-push generate
```

This prints a public + private key and a `mailto:` URL. Put them in your env:

```bash
# .env  (local)  /  Netlify Environment Variables (production)
VITE_PUSH_PUBLIC_KEY=BMxxxxx        # public key (browser-safe)
PUSH_PRIVATE_KEY=yyyy               # private key (NEVER in the frontend)
VAPID_EMAIL=mailto:gudalur-voice@example.org
```

> ⚠️ **Do not commit `PUSH_PRIVATE_KEY` to git.** `.env` is gitignored.

### 3. Local development

```bash
npm install
npm run dev        # starts Express + Vite on http://localhost:3000
```

Visit the app, click the gold mic button (bottom-right), grant notification +
microphone permission, record a short voice note, and send. The server will
transcribe the audio, create a `wildlife_incidents` row, and push a
notification to every subscribed browser tab.

### 4. Production (Netlify)

The static site cannot run Express routes — a Netlify Function is used instead.

1. Set these in **Netlify → Site settings → Environment variables**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `VITE_PUSH_PUBLIC_KEY`
   - `PUSH_PRIVATE_KEY`
   - `VAPID_EMAIL`
2. Deploy. `netlify.toml` rewrites `/api/voice/*` and `/api/push/*` to
   `/.netlify/functions/voice`.

The browser calls `/api/push/public-key` to learn the VAPID key and
`/api/voice/incident` to submit — both resolve to the same function.
---

## API reference

### `GET /api/push/public-key`
Returns `{ key: "<VAPID public key>" }` so the browser can subscribe.

### `POST /api/push/subscribe`
Body (JSON):
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "auth": "...", "p256dh": "..." },
  "userAgent": "Mozilla/5.0 ...",
  "localityId": "gudalur-town"
}
```
Upserts a row into `push_subscriptions`.

### `POST /api/voice/incident`
Body: `multipart/form-data`
| Field | Type | Notes |
|-------|------|-------|
| `audio` | file | WebM/Opus voice note (≤10 MB) |
| `type` | string | `human-wildlife` \| `fire` \| `traffic` \| `medical` \| `other` |
| `urgency` | string | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` |
| `locality` | string | locality id, e.g. `gudalur-town` |
| `lat` / `lng` | number | optional GPS |
| `description` | string | fallback text if no transcript |

Response:
```json
{ "success": true, "incident_id": "...", "transcript": "Elephant near First Mile...",
  "push_sent": 3, "push_total": 5, "push_failed": 2 }
```

### `POST /api/alerts/broadcast-enhanced`
Body (JSON): `{ "title", "body", "locality", "url" }` — pushes an ad-hoc alert.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| Notification permission never asks | Site not served over HTTPS (self-hosted push requires HTTPS or localhost) |
| `VAPID_PUBLIC_KEY invalid` | Keys don't match between `VITE_PUSH_PUBLIC_KEY` and `PUSH_PRIVATE_KEY` — regenerate together |
| `Error code 400` from push | Browser endpoint expired — supabase row is auto-cleaned on 404/410 |
| Transcription empty | `GEMINI_API_KEY` unset, or audio format not one Gemini supports |
| `sw.js` still old | Update the SW version cache name (`CACHE_NAME`) and reload twice |
| No push in dev | Make sure `Notification.requestPermission()` returned `granted` and the service worker registered |

---

## Security notes

- The push subscription table has **public** RLS for this open-source demo.
  Before production, restrict `INSERT` to a signed-in resident (see
  `src/context/AuthContext.tsx`) and `SELECT`/`DELETE` to the owner's
  authenticated uid.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose it in the bundle.
- VAPID private key is server-only.
- Audio is transcribed in-memory and never persisted beyond the optional
  `behavior_notes` transcript.

## License
MIT — free to deploy, modify, and share.