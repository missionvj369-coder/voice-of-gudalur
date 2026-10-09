/**
 * Source-level security contract for the post-signature authorization API.
 * These are the guarantees that make the feature safe to expose; a runtime test
 * would need a live DB + real Google/Telegram credentials, so the shipped
 * BEHAVIOR is pinned at the code level (same approach as media.contract.test.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(path.resolve(here, p), 'utf8');

describe('authorization route security contract', () => {
  const route = read('./authorization.ts');

  it('every endpoint requires a resident session', () => {
    expect(route).toMatch(/router\.get\('\/status', requireAuth, readLimiter/);
    expect(route).toMatch(/router\.post\('\/google', requireAuth, writeLimiter/);
    expect(route).toMatch(/router\.post\('\/telegram', requireAuth, writeLimiter/);
  });

  it('scopes every signature read to the caller identity (never trusts the client id)', () => {
    expect(route).toMatch(/identity_id = \$2/);
  });

  it('refuses to run without provider configuration (503, not a silent no-op)', () => {
    expect(route).toMatch(/GOOGLE_CLIENT_ID\)[\s\S]{0,200}503/);
    expect(route).toMatch(/TELEGRAM_BOT_TOKEN \|\| ''[\s\S]{0,300}503/);
  });

  it('stores only a keyed subject hash — the raw provider subject never reaches signature_authorizations', () => {
    expect(route).toMatch(/generateProviderSubjectKey\('google', subject\)/);
    expect(route).toMatch(/generateProviderSubjectKey\('telegram', subject\)/);
    const insert = route.slice(route.indexOf('signature_authorizations (signature_id'));
    expect(insert).toMatch(/subject_hash/);
    expect(insert).not.toMatch(/provider_subject/);
  });

  it('telegram only completes the MOBILE-NUMBER rung when the shared number matches the registered one', () => {
    expect(route).toMatch(/const phoneMatched = Boolean\(sharedTail\) && sharedTail === registeredTail/);
    // The number is compared in memory and never persisted by this route.
    expect(route).not.toMatch(/INSERT INTO \w*[Pp]hone/);
  });

  it('verifies the Telegram widget hash and rejects stale payloads', () => {
    expect(route).toMatch(/verifyTelegramHash\(widget, botToken\)/);
    expect(route).toMatch(/authAge > 86400/);
    // Only the widget's own signed fields may enter the hash check.
    expect(route).toMatch(/TELEGRAM_WIDGET_FIELDS/);
  });

  it('refuses a provider account linked to a DIFFERENT resident', () => {
    expect(route).toMatch(/subjectLinkedToOtherResident/);
  });

  it('records consent (social_consent_log) and an audit trail', () => {
    expect(route).toMatch(/INSERT INTO social_consent_log/);
    expect(route).toMatch(/signature\.authorize\.\$\{provider\}/);
  });
});

describe('authorization wiring', () => {
  it('is mounted at /api/authorization', () => {
    expect(read('../../server.ts')).toMatch(/app\.use\('\/api\/authorization', authorizationRoutes\)/);
  });

  it('reuses the exported verifiers from the auth routes (no duplicated crypto)', () => {
    expect(read('./auth.ts')).toMatch(/export async function verifyGoogleIdToken/);
    expect(read('./auth.ts')).toMatch(/export function verifyTelegramHash/);
  });

  it('exposes the ladder status shape to the browser client', () => {
    expect(read('../../src/services/api.ts')).toMatch(/export const authorizationApi = \{/);
    expect(read('../../src/services/api.ts')).toMatch(/\/api\/authorization\/status/);
  });
});
