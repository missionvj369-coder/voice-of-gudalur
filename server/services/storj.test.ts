import { describe, it, expect } from 'vitest';
import { getPublicUrl, getPublicLinkStatus } from './storj';

describe('getPublicUrl (Storj public-link safety)', () => {
  const KEY = 'media/abc.png';

  it('converts /s/ viewer URLs to /raw/ file URLs', () => {
    process.env.STORJ_PUBLIC_LINK_BASE = 'https://link.storjshare.io/s/jwx5xkbqglx4xwwvgp2wdc3ipiwa/vog';
    expect(getPublicUrl(KEY)).toBe('https://link.storjshare.io/raw/jwx5xkbqglx4xwwvgp2wdc3ipiwa/vog/media/abc.png');
  });

  it('keeps an already-healthy /raw/ base unchanged', () => {
    process.env.STORJ_PUBLIC_LINK_BASE = 'https://link.storjshare.io/raw/grantid/vog/';
    expect(getPublicUrl(KEY)).toBe('https://link.storjshare.io/raw/grantid/vog/media/abc.png');
  });

  it('never emits /s/ regardless of configuration', () => {
    process.env.STORJ_PUBLIC_LINK_BASE = 'https://link.storjshare.io/s/grantid/vog';
    const url = getPublicUrl(KEY);
    expect(url).not.toContain('/s/');
  });

  it('returns empty string when not configured (presign fallback path)', () => {
    delete process.env.STORJ_PUBLIC_LINK_BASE;
    expect(getPublicUrl(KEY)).toBe('');
  });

  it('diagnostic snapshot exposes no credentials', () => {
    process.env.STORJ_PUBLIC_LINK_BASE = 'https://link.storjshare.io/raw/grantid/vog';
    const s = getPublicLinkStatus();
    expect(Object.keys(s).sort()).toEqual([
      'lastHealthCheckAt', 'presignedFallbackActive', 'publicGrantConfigured', 'publicGrantHealthy',
    ]);
    expect(JSON.stringify(s)).not.toContain('grantid');
  });
});