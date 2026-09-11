import { describe, it, expect } from 'vitest';
import { clampWindow, toPublicMediaItem, ensureRawMediaUrl, MEDIA_DESC_MAX_CHARS } from './mediaPresenter';

describe('clampWindow (bounded gallery requests)', () => {
  it('defaults to a bounded window', () => {
    expect(clampWindow(undefined, undefined)).toEqual({ limit: 24, offset: 0 });
  });
  it('caps limit at 50 and floors offset at 0', () => {
    expect(clampWindow('5000', '-10')).toEqual({ limit: 50, offset: 0 });
  });
  it('rejects garbage input safely', () => {
    expect(clampWindow('abc', 'xyz')).toEqual({ limit: 24, offset: 0 });
  });
  it('accepts sane windows unchanged', () => {
    expect(clampWindow('6', '12')).toEqual({ limit: 6, offset: 12 });
  });
});

describe('toPublicMediaItem (compact public payload)', () => {
  const row = {
    id: 'id1', kind: 'poster', title: 'T',
    description: 'd'.repeat(1000),
    mime: 'image/png', size_bytes: '123', created_at: 'now',
    // data_url deliberately ABSENT from the row shape — the SQL never selects it
  };

  it('returns ONLY whitelisted fields — base64 can never leak', () => {
    const item = toPublicMediaItem(row, 'https://link.storjshare.io/raw/g/vog/media/id1.png');
    expect(Object.keys(item).sort()).toEqual([
      'createdAt', 'description', 'id', 'kind', 'mime', 'sizeBytes', 'title', 'url',
    ]);
  });

  it('trims long descriptions to the documented cap', () => {
    const item = toPublicMediaItem(row, 'u');
    expect((item.description || '').length).toBeLessThanOrEqual(MEDIA_DESC_MAX_CHARS);
  });

  it('never emits /s/ viewer URLs — /s/ becomes /raw/', () => {
    const item = toPublicMediaItem(row, 'https://link.storjshare.io/s/g/vog/media/id1.png');
    expect(item.url).toContain('/raw/');
    expect(item.url).not.toMatch(/\/s\//);
  });

  it('normalizes numbers coming from pgwire as strings', () => {
    const item = toPublicMediaItem(row, 'u');
    expect(item.sizeBytes).toBe(123);
  });
});

describe('ensureRawMediaUrl', () => {
  it('strips /s/ from stored file URLs', () => {
    expect(ensureRawMediaUrl('https://link.storjshare.io/s/g/vog/media/x.png'))
      .toBe('https://link.storjshare.io/raw/g/vog/media/x.png');
  });
  it('passes through already-raw URLs', () => {
    expect(ensureRawMediaUrl('https://link.storjshare.io/raw/g/vog/media/x.png'))
      .toBe('https://link.storjshare.io/raw/g/vog/media/x.png');
  });
  it('tolerates null/undefined', () => {
    expect(ensureRawMediaUrl(null)).toBe('');
  });
});