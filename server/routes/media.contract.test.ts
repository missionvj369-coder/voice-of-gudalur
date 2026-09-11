/**
 * Source-level regression pins for the emergency media work.
 * These assert the SHIPPED BEHAVIOR at the code level where runtime tests
 * would need a browser or a live Storj — they fail loudly if any emergency
 * guarantee regresses (301 redirects, /s/ URLs, unbounded queries, blocking
 * gallery fetch, video auto-preload, HTML-as-media SW caching).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.resolve(here, p), 'utf8');

describe('emergency media regression pins', () => {
  const mediaRoute = read('./media.ts');
  const petitionsRoute = read('./petitions.ts');
  const viteCfg = read('../../vite.config.ts');
  const page = read('../../src/pages/SignPetitionPage.tsx');
  const gallery = read('../../src/components/ShareSocial/MediaGallery.tsx');
  const storjSvc = read('../services/storj.ts');

  it('/api/media/:id/file never issues a permanent 301', () => {
    expect(mediaRoute).not.toMatch(/redirect\(\s*301/);
    expect(mediaRoute).toMatch(/redirect\(\s*302/);
  });

  it('redirect responses are no-store (expiring URLs are never pinned)', () => {
    expect(mediaRoute).toMatch(/no-store/);
  });

  it('public list is whitelisted via the presenter and hard-bounded', () => {
    expect(mediaRoute).toMatch(/toPublicMediaItem/);
    expect(mediaRoute).toMatch(/LIMIT \$\{MEDIA_LIST_HARD_CAP\}/);
    // The public SELECT must never ship the base64 column.
    expect(mediaRoute).toMatch(
      /SELECT id, kind, title, description, mime, size_bytes, file_url, created_at/,
    );
  });

  it('public-grant diagnostic is admin-only and leaks no credentials', () => {
    expect(mediaRoute).toMatch(/storage-health/);
    expect(mediaRoute).toMatch(/requireRole\('ADMIN', 'PLATFORM_ADMIN'\)/);
    const healthSection = mediaRoute.slice(mediaRoute.indexOf('storage-health'));
    expect(healthSection).not.toMatch(/ACCESS_KEY|SECRET_KEY|connectionString/);
  });

  it('service worker cache is versioned and error pages are never cached', () => {
    expect(viteCfg).toMatch(/vog-media-cache-v2/);
    expect(viteCfg).toMatch(/statuses: \[0, 200\]/);
    // /s/ HTML can never enter this cache because the server never emits /s/
    // URLs at all (pinned in storj.test.ts + mediaPresenter.test.ts).
  });

  it('external supporter flow remains intact', () => {
    expect(petitionsRoute).toMatch(/external-support/);
    expect(petitionsRoute).toMatch(/externalLimiter/);
    expect(petitionsRoute).toMatch(/external_support_count/);
  });

  it('Aadhaar-gated signing remains intact', () => {
    expect(petitionsRoute).toMatch(/aadhaar_last4/);
    expect(petitionsRoute).toMatch(/requireAuth/);
  });

  it('SignPetitionPage fetches a bounded window and never blocks on media', () => {
    expect(page).toMatch(/listPaged\(6, 0\)/);
    expect(page).toMatch(/catch\(\(\) => \{\}\)/);
  });

  it('gallery cards never auto-preload video and fail independently', () => {
    expect(gallery).not.toMatch(/preload="auto"/);
    expect(gallery).toMatch(/onError/);
    expect(gallery).toMatch(/retryUrl/);
    expect(gallery).toMatch(/content-visibility:auto/);
  });

  it('public-grant health probe is bounded and cached (not per item)', () => {
    expect(storjSvc).toMatch(/PUBLIC_LINK_RECHECK_MS/);
    expect(storjSvc).toMatch(/probePublicLink/);
  });
});