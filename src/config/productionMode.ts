/**
 * Voice of Gudalur — production launch mode flags.
 *
 * FULL APP MODE (post free-tier upgrade): the COMPLETE application is live.
 * These compile-time flags exist only to allow a temporary petition-only
 * campaign squeeze. Default is now 'full' — the entire creation loads.
 *
 *   VITE_APP_MODE=full       → the complete app (DEFAULT — full loaded build)
 *   VITE_APP_MODE=petition   → ONLY the petition page (explicit campaign opt-in)
 *
 *   VITE_AI_VOG_ENABLED=false → the AI VOG greeter never mounts (opt-out only)
 */
export const APP_MODE: 'petition' | 'full' =
  (import.meta.env?.VITE_APP_MODE as 'petition' | 'full' | undefined) === 'petition'
    ? 'petition'
    : 'full';

/** True only for the temporary petition-only campaign squeeze. */
export const PETITION_ONLY = APP_MODE === 'petition';

/** Frontend AI VOG greeter flag. Default true in full mode. */
export const AI_VOG_ENABLED =
  import.meta.env?.VITE_AI_VOG_ENABLED !== 'false';
