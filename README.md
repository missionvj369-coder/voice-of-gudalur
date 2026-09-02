# 🗣️ Voice of Gudalur

> A citizen-led civic platform for **Gudalur, The Nilgiris** — connecting residents, government desks, and forest authorities to solve real problems. **Privacy-first, offline-first, open-source.**

Voice of Gudalur is a model civic-tech reference build: **zero passwords**, on-device Aadhaar eKYC, a government-aligned resident ID (GDR), a petition docket ledger that officials verify, and emergency wildlife-conflict alerts that work even with **no network**.

---

## ✨ Why this is different (the "gateway" story)

| Problem in rural India | How Voice of Gudalur solves it |
|---|---|
| No internet in ghat roads | **PWA + Service Worker + IndexedDB offline queue**; reports sync when signal returns |
| No network at all | **SMS emergency bridge** (works on every phone) + **BLE/WiFi-Direct P2P relay** between phones |
| People can't prove who they are | **Aadhaar QR scan decoded 100% on-device** (Verhoeff check, only last-4 stored) |
| Tribal/regional languages | English · தமிழ் · മലയാളം · ಕನ್ನಡ |
| Govt doesn't trust citizen data | **Official verification portal** with OTP access, RLS-protected views, immutable docket hashes |
| AI in rural context | **On-device Whisper ASR** (Transformers.js) + local-LLM civic guide with Tamil fallback helplines |

---

## 🏗 Architecture

```
src/
├── pages/            # Route-level lazy-loaded pages (code-split via React.lazy)
├── components/       # Shell, NavBar, Aadhaar scan modal, live counter, maps…
├── context/          # Auth (passwordless phone + GDR ID), Language, Proximity alerts
├── lib/              # aadhaarDecoder (offline Verhoeff), supabase, firebase, db (Dexie), security
├── services/         # backgroundSync, peerRelay (BLE), smsBridge, aiService, voice services
├── utils/            # PDF generators, WhatsApp share, petition toolkit
├── data/             # Locality/master data, corridors, manifesto content (en/ta/ml/kn)
└── types/            # Shared TS contracts
server.ts             # Express edge layer: AI proxy, weather, voice transcription, SMS gateway, S3 uploads
netlify/functions/    # WhatsApp intake webhook + storage/voice Netlify functions
supabase/             # Full SQL: schema, RLS policies, triggers, indexes, official-access RPC
docs/                 # Ops runbooks (UIDAI Secure-QR signing-key rotation)
tests/                # Playwright E2E (geolocation-simulated, Chromium + Pixel 7)
```

### Data flow (privacy-first registration)

1. Resident taps **"Get GDR ID"** → camera opens (`html5-qrcode`).
2. Aadhaar QR is decoded **on-device** — `decodeAadhaar()` parses XML attrs, runs Verhoeff checksum, unescapes entities.
3. Only `name`, `phone`, `last4`, `pincode`, locality are sent to Supabase. **The full 12-digit UID never leaves the phone.**
4. The backend generates the GDR ID; the resident is registered with `aadhaarVerified=true`.
5. Petitions/dockets can then be signed and later **verified by officials** through the officials portal (`request_official_access` RPC → OTP → RLS-protected view).

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
npm test             # vitest run — unit tests for Aadhaar decode, SMS bridge, security utils
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

- **Aadhaar:** full number verified on-device and discarded; only `last4` persisted. Decodes legacy XML **and modern Secure QR v2**, verifies the embedded SHA-256 integrity hash plus the UIDAI RSA-2048 signature on-device, with **zero-release key rotation** via Supabase (see [docs/UIDAI_KEY_ROTATION.md](docs/UIDAI_KEY_ROTATION.md)). Entity-safe parsing + Verhoeff checksum.
- **Auth:** passwordless phone login; GDR ID as the civic identity; Supabase RLS gates resident vs official views.
- **Client hardening:** `sanitizeText` (XSS), `checkRateLimit` (anti-spam), `sha256Hex` device fingerprint, OTP-gated officials access.
- **Server:** strict CSP, HSTS, nosniff, frame-deny headers; files stored via S3 presigned uploads.

---

## ⚠️ Known issues & maintenance (honest engineering)

- **UIDAI signing-key rotation:** the newest UIDAI Offline PKI certificate we could obtain (`17022026`) **expired Feb 2026** and UIDAI's site 404s the newer file, so very-recent cards may show *"signature key not matched (key rotation)"*. Every scan is still guarded by the on-device **SHA-256 integrity check**, and the fix is a **one-file drop into `scripts/certs/`** — or a single Supabase row update that rotates keys **without any release**. Full runbook: [docs/UIDAI_KEY_ROTATION.md](docs/UIDAI_KEY_ROTATION.md).

---

## 🙏 The mission

One community · One voice · **The Right to Life (Article 21).**
Built for the people of Gudalur — a model that any *pincode* can adopt to bring citizens, government, and forest authorities onto one interconnected, transparent, offline-first platform.

Initiative by **Universal Guard Trust** · [ugtindia.space](https://ugtindia.space)