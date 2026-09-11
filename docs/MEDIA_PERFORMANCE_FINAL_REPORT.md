# VOICE OF GUDALUR — Media Performance Emergency Report

**Date:** 2026-09-10 · **Branch:** main · **Scope:** emergency mobile-first media delivery, no architecture changes

---

## 1. Actual media delivery architecture (unchanged in shape, hardened in behavior)

```
Admin upload ──POST /api/media──▶ Netlify function ──S3 Put──▶ Storj bucket "vog" (key: media/<uuid>.<ext>)
                                                       └──▶ CockroachDB media_posts (metadata only)

Visitor ──GET /api/media?limit&offset──▶ Netlify function ──▶ ONE cached CockroachDB query ──▶ compact JSON
        └─ browser fetches FILE BYTES directly from Storj (raw public link or presigned gateway URL)
GET /api/media/:id/file ──302 + no-store──▶ same Storj URL (never 301)
```

- Netlify serves the PWA + API function; media bytes never transit it (function cap ~6 MB).
- CockroachDB stores metadata only; `data_url` base64 rows are legacy and are never selected for the public list.
- Storj URL resolution: `getMediaUrl()` prefers the **public `/raw/` link** but only after a **bounded in-process health probe** (HEAD, 4 s timeout, cached 10 min — never per item, never per visitor); otherwise it serves **presigned gateway URLs** (1 h validity, reused 50 min per key via an in-process cache).

## 2. Storj public-grant condition

- **2026-09-10 (latest):** a NEW public access grant was provided and verified working —
  `https://link.storjshare.io/raw/jwjnus2uult6vkt6akh7wmnmncra/vog/media/<id>.png` returns **HTTP 200, `image/png`** for a real poster (2,566,784 bytes verified). `STORJ_PUBLIC_LINK_BASE` must be set to `https://link.storjshare.io/raw/jwjnus2uult6vkt6akh7wmnmncra/vog` (the code also normalizes `/s/`→`/raw/` and strips an accidental trailing `/media`).
- **Earlier same day:** the previous grant (`jwx5xkbqglx4xwwvgp2wdc3ipiwa`) returned **HTTP 401 for every public URL** — revoked/misconfigured in Storj. While it was broken, the probe marked the grant unhealthy and **all media URLs fell back to hourly presigned gateway URLs** (media loaded, but long-lived caching was limited).
- **Operational safeguard:** admin-only `GET /api/media/storage-health` (ADMIN/PLATFORM_ADMIN) reports exactly: `publicGrantConfigured`, `publicGrantHealthy`, `lastHealthCheckAt`, `presignedFallbackActive`. It exposes no keys, secrets, presigned URLs or connection details. Public visitors never call it.
- **Self-healing:** once the env var points at the healthy grant (and after the next deploy/restart), the probe flips to healthy within 10 minutes and stable `/raw/` URLs resume — no code change needed.

## 3. Files changed in this emergency work

| File | Change |
|---|---|
| `server/services/mediaPresenter.ts` | NEW — pure presenter: whitelisted fields only (base64 structurally impossible), description trimmed ≤280, `/s/`→`/raw/` hard guarantee, window clamping (limit ≤50) |
| `server/services/storj.ts` | `getPublicUrl` normalizes `/s/`→`/raw/`; `getMediaUrl` = probe-gated public URL + cached presigned fallback; `probePublicLink`/`getPublicLinkStatus` diagnostics |
| `server/routes/media.ts` | `/api/media`: ONE bounded query (`LIMIT 50` + `COUNT(*) OVER()`), 10 s TTL cache, per-request window slices (`?limit/?offset`), compact payload, `total`; admin-only `/storage-health`; earlier commit: 302 + no-store redirect |
| `src/services/api.ts` | `mediaApi.listPaged(limit, offset)` → `{items, total}`; `list()` preserved for greeter/admin |
| `src/utils/mediaAttrs.ts` | NEW — `VIDEO_PRELOAD='metadata'`, `cardImgAttrs()` (first card eager+high priority, rest lazy+async), `retryUrl()` |
| `src/utils/mediaPerf.ts` | NEW — non-sensitive in-memory perf marks (`window.__vogMediaPerf`), one console summary, **no DB/network writes** |
| `src/components/ShareSocial/MediaGallery.tsx` | `MediaCard` per-card skeleton/error/retry (isolated), zero-byte video play tiles, `content-visibility:auto` beyond card 6, "Load more" bounded pagination |
| `src/components/ShareSocial/MediaViewer.tsx` | video `preload={VIDEO_PRELOAD}` (metadata, user-initiated playback) |
| `src/pages/SignPetitionPage.tsx` | bounded first window (6), `mediaTotal`, `loadMoreMedia()`, gallery props wired; page renders independently of media fetch |
| `vite.config.ts` | SW cache `vog-media-cache-v2` caches ONLY `content-type: image/*|video/*` responses — HTML/error pages can never be cached as media again |
| tests | `server/services/storj.test.ts`, `server/services/mediaPresenter.test.ts`, `src/utils/__tests__/mediaAttrs.test.ts`, `server/routes/media.contract.test.ts` |

Note: `netlify/media/service/petition.ts` (named in the incident brief) does not exist in this repository — the media route lives at `server/routes/media.ts`; audited there.

## 4. Before → after (measured)

| Metric | Before | After |
|---|---|---|
| Media collection | 31 items / 81,694,517 B (≈81.7 MB), 0 thumbnails | unchanged (no risky migration today) |
| `/api/media` response | all items, unbounded query, long descriptions (~31 KB JSON) | windowed (`?limit`, default 24), descriptions ≤280, whitelisted fields, `total`; initial client fetch = **6 items** |
| Gallery open (modal) | rendered ALL 31 cards; video cards had `<video preload="metadata">` (bytes on open) | renders the loaded window; **video cards download 0 bytes** (static play tile); posters: 1st eager+high priority, rest `loading="lazy" decoding="async"` |
| Initial page load | fetched full list on mount | fetches 6-item window fire-and-forget; **CTA renders immediately**; media-fetch failure cannot block the page |
| Failed media | broken-image icon in grid | per-card error state + ↻ retry (cache-busted), siblings unaffected |
| Video preload | `metadata` in viewer only | `metadata` in viewer only (cards have no `<video>` at all); never `auto`, never autoplay |
| SW media cache | could cache non-media responses | only successful `image/*|video/*` responses, versioned cache v2 |
| `/api/media/:id/file` | 301 (could pin browsers to expiring URLs) | **302 + `Cache-Control: no-store`** |
| CockroachDB reads per gallery view | 1 query / 10 s (cached) | unchanged — windows are slices of the cached list, zero extra queries |
| Analytics writes | none | still none (perf marks are in-memory only) |

## 5. Known limitations (honest)

1. **No thumbnails/variants yet** — every card lazy-loads the original (2–3 MB) PNG when scrolled into view. Bounded windows + lazy loading limit the *initial* cost, but a full gallery scroll still moves ~80 MB. Next improvement: generate small variants into `variants_json` (migration 010 columns already exist) and serve those in cards.
2. **Public grant 401** — presigned fallback works but URLs rotate hourly, so browser/SW long-caching of media bytes is limited until the grant is repaired (the app self-heals when it is).
3. On-page 9-card preview (SignPetitionPage) keeps its original markup — lazy + aspect-ratio boxes, but without per-card retry (the gallery modal has it). Left untouched to minimize risk.
4. Duplicate `/api/media` request from the AI greeter remains (separate component, CDN-cached 10 s; payload now compact). Deduplication deferred — not worth the risk today.

## 6. Regression test index

- `getPublicUrl` `/s/`→`/raw/`, `/raw/` unchanged, never `/s/`, empty-when-unset, diagnostic leaks no credentials — `server/services/storj.test.ts`
- presenter: whitelisted fields only (no base64), description cap, `/s/` never emitted, pgwire number normalization, window clamping — `server/services/mediaPresenter.test.ts`
- `VIDEO_PRELOAD !== 'auto'`, priority only on card 0, lazy elsewhere, retry URL — `src/utils/__tests__/mediaAttrs.test.ts`
- contract pins: 302 + no-store (never 301), presenter + `LIMIT` bound in route, `data_url` never selected, admin-only diagnostic leaks nothing, SW v2 + content-type filter, external-supporter route intact, Aadhaar-gated signing intact, page bounded fetch + independent render, gallery never `preload="auto"` + per-card failure, probe bounded/cached — `server/routes/media.contract.test.ts`

## 7. Test & build results

- `npm run lint` (tsc --noEmit): **PASS** — no errors
- `npx vitest run`: **72/72 tests passing across 11 files** (42 pre-existing + 30 new regression tests)
- `npm run build` (vite): **PASS** — `dist/sw.js` generated with `vog-media-cache-v2`
- Security greps: no `preload="auto"`; no `/s/` URLs emitted to clients (only the normalizer's strip-target strings); no secrets in tracked files