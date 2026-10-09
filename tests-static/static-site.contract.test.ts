/**
 * static-petition contract test
 *
 * The published site in /static-petition is a set of hand-written HTML files.
 * Nothing in the build fails if one of them drifts back towards the behaviour
 * this redesign removed, so these assertions are the only thing standing
 * between a well-meaning edit and a citizen-facing regression.
 *
 * The rules encoded here are the ones from the brief, one describe block each:
 *   - no WhatsApp support flow, and nothing that offers to send a Support ID;
 *   - the official channels are the primary action, on every page;
 *   - grievance figures carry their source, and the two records never mix;
 *   - no personal data is collected at all, and the only thing stored is the
 *     language choice;
 *   - no cross-origin request, so connect-src in _headers is 'self' and
 *     nothing else;
 *   - the page still works with JavaScript switched off.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../static-petition/', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const PAGES = {
  home: read('index.html'),
  gr18982473: read('grievances/18982473/index.html'),
  gr19177921: read('grievances/19177921/index.html'),
};
const ENTRIES = Object.entries(PAGES);
const ALL_PAGES = ENTRIES.map(([, html]) => html);
const SCRIPT = read('assets/vog-support.js');
const I18N = read('assets/vog-i18n.js');
const CSS = read('assets/vog.css');
const REGISTRY_SRC = read('assets/grievances.js');
const HEADERS = read('_headers');

/* window is faked so the registry can be read as data rather than as text. */
const registry = (() => {
  const win: Record<string, unknown> = {};
  new Function('window', REGISTRY_SRC)(win);
  return win;
})();

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/* Strip comments before asserting on code. These files explain at length WHY a
   thing is absent - "there is no wa.me link", "No @import" - and a contract
   test that trips over its own documentation is worse than no test. */
const stripJsComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const stripCssComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const SCRIPT_CODE = stripJsComments(SCRIPT);
const CSS_CODE = stripCssComments(CSS);

/** Pull the address, subject and body a button would send, out of either a
 *  mailto: link or the Gmail web-compose link the pages now use. */
function emailTarget(href: string) {
  const raw = href.replace(/&amp;/g, '&');
  const u = new URL(raw);
  const params = u.searchParams;
  if (u.protocol === 'mailto:') {
    return { address: u.pathname, subject: params.get('subject') ?? '', body: params.get('body') ?? '' };
  }
  /* Gmail: https://mail.google.com/mail/?view=cm&fs=1&to=..&su=..&body=.. */
  return { address: params.get('to') ?? '', subject: params.get('su') ?? '', body: params.get('body') ?? '' };
}
const emailHrefs = (html: string) =>
  [...html.matchAll(/href="((?:mailto:|https:\/\/mail\.google\.com\/)[^"]+)"/g)].map((m) =>
    emailTarget(m[1]!),
  );

const GRIEVANCES = registry.VOG_GR1 as { id: string; facts: { value: string }[] };
const GRIEVANCE2 = registry.VOG_GR2 as { id: string; facts: { value: string }[] };
const LETTERS = registry.VOG_LETTERS as Record<string, { subject: string; body: string }>;

describe('no WhatsApp support flow anywhere', () => {
  const banned = /wa\.me|chat\.whatsapp|api\.whatsapp\.com/i;

  for (const [name, html] of ENTRIES) {
    it(`${name} has no WhatsApp link`, () => {
      expect(html).not.toMatch(banned);
    });
  }

  it('the shared script has no WhatsApp link', () => {
    expect(SCRIPT_CODE).not.toMatch(banned);
  });

  it('nothing offers to send or share a Support ID', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toMatch(/send your support|send (the |your )?support id|share (your|the) support id/i);
    }
    expect(SCRIPT_CODE).not.toMatch(/waHref|waMsg|sendBtn|GROUP_URL|SIGN_URL/);
  });

  it('the language table carries no WhatsApp flow strings', () => {
    expect(stripJsComments(I18N)).not.toMatch(banned);
  });
});

describe('the official channels are the primary action', () => {
  for (const [name, html] of ENTRIES) {
    it(`${name} links to the CM Helpline on 1100`, () => {
      expect(html).toMatch(/href="tel:1100"/);
    });

    it(`${name} cites the CM Helpline FAQ it relies on`, () => {
      expect(html).toMatch(/Tamil Nadu CM Helpline FAQ/);
    });
  }

  it('the homepage offers a follow-up by email for both grievances', () => {
    const ids = emailHrefs(PAGES.home).map((m) => m.subject.match(/\d{8}/)?.[0]);
    expect(ids).toEqual([GRIEVANCES.id, GRIEVANCE2.id]);
  });

  it('every email address is the one the Helpline publishes', () => {
    for (const html of ALL_PAGES) {
      for (const m of emailHrefs(html)) expect(m.address).toBe('cmcell@tn.gov.in');
    }
  });

  /* Step 3, and the Mudhalvarin Mugavari portal link it carried, were removed
     from the record pages at the owner’s request - so the portal-link rule
     becomes one that keeps the removed step from creeping back. */
  it('the record pages stay a two-step route, without the portal step', () => {
    for (const html of [PAGES.gr18982473, PAGES.gr19177921]) {
      expect(html).not.toContain('recStep3');
      expect(html).not.toContain('cmhelpline.tnega.org');
    }
  });

  /* The support card used to be the last block on every page, and the official
     steps had to precede it. With the card gone there is nothing left to order
     against, so what this keeps now is the part that still matters: the
     official channels come first in the source, before any petition link. */
  it('the official channels come before any petition link in the source order', () => {
    for (const html of ALL_PAGES) {
      const start =
        html.indexOf('id="action"') === -1 ? html.indexOf('tel:1100') : html.indexOf('id="action"');
      expect(start, 'this page has no official channel to anchor the order').toBeGreaterThan(-1);
      const petition = html.indexOf('https://c.org/MfJgz7FNsH');
      expect(petition).toBeGreaterThan(-1);
      expect(start).toBeLessThan(petition);
    }
  });});

describe('grievance facts stay sourced and never cross over', () => {
  it('the homepage and the records name both grievance IDs', () => {
    for (const html of ALL_PAGES) {
      expect(html).toContain(GRIEVANCES.id);
      expect(html).toContain(GRIEVANCE2.id);
    }
  });

  it('the two loss figures are labelled with the record they came from', () => {
    for (const figure of GRIEVANCES.facts) {
      expect(PAGES.home).toContain(`>${figure.value}<`);
      expect(PAGES.gr18982473).toContain(`>${figure.value}<`);
    }
    expect(PAGES.gr18982473).toMatch(/Source: grievance record #18982473/);
    expect(PAGES.gr19177921).toMatch(/Source: grievance record #19177921/);
  });

  it('#19177921 does not borrow the figures from #18982473', () => {
    for (const figure of GRIEVANCES.facts) {
      expect(PAGES.gr19177921).not.toContain(`>${figure.value}<`);
    }
  });

  it('no page asserts a status for either grievance', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toMatch(/\b(status (?:is|was)|has been (?:resolved|closed|answered))\b/i);
    }
    /* The home page no longer carries a status section at all, so the honest
       gap marker only exists on the record pages themselves. */
    expect(PAGES.gr18982473).toContain('Not shown in the record.');
    expect(PAGES.gr19177921).toContain('Not shown in the record.');
  });

  it('the registry and the pages agree, letter for letter', () => {
    for (const [id, letter] of Object.entries(LETTERS)) {
      const page = id === GRIEVANCES.id ? PAGES.gr18982473 : PAGES.gr19177921;
      const printed = page.match(new RegExp(`<pre id="letter${id}"[^>]*>([\\s\\S]*?)</pre>`))?.[1] ?? '';
      expect(squash(printed)).toBe(squash(letter.body));

      const sent = emailHrefs(page).find((m) => m.subject.includes(id));
      expect(sent, `no email button for ${id} on its own page`).toBeDefined();
      expect(sent!.subject).toBe(letter.subject);
      expect(sent!.body).toBe(letter.body);
    }
  });

  it('neither letter claims an outcome', () => {
    for (const letter of Object.values(LETTERS)) {
      expect(letter.body).not.toMatch(/has been (?:resolved|closed|approved|rejected)/i);
      expect(letter.body).toMatch(/latest action taken/i);
    }
  });
});

describe('privacy: no personal data is collected, and none is stored', () => {
  it('the pages say the personal details are withheld', () => {
    for (const html of ALL_PAGES) expect(html).toMatch(/[Ww]ithheld/);
  });

  it('no page publishes a Support ID-shaped example', () => {
    for (const html of ALL_PAGES) expect(html).not.toMatch(/VOG-\d{4}-[0-9A-Z]{4,}/);
  });

  it('the script stores the language choice and nothing else', () => {
    const keys = new Set([
      ...[...SCRIPT_CODE.matchAll(/writeStore\(\s*'([^']+)'/g)].map((m) => m[1]!),
      /LANG_KEY = '([^']+)'/.exec(SCRIPT)?.[1],
    ]);
    expect(keys).toEqual(new Set(['vog-lang']));
  });

  it('the script makes no request of its own', () => {
    expect(SCRIPT_CODE).not.toMatch(/fetch\s*\(/);
    expect(SCRIPT_CODE).not.toMatch(/XMLHttpRequest|sendBeacon|EventSource/);
    expect(SCRIPT).not.toMatch(/workers\.dev/);
  });

  it('no page collects a name or a number any more', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toMatch(/<form\b/);
      expect(html).not.toMatch(/name="(name|phone)"/);
      expect(html).not.toMatch(/type="tel"/);
      expect(html).not.toMatch(/autocomplete="(name|tel)/);
    }
  });
  it('the form never asks for a government credential', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toMatch(/name="(otp|aadhaar|aadhar|pan|passport)"/i);
    }
  });
});

describe('no cross-origin request at all, and none added by accident', () => {
  it('connect-src names nothing off-origin, because the page fetches nothing', () => {
    expect(HEADERS).toMatch(/connect-src 'self'/);
    expect(HEADERS).not.toMatch(/connect-src[^;]*workers\.dev/);
  });
  it('the only cross-origin destinations are links a reader opens themselves', () => {
    for (const html of ALL_PAGES) {
      /* canonical and alternate are metadata - the browser never fetches them -
         so lift them out and check only the tags that really pull bytes. */
      const fetched = html.replace(/<link\b[^>]*rel="(?:canonical|alternate)"[^>]*>/g, '');
      for (const [tag] of fetched.matchAll(/<(?:script|link|img|iframe)\b[^>]*(?:src|href)="https?:/g)) {
        throw new Error('a subresource is loaded off-origin: ' + tag.slice(0, 80));
      }
    }
  });
  it('every absolute URL on the pages is an expected one', () => {
    const allowed = [
      'https://voiceofgudalur.space',
      'https://cmhelpline.tnega.org',
      'https://www.youtube.com',
      'https://www.instagram.com',
      'https://www.facebook.com',
      'https://mail.google.com',
      'https://c.org',
      /* The news section links to the reports it quotes. These are two named
         publications, added deliberately and nothing else: the point of this
         list is that a reader can see every destination before clicking, so a
         new host has to be a decision rather than an accident. Both are opened
         as plain <a href> links in a new tab, never fetched by the page - the
         sibling test above is what keeps that true. */
      'https://www.thehindu.com',
      'https://www.newindianexpress.com',
    ];
    for (const html of ALL_PAGES) {
      for (const [url] of html.matchAll(/https:\/\/[^"')\s]+/g)) {
        expect(allowed.some((a) => url.startsWith(a)), `${url} is not an approved origin`).toBe(true);
      }
    }
  });

  it('the stylesheet pulls in nothing remote', () => {
    expect(CSS_CODE).not.toMatch(/@import|url\(\s*['"]?https?:/i);
  });

  it('assets are referenced root-relative so both page depths work', () => {
    for (const html of ALL_PAGES) {
      expect(html).toMatch(/href="\/assets\/vog\.css"/);
      expect(html).toMatch(/src="\/assets\/vog-support\.js"/);
      expect(html).not.toMatch(/(?:href|src)="\.\.?\//);
    }
  });

  it('the record pages are covered by a revalidate-every-time cache rule', () => {
    expect(HEADERS).toMatch(/\/grievances\/\*\s*\r?\n\s*Cache-Control: public, max-age=0, must-revalidate/);
  });
});

describe('the page still works with JavaScript switched off', () => {
  for (const [name, html] of ENTRIES) {
    it(`${name} carries its own copy, not just an empty shell`, () => {
      expect(html).toMatch(/<html lang="en">/);
      expect(html.match(/<h1/g) ?? []).toHaveLength(1);
      expect(html).toMatch(/<main id="main">/);
      expect(html).toMatch(/class="skip"/);
      expect(html).toMatch(/<meta charset="utf-8">/);
      expect(html).toMatch(/name="viewport"/);
      expect(html).toMatch(/rel="canonical"/);
    });

    it(`${name} has no duplicate element ids`, () => {
      const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]!);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, `duplicate ids: ${dupes.join(', ')}`).toEqual([]);
    });

    it(`${name} opens every external link safely`, () => {
      for (const [tag] of html.matchAll(/<a [^>]*target="_blank"[^>]*>/g)) {
        expect(tag).toMatch(/rel="noopener/);
      }
    });
  }

  /* The "YOUR SUPPORT" card and the whole #support section were removed at the
     owner's request, from all three pages at once. What survives is the thing
     the card was for: the petition, reached by a plain link straight to
     Change.org. These two rules replace the ones that used to require the card,
     and they keep both halves of that decision honest - the petition link stays
     reachable, and the section does not quietly come back. */
  it('the petition is still one click away, as a plain link out', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toMatch(/<form\b/);
      expect(html).toMatch(/href="https:\/\/c\.org\/MfJgz7FNsH"/);
      expect(html).toMatch(/target="_blank" rel="noopener noreferrer"/);
    }
  });

  it('no page carries the removed support section back', () => {
    for (const html of ALL_PAGES) {
      expect(html).not.toContain('id="support"');
      expect(html).not.toContain('id="supCard"');
      expect(html).not.toMatch(/data-t="sup(?:Title|Subtitle|Intro|Head|Label)"/);
      /* a jump to a section that no longer exists is a dead link, not a
         harmless leftover */
      expect(html).not.toMatch(/href="#support"/);
      expect(html).not.toMatch(/href="\/#support"/);
    }
  });
  it('the reveal animation can never leave content invisible', () => {
    /* .rv is only hidden under the .js class, which the inline head script sets
       together with a 3s failsafe - so a blocked script cannot blank a page. */
    for (const html of ALL_PAGES) {
      expect(html).toMatch(/documentElement\.classList\.add\('js'\)/);
      expect(html).toMatch(/setTimeout\(show, 3000\)/);
    }
    expect(CSS).toMatch(/\.js \.rv\{opacity:0/);
  });
});

describe('the language table matches the markup it is meant to translate', () => {
  const table = (() => {
    const win: Record<string, unknown> = {};
    new Function('window', I18N)(win);
    return win.VOG_I18N as Record<string, string[]>;
  })();

  it('every data-t key used on a page exists in the table', () => {
    const used = new Set<string>();
    for (const html of ALL_PAGES) {
      for (const [, key] of html.matchAll(/data-t(?:-ph|-aria)?="([^"]+)"/g)) used.add(key!);
    }
    expect(used.size).toBeGreaterThan(0);
    for (const key of used) expect(Object.keys(table), `missing key: ${key}`).toContain(key);
  });

  it('the English column matches the static text, so no-JS readers are served', () => {
    for (const html of ALL_PAGES) {
      /* data-t swaps element text... */
      for (const [, key, text] of html.matchAll(/<[^>]*\bdata-t="([^"]+)"[^>]*>([^<]*)</g)) {
        expect(squash(text), `English text for ${key}`).toBe(squash(table[key]![1]));
      }
      /* ...and data-t-ph swaps a placeholder attribute, which carries no text
         of its own, so the fallback to read is the attribute next to it. */
      for (const [tag, key] of html.matchAll(/<[^>]*\bdata-t-ph="([^"]+)"[^>]*>/g)) {
        const placeholder = tag.match(/placeholder="([^"]*)"/)?.[1] ?? '';
        expect(squash(placeholder), `English placeholder for ${key}`).toBe(squash(table[key!]![1]));
      }
      /* ...and data-t-aria swaps the aria-label of an element whose visible
         text is somewhere else (or, for a tel: link, does not exist at all). */
      for (const [tag, key] of html.matchAll(/<[^>]*\bdata-t-aria="([^"]+)"[^>]*>/g)) {
        const label = tag.match(/aria-label="([^"]*)"/)?.[1] ?? '';
        expect(squash(label), `English aria-label for ${key}`).toBe(squash(table[key!]![1]));
      }
    }
  });

  it('the table is still five languages, indexed Tamil first', () => {
    for (const entry of Object.values(table)) expect(entry).toHaveLength(5);
  });
});

describe('the citizen-action structure is the same on every page', () => {
  it('every page carries the full-page marker and the masthead language row', () => {
    for (const html of ALL_PAGES) {
      expect(html).toMatch(/<body data-i18n-full>/);
      expect(html).toMatch(/<div class="wrap langbar" id="langPick" hidden>/);
      expect(html.match(/id="langList"/g) ?? []).toHaveLength(1);
    }
  });

  it('no page links to the status section that no longer exists', () => {
    for (const html of ALL_PAGES) expect(html).not.toContain('/#status');
  });

  it('the home hero carries the grievances anchor the record pages point at', () => {
    expect(PAGES.home.match(/ id="grievances"/g) ?? []).toHaveLength(1);
    for (const html of [PAGES.gr18982473, PAGES.gr19177921]) {
      expect(html).toContain('href="/#grievances"');
    }
  });

  it('the three published PDFs exist, are real PDFs, and home offers each', () => {
    const pdfs = [
      'safety-govt-reply.pdf',
      'safety-appeal-for-permanent-reply.pdf',
      'gudalur-transformation-plan-2026.pdf',
    ];
    for (const pdf of pdfs) {
      const path = join(ROOT, 'docs', pdf);
      expect(existsSync(path), `missing /docs/${pdf}`).toBe(true);
      expect(readFileSync(path).subarray(0, 5).toString('latin1'), `bad header for ${pdf}`).toBe('%PDF-');
      expect(PAGES.home).toContain(`/docs/${pdf}`);
    }
  });

  it('the PDFs get a cache rule of their own', () => {
    expect(HEADERS).toMatch(/\/docs\/\*\s*\r?\n\s*Cache-Control: public, max-age=86400/);
  });
});
