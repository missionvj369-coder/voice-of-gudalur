/**
 * Voice of Gudalur — staging safety guard contract tests (Phase 2).
 *
 * The guard is the only thing standing between a staging container and the
 * production public record, so the contract is asserted from the OUTSIDE: a real
 * express app on a real port, driven by real HTTP requests.
 *
 * The inventory below is transcribed from `server.ts` plus every router mount,
 * not from the guard's own lists — otherwise these tests would just restate the
 * implementation and could never detect a route that slipped through.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  appEnv,
  isStaging,
  stagingAllowsWrites,
  environmentInfo,
  stagingGuard,
  UNCLASSIFIED_MUTATING,
} from './stagingGuard';

/** [method, path, expected `blocked` value] — every state-changing route today. */
const BLOCKED_ROUTES: Array<[string, string, string]> = [
  // server.ts, declared inline
  ['POST', '/api/alerts/broadcast', '/api/alerts'],
  ['POST', '/api/alerts/broadcast-enhanced', '/api/alerts'],
  ['POST', '/api/voice/incident', '/api/voice/incident'],
  ['POST', '/api/push/subscribe', '/api/push'],
  ['POST', '/api/ai/chat', '/api/ai'],
  ['POST', '/api/ai/brain', '/api/ai'],
  // media → SHARED Storj bucket
  ['POST', '/api/media', '/api/media'],
  ['POST', '/api/media/presign', '/api/media'],
  ['PUT', '/api/media/abc123/complete', '/api/media'],
  ['DELETE', '/api/media/abc123', '/api/media'],
  // public signature ledgers
  ['POST', '/api/petitions/sign', '/api/petitions'],
  ['POST', '/api/petitions/abc/support', '/api/petitions'],
  ['POST', '/api/petitions/abc/external-support', '/api/petitions'],
  ['POST', '/api/petition/sign', '/api/petition'],
  ['POST', '/api/manifesto/signature', '/api/manifesto'],
  ['POST', '/api/manifesto/submission', '/api/manifesto'],
  // civic / validation / authorization
  ['POST', '/api/civic/sign', '/api/civic'],
  ['POST', '/api/civic/verification/start', '/api/civic'],
  ['POST', '/api/civic/verification/complete', '/api/civic'],
  ['POST', '/api/validation/create', '/api/validation'],
  ['POST', '/api/validation/accept', '/api/validation'],
  ['POST', '/api/validation/reject', '/api/validation'],
  ['POST', '/api/authorization/google', '/api/authorization'],
  ['POST', '/api/authorization/telegram', '/api/authorization'],
  // wildlife — the SAME router is mounted at /api/wildlife AND /api/offline
  ['POST', '/api/wildlife/incident', '/api/wildlife'],
  ['POST', '/api/wildlife/sighting', '/api/wildlife'],
  ['POST', '/api/wildlife/voice', '/api/wildlife'],
  ['POST', '/api/wildlife/offline/sync', '/api/wildlife'],
  ['POST', '/api/offline/incident', '/api/offline'],
  ['POST', '/api/offline/sighting', '/api/offline'],
  ['POST', '/api/offline/sync', '/api/offline'],
  // officials — everything except sign-in
  ['POST', '/api/officials/request', '/api/officials'],
  ['POST', '/api/officials/set-password', '/api/officials'],
  ['POST', '/api/officials/forgot-password', '/api/officials'],
  ['POST', '/api/officials/reset-password', '/api/officials'],
  ['POST', '/api/officials/approve/42', '/api/officials'],
  // admin — everything except login/logout
  ['POST', '/api/admin/officials', '/api/admin'],
  ['POST', '/api/admin/officials/42/approve', '/api/admin'],
  ['POST', '/api/admin/officials/42/reject', '/api/admin'],
  ['POST', '/api/admin/officials/42/reset-password', '/api/admin'],
];

/** Mutating routes staging must still be able to use: sign-in and session only. */
const ALLOWED_ROUTES: Array<[string, string]> = [
  ['POST', '/api/auth/register'],
  ['POST', '/api/auth/lookup'],
  ['POST', '/api/auth/google'],
  ['POST', '/api/auth/telegram'],
  ['POST', '/api/auth/forgot'],
  ['POST', '/api/auth/refresh'],
  ['POST', '/api/auth/logout'],
  ['PATCH', '/api/auth/me'],
  ['POST', '/api/admin/login'],
  ['POST', '/api/admin/logout'],
  ['POST', '/api/officials/login'],
];

/** Reads must work on staging — that is the whole point of having it. */
const READ_ROUTES: Array<[string, string]> = [
  ['GET', '/api/health'],
  ['GET', '/api/push/public-key'],
  ['GET', '/api/alerts'],
  ['GET', '/api/media'],
  ['GET', '/api/petitions'],
  ['GET', '/api/petition/count'],
  ['GET', '/api/manifesto'],
  ['GET', '/api/wildlife'],
  ['GET', '/api/offline'],
  ['GET', '/api/civic'],
  ['GET', '/api/validation'],
  ['GET', '/api/authorization'],
  ['GET', '/api/admin/officials'],
  ['GET', '/api/officials/signs'],
];

// ---------------------------------------------------------------------------
// Harness — a real express app on a real port, driven by real HTTP requests.
// ---------------------------------------------------------------------------

let server: Server | undefined;
let base = '';

const ORIGINAL_ENV = {
  APP_ENV: process.env.APP_ENV,
  NODE_ENV: process.env.NODE_ENV,
  STAGING_ALLOW_WRITES: process.env.STAGING_ALLOW_WRITES,
};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function call(method: string, path: string) {
  const res = await fetch(base + path, { method, redirect: 'manual' });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* not JSON — irrelevant for this contract */
  }
  return { status: res.status, body, xEnvironment: res.headers.get('x-environment') };
}

beforeAll(async () => {
  // The guard logs every refusal; keep suite output readable.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  const app = express();
  app.use(stagingGuard);
  // Terminal handler: reaching it proves the guard let the request through.
  app.use((_req, res) => {
    res.json({ reached: true });
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
  });
  base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
});

// Every test starts as a staging deployment; the escape hatch is off.
beforeEach(() => setEnv({ ...ORIGINAL_ENV, APP_ENV: 'staging', STAGING_ALLOW_WRITES: undefined }));
afterEach(() => setEnv(ORIGINAL_ENV));

// ---------------------------------------------------------------------------
// Environment resolution
// ---------------------------------------------------------------------------

describe('deployment environment resolution', () => {
  it('treats APP_ENV=staging as staging even when NODE_ENV=production', () => {
    // NODE_ENV must stay `production` on staging so cookies keep `Secure`.
    setEnv({ NODE_ENV: 'production', APP_ENV: 'staging' });
    expect(appEnv()).toBe('staging');
    expect(isStaging()).toBe(true);
    expect(stagingAllowsWrites()).toBe(false);
  });

  it('keeps an APP_ENV-less production process on production behaviour', () => {
    setEnv({ APP_ENV: undefined, NODE_ENV: 'production' });
    expect(appEnv()).toBe('production');
    expect(isStaging()).toBe(false);
    expect(stagingAllowsWrites()).toBe(true);
  });

  it('infers development when nothing is set', () => {
    setEnv({ APP_ENV: undefined, NODE_ENV: undefined });
    expect(appEnv()).toBe('development');
    expect(stagingAllowsWrites()).toBe(true);
  });

  it('normalises case and surrounding whitespace', () => {
    setEnv({ APP_ENV: '  STAGING  ' });
    expect(appEnv()).toBe('staging');
    setEnv({ APP_ENV: 'Prod' });
    expect(appEnv()).toBe('production');
    setEnv({ APP_ENV: 'dev' });
    expect(appEnv()).toBe('development');
  });

  it('exposes a non-secret descriptor that never leaks a value', () => {
    setEnv({ APP_ENV: 'staging' });
    expect(environmentInfo()).toEqual({ env: 'staging', staging: true, writes_allowed: false });
    setEnv({ APP_ENV: 'production' });
    expect(environmentInfo()).toEqual({ env: 'production', staging: false, writes_allowed: true });
  });

  it('accepts STAGING_ALLOW_WRITES=true as the documented escape hatch', () => {
    setEnv({ APP_ENV: 'staging', STAGING_ALLOW_WRITES: 'true' });
    expect(stagingAllowsWrites()).toBe(true);
    setEnv({ APP_ENV: 'staging', STAGING_ALLOW_WRITES: 'TRUE' });
    expect(stagingAllowsWrites()).toBe(true);
  });

  it('never lets the escape hatch affect a non-staging deployment', () => {
    setEnv({ APP_ENV: 'production', STAGING_ALLOW_WRITES: 'false' });
    expect(stagingAllowsWrites()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The contract: state-changing routes to shared production state are refused
// ---------------------------------------------------------------------------

describe('staging refuses every mutating route that touches shared state', () => {
  it.each(BLOCKED_ROUTES)('%s %s → 403 %s', async (method, path, expected) => {
    const res = await call(method, path);
    expect(res.status).toBe(403);
    expect(res.body?.error).toBe('STAGING_WRITE_BLOCKED');
    expect(res.body?.blocked).toBe(expected);
    expect(res.body?.env).toBe('staging');
    // 403 rather than 404: staging must identify itself, not hide the route.
    expect(res.xEnvironment).toBe('staging');
  });
});

describe('staging keeps sign-in and session plumbing usable', () => {
  it.each(ALLOWED_ROUTES)('%s %s reaches the handler', async (method, path) => {
    const res = await call(method, path);
    expect(res.status).toBe(200);
    expect(res.body?.reached).toBe(true);
  });
});

describe('staging keeps every read usable', () => {
  it.each(READ_ROUTES)('%s %s reaches the handler', async (method, path) => {
    const res = await call(method, path);
    expect(res.status).toBe(200);
    expect(res.body?.reached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fail closed — the property that makes the guard a safety boundary
// ---------------------------------------------------------------------------

describe('unclassified mutating routes fail closed', () => {
  it('refuses a mutating /api route nobody has classified', async () => {
    const res = await call('POST', '/api/some-future-feature');
    expect(res.status).toBe(403);
    expect(res.body?.blocked).toBe(UNCLASSIFIED_MUTATING);
  });

  it('distinguishes an unclassified refusal from a known shared-state refusal', async () => {
    const unclassified = await call('POST', '/api/some-future-feature');
    const known = await call('POST', '/api/media');
    expect(unclassified.body?.message).not.toBe(known.body?.message);
  });

  it('does not let /api/auth prefix-match a look-alike route', async () => {
    // `/api/authx` must NOT be treated as the allowed auth plumbing.
    const res = await call('POST', '/api/authx');
    expect(res.status).toBe(403);
    expect(res.body?.blocked).toBe(UNCLASSIFIED_MUTATING);
  });

  it('does not let /api/petitions prefix-match a look-alike route', async () => {
    const res = await call('POST', '/api/petitionsXYZ');
    expect(res.status).toBe(403);
    expect(res.body?.blocked).toBe(UNCLASSIFIED_MUTATING);
  });

  it('still lets non-/api requests through, since they cannot reach shared state', async () => {
    const res = await call('POST', '/assets/index.js');
    expect(res.status).toBe(200);
    expect(res.body?.reached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Production must be byte-for-byte unaffected
// ---------------------------------------------------------------------------

describe('production behaviour is untouched', () => {
  beforeEach(() => setEnv({ APP_ENV: undefined, NODE_ENV: 'production' }));

  it('lets a production deployment perform every guarded write', async () => {
    for (const [method, path] of BLOCKED_ROUTES) {
      const res = await call(method, path);
      expect(res.status, `${method} ${path}`).toBe(200);
      expect(res.body?.reached, `${method} ${path}`).toBe(true);
    }
  });

  it('does not stamp the staging header on production responses', async () => {
    const res = await call('POST', '/api/media');
    expect(res.xEnvironment).toBeNull();
  });

  it('lets an unclassified mutating route through on production', async () => {
    const res = await call('POST', '/api/some-future-feature');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Escape hatch
// ---------------------------------------------------------------------------

describe('STAGING_ALLOW_WRITES escape hatch', () => {
  beforeEach(() => setEnv({ APP_ENV: 'staging', STAGING_ALLOW_WRITES: 'true' }));

  it('re-opens the guarded routes for an isolated staging database', async () => {
    for (const [method, path] of BLOCKED_ROUTES) {
      const res = await call(method, path);
      expect(res.status, `${method} ${path}`).toBe(200);
    }
  });

  it('re-opens unclassified routes too', async () => {
    const res = await call('POST', '/api/some-future-feature');
    expect(res.status).toBe(200);
  });
});