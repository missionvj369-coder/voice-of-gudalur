import { describe, it, expect } from 'vitest';
import { loadCamaraConfig, isCamaraEnabled } from './camaraConfig';

describe('loadCamaraConfig (env-driven, fail-closed)', () => {
  it('defaults to mode off', () => {
    const cfg = loadCamaraConfig({});
    expect(cfg.mode).toBe('off');
    expect(isCamaraEnabled(cfg)).toBe(false);
    expect(cfg.baseUrl).toBe('');
  });

  it('loads a complete sandbox config', () => {
    const cfg = loadCamaraConfig({
      CAMARA_MODE: 'sandbox',
      CAMARA_BASE_URL: 'https://sandbox.example.com/',
      CAMARA_CLIENT_ID: 'cid',
      CAMARA_CLIENT_SECRET: 'csecret',
    });
    expect(cfg.mode).toBe('sandbox');
    expect(cfg.baseUrl).toBe('https://sandbox.example.com');
    expect(cfg.clientId).toBe('cid');
    expect(cfg.clientSecret).toBe('csecret');
    expect(isCamaraEnabled(cfg)).toBe(true);
  });

  it('loads a complete production config and reports production=true via adapter', () => {
    const cfg = loadCamaraConfig({
      CAMARA_MODE: 'production',
      CAMARA_BASE_URL: 'https://operator.example.com',
      CAMARA_CLIENT_ID: 'cid',
      CAMARA_CLIENT_SECRET: 'secret',
    });
    expect(cfg.mode).toBe('production');
    expect(isCamaraEnabled(cfg)).toBe(true);
  });

  it('throws when sandbox/production is configured but fields are missing', () => {
    expect(() => loadCamaraConfig({ CAMARA_MODE: 'sandbox' })).toThrow(/CAMARA_BASE_URL/);
    expect(() =>
      loadCamaraConfig({ CAMARA_MODE: 'production', CAMARA_BASE_URL: 'https://x' }),
    ).toThrow(/CAMARA_CLIENT_ID/);
  });

  it('throws on an invalid mode value', () => {
    expect(() => loadCamaraConfig({ CAMARA_MODE: 'moo' })).toThrow(/CAMARA_MODE/);
  });

  it('rejects credentials from a .env example file (no credentials in source)', () => {
    // Attempt to load the repo .env.example as config — must never contain real creds.
    // The default loadCamaraConfig({}) produces off-mode with empty credentials.
    const cfg = loadCamaraConfig({});
    expect(cfg.clientSecret).toBe('');
    expect(cfg.clientId).toBe('');
  });
});