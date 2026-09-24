# Voice of Gudalur - Petition Site: LIVE READINESS

**Date:** 2026-09-24 (rev. 6 - the rev. 5 one-screen page, finished: a poster that actually paints, reduced-motion that actually holds the still, dead CSS and 1.1 MB of unused loops removed, security headers closed to third parties)
**Scope:** `static-petition/` standalone emergency-petition page (Tamil / English / Malayalam / Kannada)
**Status:** READY FOR LIVE - **no blocker**. One screen, first-party only, 8 files / 2,045 KB on disk, ~1,330 KB on a first visit, LCP 856-1,096 ms, CLS 0.0065-0.0090.

---

## 1. What this page is

A self-contained static page (no backend, no auth, no database) that drives
signatures to the Mudhalvarin Mugavari grievance **18982473** through a third
party signature platform. It is NOT part of the main Vite app: nothing in
`server/` or `netlify.toml` references `static-petition/`, and Netlify publishes
`dist/` only. This folder must be deployed as its OWN site (see section 6).

Contents (**8 files, 2,045 KB on disk; 1,330 KB on a first visit** - HTML + the
hero encode the browser can decode + poster + logo + fonts):

| File | Bytes | Notes |
|---|---|---|
| `index.html` | 25,491 | the whole page; one screen - heading rotator (8 headlines, ta/en/ml/kn, read out loud) + 2 sign buttons + grievance id in the top-right stack + voice pill, over one full-bleed film |
| `media/bg-hero.av1.mp4` | 1,208,664 | the hero loop: AV1 1280x720, 5.04 s seamless loop; the first `<source>`, so AV1-capable browsers (Chrome / Firefox / Edge) take it |
| `media/bg-hero.h264.mp4` | 709,661 | H.264 1280x720 fallback for browsers without AV1 (Safari, older WebKit) |
| `media/bg-hero.jpg` | 100,319 | 1280x720 poster, 1.7778 - the film's own aspect ratio. Painted twice over: as the `.bgpic` CSS background (the elephant shadow is on screen from the first frame, even when autoplay is refused) and as the `og:image` social card |
| `media/logo-voice.webp` | 6,072 | brand mark beside the wordmark (was a 131,024 B PNG) |
| `fonts/montserrat.woff2` | 26,596 | self-hosted subset (400/500/600/700) |
| `fonts/inter.woff2` | 14,920 | self-hosted subset |
| `_headers` | 2,509 | cache/security headers (see section 6) |

The 15.4 MB autoplay pair is gone for good - and so are the two capped tiger
loops that replaced it (1,089,398 B of AV1/H.264 plus 102,525 B of stills). The
page has been a single hero film since rev. 5, so shipping them meant deploying
bytes nothing referenced; they are parked in `.tmp/backup-media/capped-loops/`
(section 8). Cinzel was retired at rev. 4 - every wordmark uses the same
Montserrat subsets as the content.

## 2. Content

- The rotator carries the approved copy (the two bands tabled below); the four
  language *slides* that used to hold the long body text (grievance 18982473,
  wildlife corridors, real-time early warning, permanent measures within
  30-180 days, "Stand with Gudalur. Sign now.") were removed at rev. 5 - the
  rollback copy is noted in section 8.
- Fixed order: **Tamil -> English -> Malayalam -> Kannada**. (The copy was
  supplied in the order ta/ml/kn/en; the page order was left as built.)
- The sign button(s) point at the external signature platform and are intact.
- No localhost / file:// / placeholder / TODO strings remain in the markup.

**Rev. 5 (2026-09-24) - what the screen shows now.** The content box is gone; the
rotator carries both approved bands, ta -> en -> ml -> kn each time:

| # | Band | Dwell |
|---|---|---|
| 1-4 | "Gudalur is living in fear." (four languages) | 7 s |
| 5-8 | `GUDALUR: 95 LIVES LOST \| TAMIL NADU: 720 \| INDIA: 7,868 (2009-2025)` (four languages) | 9 s |

Both sign buttons point at `https://c.org/JnjH68G57Q` - **"Sign Petition"** plus
the Tamil label taken from the app's own `mnu.sign_petition` string - and the
grievance number (`Grievance ID: 18982473` / `மனு எண்: 18982473`) sits under
them. Each headline is also spoken in its own language (section 4.4).

Every byte count in this document is the rev. 6 inventory, re-measured on
2026-09-24 with `node .tmp/verify-ship.mjs`. `index.html` went 35,907 -> 28,871
(rev. 5, the card and slides removed) -> 25,491 bytes (rev. 6, dead CSS trimmed).
Figures quoted in the rev. 2-5 sections below describe the layout of those
revisions, not this one.

## 3. Remaining blocker

**None.** The previous revision of this document tracked two YouTube embeds that
still held the placeholder ID `M7lc1UVf-VE`. Those embeds, the card that hosted
them and the reel that drove them were all removed at rev. 5 - the page is one
screen now - so there is no video ID to swap and nothing waiting on an upload.

If films are ever put back on this page, two things have to happen together (the
first is noted in `static-petition/_headers`): re-open `frame-src` (and `img-src`
for the thumbnail host) in the CSP, because rev. 6 closed them to
`frame-src 'none'` / `img-src 'self' data:`, and re-run `.tmp/verify-ship.mjs` -
its "one host, nothing else" check is what keeps this page first-party.

## 4. Verification - go-live gate

Five local harnesses, all run against `.tmp/serve-static.mjs` (the static server
applies the real `_headers`, so CSP and caching behave as in production). Latest
run 2026-09-24, rev. 6:

| Harness | What it proves | Result |
|---|---|---|
| `.tmp/balance.mjs` | the markup is balanced (div / p / h1 / button / a / span / style / script open == close), the removed card / track / dots / slide strings are really gone, LF-only, expected size | 18/18 PASS |
| `.tmp/audit-css.mjs` | no stylesheet rule can fail to match: every class selector the CSS defines exists in the markup or is put there by the page's own scripts (`live`, `crow`, `fade`, `on`) | 0 dead selectors |
| `.tmp/verify-simplify.mjs` (browser) | the rev. 5 screen contract: no card / track / dots, the Tamil fear heading on screen with `lang=ta`, both sign buttons and their href, the grievance id, the voice pill (auto-speak, mute, restore), a full eight-headline rotation with `lang` switching and the compact toll style, a blocked-voice run proving the first gesture retries (and a sign-button click does not), the film live on a phone, desktop + phone screenshots | 31/31 PASS |
| `.tmp/verify-ship.mjs` (browser) | what ships and what it costs: every referenced asset present, nothing shipped unused, exactly the two hero encodes, per-file caps, first visit under budget; then per viewport (1280x800 and 390x844): no console/page error, no 4xx and no failed request, **one host only** (nothing third-party anywhere), the film decoding with its clock advancing, the `.live` crossfade, the poster background loading 200, no horizontal overflow, LCP and CLS, and the crop (centred landscape, 92% on the elephant shadow in portrait) | 31/31 PASS |
| `.tmp/probe-reduced.mjs` (browser) | `prefers-reduced-motion: reduce` really stops everything: CTA heartbeat / shimmer / sheen, film drift, voice equalizer, and the loop itself is paused and never gets `.live`, so the poster frame is what shows | 11/11 PASS |

Measured on the local preview (desktop 1280x800 / phone 390x844): transfer
1,349.7 KB both (HTML uncompressed locally - ~1,330 KB behind Cloudflare/Netlify
brotli), LCP 1,096 ms / 856 ms, CLS 0.0065 / 0.0090.

Screenshots land in `.tmp/`: `ship-desktop.png`, `ship-phone.png`,
`verify-reduced.png`, `verify-simplify-desktop.png`,
`verify-simplify-mobile.png`, `verify-simplify-mobile-live.png`.

### 4.0 The rev. 4 gate, as it ran then (historical)

`node .tmp/verify-all.mjs` ran every harness of that revision and printed one
verdict. Latest run (2026-09-18, rev. 4): **5/5 checks passed, 1 retired ->
READY FOR LIVE (pending real video IDs)**. The rows below describe the rev. 4
eight-slide card layout; `verify-content2.mjs`, `verify-theme.mjs`,
`probe-fit.mjs` and `verify-weight.mjs` all target DOM that rev. 5 removed, and
`verify-ship.mjs` + `probe-reduced.mjs` replaced the last of them at rev. 6.

| Check | What it proves | Result |
|---|---|---|
| preview server + live page | HTTP 200, grievance id present, 2 embeds present | PASS |
| content (8 slides, exact) | 4 language slides match the supplied copy exactly AND the 4 crisis slides carry the toll headline (95 / 720 / 7,868, period 2009-2010), national-crisis body, grievance ID and STAND WITH US tag in all four languages; grievance number appears 12x; per-slide dwell 12 s (languages) / 14 s (crisis); sonar pulse + heartbeat + ember pulse present; reduced-motion fallback; plus the structural assertions (CTA href, facade wiring, LF-only, no U+FFFD) | 77/77 PASS |
| theme | header/footer share one translucent glass background over the film, divider lines == text colour, wordmark == Montserrat 700 mixed case (actually downloaded, same font as the content headings), footer text >= 4.5:1 WCAG AA (also covers the crisis palette: white on charcoal/crimson) | 9/9 PASS |
| fit | 48 cells (6 viewports x 8 slides) - no headline/slide text clipped, rotator never overflows | PASS |
| weight + first-visit budget (`verify-weight.mjs`) | every referenced asset exists, nothing ships unused, mp4s are exactly the four capped bg loops (each < 600 KB), no non-video file over 200 KB, first visit 221.4 KB (sampled before the loops start), loops add +600 KB streaming after load (< 1.7 MB cap), **two bg loops actually playing (time + decoded frames advance, AV1 selected)**, zero console errors / 4xx / failed requests, no third-party host on load, both 2560 px stills + both WebP fallbacks decode, fonts limited to the shipped subsets, two facades with no iframe `src` until play, cards side by side at 1280 px and 360 px, pressing play loads the embed on demand | 24/24 PASS |
| fidelity vs reference build | RETIRED at rev. 2: the mp4 -> still swap proof stands (commit 9c142e9 - SSIM 0.31/255, 16/16 layout boxes to 0.5 px), and the page has since been intentionally extended (8 slides, crisis styling, animated CTA), so "identical to the old build" is no longer a valid criterion. Background/layout regressions are still caught by the weight and fit checks. | SKIP (retired) |

Screenshots regenerated by the harnesses land in `.tmp/`:
`gate-slide-<lang>[-cr]-<viewport>.png`, `theme-desktop.png`, `theme-mobile.png`.

### 4.1 Rev. 2 changes (2026-09-18)

- **Slide timing doubled with readable dwell**: rotator advance 6 s -> **12 s**
  per language slide and **14 s** for the denser crisis slides (per-slide `DUR`
  array, not one global timer); the first advance is no longer hard-coded to
  6 s and the post-interaction hold is 3 ticks.
- **Crisis slides 5-8** (ta/en/ml/kn) appended after the four language slides:
  toll headline (`GUDALUR: 95 LIVES LOST | TAMIL NADU: 720 | INDIA: 7,868`),
  national-crisis body, grievance ID, `STAND WITH US.` tag - on an
  ember/charcoal ground with a slow crimson radial pulse (`.slide.cr`), flipping
  the emotional register from the calm green of slides 1-4 to urgency.
- **Rotator heads 5-8**: "This is now a national crisis." in the four languages.
- **CTA animation**: heartbeat (2.4 s) layered over the gradient shimmer, hover
  lift, and sonar rings expanding from behind the button like sound waves from
  the mic - the "Voice of Gudalur" motif; all of it disabled under
  `prefers-reduced-motion`.
- Harnesses updated in lockstep: `verify-content2.mjs` (77 checks, incl. toll +
  STAND WITH US per language and dwell assertions), `probe-fit.mjs` (8 slides x
  6 viewports), `verify-all.mjs` (fidelity check retired).

### 4.2 Rev. 3 changes (2026-09-18)

- **Background film restored.** The "video not playing" report was about the
  stills-only swap from the weight pass, not the YouTube embeds. The two forest
  loops are back as **AV1 (1280 px - the resolution the original site shipped -
  0.75x cinematic slow-motion, seamless 1 s crossfade loop)** with H.264
  fallbacks: 319 + 282 KB AV1, 204 + 167 KB H.264, ~605 KB streamed vs the
  15.4 MB autoplay pair they replaced. Loading contract: the stills paint
  instantly (poster role), the videos carry `preload="none"` and start only at
  `load` + 300 ms, then crossfade in over the stills; a slow 30 s drift
  (scale 1 -> 1.07) plus a radial vignette give the IMAX feel;
  `prefers-reduced-motion` keeps the still frame.
- **8K / IMAX tiers**: at >= 1800 px and >= 3000 px viewports the composition
  scales up (card 660 / 880 px, larger type, bigger stage and CTA) so an 8K
  panel gets the same layout as a laptop instead of a 520 px island.
- **Header wordmark**: "Voice of Gudalur" now renders in mixed case (Cinzel 800,
  V and G capitals) - the `text-transform: uppercase` is gone.
- **Death-count period**: the crisis headlines now read `... 7,868 (2009-2010)`
  in all four languages, and the content gate asserts the period.
- Harnesses evolved with the design: two-phase transfer budget (first visit vs
  streamed loops), a 600 KB per-loop cap, and hard "loops playing" +
  "AV1 selected" proofs in `verify-weight.mjs`; stills regenerated at 2560 px
  (AVIF) / 1920 px (WebP) via `.tmp/make-media-8k.py`.

### 4.3 Rev. 4 changes (2026-09-18)

- **Full-bleed IMAX film.** The two loops moved out of the centre column into a
  fixed full-viewport `.film` layer behind the entire page, and the header and
  footer became translucent glass bars (`--glass` gradient + `backdrop-filter:
  blur(14px) saturate(1.15)`) floating on the footage edge to edge. The drift
  eased to 34 s (scale 1 -> 1.08) and the vignette deepened slightly.
- **Wordmarks**: header and footer now use **Montserrat 700, mixed case**
  ("Voice of Gudalur" - V and G capitals), the same font as the content
  headings. Cinzel was removed entirely (@font-face, preload, file, and its
  harness assertions updated to Montserrat).
- **Logo spacing**: the stage badge carries `margin-top: 10px` so it can never
  crowd the header bar.
- **CTA voice bars**: five animated bars (an equalizer) inside the button -
  your signature adds a voice to the wave; they speed up on hover, the label
  tracks out, and everything stops under `prefers-reduced-motion`. Sonar rings
  + heartbeat retained.
- **Scaling tiers**: new `min-width: 1500px` tier (card 580 px, larger type)
  between the base layout and the 1800 px / 3000 px tiers, so Full-HD and 8K
  panels alike keep the IMAX composition.
- Gate: content 77/77, theme 9/9 (wordmark assertions now Montserrat), fit
  48 cells clean, weight 24/24 - first visit 221.4 KB, loops +600 KB streamed.

### 4.4 Rev. 5 changes (2026-09-24)

- **One screen, no content box.** The `.card` / `.card-track` / 8 `.slide`
  blocks and the `.dots` pager are gone from the markup *and* the stylesheet,
  and `.center` moved to `justify-content: center` so the heading is the page.
  Old dead CSS went with them: the crisis-slide block, the card/dots rules and
  the four media-query overrides that only sized the card. `index.html`
  35,907 -> 28,871 bytes.
- **Multilingual heading kept.** All eight headlines stay in the rotator: the
  four "Gudalur is living in fear." lines, then the four death-count lines
  (`95 / 720 / 7,868`), 7 s and 9 s dwells.
- **CTA renamed.** "Sign in Petition" -> **"Sign Petition"** (the wording the
  app itself uses for `mnu.sign_petition` in English), with a second sign button
  in Tamil beside it (`.sign-btn.ta`, `lang="ta"`) and the grievance number
  under both.
- **The heading is read out loud.** The hero mp4s carry a video stream only (no
  audio track), so the voice is the Web Speech API rather than the film's own
  audio: every headline is spoken in its language (`ta-IN` / `en-IN` / `ml-IN` /
  `kn-IN`, with a voice resolved for each), the `lang` attribute follows the
  headline, and a pill under it (`#voiceBtn`) is the control - it lights up
  while a line is being read and toggles the voice. The film keeps its
  muted-autoplay loop; if the browser refuses to start the automatic voice, the
  first gesture anywhere (`touchstart` / `click` / `keydown`, and on tab focus)
  arms it, and the pill stays available as the manual way in.
- **Bug fixed in passing.** The film script's `kick()` referenced an undeclared
  `lv` (a leftover from the removed reel), so the first touch on a page whose
  autoplay was held threw a `ReferenceError`. The reference is gone.
- **Harnesses.** `.tmp/simplify-voice.mjs` is the guarded transform (it refuses
  to write `index.html` unless every structural and CSS assertion passes) and
  `.tmp/verify-simplify.mjs` is the browser gate: DOM contract (no card / track /
  dots), both sign buttons + href, grievance id in both scripts, muted autoplay
  playing, the voice pill on/off, a full eight-headline rotation walked on a
  fast clock (languages in order, compact toll style, `lang` switching),
  a blocked-voice run proving the first gesture retries (and that a sign-button
  click does not, since the visitor is leaving), and desktop + phone
  screenshots. Latest run: **31/31 PASS**. The gates in sections 4-4.3 describe
  the pre-rev. 5 layout.

### 4.5 Rev. 6 changes (2026-09-24) - the polish pass

- **The poster now actually paints.** Rev. 5 replaced the `<picture>` stills with
  a `poster` attribute - but `.bgpic video` is `opacity:0` until the loop plays,
  and a poster belongs to that same element, so the still was invisible: a phone
  whose autoplay is refused (iOS Low Power Mode, some in-app browsers) saw only
  the dark green `.film` ground. The poster is a CSS background on `.bgpic` now
  (`url(media/bg-hero.jpg) center/cover`), so the elephant shadow is painted
  before any video byte arrives and the loop crossfades in over it exactly as
  before. Portrait adds `background-position: 92% 50%` so still and film crop to
  the same place. The JPEG is 1280x720 at the film's own 1.7778 aspect, fetched
  once for both roles (`og:image` + background).
- **Reduced motion now means still.** The `autoplay` attribute kept the loop
  running for `prefers-reduced-motion: reduce` visitors - the script only
  declined to *start* it, which the attribute had already done. The hero script
  now removes the attribute and pauses the element, so a reduced-motion visitor
  gets the poster frame and no drift. `.sign-btn::after` (the CTA sheen) was the
  one animation still running in that mode; it is in the reduced-motion list now.
- **Dead code out.** `.tmp/audit-css.mjs` diffs the classes the markup and the
  scripts can produce against the class selectors the stylesheet defines. 18
  selectors could no longer match anything: two `.header` rules and
  `.header-title-old`, `.landscape`, the whole `.stage` / `.badge` / `.ring`
  block (and its `spin` keyframes), `.cta-row`, `.cta-pulse` (its `sonar`
  keyframes are still used by the sign buttons), the `.vbars` equalizer (which
  the voice pill's `.eq` replaced), `.sign-label`, the entire footer block
  (`.f-by`, `.f-right`, `.f-cta`, `.f-social`, `.f-links`, `.app-footer
  .sign-btn`, `.videos`), `.bgpic video.live ~ picture` and `.bgpic img` (no
  `<picture>` or `<img>` in the film layer any more). `index.html`
  28,871 -> 25,491 bytes, with `.tmp/balance.mjs` proving the markup is untouched.
- **Unused media out.** `bg-left.*` / `bg-right.*` (326,533 + 288,333 AV1,
  208,605 + 171,357 H.264, 54,616 + 47,909 stills) were still being deployed for
  a layout that no longer exists. They are parked in
  `.tmp/backup-media/capped-loops/` (and remain in git history), so the deploy
  folder is exactly the eight files the page uses - 2,045 KB instead of 3,120 KB.
- **Security headers match reality.** `_headers` still described the removed
  YouTube IFrame API and the reel's `youtube-nocookie` frames. Nothing on the
  page is cross-origin now, so `frame-src` is `'none'` and `img-src` is
  `'self' data:` (the `i.ytimg.com` / `youtube.com` allowances are gone), and the
  comment records what to re-open if an embed ever returns.
- **Gates.** `.tmp/verify-ship.mjs` replaces the rev. 4 `verify-weight.mjs`, which
  still expected six film encodes, a reel and two facades (it crashed on the
  rev. 5 DOM) - it now measures the real inventory, real transfer, real LCP/CLS
  and the one-host rule. `.tmp/probe-reduced.mjs` covers the reduced-motion
  contract for the first time. Both are new here; `verify-simplify.mjs` re-ran
  unchanged and is still 31/31.

## 5. Layout work done in this pass (rev. 2-4 - the card measured here was removed at rev. 5)

The approved copy is roughly twice the length of the placeholder text, which
overflowed the fixed-height card. Measured, before vs after:

| Viewport | Original copy | Approved copy (first attempt) | Now |
|---|---|---|---|
| 1280x800 | fits | clipped 50 px | fits, card 346 px |
| 1440x900 | fits | - | fits, card 446 px |
| 390x844 | fits | clipped 34 px | fits, card 367 px |
| 375x667 (iPhone SE) | clipped (card 194 px) | clipped | fits, card 337 px |
| 360x800 (Android) | **clipped, card 0 px** | clipped | fits, card 354 px |

Changes: reclaimed vertical space (stage 66 px, rotator 46 px, tighter paddings
and type scale) and converted the rigid `100dvh` shell to document flow on short
or narrow screens, so the card grows to fit and the page scrolls instead of
hiding text. `justify-content: safe center` plus `overflow-y: auto` were added as
a last-resort guarantee that no block can ever be cut off at both edges.

### Background history: the two clips became stills at rev. 2 (superseded at rev. 3 - motion is back, capped)

Section 7 item 1 described the page pulling ~15.4 MB of `preload="auto"` h264 on
every visit. That is fixed by replacing the two `<video>` elements with stills of
exactly the frame they were showing.

- **Frame:** t=2.5 s of each clip. It is the instant `shots-bg.mjs` freezes every
  video on, so the reference screenshot and this page render the same frame.
- **Pixels:** captured from a real Chrome `drawImage` of the composited video
  (`.tmp/vframe-left.png`, `.tmp/vframe-right.png`), not from ffmpeg. The two
  decodes differ by ~0.3% luma (range, matrix, compositor scaling), and taking the
  browser's own pixels removes that at the source.
- **Size:** encoded at the clips' own 1280x854, so nothing is resampled between
  the still on disk and the still on screen: AVIF q55 (49 KB / 74 KB) with a WebP
  q82 fallback (84 KB / 112 KB).
- **Geometry - this is the part worth knowing:** the reference CSS was
  `.bgvid{position:absolute;top:0;bottom:0;width:50%;object-fit:cover}`. A
  `<video>` is a replaced element with `height:auto`, so the intrinsic ratio wins
  over `bottom:0` and the clip was painted as a **640x427 band at the top** with
  the `.center` background (`#101c14`) below it - not stretched to the panel. The
  still therefore uses `width:100%;height:auto` (band 640x427 on desktop,
  195x130.09 on a 390 px phone) so the painted result is identical instead of
  1.22x taller than the reference.
- **Measured fidelity** (frozen video vs still, everything else masked out):
  scenery mean difference 0.31/255 desktop and 0.97/255 mobile, 0.03% / 0.45% of
  pixels over 16 - all of it on high-contrast foliage edges, where an image
  downscale and a video downscale round differently.

Regenerating the background media (only needed if a clip changes):

```powershell
python .tmp/make-media-8k.py stills left    # 2560 px AVIF + 1920 px WebP still, frame t=2.5 s
python .tmp/make-media-8k.py videos left    # slow + crossfade loop master, then AV1 + H.264
python .tmp/make-media-8k.py deliver left   # re-cap deliverables from an existing loop master
node .tmp/verify-weight.mjs                 # budgets + "loops playing" proof
```

Trade-off, stated plainly: the background is now static. The clips were 5.04 s
loops behind a 30-62% dark veil at 50% opacity, and the motion was barely
readable through it, but it is gone. If the motion is wanted back, the cheapest
honest option is a single small looping video **below** the fold or on click, not
the 15.4 MB autoplay pair. *(Rev. 3: done - two capped AV1 loops, section 4.2.)*

**Also fixed (pre-existing bug):** at <= 380 px the old rule stacked the two
background videos full width, leaving the card **0 px tall**. Videos now stay
side by side at 50 percent and the card has a `min-height` floor.

## 6. Deploy notes

1. Deploy `static-petition/` as its own site (Netlify: base directory
   `static-petition`, no build command, publish `.`). Do NOT expect it to ship
   with `npm run build` - that builds the main app into `dist/`.
2. `_headers` pins `/index.html` to `max-age=0, must-revalidate`. This matters:
   the link is shared over WhatsApp and Instagram, and those in-app browsers
   cache hard - without it visitors keep seeing the old page (old wording, old
   counters) after every redeploy.
3. `media/*` and `fonts/*.woff2` are NOT content-hashed, so they get a 1-day TTL
   with a 7-day `stale-while-revalidate` tail. If the film, the poster or a font
   subset is ever re-encoded in place, expect up to 24 h before every visitor has
   the new bytes (they keep the old ones meanwhile, never a blank).
4. The film layer is decorative and marked `aria-hidden` (with
   `disablepictureinpicture` and `tabindex="-1"`); the logo ships at display
   resolution (6 KB WebP, was a 131 KB PNG), so its fine detail differs slightly
   from the original 512 px artwork.
5. There is no third-party request at all: the page loads HTML, one film, its
   poster, the logo and two font files, every one from its own origin, and
   `verify-ship.mjs` fails if a second host ever appears. `frame-src` is `'none'`
   in the CSP for the same reason.

## 7. Known limitations (honest)

1. **A first visit is 1,330 KB, and the hero film is almost all of it.** The HTML
   is 6.6 KB brotli; the AV1 hero (1,180 KB) or its H.264 fallback (693 KB), the
   98 KB poster and 41 KB of fonts make up the rest. That is the price of
   full-bleed film on a link shared over WhatsApp, and it is 12x lighter than the
   15.44 MB the page started at. The poster paints immediately, so the video
   bytes are never what the visitor waits on for the first frame (LCP 856-1,096
   ms locally).
2. Pinch-zoom is disabled, so the type size is the only size. The longest
   headline (the four death-toll lines) runs to 3-4 lines at 360-390 px; the
   rotator is sized for that worst case (`min-height: 74px`, `clamp()`), and
   `verify-simplify.mjs` asserts the heading, the sign stack and the voice pill
   never overlap and never leave the viewport.
3. The `lang` attribute story is not ideal for screen readers - all four
   languages live in one document, so a reader linearises four languages. Each
   rotating headline carries its own `lang` and is spoken in that language, but
   the document-level issue remains. Acceptable for a four-language poster page,
   not a translated site.
4. Not verified on a real device (Android Chrome / iOS Safari) or end to end on
   the third-party signature platform; both need a human with a phone. The
   poster-first fix in rev. 6 targets exactly what a device pass would catch
   (autoplay refused, or reduced motion), and `probe-reduced.mjs` proves the
   still is what paints when the loop cannot run.
5. This page has no tests in `npx vitest run`; its verification lives in the
   `.tmp/` harnesses, which are not part of the repo suite. Rev. 6's are
   `verify-ship.mjs`, `verify-simplify.mjs`, `probe-reduced.mjs`, `balance.mjs`
   and `audit-css.mjs` - run them against `.tmp/serve-static.mjs` before every
   publish.
6. The voice is the browser's own text-to-speech, not a recording. The film's
   encodes were probed for audio tracks (`.tmp/probe-audio.mjs`): all of them are
   video-only (`soun: 0`, `mp4a: 0`), so there is nothing to play even if
   autoplay-with-sound were allowed. Quality depends on the voices installed on
   the device - many Android/iOS builds have Tamil, Malayalam or Kannada voices,
   and where one is missing the browser reads that line with its default voice
   (and may mispronounce it). A recorded voice-over would need a new asset; the
   film only ever plays muted, so nothing else changes if one is added.
7. The voice starts itself, but browsers only allow audio after a gesture. Where
   the automatic start is refused, the pill under the heading is the way in and
   the first tap / click / key anywhere arms it - deliberately *not* a sign-button
   click, because that visitor is leaving for the petition platform.

## 8. Rollback

The original pre-content-swap page is preserved byte-for-byte at
`.tmp/index.html.bak` (17,033 bytes). Copy it back over
`static-petition/index.html` to revert, then redeploy.

The rev. 5 pre-simplification page (content box, eight slides, dots pager,
"Sign in Petition") is preserved at `.tmp/index.simplify.bak.html` (35,907
bytes). Copy it back over `static-petition/index.html` to restore the card and
the old CTA, then redeploy.

To revert only the background change, the two capped tiger loops and their stills
are parked in `.tmp/backup-media/capped-loops/` (the untouched 6.5 MB / 9.3 MB
masters sit one level up, in `.tmp/backup-media/`). Restore them to `media/` and
put the two `<video>` elements, the `.bgpic picture` rules and the old six-file
inventory back. Any revert must re-run the gates; the rev. 6 CSP is already
compatible with the older pages (none of them loaded anything cross-origin
either), so only the checks have to pass again.

Git is the other rollback path: rev. 6 is one commit, so
`git revert <rev.6 sha>` restores the pre-polish page *and* the removed film
files in one step, and the commit message lists the five harnesses to re-run.

## 9. Repo state

- `static-petition/` is committed with the page as built: `index.html`,
  `_headers`, the hero film and its H.264 fallback, the poster, the logo and the
  two font subsets. Rev. 6 also deletes the six unused `bg-left.*` / `bg-right.*`
  files from the repo; they stay reachable in git history and in
  `.tmp/backup-media/capped-loops/`.
- This document is committed beside the page it describes, so the readiness
  record travels with the folder's history. Sections 4.1-4.5 are a change log:
  read the newest revision first, and treat gate results quoted in an earlier
  revision as describing that revision's layout.
- `.tmp/` (harnesses, screenshots, backup media) is git-ignored and must not be
  deployed - including the parked `capped-loops/` film encodes.
