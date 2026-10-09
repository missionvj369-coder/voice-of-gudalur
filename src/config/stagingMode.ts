/**
 * Voice of Gudalur — staging indicator (Phase 2).
 *
 * A staging deployment must be impossible to mistake for the live petition.
 * This is a BUILD-TIME configuration flag (not hard-coded text), so the same
 * source tree produces either build:
 *
 *   VITE_APP_ENV=staging  → the orange staging banner mounts on every page
 *   unset / production    → banner never renders (production is unchanged)
 *
 * Mirrors the VITE_APP_MODE pattern in ./productionMode.ts.
 */
export const APP_ENV: 'staging' | 'production' =
  (import.meta.env?.VITE_APP_ENV as string | undefined) === 'staging' ? 'staging' : 'production';

/** True only for a staging build — drives the visible staging banner. */
export const IS_STAGING = APP_ENV === 'staging';

/** Banner text. Kept here so it is configuration, not scattered literals. */
export const STAGING_BANNER_TEXT =
  'STAGING — test environment. Signatures, alerts and uploads are disabled.';