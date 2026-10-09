/**
 * Pure logic tests for the post-signature verification ladder, plus the
 * registration-form contract: Google/Telegram are AUTHENTICATION + VERIFICATION
 * and belong AFTER registration — the registration form must not offer them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { buildLadderRungs, ladderHeadline, remainingOptionalSteps } from '../verificationLadder';
import type { AuthorizationStatus } from '../../services/api';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.resolve(here, p), 'utf8');

function makeStatus(over: Partial<AuthorizationStatus> = {}): AuthorizationStatus {
  return {
    success: true,
    signature: {
      id: 'sig-1', publicReference: 'VOG-ABC123', status: 'PENDING',
      validationCount: 0, witnessValidated: false, unicodeSortKey: 100,
    },
    authorizations: {
      google: { authorized: false, at: null, label: null },
      telegram: { authorized: false, phoneMatched: false, at: null, label: null },
    },
    fullyValidated: false,
    providers: {
      google: { available: false, clientId: null, reason: 'Google authorization is not configured on this deployment' },
      telegram: { available: false, botUsername: null, reason: 'Telegram mobile validation is not configured on this deployment' },
    },
    ...over,
  };
}

describe('buildLadderRungs', () => {
  it('always starts with the recorded signature rung', () => {
    const rungs = buildLadderRungs(makeStatus());
    expect(rungs[0]).toMatchObject({ id: 'signature', state: 'done' });
    expect(rungs).toHaveLength(4);
  });

  it('provider rungs are optional and unavailable when unconfigured', () => {
    const rungs = buildLadderRungs(makeStatus());
    expect(rungs.find((r) => r.id === 'google')).toMatchObject({ state: 'unavailable', optional: true });
    expect(rungs.find((r) => r.id === 'telegram')).toMatchObject({ state: 'unavailable', optional: true });
  });

  it('shows todo when the provider is configured but not yet used', () => {
    const rungs = buildLadderRungs(makeStatus({
      providers: {
        google: { available: true, clientId: 'cid', reason: null },
        telegram: { available: true, botUsername: 'vog_bot', reason: null },
      },
    }));
    expect(rungs.find((r) => r.id === 'google')!.state).toBe('todo');
    expect(rungs.find((r) => r.id === 'telegram')!.state).toBe('todo');
  });

  it('marks telegram PARTIAL when connected but no number was shared — it is mobile validation', () => {
    const rungs = buildLadderRungs(makeStatus({
      authorizations: {
        google: { authorized: false, at: null, label: null },
        telegram: { authorized: true, phoneMatched: false, at: '2026-01-01T00:00:00Z', label: '@user' },
      },
      providers: {
        google: { available: false, clientId: null, reason: 'x' },
        telegram: { available: true, botUsername: 'vog_bot', reason: null },
      },
    }));
    expect(rungs.find((r) => r.id === 'telegram')!.state).toBe('partial');
  });

  it('marks telegram done only when the shared number MATCHED the registered one', () => {
    const rungs = buildLadderRungs(makeStatus({
      authorizations: {
        google: { authorized: true, at: '2026-01-01T00:00:00Z', label: 'v***@gmail.com' },
        telegram: { authorized: true, phoneMatched: true, at: '2026-01-01T00:00:00Z', label: '@user' },
      },
      providers: {
        google: { available: true, clientId: 'cid', reason: null },
        telegram: { available: true, botUsername: 'vog_bot', reason: null },
      },
    }));
    expect(rungs.find((r) => r.id === 'google')!.state).toBe('done');
    expect(rungs.find((r) => r.id === 'telegram')!.state).toBe('done');
  });

  it('witness rung follows the signature validation count', () => {
    expect(buildLadderRungs(makeStatus()).find((r) => r.id === 'witness')!.state).toBe('todo');
    const validated = makeStatus({
      signature: { id: 's', publicReference: 'p', status: 'COMMUNITY_VALIDATED', validationCount: 1, witnessValidated: true, unicodeSortKey: 200 },
    });
    expect(buildLadderRungs(validated).find((r) => r.id === 'witness')!.state).toBe('done');
  });
});

describe('ladderHeadline', () => {
  it('is full only when the server says fullyValidated', () => {
    expect(ladderHeadline(makeStatus({ fullyValidated: true }))).toBe('full');
    expect(ladderHeadline(makeStatus())).toBe('base');
  });

  it('is strengthened once ANY optional provider step is done', () => {
    expect(ladderHeadline(makeStatus({
      authorizations: {
        google: { authorized: true, at: null, label: null },
        telegram: { authorized: false, phoneMatched: false, at: null, label: null },
      },
    }))).toBe('strengthened');
  });
});

describe('remainingOptionalSteps', () => {
  it('counts only unfinished optional rungs (unavailable ≠ remaining)', () => {
    expect(remainingOptionalSteps(makeStatus())).toBe(0);
    expect(remainingOptionalSteps(makeStatus({
      providers: {
        google: { available: true, clientId: 'cid', reason: null },
        telegram: { available: true, botUsername: 'bot', reason: null },
      },
    }))).toBe(2);
  });
});

describe('registration form contract — Google/Telegram come AFTER registration', () => {
  const modal = read('../../components/Auth/RegisterResidentModal.tsx');

  it('offers no Google / Telegram sign-in', () => {
    expect(modal).not.toMatch(/react-icons\/si/);
    expect(modal).not.toMatch(/SiGoogle|SiTelegram/);
    expect(modal).not.toMatch(/loginWithGoogle|loginWithTelegram/);
    expect(modal).not.toMatch(/handleSocialGoogle|handleSocialTelegram/);
    expect(modal).not.toMatch(/or continue with/);
  });

  it('explains that the providers are used after signing the petition', () => {
    expect(modal).toMatch(/reg\.social_note/);
  });

  it('is an accessible dialog (screen readers announce it; E2E can address it)', () => {
    expect(modal).toMatch(/role="dialog"/);
    expect(modal).toMatch(/aria-modal="true"/);
    expect(modal).toMatch(/aria-label=\{t\('reg\.title'\)\}/);
  });
});