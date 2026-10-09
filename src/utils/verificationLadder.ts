import type { AuthorizationStatus } from '../services/api';

/**
 * Pure state model for the post-signature verification ladder.
 *
 * The ladder explains what a signature IS and what it CAN become — the two
 * optional provider authorizations are presented exactly as optional, and
 * "fully validated" (Google + Telegram mobile + community witness) is shown as
 * the strongest form, never as a requirement. A signature with nothing extra is
 * still a valid signature.
 */
export type RungState = 'done' | 'partial' | 'todo' | 'unavailable';

export type RungId = 'signature' | 'witness' | 'google' | 'telegram';

export interface LadderRung {
  id: RungId;
  state: RungState;
  /** The witness rung is part of the petition's own flow; the providers are not. */
  optional: boolean;
}

export type LadderHeadline = 'full' | 'strengthened' | 'base';

export function buildLadderRungs(status: AuthorizationStatus | null): LadderRung[] {
  if (!status) return [];
  const witnessDone = status.signature.witnessValidated;
  const googleOk = Boolean(status.authorizations.google.authorized);
  const telegramOk = Boolean(status.authorizations.telegram.authorized);
  const telegramPhone = Boolean(status.authorizations.telegram.phoneMatched);
  const googleAvailable = status.providers.google.available;
  const telegramAvailable = status.providers.telegram.available;

  return [
    { id: 'signature', state: 'done', optional: false },
    {
      id: 'witness',
      state: witnessDone ? 'done' : 'todo',
      optional: false,
    },
    {
      id: 'google',
      state: googleOk ? 'done' : googleAvailable ? 'todo' : 'unavailable',
      optional: true,
    },
    {
      id: 'telegram',
      state: telegramOk
        ? telegramPhone
          ? 'done'
          : 'partial' // connected, but the mobile number was never shared
        : telegramAvailable
          ? 'todo'
          : 'unavailable',
      optional: true,
    },
  ];
}

/** What the headline should say about THIS signature right now. */
export function ladderHeadline(status: AuthorizationStatus | null): LadderHeadline {
  if (!status) return 'base';
  if (status.fullyValidated) return 'full';
  const rungs = buildLadderRungs(status);
  const extra = rungs.filter((r) => r.state === 'done' && r.optional).length;
  return extra > 0 ? 'strengthened' : 'base';
}

/** How many optional provider steps are still actionable — for the "n of 2" counter. */
export function remainingOptionalSteps(status: AuthorizationStatus | null): number {
  if (!status) return 0;
  return buildLadderRungs(status).filter((r) => r.optional && r.state === 'todo').length;
}
