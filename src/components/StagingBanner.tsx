import React from 'react';
import { IS_STAGING, STAGING_BANNER_TEXT } from '../config/stagingMode';

/**
 * Voice of Gudalur — visible staging indicator (Phase 2).
 *
 * Renders ONLY when the bundle was built with VITE_APP_ENV=staging, so the
 * production build is byte-identical to before (the component compiles to
 * `null`). Deliberately `pointer-events-none` and offset from the top edge so
 * it can never intercept a tap on a petition control.
 */
export const StagingBanner: React.FC = () => {
  if (!IS_STAGING) return null;
  return (
    <div
      role="status"
      aria-label="Staging environment indicator"
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex justify-center pt-1"
    >
      <span className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
        {STAGING_BANNER_TEXT}
      </span>
    </div>
  );
};