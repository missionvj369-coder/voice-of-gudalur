import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Renders a button that opens the GDR registration modal. The modal is owned
 * by Shell (RegisterResidentModal) and triggered via a module-level bus so any
 * page inside the Shell can open it without adding prop-drilling.
 */
export const OPEN_REGISTER_EVENT = 'vog:open-register';

/** Bus event — any RegisterResidentModal without a local login modal can ask Shell to open Login. */
export const OPEN_LOGIN_EVENT = 'vog:open-login';

/**
 * WITNESS FUNNEL — pushed when someone arrived on a shared /validate/<token>
 * link, has no resident account yet, and has just finished the intro.
 *
 * ValidatePage answers it with its OWN registration form rather than asking
 * Shell: Shell's modals are intentionally not mounted in petition-only mode
 * (`!petitionOnly`), and a witness must be able to register in every build mode.
 */
export const WITNESS_REGISTER_EVENT = 'vog:witness-register';

/**
 * One-shot sessionStorage companion to WITNESS_REGISTER_EVENT, for the unlikely
 * case where the validate page (lazy route) was still loading when the intro
 * ended and missed the event. Written before the event is dispatched and
 * deleted the first time it is read.
 */
export const WITNESS_REGISTER_FLAG = 'vog_witness_register';

export const GetGDRCard: React.FC<{ className?: string }> = ({ className }) => {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_REGISTER_EVENT))}
      className={`rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95 ${className || ''}`}
    >
      🪪 {t('home.register_cta')}
    </button>
  );
};