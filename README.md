# 🗣️ Voice of Gudalur

> A citizen-led civic platform for **Gudalur, The Nilgiris** — connecting residents, government desks, and forest authorities to solve real problems. **Privacy-first, offline-first, open-source.**

Voice of Gudalur is a model civic-tech reference build: **zero passwords**, phone-based OTP registration, a government-aligned resident ID (GDR), a petition docket ledger that officials verify, and emergency wildlife-conflict alerts that work even with **no network**.

---

## ✨ Why this is different (the "gateway" story)

| Problem in rural India | How Voice of Gudalur solves it |
|---|---|
| No internet in ghat roads | **PWA + Service Worker + IndexedDB offline queue**; reports sync when signal returns |
| No network at all | **SMS emergency bridge** (works on every phone) + **BLE/WiFi-Direct P2P relay** between phones |
| People can't prove who they are | **Phone OTP registration** (10-digit mobile verification, only last-4 stored) |
| Tribal/regional languages | English · தமிழ் · മലയാളം · ಕನ್ನಡ |
| Govt doesn't trust citizen data | **Official verification portal** with OTP access, RLS-protected views, immutable docket hashes |
| AI in rural context | **On-device Whisper ASR** (Transformers.js) + local-LLM civic guide with Tamil fallback helplines |

---

## 🏗 Architecture

```
src/
├── pages/            # Route-level lazy-loaded pages (code-split via React.lazy)
├── components/       # Shell, NavBar, registration modal, live counter, maps…
├── context/          # Auth (passwordless phone OTP + GDR ID), Language, Proximity alerts
├── lib/              # auth (offline OTP), db (Dexie), security
├── services/         # backgroundSync, peerRelay (BLE), aiService, voice services
├── utils/            # PDF generators, WhatsApp share, petition toolkit
├── data/             # Locality/master data, corridors, manifesto content (en/ta/ml/kn)
└── types/            # Shared TS contracts
server.ts             # Express edge layer: AI proxy, weather, voice transcription, SMS gateway, S3 uploads
netlify/functions/    # WhatsApp intake webhook + storage/voice Netlify functions
supabase/             # Full SQL: schema, RLS policies, triggers, indexes, official-access RPC
docs/                 # Ops runbooks
tests/                # Playwright E2E (geolocation-simulated, Chromium + Pixel 7)
```

### Data flow (privacy-first registration)

1. Resident taps **"Get GDR ID"** → phone number entry.
2. A 6-digit OTP is sent to the phone — resident enters it to verify possession.
3. Resident enters name, selects locality, pincode.
4. The backend generates the GDR ID; the resident is registered with `verificationLevel=PHONE_VERIFIED`.
5. Petitions/dockets can then be signed and later **verified by officials** through the officials portal (OTP → RLS-protected view).

---

## 🚀 Run locally

```bash
# 1. Configure env (see .env.example)
cp .env.example .env

# 2. Install and start
npm install
npm run dev          # tsx server.ts (Express + Vite-compatible SPA at :3000)
```

### Quality gates

```bash
npm run lint         # tsc --noEmit — strict type-check of the whole project
npm test             # vitest run — unit tests for OTP auth, security utils
npm run build        # vite build — PWA build, manualChunks + route-split output
npx playwright test  # E2E (Chromium desktop + Pixel 7 mobile)
```

CI (`.github/workflows/ci.yml`) runs **lint → test → build** on every push and PR.

---

## 🧠 Technology that earns the "Google-grade" label

- **On-device ML:** Whisper ASR via `@huggingface/transformers` (WASM/WebGPU) — audio never leaves the phone, works fully offline; Open-Meteo weather (keyless open data).
- **Real-time ledger:** Supabase Realtime WebSocket streams signature/docket counts into the sticky `LiveCounterBar` with zero-latency updates.
- **Offline mesh:** IndexedDB (Dexie) write queue → Background Sync; optional Web-Bluetooth/WiFi-Direct P2P relay for sighting alerts.
- **Serverless intake:** Netlify WhatsApp webhook ingests reports from WhatsApp.
- **Maps/GIS:** MapLibre GL + Leaflet + Turf corridor geometry; cached OSM tiles via Workbox.
- **Print/PDF:** Server-less PDF generation (jsPDF) for policy briefs, petition dockets, and the manifesto.
- **Security headers + CSP** applied to dev/preview servers; RLS on every table; XSS sanitization and sliding-window rate limits on the client.
- **PWA:** auto-updating service worker, offline navigation fallback, installable manifest, push-ready (`web-push`).

---

## 📦 Bundle & Performance

- Route-level `React.lazy` splitting keeps the boot path small (only the landing page loads eagerly).
- `manualChunks` isolate React, maps, Supabase, Firebase, PDF, and AI vendors for stable caching.
- Heavy modules (Whisper WASM, maps, PDF) are dynamically imported and only load when a feature is first used.

---

## 🔐 Security & Privacy posture

- **Auth:** passwordless phone OTP registration and login; GDR ID as the civic identity.
- **Client hardening:** `sanitizeText` (XSS), `checkRateLimit` (anti-spam), `sha256Hex` device fingerprint, OTP-gated officials access.
- **Server:** strict CSP, HSTS, nosniff, frame-deny headers; files stored via S3 presigned uploads.

---

## 🙏 The mission

One community · One voice · **The Right to Life (Article 21).**
Built for the people of Gudalur — a model that any *pincode* can adopt to bring citizens, government, and forest authorities onto one interconnected, transparent, offline-first platform.

Initiative by **Universal Guard Trust** · [ugtindia.space](https://ugtindia.space)