import { describe, it, expect } from 'vitest';
import { VIDEO_PRELOAD, cardImgAttrs, retryUrl } from '../mediaAttrs';

describe('media loading attributes (emergency perf rules)', () => {
  it('videos never preload the full file — metadata at most, never auto', () => {
    expect(VIDEO_PRELOAD).toBe('metadata');
    expect(VIDEO_PRELOAD).not.toBe('auto');
  });

  it('ONLY the first card is eager + high priority', () => {
    const first = cardImgAttrs(0);
    expect(first.loading).toBe('eager');
    expect(first.fetchPriority).toBe('high');
    expect(first.decoding).toBe('async');
  });

  it('every other card is lazy + async with no priority boost', () => {
    for (const i of [1, 2, 5, 30]) {
      const a = cardImgAttrs(i);
      expect(a.loading).toBe('lazy');
      expect(a.decoding).toBe('async');
      expect(a.fetchPriority).not.toBe('high');
    }
  });

  it('retry URL keeps the origin and busts only the cache', () => {
    const u = retryUrl('https://example.com/x.png');
    expect(u.startsWith('https://example.com/x.png?retry=')).toBe(true);
  });
});