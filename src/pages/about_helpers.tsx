import React from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Renders a button that opens the GDR registration modal. The modal is owned
 * by Shell (RegisterResidentModal) and triggered via a module-level bus so any
 * page inside the Shell can open it without adding prop-drilling.
 */
export const OPEN_REGISTER_EVENT = 'vog:open-register';

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