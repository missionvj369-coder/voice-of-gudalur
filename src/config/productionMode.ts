/**
 * Voice of Gudalur — production launch mode flags.
 *
 * The COMPLETE application stays in the codebase (nothing is deleted). These
 * compile-time flags hide everything that is not the petition-signing
 * experience for the current production launch. Flip VITE_APP_MODE back to
 * 'full' to reactivate the full product unchanged.
 *
 *   VITE_APP_MODE=petition   → production shows ONLY the petition page
 *   VITE_APP_MODE=full       → the complete app (explicit developer opt-in)
 *   (unset)                  → petition — the clean public campaign launch
 *
 *   VITE_AI_VOG_ENABLED=false → the AI VOG greeter never mounts (no LLM spend)
 */
export const APP_MODE: 'petition' | 'full' =
  (import.meta.env?.VITE_APP_MODE as 'petition' | 'full' | undefined) === 'full'
    ? 'full'
    : 'petition';

/** True for the current production launch: petition signing ONLY. */
export const PETITION_ONLY = APP_MODE === 'petition';

/** Frontend AI VOG greeter flag. Default true (full mode); never in petition mode. */
export const AI_VOG_ENABLED =
  PETITION_ONLY ? false : import.meta.env?.VITE_AI_VOG_ENABLED !== 'false';
