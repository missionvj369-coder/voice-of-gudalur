# FINAL BUILD REPORT — VOICE OF GUDALUR

**Platform:** Citizen-led wildlife safety, evidence & accountability platform for Gudalur, Nilgiris
**Identity:** ONE GUDALUR — *Protect People. Protect Wildlife. Protect Gudalur.*
**Stack:** React 19 · Vite 6 · Tailwind CSS 4 · Supabase JS 2 · React Router 7 · Leaflet · Express (dev/preview server)

---

## IMPLEMENTED

### Phase 1 — Architecture, homepage, navigation
- Real router (`src/App.tsx`): 17 routes incl. 404; app previously rendered a single unreachable page.
- `Shell` rebuilt: simple nav (SAFETY · LOCALITIES · RIGHT TO LIFE · EVIDENCE · ACTION · ABOUT) + REPORT button; mobile-first; honest footer (Privacy/Terms included).
- Homepage hierarchy per spec: Hero (`Gudalur Has a Right to Live Safely.` + 3 CTAs) → GUDALUR SAFETY NOW (3 actions + do-not-approach warning) → Current verified situation → Report/Alerts/Emergency → Map preview → Gudalur 365 → Right to Life → Safety Priorities → Local Safety Nodes → Evidence → Action Tracker → Join/Resident ID → Footer.
- Emergency bar with verified national numbers (112, 108, 100) labelled with source.

### Phase 2 — Incident reporting + moderation
- `/report`: species (Elephant/Tiger/Leopard/Gaur/Other/Unknown), incident type (8 kinds), locality + landmark, date, time, direction of movement, description, optional photo/video upload (Supabase storage), optional contact; safety warning “Only report information you have personally observed…”. Anonymous reporting supported.
- Verification workflow: `REPORTED → UNDER_REVIEW → VERIFIED → OFFICIAL → RESOLVED | REJECTED`; visually distinct badges (`VERIFIED`, `COMMUNITY REPORT — UNDER REVIEW`, `OFFICIAL RECORD`).
- `/admin` (role-gated): review queue with verify/reject + notes, alert creation, evidence registry, action-tracker updates. Ordinary users cannot mark incidents VERIFIED — enforced by DB RPCs, not just UI.

### Phase 3 — Local safety nodes
- `/localities` + `/localities/:slug` — 10 real Gudalur-taluk localities (from verified names: Gudalur Town, O'Valley, Cherambadi, Pandalur, Devala, Nadugani, Thorapalli, Masinagudi, Erumad, Kalethur): current status, recent verified incidents, active alerts, emergency contacts, report + join links. No invented coordinators/phones/member counts.

### Phase 4 — Right to Life + Law & Evidence
- `/right-to-life`: 7 numbered sections (What is happening / Why conflict occurs / What the law provides / What has failed / What Gudalur needs / What citizens can do / Our commitments) + **Sources & Evidence**.
- `/law-and-evidence`: WPA 1972, tiger-reserve core/buffer + NTCA, FRA 2006, ESZ notifications, RTI/CPGRAMS — each entry with official sources; explicit note that no blanket distance-rule exists and relocation requires due process.
- `/evidence`: document room (Supabase-backed records + official portals). No fake documents.

### Phase 5 — Government Action Tracker
- `/government-action`: public tracker with statuses `SUBMITTED / ACKNOWLEDGED / RESPONSE RECEIVED / ACTION REPORTED / FOLLOW-UP REQUIRED`; citizens submit tracked questions (auto ref `ACTION-YYYY-NNNN`); admins record responses. No “government failure” claims without evidence.

### Phase 6 — Resident ID + alerts
- GUDALUR RESIDENT ID kept (phone-only registration, unique GD ID) with the required disclaimer: *“This is a citizen/community platform ID and is not a government identity document.”* Phone/address never displayed publicly.
- `/alerts`: verified alert list (RECENT / VERIFIED labels — no fake LIVE), subscription by locality + topics (elephant/tiger/emergency/civic) + language (EN/TA/ML), phone stored once, masked confirmation, never shown publicly.

### Phase 7 — Safety map architecture
- `/safety-map`: Leaflet/OSM via provider abstraction (`src/lib/mapProvider.ts` — switchable to Google/Mapbox/custom by env); layer plan incl. corridors/schools/hospitals marked “requires verified data”; public coordinates fuzzed to locality level; precise coordinates admin-only.
- Home/map show only verified records with status; locality-level reference, never precise animal locations.

### Supporting systems
- `/act`: representation generator (9 concern categories → professional letter with date/locality/evidence/requested action/legal basis), full preview + recipient list shown before any mail client opens; auto-fills sender's Resident ID; copies cleanly on mobile.
- Language system (EN/TA/ML/KN) retained for kept surfaces; PWA manifest + service worker retained; ErrorBoundary + OfflineIndicator retained.


## REMOVED (intentionally)
- **27 dead pages** (unreachable from the old single-page app): Admin(old), AIGuide, BusTimings, Community, Directory, Government(old), GovtChannels, History, Home(old), Issues, KnowledgeHub, Live, Localities(old), Login, Manifesto(old), Market, NewReport, Petitions, Places, Profile, Reports, Services, Shop, StoryOfGudalur, Volunteers, Welcome, WildlifeHub.
- **10 orphaned components**: GrievanceTrackerModal, GudalurLiveBar, LogWildlifeModal, ReportIssueModal, SupportPetitionModal, PetitionProgressBar, CommentSection, AlertMap, LocalityMap, ReportWildlifeModal.
- **Legacy Firebase layer**: `lib/firebase.ts`, `firestore.rules`, both firebase JSON configs, `firebase` dependency.
- **Invented data**: fake locality coordinators + phone numbers, fake WhatsApp group links, fake member/petition counters, hard-coded fake alerts/petitions, unused AI-guide/bus/market/service translations, `server.ts` weather/chat proxy (axios + Gemini deps removed from package.json).
- **Unused dependencies**: firebase, canvas-confetti, @google/genai, axios, zod, react-hook-form, @hookform/resolvers.

## STILL REQUIRES EXTERNAL DATA
- Verified incident/alert content — needs the Forest Department's public communications or an on-ground verifier network before real records appear (UI shows honest `DATA NOT YET AVAILABLE` empty states until then).
- Wildlife corridor / school / hospital layers — require official boundary and point datasets (marked disabled in the layer plan).
- ESZ notification text for Mudumalai — will be published only when the Gazette document is obtained and verified.
- Live wildlife detection — deliberately not promised; the alert feed is admin-verified, not sensor-fed.
- News aggregation — no news source configured; no fake "live news" built.

## DATABASE (Supabase — `supabase/v2_platform_schema.sql`)
- Tables: `wildlife_incidents` (v2 workflow fields), `alerts`, `localities`, `evidence_documents`, `government_actions`, `alert_subscriptions` (+ existing `users`, `manifesto_dockets`).
- RPCs: public `get_public_incidents`, `create_incident_report`, `get_public_alerts`, `submit_gov_action`, `subscribe_alerts`, `get_platform_stats`; admin `admin_list_incidents`, `admin_update_incident`, `admin_upsert_alert`, `admin_add_evidence`, `admin_update_action`.
- Apply once via Supabase SQL Editor (idempotent). Legacy `wildlife_incidents` auto-archived as `wildlife_incidents_legacy_backup` if present.

## SECURITY
- RLS enabled on every table; `wildlife_incidents` has **no public SELECT** — the public path reads only through `get_public_incidents()` which strips latitude/longitude and reporter identity; inserts forced to `REPORTED/CITIZEN`.
- Admin mutations go through `SECURITY DEFINER` RPCs gated by `is_platform_admin(uid, phone, gudalur_id)` against the users table role.
- `alert_subscriptions`: insert-only for public; phone numbers never readable publicly.
- Reporter contact optional & private; file uploads via Supabase storage path-scoped by user/incident; server.ts keeps CSP/HSTS/X-Frame-Options headers; no precise wildlife coordinates public anywhere in the client.

## TEST RESULTS
| Check | Command | Result |
|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Production build | `npm run build` | built (vite 6) — app 419 kB (126 kB gzip) + vendor chunks react/maps/supabase |
| Route validation | `src/App.tsx` | 17 routes, all imports resolve |
| Lint | `npm run lint` (= tsc --noEmit) | pass |
| Schema | manual SQL review | idempotent DDL, RLS + RPCs verified by read-through |
| Mobile viewport | manual — 16px inputs, single-column layouts, sticky nav | pass |
| Console errors | build clean; no dev-server runtime warnings observed | pass |

## KNOWN LIMITATIONS
- Incident/alert/map content is empty until the Supabase schema is applied and verified data is entered — by design, not a bug.
- Admin auth is identity-triple based (uid + phone + Gudalur ID with role), not Supabase Auth sessions — adequate for a small trusted verifier team, not for large admin orgs.
- Map is OSM-only until a commercial provider key is configured (abstraction ready).
- Full a11y audit (screen-reader passes) not yet performed; WCAG-minded markup (labels, roles, focus states, alt text) is in place.

## NEXT STEPS
1. Run `supabase/v2_platform_schema.sql` in the Supabase SQL Editor.
2. Create the first CORE_ADMIN user row (set `role='CORE_ADMIN'` on the resident).
3. Enter verified locality records + first real evidence documents via `/admin`.
4. Configure `VITE_MAP_PROVIDER`/tiles if a premium basemap is wanted.
5. Optional: Supabase Edge Function/cron for subscription notifications (SMS/WhatsApp) once a provider is contracted.
