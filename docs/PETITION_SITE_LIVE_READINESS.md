# Voice of Gudalur - Petition Site: LIVE READINESS

**Date:** 2026-09-27 (rev. 11.1 - the social card is rebuilt: 1200x628, the current figures, rendered from the page's own tokens by a harness that fails if the two ever disagree. The page itself is unchanged since rev. 11: white cloud instead of dark aurora, "VOG" condenses out of the air, the visitor picks their own language instead of the rotator choosing for them, and the copy is revealed word by word in step with fresh narration)
**Scope:** `static-petition/` standalone emergency-petition page (Tamil / English / Malayalam / Kannada / Hindi)
**Status:** READY FOR LIVE - **no blocker**. One screen, three stages, first-party only, **no raster anywhere in the page**, 14 files / 934 KB on disk, **17.3 KB on a first visit**, LCP ~0.1-1.0 s, CLS 0.0000. The one raster that exists - the link-preview card - now carries the same figures the page does, which was not true at rev. 11.

---

## 1. What this page is

A self-contained static page (no backend, no auth, no database) that drives
signatures to the Mudhalvarin Mugavari grievance **18982473** through a third
party signature platform. It is NOT part of the main Vite app: nothing in
`server/` or `netlify.toml` references `static-petition/`, and Netlify publishes
`dist/` only. This folder must be deployed as its OWN site (see section 6).

Contents (**14 files, 934 KB on disk; 17.3 KB on a first visit** - brotli HTML +
logo. The 797 KB of narration and 3.9 KB of word-timings are fetched only after
the visitor picks a language, and **no raster is fetched at all**: the clouds are
CSS. `_headers` is the one entry a host reads and a browser never requests):

| File | Bytes | Notes |
|---|---|---|
| `index.html` | 44,032 | the whole page; three stages over a CSS cloud field |
| `media/voice-hi.mp3` | 179,853 | Hindi narration, **44.86 s**, 88 words - the longest track |
| `media/voice-ta.mp3` | 178,797 | Tamil narration, 44.59 s, 56 words |
| `media/voice-en.mp3` | 168,045 | English narration, 41.90 s, 73 words |
| `media/voice-kn.mp3` | 145,677 | Kannada narration, 36.31 s, 56 words |
| `media/voice-ml.mp3` | 143,661 | Malayalam narration, 35.81 s, 51 words |
| `media/bg-stats.jpg` | 83,929 | 1200x628 (1.911:1). **Scraper-only**: the `og:image` / `twitter:image` link-preview card, rebuilt at rev. 11.1 (section 7 item 7). Never fetched by the page - the gates assert that |
| `media/logo-voice.webp` | 6,072 | brand mark beside the wordmark, and (since rev. 11) the favicon |
| `_headers` | 2,509 | cache/security headers (see section 6) |
| `media/voice-hi.json` | 1,074 | word-boundary sidecar, 88 entries |
| `media/voice-en.json` | 899 | 73 entries |
| `media/voice-ta.json` | 702 | 56 entries |
| `media/voice-kn.json` | 693 | 56 entries |
| `media/voice-ml.json` | 637 | 51 entries |

`fonts/montserrat.woff2` (26,596 B) and `fonts/inter.woff2` (14,920 B) were
**deleted at rev. 11** - see section 5. `media/bg-stats.webp`,
`bg-stats-portrait.webp` and the `bg-hero.*` film went at revs 10 and 8. The
`/fonts/*` rule in `_headers` is therefore now dead weight; it is harmless and
comes back into use the day a webfont is shipped again.

## 2. The three stages

rev. 10 rotated five languages on a timer, so a visitor arrived in whatever
language happened to be up and the copy swapped underneath them. rev. 11 asks
once and then never swaps again. This is a three-stage state machine, and the
middle stage is the change that matters:

| Stage | Element | Behaviour |
|---|---|---|
| 1. intro | `#intro` | `V O G` condenses out of the cloud: each glyph starts at `blur(30px)`, risen and scaled 1.35x, and resolves over 1.15 s on staggered 0.2 s delays, then "Voice of Gudalur" and "Grievance 18982473" fade in. A green bloom opens behind it. **Skippable** - a tap anywhere goes straight on. Auto-advances after 3.4 s (250 ms under reduced motion) |
| 2. picker | `#pick` | "Choose your language", with the question also in Tamil. Five cards, each in its **own** native script (தமிழ் / English / മലയാളം / ಕನ್ನಡ / हिन्दी) with the English name beneath. Tamil gets the full first row |
| 3. petition | `#main` | The chosen copy, revealed one word at a time in step with its narration, the sign button, the voice toggle, a language chip to go back, and four social links |

The three stages are `position: fixed` siblings, exactly one carrying no
`hidden` attribute at a time. The CTA is present on stage 3 from the first
frame - a visitor who wants to skip the narration can sign immediately.

**State that persists** in `localStorage`: the chosen language (`vog-lang`) and
whether they muted it (`vog-muted`). A returning visitor goes straight to stage 3
in their own language, and is not ambushed by audio they turned off last time.

## 3. Content

- The page carries **ten** parallel arrays: `heads` and `subs` (one entry per
  language), plus `LANGS`, `NARR`, `TIMS`, `NATIVE`, `ENGLISH`, `PICKQ`,
  `VOICELBL`, `REPLAYLBL`. `N` is derived from `heads.length` and the picker,
  the chip, the voice label, the replay label and the sign label are all read off
  the same indices, so a sixth language is one array entry each, not an edit in
  five places.
- Every body entry carries the real toll - **~7,800** people, **~1,600** wild
  elephants, **2009-2026** - and names both the blocked corridors and Gudalur.
  The superseded 95 / 720 / 7,868 / 1,653 breakdown is gone from the copy; the
  gate fails if any of those numbers reappear.
- The English headline is exactly the campaign line: *"WHEN PEOPLE UNITE AS ONE
  UNSTOPPABLE FORCE, NOTHING HAS EVER FAILED."*
- The CTA is `https://c.org/MfJgz7FNsH` with `rel="noopener noreferrer"`, and
  reads "JOIN THE FORCE & SIGN PETITION #18982473" in English,
  "SIGN PETITION #18982473" in the other four.
- No emoji or pictographs anywhere in the copy.

## 4. The reveal: why there is a JSON beside every MP3

The headline and body are split into one `<span class="w">` per word. A word
starts at `opacity: 0`, becomes `.said` when the narrator reaches it, and gains
`.on` - the brighter green - while the narrator is on it. Exactly one word
carries `.on` at a time.

Unlit words keep their space (`opacity`, not `visibility: hidden`), so the
paragraph lays out once, completely, and **never reflows as it is spoken**. That
is why a half-revealed line shows its first lit word hard against the left edge
rather than centred: the line is already full width, the rest of it is just
invisible.

**The timings are real, not estimated.** `.tmp/gen-narration.py` generates the
MP3s with `edge-tts` using `boundary='WordBoundary'` (the library's default is
`SentenceBoundary`, which is a trap - it yields one boundary per sentence and
the reveal degenerates into a per-line fade), and writes a sidecar beside each
one:

```
{ "v": 1, "lang": "ta-IN", "dur": 44592, "w": [[106,561], [682,772], ...] }
```

`w[i]` is `[startMs, durationMs]` for spoken word *i*. The page reads the sidecar
and drives the reveal off `AudioContext.currentTime`, which is sample-accurate.

**Two things about that data are worth knowing before touching it:**

1. **Counts do not always match.** The sidecar has one boundary per word the
   *synthesiser* spoke; the page splits the copy it *renders*. Tamil, Malayalam,
   Kannada and Hindi match exactly (56/56, 51/51, 56/56, 88/88). **English is
   73 boundaries against 77 rendered words** - the synthesiser merges some short
   words. The page therefore `resample()`s the boundary timeline onto however
   many spans it actually rendered: same start, same end, monotonic, nothing
   skipped. Zipping index-to-index would have lit the wrong words from the
   middle of the English body onward.
2. **Do not scale the offsets to the MP3 duration.** They are already in the
   track's own timeline. English carries roughly **918 ms of trailing silence**,
   so scaling `w` by `duration / lastBoundary` pushes every closing word late
   and the last words land after the audio has finished.

`.tmp/word-map-check.py` re-derives the rendered word count from `index.html`
itself and compares it against every sidecar, so the audio, the timings and the
on-screen copy cannot drift apart silently.

**Fallbacks, in order.** Recorded track (accurate) -> `speechSynthesis` with
live `onboundary` char indices against the rendered spans (still in step, just
reading a different clock) -> the whole copy simply visible. The last one is the
floor: **the page must never be left blank**, and under `prefers-reduced-motion`
it starts there, with no motion at all.

## 5. Look and feel

The palette is the inverse of every earlier revision: a near-white cloud field
with dark green ink, instead of a dark scene with light text.

| Token | Value | Used for |
|---|---|---|
| `--ink` | `#0A3A28` | headline, wordmarks, button text on the CTA |
| `--ink2` | `#17573F` | body copy |
| `--live` | `#14764A` | the word currently being spoken |
| `--cta` | `#0A3A28` | the sign button |
| `.sky` | `#FFFFFF -> #E1EEE7` | the cloud gradient |

**Contrast, measured against the darkest stop of the cloud gradient (`#E1EEE7`),
which is the real worst case - measuring against `#FFFFFF` would overstate every
ratio on the page:**

| Pair | Ratio | WCAG |
|---|---|---|
| `--ink` headline | **10.67:1** | AAA |
| `--ink2` body | **7.12:1** | AAA |
| `--live` spoken word | **4.73:1** | AA |

`--live` was originally `#2FA36B`, which measured **2.68:1** - the spoken word
was the least legible moment on the page, which is exactly backwards. The gate
now fails if it drops below 3:1, and the glow moved into a separate `--glow`
token so the colour can be darkened without losing the effect.

**Type: the page names Montserrat and does not ship it.** The one `font-family`
declaration is `'Montserrat', system-ui, -apple-system, 'Segoe UI', Roboto,
sans-serif` with no `@font-face` and no font request anywhere - the two subsets
were deleted at rev. 11 because 41 KB of webfont bought a face that 4 of the 5
languages could not even use (Tamil, Malayalam, Kannada and Hindi script fall
through to a system face regardless). The consequence is honest and worth stating
plainly: **the headline renders in the visitor's own UI font**, and the visitor
who *does* have Montserrat installed sees a different page from the visitor who
does not. That is a deliberate trade, not an oversight - but if the campaign line
is meant to look identical for everyone, either ship the subset or drop the
`'Montserrat'` name from the stack. The social card uses this exact stack
verbatim, so on any given machine the card and the page are set in the same face.

The clouds are five blurred radial blobs drifting on 66-108 s cycles, plus a
green `halo` breathing behind the copy on a 19 s cycle. All `transform`/`opacity`
only, so they cost no layout and no CLS. **The page fetches no raster at all** -
the gates assert that `.sky` and every `.c1`-`.c5` rule contain no `url()`.

Under `prefers-reduced-motion: reduce` every animation and transition is
switched off, the intro waits 250 ms instead of 3.4 s, and the copy is rendered
complete from the start.

## 6. Gates

Run against `.tmp/serve-static.mjs` on `:8791` before every publish.

| Harness | Checks | What it covers |
|---|---|---|
| `node .tmp/check-page.mjs` | **59/59** | static structure: the three stages, the picker, all ten arrays in lockstep, the reveal wiring, the contrast maths, no rev. 10 selectors left, the social card (its `og:image:width/height` are read back out of the JPEG's own SOF marker and must equal the meta tags; the card must never be fetched by the page), LF/BOM hygiene |
| `node .tmp/verify-page-rev11.mjs` | **46/46** | the live page: intro -> picker -> petition, the reveal actually tracking the audio, mute persistence, no third-party host, five viewports, reduced motion |
| `node .tmp/verify-ship2.mjs` | **51/51** | what ships vs. what is used, no orphans, content types, first-visit weight, LCP/CLS, the CTA on screen at both viewports |
| `node .tmp/build-card.mjs` | **26/26** | the social card: renders `.tmp/card-src.html` at exactly 1200x628 and refuses to write the JPEG unless the headline is the headline `index.html` renders, every toll figure on the card also appears in the page's own copy, no superseded figure (7,868 / 1,653 / 720 / 95) survived, the grievance number and the domain are present, no box hangs off the canvas, the cloud blobs stay inside the sky layer that clips them, the frame is not blank, and the meta tags still declare the size the file that was just written actually has |
| `python .tmp/audit-card.py` | **21/21** | the card's *pixels*, off the lossless PNG the build leaves behind: glyphs really painted inside each laid-out box, the toll figures really came out in `--live`, the CTA really is a dark pill with light text, and every contrast ratio is measured off sampled background pixels rather than off the CSS - plus an ASCII ink-density map, because nobody running this can look at the image either |
| `python .tmp/word-map-check.py` | pass | every sidecar against the copy actually rendered in `index.html` |

All six are green as of this revision. `.tmp/` is git-ignored, so **the gates
do not travel with the code** - see section 8.

## 7. Deploy notes

1. Deploy `static-petition/` as its own site (Netlify: base directory
   `static-petition`, no build command, publish `.`). Do NOT expect it to ship
   with `npm run build` - that builds the main app into `dist/`.
2. `_headers` pins `/index.html` to `max-age=0, must-revalidate`. This matters:
   the link is shared over WhatsApp and Instagram, and those in-app browsers
   cache hard - without it visitors keep seeing the old page after every
   redeploy.
3. `media/*` is **not** content-hashed, so it gets a 1-day TTL with a 7-day
   `stale-while-revalidate` tail. This matters more now, because both the
   narration **and the word-timing sidecars** live there. Re-recording a track,
   or regenerating its sidecar, does not change its name - so a returning
   visitor can see the old wording **and** be revealed against the new timings
   for up to 24 h. **The MP3 and its JSON must be published together**, or the
   filenames versioned.
4. **Audio must start from the visitor's own gesture.** The narration is kicked
   off inside the click handler on a language card (`unlock()` then `play()`),
   not on load. Starting it earlier is blocked by autoplay policy on every
   current mobile browser, and the reveal would run against a silent clock.
5. The cloud layers are decorative and `aria-hidden`; the logo ships at display
   resolution (6 KB WebP, was a 131 KB PNG) and doubles as the favicon, which
   also stops the browser's unprompted `/favicon.ico` request from 404ing on
   every first visit.
6. There is no third-party request at all: the page loads HTML, the logo, and -
   only after a language is chosen - one MP3 and one JSON. `verify-ship2.mjs`
   fails if a second host ever appears. The signature-platform link is a
   *navigation*, not a request the page makes, so it does not appear in the
   one-host check. `frame-src` is `'none'` for the same reason.
7. **The social card is the only image anyone outside the page will see**, so it
   is now built like code. `node .tmp/build-card.mjs` renders `.tmp/card-src.html`
   - a 1200x628 document that copies the page's palette tokens, its cloud
   gradient and its font stack verbatim - through Chromium at exactly that size
   and writes `media/bg-stats.jpg` at q82 (82 KB). It asserts the copy against
   `index.html` *before* it screenshots, so the bytes that land are the bytes
   that were checked, and the previous card is preserved at `.tmp/bg-stats.prev.jpg`
   before overwriting. `python .tmp/audit-card.py` then reads the lossless
   `.tmp/card-preview.png` the same run leaves behind and asks the pixels, not the
   CSS, whether the glyphs are really there. Rebuild with both, in that order:

   ```
   node .tmp/build-card.mjs && python .tmp/audit-card.py
   ```

   1200x628 is 1.911:1 - the ratio link-preview scrapers want, against 1.775 for
   the card it replaces, so nothing gets trimmed. `og:image:width/height` are
   read back out of the written JPEG's own SOF marker by the gate and must equal
   the meta tags, and `og:image:alt` describes what the card actually says
   (campaign line, the toll, the petition number, where to sign).

   Two things about getting it in front of people: `og:image` and `twitter:image`
   are absolute URLs on `https://voiceofgudalur.space/`, so **no preview can
   render until that domain resolves with a valid certificate** - the card is
   perfect on a machine nobody has shared yet. And `media/*` carries
   `max-age=86400, stale-while-revalidate=604800` while the card's filename never
   changes, so the CDN can serve the old bytes for a day, and crawlers cache the
   preview by URL for far longer than that. After publishing a new card, verify
   with the platform's own refresher (Facebook's Sharing Debugger, Twitter/X's
   card validator) rather than by re-sharing the link and hoping. If the old card
   is still coming back, **version the filename** (`bg-stats-1200x628-v2.jpg`) and
   point both meta tags at it - that is the only thing that forces a refetch.

## 8. Known limitations (honest)

1. **Not verified on a real device** (Android Chrome / iOS Safari), nor end to
   end on the third-party signature platform. Both need a human with a phone.
   This is the largest remaining gap, and it is sharper now than at rev. 10
   because three mechanisms are new: `AudioContext` playback, the sidecar fetch
   and the reveal loop. All are exercised in headless Chromium; none have been
   on a handset. In particular `speechSynthesis` voice availability for
   Malayalam, Kannada and Hindi is highly platform-dependent, and the fallback
   path has never been seen running.
2. **The reveal is long, by design.** A Tamil visitor sees a blank copy area for
   roughly 10 s before the body starts. This is the requested experience and the
   sign button is visible throughout, but a visitor who muted the voice is shown
   the copy complete immediately rather than held for a reveal that would have
   no sound to sync to.
3. The `lang` attribute story is not ideal for screen readers. All **five**
   languages live in one document, so a linearising reader walks five of them -
   worse than rev. 10, whose rotator at least hid the inactive ones. The stage
   machine mitigates it: only the chosen stage is in the accessibility tree, and
   each carries its own `lang`. Acceptable for a multilingual poster page, not a
   translated site.
4. **A narration track that is still downloading gives a silent reveal.** The
   reveal clock starts when the buffer starts, so there is no visible stall, but
   on a slow connection the words appear with no sound for that latency.
5. Pinch-zoom is disabled, so type size is the only size. The subheadline is long
   in every language and runs to 6-7 lines at 360-390 px; `.copy` is a flex child
   with `min-height: 0` and the sizes are `clamp()`ed, and the gates confirm at
   five viewports (320x568 through 1440x900, including landscape) that nothing
   overflows horizontally and nothing is pushed below the fold.
6. This page has no tests in `npx vitest run`; its verification lives in the
   `.tmp/` harnesses, which are git-ignored - **so the gates do not travel with
   the code.** Run all six before every publish.
7. The narration is a pre-recorded neural track per language. If the recorded
   track cannot be decoded the page falls back to the device's own speech
   synthesis, which uses a different voice and a different pace. The copy and
   the CTA are unaffected.
8. The social card is **English-only**, because WhatsApp, Facebook and Twitter/X
   OpenGraph crawlers request a single preview image per URL and do not send
   `Accept-Language`. A visitor who shares the link while viewing the Tamil or
   Malayalam copy still produces an English preview card. That is an OpenGraph
   protocol limitation, not an omission. Also, the card was rendered in the
   system font of the machine that ran `build-card.mjs` (see section 5); on a
   clean Linux build box without Montserrat installed, it falls back to
   Liberation Sans or DejaVu Sans.

## 9. Rollback

The original pre-content-swap page is preserved byte-for-byte at
`.tmp/index.html.bak` (17,033 bytes). Copy it back over
`static-petition/index.html` to revert, then redeploy.

The rev. 5 pre-simplification page (content box, eight slides, dots pager,
"Sign in Petition") is preserved at `.tmp/index.simplify.bak.html` (35,907
bytes). Copy it back to restore the card and the old CTA, then redeploy.

The previous social card (1672x942, superseded figures) is preserved at
`.tmp/bg-stats.prev.jpg` (101,082 bytes). Copy it back over
`static-petition/media/bg-stats.jpg` and restore `og:image:width` (1672) /
`og:image:height` (942) in `static-petition/index.html` to roll it back.

The rev. 6 page - the last one before the rev. 7-11 redesigns - is the last
committed version of `index.html`, so `git checkout HEAD -- static-petition/`
is the fastest way back to a known-good dark page. Any revert must re-run all
six gates; the CSP is already compatible with the older pages (none of them
loaded anything cross-origin either), so only the checks have to pass again.

## 10. Repo state

- `static-petition/` holds the page as built: `index.html`, `_headers`, five
  narration tracks, five word-timing sidecars, the social-card jpg and the logo -
  **14 files, 934 KB** (including `_headers`, which is served as metadata).
  `media/bg-hero.*` went at rev. 8, `media/bg-stats.webp` /
  `bg-stats-portrait.webp` at rev. 10, and `fonts/*.woff2` at rev. 11; all stay
  reachable in git history.
- **Changes are uncommitted**, and part of what ships is not even tracked yet.
  The most important item: **the five `media/voice-*.mp3`, the five
  `media/voice-*.json` and `media/bg-stats.jpg` are untracked.** The page
  references all eleven. A commit of only the modified files would produce a
  repo whose page 404s every narration track, every timing sidecar, and has no
  social card. `fonts/` no longer appears in `git status` because those files
  were never committed - their deletion is invisible to git, and only the
  on-disk orphan check in `verify-ship2.mjs` can confirm it.
- The rev. 7-11 work - the rotator, the CSS scene, the removal of the
  infographic, the re-recorded narration, the word-timings, the white cloud
  redesign and the language picker - is in the working tree only. **No
  production deployment has happened.** Committing and deploying are both still
  to be requested.
- One accident is worth recording because it shaped this document's history:
  while editing it, a PowerShell line intended to splice six lines out of this
  file serialised the *type name* `System.Collections.ArrayList` instead of the
  array, replacing all 69 KB with 28 bytes. `git checkout --` restored the
  committed copy, which was the rev. 6 text, so the uncommitted rev. 9 notes
  were lost and had to be rewritten. The lesson is the same as the screenshot
  one: **mutating a file through a typed shell is a good way to destroy it.**
  Read the file, edit it, write it back - and never trust a cast-and-join
  without reading the result before moving on.
- This document is committed beside the page it describes, so the readiness
  record travels with the folder's history. Treat gate results quoted in an
  earlier revision as describing that revision's layout.
- `.tmp/` (harnesses, screenshots, backup media) is git-ignored and must not be
  deployed - which also means the gates in section 6 exist only locally.
- There is a stray `-w` file (46 KB of HTML, mojibake) at the repo root, left by
  a broken shell redirect on 2026-09-21. It is junk and safe to delete; it is
  not referenced by anything.

---

# Addendum, 2026-09-30: the site is now a citizen-action site

**Read this section first. Sections 1-10 above describe rev. 11.1 - a
three-stage, narrated, single-screen page with `media/voice-*.mp3` and
word-timing sidecars. None of that is in the folder any more. The sections are
kept as the record of how the site got here, and they are not a description of
the current code.**

## A1. What it is now

Three static pages instead of one, built around two published grievance
records and the official channels a citizen can use without us:

| Page | What it is for |
|---|---|
| `/` | both records side by side, the official action steps, and the status rules |
| `/grievances/18982473/` | the Safety record: its figures, its letter, its follow-up steps |
| `/grievances/19177921/` | the Transformation record, same shape, and no figures |

Files (first-party only, no third-party anything):

```
index.html                      28.4 KB   the three pages' shared shell
grievances/18982473/index.html  22.2 KB
grievances/19177921/index.html  22.1 KB
assets/vog.css                  20.7 KB   every page, root-relative
assets/vog-support.js           14.1 KB   reveal, copy, language, the support form
assets/vog-i18n.js               7.6 KB   the 5-language table, extracted verbatim
assets/grievances.js             5.8 KB   the fact registry (not loaded by any page)
media/logo-voice.webp            5.9 KB   brand mark and favicon
_headers                         3.3 KB
media/bg-stats.jpg                82 KB   orphaned - see A5
```

Total first visit, desktop: HTML + CSS + the two scripts + the logo, about
78 KB uncompressed.

## A2. What changed, and why it is not a matter of taste

1. **The official channels come first.** `tel:1100`, `cmcell@tn.gov.in` and the
   Mudhalvarin Mugavari portal, in that order, on every page, each with the FAQ
   question it comes from cited underneath. The support form is the last thing
   on every page, not the first.
2. **The WhatsApp support flow is gone** - no `wa.me` link, no group link, no
   "send your support ID" anywhere. A Support ID that a person carries to a
   government office would read as a receipt, which is the confusion this
   rebuild exists to remove.
3. **No status is ever shown for either grievance.** The FAQ is explicit that a
   dashboard shows only your own filings and that status for anyone else's must
   come from 1100, so the site says that instead of guessing.
4. **Figures carry their source line**, and the page states that it has not
   verified them. #19177921 shows no figures because the record carries none.
5. **The petitioner's details are withheld**, stated as a decision rather than
   passed over in silence.

## A3. The gates, and where they moved

The gates in section 6 were throwaway scripts in `.tmp/`, which is
git-ignored, so nothing stopped the site drifting. That is now a real test in
the suite:

```
tests-static/static-site.contract.test.ts    48 assertions
```

It reads the published files as text and fails if: a WhatsApp link reappears; a
page stops offering 1100; a figure loses its source line; #19177921 shows
#18982473's numbers; a page asserts a status; the storage rules change; a new
external origin appears; the letters in the pages stop matching the ones the
`mailto:` links send; an id is duplicated; or a `data-t` key drifts out of the
language table. `vitest.config.ts` includes `tests-static/`, so `npm test` runs
it. `npx tsc --noEmit` is clean.

`.tmp/verify-vog.mjs` is the browser harness: it serves the folder, mocks the
Worker (preflight and CORS included, because that is how the real one behaves),
and checks 29 things a text test cannot - that the pages render without console
errors, that the form mints and shows an ID, that a legacy `{id, name, phone}`
record from the previous revision is scrubbed to the ID alone, that nothing is
left at `opacity: 0`, and that a 360 px phone gets no horizontal scroll.

## A4. Two things to know before editing

- **`assets/grievances.js` is a registry, not a dependency.** The pages are
  static so they work without JavaScript, which means every fact is written
  twice. The contract test fails when the copies disagree, but it does not
  police numbers typed into prose. Fix a fact in both places.
- **The five-language table now covers the whole site** (see A6). It started as
  the support-card table extracted byte-for-byte from the previous revision, so
  no translation was retyped or invented; this revision extended it to every
  visible string on all three pages. The rule that survives from the card-only
  era: column 1 (English) is byte-identical to the static markup, enforced by
  `.tmp/merge-i18n.mjs` before it writes and by the contract test afterwards.

## A5. Open, deliberately

- The filing dates, the statuses and the records' own lists of demands are
  blank. They are rendered as "Not shown in the record." rather than guessed,
  and they need a human to transcribe them from the records.
- `media/bg-stats.jpg` (82 KB) is no longer referenced by anything: it was the
  `og:image`, and it carries figures this site no longer claims. The new pages
  set no `og:image` at all. Delete it, or rebuild it from tokens that are
  actually true - but note that a card already cached by Facebook or WhatsApp
  will outlive the file either way.
- The copy needed translating - done in A6. What is left for a human is
  reviewing the Indic wording, not filling empty slots.

## A6. Citizen-action restructure and full translation

The site stopped presenting itself as a record museum and became an action
page around the two existing grievances:

- **The homepage lost its disclaimer/status/record machinery** - the "Before you
  read on" note, the "Read this first" notice, action steps 3-5, the whole
  STATUS section and the old GRIEVANCES block. What remains, in order: hero
  (carrying the `grievances` anchor the record pages link to) -> two official
  steps -> documents -> support. No page links `/#status` any more.
- **A Documents section (`#documents`) publishes three PDFs**: the government's
  one-page reply to #18982473, our nine-page appeal for a permanent reply, and
  the eight-page Gudalur Transformation Plan 2026 - each with Read and Download
  actions. They live in `static-petition/docs/`, get their own `/docs/*` cache
  rule in `_headers`, and the contract test asserts all three exist, start with
  `%PDF-`, and are offered by the homepage.
- **The language switcher moved from the support card to the masthead** on all
  three pages (`#langPick` inside `.topbar`, kept `hidden` until the buttons are
  built), and every page declares `<body data-i18n-full>`: the reader's choice
  now sets `lang` on `<html>` and rewrites every tagged string, not just the
  card. The record pages' footers were replaced with the homepage's (killing
  the dead `/#status` link), the support card lost its duplicate language row,
  and the done-block points at `#follow` on every page.
- **Every visible string on both record pages carries `data-t`/`data-t-aria`**.
  Nested `<b>/<strong>/<em>` runs are split into sibling spans because the
  runtime writes `textContent`; HTML entities inside tagged text were replaced
  with literal characters (`&mdash;` -> `—`, curly quotes literal, `&nbsp;` ->
  space); the letter `<pre>` blocks stay English with `lang="en"` because their
  bytes are baked into the `mailto:` links. ASCII identifiers - grievance IDs,
  85/53, `cmcell@tn.gov.in` - are deliberately untranslated.
- **The table is 177 keys x 5 languages** (85 -> 177; the 92 record-page keys
  were batched in `.tmp/i18n-new-5..15.mjs`). `.tmp/merge-i18n.mjs` now
  auto-discovers numbered batches, and still refuses to write when any key's
  English column disagrees with the markup or a slot is empty.
- **The contract test grew from 48 to 53 assertions**: `data-t-aria` keys are
  checked for existence and byte-exact English like the others, and a new
  describe block pins the shared structure - `data-i18n-full` and exactly one
  `#langList` per page, no `/#status` anywhere, exactly one `id="grievances"` on
  the homepage, the three PDFs and their cache rule. The letter comparison now
  tolerates the `<pre>`'s `lang="en"` attribute.

Gates after this revision, all green: `npm test` 367/367 across 29 files,
`tsc --noEmit` clean, contract test 53/53, `.tmp/verify-vog.mjs` 29/29 (its two
language checks were rewritten for the full-page contract: `<html lang>` now
follows the switch instead of staying English), `.tmp/layout360.mjs` 3/3,
`.tmp/check-csp.mjs` all checks passed against the preview, `npm run build`
succeeded, and each `/docs/*.pdf` served with its `%PDF-` header from the
preview on :4173.

## A7. The Read/Download pair, and what a `mailto:` can and cannot do

Two actions on the finished pages were reported broken. One was a real defect in
the harness; the other was not a defect in the page at all, and the difference
is worth keeping written down.

**Read must be served `application/pdf`, or it quietly becomes a second
Download button.** Each document is offered twice - Read opens it in the
reader's own PDF viewer, Download saves it - and the two links are otherwise
identical: same `href`, Read with `target="_blank"` and no `download`
attribute, Download with `download="..."`. The browser picks viewing or saving
from the response headers, and `_headers` sets
`X-Content-Type-Options: nosniff` on everything, so a `.pdf` answered as
`application/octet-stream` is downloaded. That is exactly what Read did in the
local preview, whose MIME map had no `.pdf` entry. Fixed in two places, because
the two harnesses answer the question in different ways:

- `.tmp/preview-vog.mjs` - `'.pdf': 'application/pdf'` added to `TYPES`. That
  server applies only the `/*` catch-all from `_headers`, so its own map is
  what a reader gets on :4173.
- `static-petition/_headers` - `Content-Type: application/pdf` added under
  `/docs/*`, placed *after* the `Cache-Control` line because the contract test
  anchors on that line coming first in the block. Netlify and Cloudflare both
  resolve `.pdf` correctly on their own; this is what keeps it true on a host
  that does not. `.tmp/serve-static.mjs` does apply path rules, and this was
  proved through it: all three PDFs now return `application/pdf` with the CSP
  and nosniff headers still in place.

One limit stands, and it is not fixable from the page: a reader whose browser is
set to always download PDFs (`chrome://settings/content/pdfDocuments`) will
still get a file, because that preference outranks any header.

**The mail button was never broken - the mail app it asks for is the part that
was missing.** Every `mailto:` on the three pages carries the address, the
subject and the whole letter, percent-encoded, with the body byte-identical to
the `<pre>` printed above it (the contract test compares both against
`VOG_LETTERS` in `assets/grievances.js`). `.tmp/probe-mail-read.mjs` checks it
from the other side by driving a real browser: clicking the button makes the
browser issue the navigation `mailto:cmcell@tn.gov.in?subject=...&body=...`
with the complete letter in it, which is all a page can do. What happens next
belongs to the operating system, and on the machine this was reported from,
Windows had `mailto:` associated with `ChromeHTML` while Chrome itself had no
`protocol_handler` entry - so the click was handed to Chrome, which had no mail
handler to pass it on to, and nothing opened. ProtonMail was installed and
registered as a mail client throughout. The page cannot detect or repair that;
the fix is to set the default app for "Mailto" to a mail client, or to give
Chrome a mail handler. The letter stays in the markup regardless: it is what a
reader copies when no mail app answers, and the no-JavaScript rule requires the
text to be there anyway.

`.tmp/probe-mail-read.mjs` is the gate for both halves. Run
`node .tmp/probe-mail-read.mjs` against the preview on :4173 and it checks the
address, the subject, the body, the `<pre>`-for-`<a>` byte match and the
encoding, then the Content-Type and Content-Disposition of all three PDFs, in
one pass. Gates re-run after this revision: contract test 53/53, `npm test`
367/367 across 29 files, `.tmp/verify-vog.mjs` 29/29, `.tmp/check-csp.mjs` all
checks passed, `.tmp/probe-mail-read.mjs` all checks passed.

That is the state this section was written in. The `mailto:` pair it describes is gone
from the pages - A8 replaces it with a Gmail link, for exactly the reason recorded here.

## A8. Step 3 dropped, the mail button moved to Gmail, support points at Instagram

Three changes to the finished pages, all in one direction: stop depending on the
reader's own machine, and take out the step that asked the most of them.

- **Step 3 is gone from both record pages.** The `Official step` block used to end with a
  third `step` - "If it affects you, file your own" - carrying the Mudhalvarin Mugavari
  portal link (`cmhelpline.tnega.org`) and the "never send anyone an OTP" warning. Both
  `grievances/18982473/` and `grievances/19177921/` are a two-step route again: Step 1
  (call 1100), Step 2 (the letter), then the "Then, and only then" card. The strings it
  used (`recStep3`, `recFileOwn`, `recWho3`, `recFileP1`/`P2`, `recFileEm`,
  `recOpenPortal`, `recNever`, `recNeverRest`, `recFoot3`) are left in
  `assets/vog-i18n.js`: an unused key is harmless, and the contract test only checks that
  keys in use exist - never that every key is used.
- **The mail button no longer needs a mail app.** A7 records the diagnosis: a `mailto:`
  only works when the operating system has a mail handler registered, and where this was
  reported it did not. The three email buttons (the homepage's two-step action, and each
  record page's Step 2) are now Gmail web-compose links -
  `https://mail.google.com/mail/?view=cm&fs=1&to=cmcell@tn.gov.in&su=…&body=…` - with
  `target="_blank" rel="noopener noreferrer"`. Same mailbox, same subject, same
  percent-encoded letter; the reader gets Gmail's compose window in a new tab, which
  works wherever a browser works. The labels follow in all five languages: `recOpenMail`
  and the `act2Body` sentence now name Gmail and "a new tab". `mail.google.com` is never
  fetched - only navigated to - so it is not a `connect-src`, `_headers` and the CSP are
  untouched, and the one place that had to learn the new origin is the contract test's
  allowed-origin list.
- **"Support Voice of Gudalur" goes to the Instagram profile.** The button at the end of
  each record page used to jump to the on-page `#support` card; it now opens
  `https://www.instagram.com/voiceofgudalur` in a new tab, the same profile the footer
  already links. The `#support` section itself stays where it is, unchanged.

The contract test moved with the pages rather than being loosened: the helpers are now
`emailTarget`/`emailHrefs` (they parse a `mailto:` or a Gmail link and return the same
`{address, subject, body}`), the address assertion compares `cmcell@tn.gov.in` rather
than `mailto:cmcell@tn.gov.in`, `https://mail.google.com` joins the allowed origins, the
"no mailto for #{id}" message reads "no email button", and the old "every record page
offers its own portal link" assertion is *replaced* by one that keeps the removed step
out: `expect(html).not.toContain('recStep3')` and `not.toContain('cmhelpline.tnega.org')`.

`.tmp/probe-mail-read.mjs` was rewritten to match, and still drives a real browser. On the
record page it now reads the Gmail link and checks the mailbox, the subject, the body,
`target="_blank"`, a `rel` carrying `noopener`, and the `<pre>`-for-`body` byte match -
then clicks the button and waits for the new tab, which headless opens on Gmail's
sign-in/compose page with the whole letter still in the URL. The Read/Download half of
the probe is unchanged.

Gates re-run after this revision: contract test 53/53, `npm test` 367/367 across 29 files,
`npx tsc --noEmit` clean, `.tmp/verify-vog.mjs` 29/29, `.tmp/check-csp.mjs` all checks
passed, `.tmp/probe-mail-read.mjs` ALL CHECKS PASSED.


## A9. The homepage is one page: no menu, no sections

The owner asked for "a single page, no menu or section, one single page, remove
repeated content sections". Scoped to the **homepage only** - `grievances/18982473/` and
`grievances/19177921/` are untouched, and this revision changed neither their markup nor
their spacing.

**What came off `index.html`:**

- **The masthead menu.** `<nav class="navlinks">` - Documents / Take action / Support VOG
  - is gone, so the top bar is the logo and the name alone. The language row (five
  languages) stays; it is a control, not navigation.
- **The repeated footer links.** The footer re-listed all three of those same
  destinations, so each appeared twice on one page. Its row now carries only the two links
  that actually go somewhere else: grievance #18982473 and #19177921.
- **Three section labels** (`seclab`): "The official route", "The documents", "Our own
  register".
- **Three section headings**: "Take action on #18982473 and #19177921", "Read the files
  for yourself", "Record your support for Voice of Gudalur". Their strings stay in
  `assets/vog-i18n.js` (`actLabel`, `actTitle`, `docsLabel`, `docsTitle`, `supLabel`,
  `supHead`) - an unused key is harmless, and putting one back is a two-line edit.
- **The four `<section>` wrappers**, now `<div>`. A `<section>` is a landmark only when it
  has an accessible name; with its heading gone it had none, so the demotion costs
  nothing. The `aria-labelledby` went with the heading it pointed at, rather than being
  left addressing an id that no longer exists.

**What deliberately stayed, and why:**

- **`id="grievances"`, `id="action"`, `id="documents"`, `id="support"`.** The record
  pages' footers link back to `/#action` and `/#support`, the breadcrumbs link to
  `/#grievances`, and the hero's two "Follow it up" buttons jump to `#action`. Removing
  the section *furniture* is safe; removing the anchors would have broken links on the
  two pages this revision must not touch.
- **The heading outline.** Dropping the three `h2`s leaves `h1` -> `h2` (the two hero card
  titles) -> `h3` (the steps, the documents, the support card), so no level is skipped.
  Promoting anything would have broken the language gate, which reads `#supCard h3`.
- **Every sentence.** The three blocks now open on their `sec-intro` prose - "Two official
  channels, in the order that matters...", "Three documents sit behind these two
  grievances...", "This is the only part of this site that belongs to us..." - which is
  what carries each block now that its heading does not.

**One consequence, fixed.** `.sec` was padded to hold a label and a heading; with both gone
the spacing read as three empty section breaks - the opposite of the request. One rule in
`assets/vog.css` tightens it for the homepage only:

```css
#grievances ~ .sec{padding:clamp(24px,4.5vh,48px) 0}
```

`#grievances` is the home hero's id and is on neither record page - the script asserts
`1 / 0 / 0` across the three files before it writes - so the record pages keep the spacing
they had. `vog.css` is CRLF, so the rule was added with CRLF terminators: 415 lines became
420, rather than the file being rewritten.

**The gates.** Nothing had to be loosened, because none of the removed strings were load
bearing: the support form is asserted on every page and is untouched;
`official steps come before the support card in the source order` already tolerated an
absent `id="action"` and falls back to `tel:1100`, which is still present; the home hero
still carries exactly one `id="grievances"`; and the three PDFs, the two loss figures, the
FAQ citation and both Gmail buttons are all still asserted and still present.

Re-run after this revision: contract test 53/53, `npm test` 367/367 across 29 files,
`npx tsc --noEmit` clean, `.tmp/verify-vog.mjs` 29/29, `.tmp/check-csp.mjs` all checks
passed. `.tmp/a9-shots.mjs` captures the masthead, the first block and the footer, and
asserts in the live DOM that `.navlinks` is 0, `section` is 0, the footer holds exactly
the two grievance links, and all five anchors still resolve.

Reverting: `.tmp/flatten-home.mjs` wrote `.tmp/index.before-flatten.html` before it
changed anything.
## A10. The documents section no longer navigates away, and a go-live check

**One button removed.** In the Phase 2 / #19177921 panel, "The grievance record itself"
carried a `Read the record` button pointing at `/grievances/19177921/`. It was the only
control in that panel that left the page - every other button there opens a PDF - so it
read as a redirect out of a section that is not supposed to navigate. The owner asked for
the redirect gone, and it is: the `.docacts` wrapper holding that anchor was removed (353
bytes; `index.html` 24250 -> 23897) and nothing else.

The two lines of description stay, because they are the honest label for what the record
is; deleting authored copy was not what was asked. The record page is still reachable - the
#19177921 hero card keeps its own `Read the record` button and the footer links to it - so
nothing is orphaned. `.tmp/remove-record-redirect.mjs` asserts all of that, including that
`#documents` is left with four rows of which exactly three carry buttons.

`btnReadRecord` stays in use on both hero cards, so no i18n key goes idle, and no English
column text was edited, so the byte-for-byte i18n contract is untouched. Nothing in
`tests-static` asserts that the homepage links to a record page.

**Go-live check.** All six current gates re-run and green: contract test 53/53, `npm test`
367/367 across 29 files, `npx tsc --noEmit` clean, `.tmp/verify-vog.mjs` 29/29,
`.tmp/check-csp.mjs` all checks passed, `.tmp/probe-mail-read.mjs` ALL CHECKS PASSED.
`_headers` is present and correct, and `static-petition/` publishes exactly six entries:
`index.html`, `_headers`, `assets/`, `docs/`, `grievances/`, `media/`.

Four things to know before publishing, none of them blocking:

1. **No `og:image`.** Zero occurrences across all three pages, so a link preview on
   WhatsApp or Instagram renders with no image - and those in-app browsers are the site's
   main distribution channel, as `_headers` itself argues when it explains why the HTML
   must never be cached hard. `media/bg-stats.jpg` (84 KB) is still published and
   referenced nowhere: it is the retired petition card, so it is 84 KB of dead weight as
   well as a missed preview.
2. **Doc sections 6-10 describe the previous site.** Section 6 "Gates" lists six
   harnesses (`check-page.mjs`, `verify-page-rev11.mjs`, `verify-ship2.mjs`,
   `build-card.mjs`, `audit-card.py`, `word-map-check.py`) and an MP3/JSON sidecar model
   the citizen-action site does not have; section 8's "Known limitations" is about
   `AudioContext`, the reveal loop and `speechSynthesis`. The current gates are listed in
   A3. Anyone following section 6 before a publish would run the wrong harnesses.
3. **Dead and stale rules in `_headers`.** `/fonts/*` has no matching directory and no
   reference anywhere on the site, and the comment above the catch-all still lists the
   Mudhalvarin Mugavari portal among the plain `<a href>` routes - dropped in A8.
4. **Stale portal mentions in copy.** `<meta name="description">`, `og:description` and
   `twitter:description` all still promise the Mudhalvarin Mugavari portal as a channel to
   follow up through, and the footer disclaimer calls it a channel "named here". Nothing
   links to it any more. Naming it may well be deliberate - the disclaimer exists to show
   what is *not* connected to us - but the meta descriptions are the one place a stranger
   reads that promise before arriving.

Also outstanding, unchanged: `voiceofgudalur.space` must resolve with a valid certificate
for the canonical and `og:url` to be honest, and no page has yet been opened on a real
handset.

## A11. The copy stops telling the reader what to do with the e-mail

The Gmail buttons had been correct since A8 - they open `mail.google.com` with the whole
letter in the URL - but the support card's instructions were written for the old form. The
closing sentence told the reader they could edit the draft before sending, and that "we never
see it". The person is not composing anything on this site any more, and "we never see it"
described something this site no longer does at all: receive. With the form gone, the card
pointed at a step that had left the page. `act2Body` carried the same sentence in all five
languages, so it was removed from all five at once - the i18n table is one row per key, and
leaving one column holding an instruction the others had lost would have been a five-way
inconsistency rather than a translation gap.

The privacy claim is not weakened by the deletion, it is stated more accurately:
`supSubtitle` says the signature goes to the people who can act on it and **this site keeps no
copy of it**. That is a property of a link, and it is checkable - the page has nothing to keep
a copy *with*.

## A12. The support form is a Change.org petition, and nothing is collected

**What changed.** The support card on all three pages was a form - a name field, a WhatsApp
number field, a `SUPPORT` button, and a `POST` to `vog-api.missionvj369.workers.dev` that
returned a Support ID. All of it is gone. In its place the card carries a `YOUR SUPPORT`
heading, the five-language `supSubtitle`, and a single `SUPPORT` button linking to the public
petition:

```
https://c.org/MfJgz7FNsH
```

The slug came with a `/dashboard/home?met=mg` suffix. That path is the creator's own editor,
not the public petition, so it was dropped - **confirm this is the intended public destination
before publishing.** The URL was checked live: HTTP 200, title *"கூடலூர் வனவிலங்கு மோதலுக்கு
நிரந்தர தீர்வு வேண்டும் | Resolve Gudalur animal crisis"*, 271 verified signatures, created 17
September 2026, addressed to the Chief Minister of Tamil Nadu, the MP for Nilgiris, the MLA
for Gudalur, the Field Director of the Gudalur Division, and the Minister for Forests. It is
the right petition and it is live.

The link carries `target="_blank" rel="noopener noreferrer"` on all three pages, so the
petition cannot reach back through `window.opener`.

**Removed from `assets/vog-support.js`:** the `fetch` call, the API URL, `SUP_KEY`, the
`writeId`/`readId`/`delStore` helpers, the submit path, and the Support ID copy. What stays is
the reveal pass, the copy buttons, and the five-language switcher. **The Worker and D1 were not
touched** - the Worker is still deployed and still answers; nothing calls it now.

**Removed from `static-petition/_headers`:** the Worker origin from `connect-src`, which is now
`'self'`. The comment above the catch-all was rewritten to say why, rather than left describing
a request that no longer happens.

**One decision worth stating plainly, because it looks like a regression.** `vog-support.js`
does **not** scrub a `vog-support` key left behind by the old form, which it previously reduced
to a bare ID. The reason is in that file's own header: deleting a stored string out of someone
else's browser is not this file's business. A returning visitor keeps their old record
untouched - but the page never reads it, never renders it, and never sends it. The harness
asserts all three, and that no key beyond `vog-lang` is added.



**The gates moved with the pages, none loosened:**

| Gate | Before | After |
|---|---|---|
| contract test | 53/53 | 53/53 |
| `npm test` | 367/367 (29 files) | 367/367 (29 files) |
| `npx tsc --noEmit` | clean | clean |
| `.tmp/verify-vog.mjs` | 29/29 | **50/50** |
| `.tmp/check-csp.mjs` | all checks passed | all checks passed |
| `.tmp/probe-mail-read.mjs` | ALL CHECKS PASSED | ALL CHECKS PASSED |

Seven contract tests were rewritten, each swapped for a stricter statement of the same intent
rather than deleted:

- `official steps come before the support card in the source order` keyed off `id="supForm"`.
  `indexOf()` on an id that no longer exists returns `-1`, so that comparison would have begun
  passing **for the wrong reason** - it now keys off `#supCard` and asserts that anchor exists.
- Three privacy rules about how the Support ID was stored and posted became: the only key
  written is `vog-lang`, the script makes no request at all, and no page has a `<form>`,
  `name=`, `type="tel"` or `autocomplete=`.
- `connect-src still names only the support Worker` and `the script talks to exactly that one
  origin` became: `connect-src` is `'self'`, and **no page loads any off-origin subresource**.
  The first cut of that rule failed on `<link rel="canonical">`, which is metadata the browser
  never fetches; the non-fetching `link rel`s are now lifted out before the check.
- `the form submits nowhere on its own` became `the support card is a link out, not a form that
  posts anywhere`, and `change.org` joined the allowed-origin list.

`.tmp/verify-vog.mjs` gained 21 checks. The Worker mock and its CORS machinery are deleted -
there is nothing left to intercept - and replaced by something stronger: **every request each
page makes is recorded, and any request that leaves the origin fails the run.** All three pages
are checked for the CTA's href, `target`, `rel` and absence of a form. Clicking SUPPORT is now
tested end to end: change.org is stubbed, the click must open a new tab at the petition, must
post nothing anywhere, and must leave this tab on the site.

`.tmp/check-csp.mjs` had a check asserting the CSP **permits** the Worker origin. It is
inverted: the same cross-origin fetch must now be *blocked* by `connect-src 'self'`, and the
page itself is asserted to request nothing off its own origin. A sweep confirms zero occurrences
of `workers.dev` in `static-petition/`, `assets/` or `_headers`.

One preview-server fix was needed to run that probe at all: `.tmp/serve-static.mjs` resolved
`/` but not a directory URL, so `/grievances/NNNNNNNN/` 404'd locally and the CSP probe
covered the homepage only - the two record pages, which carry the same CTA, were never checked.
It now serves a directory URL as its `index.html`, as Cloudflare Pages and Netlify both do.

**Still open, unchanged from A10:** no `og:image`; stale Mudhalvarin portal wording in the meta
descriptions and in doc sections 6-10; `voiceofgudalur.space` must resolve with a valid
certificate for the canonical and `og:url` to be honest; and no page has been opened on a real
handset. The non-English `supSubtitle` and `figC2Title` translations are new and want a
native-language read before publish.
