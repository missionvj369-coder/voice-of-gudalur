/* ===========================================================================
   Voice of Gudalur - the shared behaviour for all three citizen-action pages.

   Loaded with a single root-relative src from /, /grievances/18982473/ and
   /grievances/19177921/, so every page reads its own depth. It does four
   things, in this order:

     1. reveal    - fades in .rv blocks as they scroll into view. Without JS
                    (or without IntersectionObserver) everything stays visible:
                    .rv is only ever hidden under the .js class.
     2. copy      - the [data-copy] buttons, for the follow-up letter text.
     3. language  - the five-language switcher in the masthead, reading the copy
                    table in assets/vog-i18n.js and the same stored choice
                    (vog-lang) the site has used since rev 12. A page marked
                    data-i18n-full on <body> is translated end to end and its
                    <html lang> follows the choice.
     4. intro     - the one-minute film on the homepage, its one-shot song
                    (attempted aloud, then muted, then unmuted by the first
                    touch; faded out and paused when the film ends) and the
                    floating sound button the film carries. The record pages
                    are never interrupted: no film, no song, no button.

   It makes NO network request at all. The support card used to POST a name and
   a WhatsApp number to a Worker and mint a Support ID from the answer; that
   form is gone, and support now means signing the Change.org petition, which is
   a plain link the reader opens themselves. Nothing here collects a name or a
   number any more, so connect-src in _headers is back to 'self'.

   What it deliberately does NOT do: there is no wa.me link, no chat.whatsapp
   link, and no "send / share your Support ID" button. Official follow-up is by
   the government channels in the HTML (tel:1100 and the CM Helpline mailbox),
   which are plain links a person opens themselves.

   Storage: the only thing written to localStorage is the language choice
   (vog-lang). The support record's own key (vog-support) is deliberately left
   alone rather than scrubbed here: a visitor's browser may still hold a Support
   ID from an earlier revision, and deleting a stored string from someone else's
   browser is not this file's business.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function readStore(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function writeStore(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { } }

  /* --- 1. reveal ------------------------------------------------------------
     Everything already painted without animation is fine; nothing may be left
     invisible, so the timeout is a hard safety net for odd browsers. */
  var rvNodes = document.querySelectorAll('.rv');
  function reveal(el) { el.classList.add('in'); }
  if (!('IntersectionObserver' in window) || reduced) {
    for (var r = 0; r < rvNodes.length; r++) reveal(rvNodes[r]);
  } else {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) { reveal(entries[i].target); io.unobserve(entries[i].target); }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    for (var q = 0; q < rvNodes.length; q++) io.observe(rvNodes[q]);
    setTimeout(function () { for (var i = 0; i < rvNodes.length; i++) reveal(rvNodes[i]); }, 4000);
  }

  /* --- 2. copy buttons ------------------------------------------------------
     Clipboard API first, the execCommand path second: this site is opened
     inside in-app browsers a lot, and those are exactly the ones without the
     async clipboard. */
  var COPIED = 'Copied';
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function flagCopied(btn) {
    var label = btn.querySelector('.lbl') || btn;
    var old = label.textContent;
    label.textContent = COPIED;
    setTimeout(function () { label.textContent = old; }, 2200);
  }
  function copyFrom(btn) {
    var src = $(btn.getAttribute('data-copy'));
    if (!src) return;
    var text = (src.textContent || '').trim();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flagCopied(btn); },
        function () { if (fallbackCopy(text)) flagCopied(btn); });
    } else if (fallbackCopy(text)) { flagCopied(btn); }
  }
  var cbtns = document.querySelectorAll('[data-copy]');
  for (var ci = 0; ci < cbtns.length; ci++) {
    (function (btn) { btn.addEventListener('click', function () { copyFrom(btn); }); })(cbtns[ci]);
  }

  /* --- 3. language ----------------------------------------------------------
     Same five languages, same table and same stored choice (vog-lang) as the
     previous revision, so returning visitors keep the language they picked.
     Two deliberate changes from the old inline script:

       - the table is window.VOG_I18N (assets/vog-i18n.js), so the Indic
         strings stay byte-identical to what they were instead of being
         retyped here;
       - lang follows the language on <html> for a page that declares
         data-i18n-full, because such a page really is translated end to end.
         On a page that is only partly translated, each rewritten element
         declares its own language instead, so the English the script leaves
         alone keeps the language it was written in. */
  var T = window.VOG_I18N || {};
  var LANGS = ['ta-IN', 'en-IN', 'ml-IN', 'kn-IN', 'hi-IN'];
  var NATIVE = ['தமிழ்', 'English', 'മലയാളം', 'ಕನ್ನಡ', 'हिंदी'];
  var LANG_KEY = 'vog-lang';
  var N = LANGS.length;

  function detect() {
    var saved = parseInt(readStore(LANG_KEY), 10);
    if (saved >= 0 && saved < N) return saved;
    var want = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    if (want) {
      var sub = want.split('-')[0];
      for (var i = 0; i < N; i++) {
        if (LANGS[i].toLowerCase().split('-')[0] === sub) return i;
      }
    }
    return 1; /* English when nothing matches */
  }
  var idx = detect();

  function t(key) {
    var e = T[key];
    if (!e) return key;
    return e[idx] || e[1] || key;
  }

  var langList = $('langList');
  /* Every [data-t] in the document is fair game. A page that declares
     data-i18n-full on <body> is translated end to end, so one attribute on
     <html> says what language the reader is reading. A page whose copy is only
     partly translated cannot do that without lying about the English it leaves
     alone - so on those, every element this script rewrites declares its own
     language instead, the header's language row included. */
  var scope = document;
  var fullPage = document.body.hasAttribute('data-i18n-full');

  function applyLang() {
    var i, nodes;
    nodes = scope.querySelectorAll('[data-t]');
    for (i = 0; i < nodes.length; i++) nodes[i].textContent = t(nodes[i].getAttribute('data-t'));
    nodes = scope.querySelectorAll('[data-t-ph]');
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('placeholder', t(nodes[i].getAttribute('data-t-ph')));
    nodes = scope.querySelectorAll('[data-t-aria]');
    for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('aria-label', t(nodes[i].getAttribute('data-t-aria')));
    if (fullPage) {
      document.documentElement.setAttribute('lang', LANGS[idx]);
    } else {
      nodes = scope.querySelectorAll('[data-t],[data-t-ph],[data-t-aria]');
      for (i = 0; i < nodes.length; i++) nodes[i].setAttribute('lang', LANGS[idx]);
    }
    /* the copy buttons sit outside the card, so only the word follows the
       language - and only when the table actually has that key */
    var cw = t('copied');
    COPIED = (cw === 'copied' || !cw) ? 'Copied' : cw;
    writeStore(LANG_KEY, String(idx));
    if (langList) {
      var btns = langList.querySelectorAll('button');
      for (i = 0; i < btns.length; i++) btns[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
    }
    /* the song button is not a data-t element - its label depends on whether the
       sound is on, which no attribute can express - so it is painted here */
    songPaint();
  }

  /* The switcher is built rather than written out five times per page, and the
     row holding it stays hidden until the buttons exist - a label over nothing
     is worse than no switcher at all. */
  if (langList) {
    for (var li = 0; li < N; li++) {
      (function (n) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'langbtn';
        var nat = document.createElement('span');
        nat.lang = LANGS[n];
        nat.textContent = NATIVE[n];
        b.appendChild(nat);
        b.addEventListener('click', function () { idx = n; applyLang(); b.focus(); });
        langList.appendChild(b);
      })(li);
    }
    var pick = $('langPick');
    if (pick) pick.hidden = false;
  }
  applyLang();

  /* --- 4. the intro film, and the song that plays once ----------------------
     The homepage opens with a one-minute film - Gudalur at home, the problems
     that stayed, the moment the change began, temporary fixes becoming
     permanent, people taking responsibility, the title - and only then reveals
     the core site. The record pages carry no film: a link opened to read a
     grievance goes straight to the record, and nothing may stand in the way.
     The markup carries the overlay `hidden`, so without JavaScript (or under
     prefers-reduced-motion) every reader meets the site directly.

     The song plays exactly once, during the film, and never repeats: there is
     no loop, and finishIntro() fades it out and pauses it for good - nothing
     on the core site starts it again. What a browser allows unprompted
     differs: attempt audible first, fall back to muted, and let the reader's
     first touch unmute - Safari (desktop and iOS alike) insists on that
     gesture. Skipping the film counts as leaving, not as asking for sound, so
     the skip button is excluded from that first touch; the sound button
     toggles itself.

     NOTHING IS STORED. The privacy test in tests-static asserts that this file
     writes exactly one key, vog-lang, and a remembered preference would fail
     it - which is the right answer: a preference is not something to keep on
     someone's phone. Reload, and the film - with its song - starts again.

     Volume is low on purpose. This is music under a one-minute film on a page
     someone may be watching on a phone in a tea estate; it should never be
     the loudest thing in the room. */
  var song = $('vogSong'), songBtn = $('vogSongBtn'),
      intro = $('vogIntro'), introSkip = $('vogIntroSkip');

  /* Called from applyLang() so the button's label follows the chosen language.
     Declared here and hoisted, so applyLang above can already reach it; the
     guard is what makes that safe on the very first call, before `song` is
     assigned. The button is icon-only, so only the aria-label (and the
     language it is spoken in) needs painting - the visible pair of svgs is
     switched by CSS off aria-pressed. */
  function songPaint() {
    if (!song || !songBtn) return;
    var on = songBtn.getAttribute('aria-pressed') === 'true';
    songBtn.setAttribute('aria-label', t(on ? 'audStopAria' : 'audAria'));
    songBtn.setAttribute('lang', LANGS[idx]);
  }

  if (intro && song && songBtn && !reduced) {
    var introTimers = [], introDone = false, filmStarted = false, settled = false;
    song.volume = 0.28;
    song.loop = false; /* belt and braces: the markup carries no loop either */

    var SCENES = [0, 8000, 16000, 24000, 38000, 50000]; /* six windows, 60s */
    var sceneNodes = intro.querySelectorAll('.iscn');
    var capNodes = intro.querySelectorAll('.icpn');
    var pageBlocks = document.querySelectorAll('header.top, main, footer');

    function showScene(n) {
      for (var k = 0; k < sceneNodes.length; k++) {
        sceneNodes[k].classList.toggle('on', k === n);
        if (capNodes[k]) capNodes[k].classList.toggle('on', k === n);
      }
    }

    function lockPage(on) {
      document.documentElement.classList.toggle('ilock', on);
      for (var b = 0; b < pageBlocks.length; b++) {
        if (on) pageBlocks[b].setAttribute('inert', ''); else pageBlocks[b].removeAttribute('inert');
      }
    }

    function songOff() {
      songBtn.setAttribute('aria-pressed', 'false');
      song.muted = true;
      song.pause();
      songPaint();
    }

    function songOn() {
      if (introDone) return; /* the film is over: the core site stays silent */
      song.muted = false;
      song.currentTime = 0;
      songBtn.setAttribute('aria-pressed', 'true');
      songPaint();
      var p = song.play();
      if (p && typeof p.catch === 'function') p.catch(songOff);
    }

    function songFadeOut(ms) {
      var v0 = song.volume, steps = 16, n = 0;
      var iv = setInterval(function () {
        n++;
        song.volume = Math.max(0, v0 * (1 - n / steps));
        if (n < steps) return;
        clearInterval(iv);
        song.pause();
        try { song.currentTime = 0; } catch (e) { /* not seekable yet */ }
        song.volume = v0;
        songOff();
      }, Math.max(25, Math.floor(ms / steps)));
    }

    function finishIntro() {
      if (introDone) return;
      introDone = true;
      for (var k = 0; k < introTimers.length; k++) clearTimeout(introTimers[k]);
      songFadeOut(500);
      songBtn.hidden = true;
      intro.classList.remove('run');
      intro.hidden = true;
      lockPage(false);
    }

    /* Run the film. Reading offsetHeight forces a layout between un-hiding the
       overlay and adding .run / .on: WebKit (iOS Safari above all) will not
       start a @keyframes animation that is triggered in the same synchronous
       task that flips the element from display:none, so the scene animations
       (sunrise, paper, tree, flag, title) never ran there. The reflow commits
       the un-hide first, and the animations fire. */
    function runFilm() {
      if (filmStarted || introDone) return;
      filmStarted = true;
      intro.hidden = false;
      void intro.offsetHeight; /* reflow: the iOS Safari animation fix */
      lockPage(true);
      intro.classList.add('run');
      showScene(0);
      for (var s = 1; s < SCENES.length; s++) {
        (function (n) { introTimers.push(setTimeout(function () { showScene(n); }, SCENES[n])); })(s);
      }
      introTimers.push(setTimeout(finishIntro, 60000));
      songBtn.hidden = false;
    }

    /* Autoplay with sound was refused (iOS Safari above all): the film stays on the
       first frame, muted, until the user unmutes. No tap-to-start prompt. */
    function holdForSound() {
      song.muted = true;
      songPaint();
      runFilm();
    }

    /* Sound by default: try audible autoplay the instant the page opens. Where a
       browser allows it (desktop, Android) the film runs with sound right away;
       where it refuses (iOS Safari) the film stays on the first frame, muted,
       and the user unmutes via the song button. No tap-to-start prompt. */
    function audible() {
      if (settled) return; settled = true;
      songBtn.setAttribute('aria-pressed', 'true'); /* audible already */
      songPaint();
      runFilm();
    }
    function needGesture() {
      if (settled) return; settled = true;
      song.muted = true;
      songPaint();
      holdForSound();
    }
    song.muted = false;
    var firstPlay = song.play();
    if (firstPlay && typeof firstPlay.then === 'function') {
      firstPlay.then(audible, needGesture);
      setTimeout(needGesture, 700); /* if play() neither settles, fall back to muted */
    } else {
      audible(); /* old synchronous play(): assume it started */
    }

    songBtn.addEventListener('click', function () {
      var on = songBtn.getAttribute('aria-pressed') === 'true';
      if (on) songOff(); else songOn();
    });
    song.addEventListener('ended', songOff); /* one play: it simply ends */
  }
})();
