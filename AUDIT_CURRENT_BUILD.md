# AUDIT — CURRENT BUILD (voiceofgudalur.netlify.app)

Audit date: 2026-08-28 · Branch: main · Stack: React 19 + Vite 6 + Tailwind CSS 4 + Supabase JS 2 + React Router 7 + Leaflet + Express (dev server)

## What the build actually is today

`src/App.tsx` renders **only the Manifesto page** inside a `Shell`. React Router is imported but **no `<Routes>` exists**. 26 page components, 15 tables of Supabase schema, and a whole Firebase layer exist but are **unreachable dead code** from the app entry point.

---

## KEEP (valuable, connected, working)

| Item | Why |
|---|---|
| `src/lib/supabase.ts` — client, `db` layer, helpers | Real configured Supabase project, snake/camel helpers, storage upload for wildlife media, realtime subscriptions |
| `src/context/AuthContext.tsx` | Phone-only registration, unique `GD-YYYY-######` Resident ID issuance, locality binding, privacy-first (phone never public) |
| `src/components/GudalurIdModal.tsx` + `Auth/*` modals | Working Gudalur Resident ID card flow (register/login) — becomes **GUDALUR RESIDENT ID** |
| `src/components/Manifesto/SendEmailModal.tsx` | Government representation generator (mailto, copy-to-clipboard, sender identity from Resident ID) — becomes the engine of `/act` |
| `src/data/manifestoData.ts` + `manifestoUi.ts` | Genuine 4-language (EN/TA/ML/KN) manifesto content — source material for `/right-to-life` |
| `src/data/emailPetitionData.ts` | Recipient lists + multi-language petition body — needs verification flags, structure kept |
| `src/utils/manifestoPdfGenerator.ts` | Working PDF export of the manifesto |
| Locality names in `src/data/gudalurMasterData.ts` | Real Gudalur taluk place names, Tamil names, pincodes, administrative parents (contacts inside are fabricated → IMPROVE) |
| `src/components/ErrorBoundary.tsx`, `OfflineIndicator.tsx` | Solid UX infrastructure |
| `public/` (sw.js, manifest.json, robots.txt, sitemap.xml, favicon) | PWA + SEO basics |
| `server.ts` security headers | CSP, HSTS, X-Frame-Options already correct |
| Language system (`LanguageContext`) | EN/TA/ML/KN switching already wired |

## IMPROVE (retain but rebuild)

| Item | Action |
|---|---|
| `wildlife_incidents` table | Rebuild: add `incident_type`, `species`, `verification_status` workflow (REPORTED→UNDER_REVIEW→VERIFIED→OFFICIAL→RESOLVED/REJECTED), `event_date/time`, `direction`; no public precise coordinates |
| `alerts` table | Add `instruction`, category enum (ELEPHANT/TIGER/EMERGENCY/CIVIC), locality scoping, admin-only writes |
| RLS on **all 15 tables** | Currently `for all using (true)` — wide open. Rebuild with role-based policies + `is_platform_admin()` helper |
| `Shell.tsx` | Rebuild: new navigation (SAFETY / LOCALITIES / RIGHT TO LIFE / EVIDENCE / ACTION / ABOUT + REPORT button), calm light theme, real footer |
| `Manifesto.tsx` | Restructure into `/right-to-life` — 7 numbered sections + Sources & Evidence, keep endorsement + PDF + email flows |
| `emailPetitionData.ts` recipients | Add per-recipient `verified` status; UI must warn on unverified addresses |
| `index.html` SEO | Rewrite for Voice of Gudalur safety identity |
| `gudalurMasterData.ts` | Split: real localities → `data/localities.ts`; **remove invented coordinator names/phones/WhatsApp links/member counts** |

## REMOVE (dead, misleading, or against data-integrity rules)

**25 orphaned pages** (unreachable — App.tsx renders only Manifesto):
`Admin, AIGuide, BusTimings, Community, Directory, Government, GovtChannels, History, Home(old), Issues, KnowledgeHub, Live, Localities(old), Login, Market, NewReport, Petitions, Places, Profile, Reports, Services, Shop, StoryOfGudalur, Volunteers, Welcome, WildlifeHub`

**Orphaned components:** `GrievanceTrackerModal, GudalurLiveBar, LogWildlifeModal, ReportIssueModal, SupportPetitionModal, Petition/PetitionProgressBar, Engagement/CommentSection, Map/AlertMap, Map/LocalityMap, Wildlife/ReportWildlifeModal`

**Legacy Firebase layer** (only referenced by orphans): `lib/firebase.ts`, `firestore.rules`, `firebase-*.json`, `firebase` dependency


**Fake/invented data violating the absolute data-integrity rule:**
- Invented locality coordinators ("K. Rajendran +91 94430 89101"…), invented WhatsApp group links, invented member counts (650/420…)
- Hard-coded `INITIAL_URGENT_ALERTS` / `INITIAL_PETITIONS` fake content
- LanguageContext translations for features that no longer exist (AI Guide, Bus Timings, Market…)
- `utils/geoUtils.ts, pdfGenerator.ts, whatsappShare.ts`, `services/geminiService.ts` (orphans only)
- Unverifiable email recipients must be flagged, not silently presented as official

**Dependencies to drop:** `firebase`, `canvas-confetti` + `@types/canvas-confetti`, `@google/genai` + `axios` (server chat/weather only), `zod` / `react-hook-form` / `@hookform/resolvers` (unused by kept code). `leaflet`/`react-leaflet` **kept** for `/safety-map`.

## BUILD (missing, required by the new architecture)

1. **Routing** — real `<Routes>` for: `/`, `/report`, `/alerts`, `/safety-map`, `/localities`, `/localities/:slug`, `/gudalur-365`, `/right-to-life`, `/law-and-evidence`, `/evidence`, `/government-action`, `/act`, `/about`, `/admin`, 404
2. **Homepage** — hero → Safety Now → verified situation → Report/Alerts/Emergency → map preview → Gudalur 365 → Right to Life → Priorities → Local nodes → Evidence → Tracker → Join → footer
3. **`/report`** — full incident form per spec (species, incident type, locality, landmark, date, time, direction, description, optional evidence upload, safety warning)
4. **Verification model + status badges** everywhere (`VERIFIED`, `COMMUNITY REPORT — UNDER REVIEW`, `OFFICIAL RECORD`)
5. **`/safety-map`** — Leaflet map with provider abstraction, public coordinates fuzzing (locality-level), restricted precision
6. **`/localities/:slug`** — safety nodes (status, incidents, alerts, emergency contacts, report, join)
7. **`/gudalur-365`** — MONITOR/PROTECT/RESPOND/RECORD/ANALYSE/PREVENT/RESTORE model
8. **`/right-to-life`** — 7 sections + Sources & Evidence
9. **`/law-and-evidence`** — WPA 1972, NTCA, FRA 2006, ESZ context, no fabricated legal claims, source-linked
10. **`/evidence`** — document room (Supabase-backed, honest empty states)
11. **`/government-action`** — action tracker (SUBMITTED→ACKNOWLEDGED→RESPONSE_RECEIVED→ACTION_REPORTED→FOLLOW_UP_REQUIRED)
12. **`/act`** — representation generator (categories, professional letter, recipients preview before send)
13. **`/alerts`** — subscription (locality, topics, language EN/TA/ML), RECENT/VERIFIED labels not fake LIVE
14. **`/admin`** — incident verification/rejection, alert creation, evidence/action management (role-gated UI + RLS)
15. **Supabase v2 schema** — `wildlife_incidents v2, alerts, localities, evidence_documents, government_actions, alert_subscriptions` + RLS + `is_platform_admin()`
16. **Emergency contacts** — verified national numbers (112, 108, 100) + TN Forest RRT with source labels
17. **GUDALUR RESIDENT ID** positioning + "not a government identity document" notice
