/**
 * Gate: the Vision 2035 redesign's SEO surface must not rot.
 *
 * index.html now carries THREE JSON-LD nodes in one @graph — the WebSite,
 * the "Gudalur Vision 2035" Campaign, and the Mudhalvarin Mugavari grievance
 * #18982473 that the campaign is filed under. A malformed graph fails SILENTLY
 * in Google's parser (no console error, no warning in dev), so it is checked
 * here instead: a syntax error, a dropped node, or a broken @id link between
 * the campaign and the grievance fails the test loudly.
 *
 * Run: npx vitest run tests/vision2035Schema.test.ts
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

/** Extract and parse the single ld+json block. */
function readGraph(): any[] {
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(match, 'index.html must contain a ld+json block').toBeTruthy();
  const parsed = JSON.parse(match![1]);
  expect(Array.isArray(parsed['@graph']), 'ld+json must be a single @graph').toBe(true);
  return parsed['@graph'];
}

describe('index.html — Vision 2035 structured data', () => {
  const graph = readGraph();
  const byType = (type: string) => graph.find((n) => n['@type'] === type);

  it('parses as valid JSON-LD and keeps the original WebSite node', () => {
    expect(byType('WebSite')).toBeTruthy();
    expect(byType('WebSite').name).toBe('VOICE OF GUDALUR');
  });

  it('declares the Gudalur Vision 2035 campaign', () => {
    const campaign = byType('Campaign');
    expect(campaign).toBeTruthy();
    expect(campaign.name).toBe('Gudalur Vision 2035');
    expect(campaign.endDate).toBe('2035-12-31');
    // The blueprint deep-link is what the "Explore Vision 2035" CTA and every
    // share message point at, so the schema and the app must agree on it.
    expect(campaign.url).toContain('#gudalur-vision-2035');
  });

  it('links the campaign to grievance #18982473 in both directions', () => {
    const campaign = byType('Campaign');
    const grievance = byType('GovernmentService');
    expect(grievance, 'the grievance node must exist').toBeTruthy();
    expect(grievance.alternateName).toContain('18982473');
    // grievance -> campaign
    expect(grievance.isPartOf['@id']).toBe(campaign['@id']);
    // and the ids are unique, or the graph is ambiguous
    const ids = graph.map((n) => n['@id']).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points the grievance at the official CM Helpline ticket', () => {
    const grievance = byType('GovernmentService');
    expect(grievance.availableChannel.serviceUrl).toContain('cmhelpline.tnega.org');
  });

  it('loads the activism display fonts the redesign depends on', () => {
    expect(html).toContain('Bebas+Neue');
    expect(html).toContain('family=Syne');
  });
});

/**
 * The failure this file exists to prevent, part two: a `t()` key that does not
 * actually resolve.
 *
 * t() resolves translations → extraTranslations → siteExtras (current
 * language) → the same two blocks in English → the raw key. A key that is
 * only defined in one of those blocks resolves fine; a key defined in the
 * English `translations` block SHADOWS the identically-named key in
 * `siteExtras`, because translations is checked first. The Vision 2035 hero
 * shipped the old "connect with your locality" sub-headline for exactly that
 * reason — nothing failed, the string was simply the wrong one.
 *
 * So: no `v2035.*` key may exist outside siteExtras, and no v2035 key may
 * collide with a key that already owns a name in an earlier-resolved block.
 */
describe('v2035 copy keys resolve to the new strings', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/context/LanguageContext.tsx'), 'utf8');

  /** Split the file into the three blocks t() consults, in resolution order. */
  const primary = source.slice(0, source.indexOf('const extraTranslations'));
  const extras = source.slice(source.indexOf('const extraTranslations'), source.indexOf('const siteExtras'));
  const site = source.slice(source.indexOf('const siteExtras'));

  const keysIn = (block: string) =>
    new Set(Array.from(block.matchAll(/'([a-z0-9._]+)':/g)).map((m) => m[1]));
  const primaryKeys = keysIn(primary);
  const extrasKeys = keysIn(extras);
  const siteKeys = keysIn(site);

  const v2035 = Array.from(siteKeys).filter((k) => k.startsWith('v2035.'));
  it('defines the whole v2035 namespace (it is not empty)', () => {
    expect(v2035.length).toBeGreaterThan(40);
  });

  it('has no v2035 key shadowed by an earlier-resolved block', () => {
    const collisions = v2035.filter((k) => primaryKeys.has(k) || extrasKeys.has(k));
    expect(collisions, `shadowed by translations/extraTranslations: ${collisions.join(', ')}`)
      .toEqual([]);
  });

  it('keeps the old hero.* keys out of the new hero entirely', () => {
    // The redesign must not read the legacy 'hero.subheadline' / 'hero.cta_*'
    // family; those belong to the retired localities-first hero.
    const hero = readFileSync(resolve(process.cwd(), 'src/components/ActivismHero.tsx'), 'utf8');
    expect(hero).not.toMatch(/t\('hero\./);
    expect(hero).toContain("t('v2035.hero_sub')");
  });
});
