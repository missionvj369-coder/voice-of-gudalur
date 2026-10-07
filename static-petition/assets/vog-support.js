/* ===========================================================================
   Voice of Gudalur - the shared behaviour for all three citizen-action pages.

   Loaded with a single root-relative src from /, /grievances/18982473/ and
   /grievances/19177921/, so every page reads its own depth. It does three
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
  var ENGLISH = ['Tamil', 'English', 'Malayalam', 'Kannada', 'Hindi'];
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
        var en = document.createElement('span');
        en.className = 'en';
        en.textContent = ENGLISH[n];
        b.appendChild(nat);
        b.appendChild(en);
        b.addEventListener('click', function () { idx = n; applyLang(); b.focus(); });
        langList.appendChild(b);
      })(li);
    }
    var pick = $('langPick');
    if (pick) pick.hidden = false;
  }
  applyLang();

  /* --- 4. background song ----------------------------------------------------
     One rule shapes all of this: a browser will not start audible media on its
     own. Chrome, Safari and Firefox all require a gesture first. So the song is
     started muted - that is the only state in which "plays by itself" is true -
     and the floating button is how the reader turns the sound on. The button
     stays `hidden` in the markup and is revealed below, so a reader without
     JavaScript gets silence instead of a control that does nothing.

     NOTHING IS STORED. The privacy test in tests-static asserts that this file
     writes exactly one key, vog-lang, and a remembered mute preference would
     fail it - which is the right answer: a sound preference is not something to
     keep on someone's phone. Reload, and the song starts muted again.

     Volume is low on purpose. This is background music on a page someone may be
     reading on a phone in a tea estate; it should never be the loudest thing in
     the room. */
  var song = $('vogSong'), songBtn = $('vogSongBtn');

  /* Called from applyLang() so the button's label follows the chosen language.
     Declared here and hoisted, so applyLang above can already reach it; the
     guard is what makes that safe on the very first call, before `song` is
     assigned. */
  function songPaint() {
    if (!song || !songBtn) return;
    var on = songBtn.getAttribute('aria-pressed') === 'true';
    songBtn.setAttribute('aria-label', t(on ? 'audStopAria' : 'audAria'));
    songBtn.setAttribute('lang', LANGS[idx]);
    songBtn.lastElementChild.textContent = t(on ? 'audStop' : 'audLabel');
  }

  if (song && songBtn) {
    song.volume = 0.28;
    song.muted = true;            /* as a property too, not only the attribute */

    /* Autoplay can still be refused - data-saver mode, low-power mode, or a
       browser that blocks it outright. play() returns a promise that rejects in
       exactly those cases, so it is caught: the button simply waits for a click.
       An unhandled rejection here would be a console error on an otherwise
       clean page. */
    function songStart() {
      var p = song.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* refused: stay silent, no error surfaces */ });
      }
    }

    songBtn.addEventListener('click', function () {
      var on = songBtn.getAttribute('aria-pressed') === 'true';
      if (on) {
        songBtn.setAttribute('aria-pressed', 'false');
        song.muted = true;
        song.pause();
      } else {
        songBtn.setAttribute('aria-pressed', 'true');
        song.muted = false;        /* this click IS the gesture the policy wants */
        song.currentTime = 0;
        songStart();
      }
      songPaint();
    });

    songBtn.hidden = false;
    songStart();                   /* muted, so this is allowed */
    songPaint();
  }

})();
