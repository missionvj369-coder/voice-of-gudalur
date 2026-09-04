import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { PenLine, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CorridorMap } from '../components/CorridorMap';
import { GetGDRCard } from './about_helpers';
import { petitionApi } from '../services/api';

/**
 * About the Movement — the full story, the closed-corridor GIS map, the ALREADY
 * SUBMITTED grievance (viewed on the official portal, since embedding is
 * blocked), and the sign-in-petition call to action that supports it.
 */
const GRIEVANCE_URL = 'https://cmhelpline.tnega.org/portal/en/ticket/35665012410302427';

export const Manifesto: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [total, setTotal] = useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    petitionApi.signStats().then((s) => { if (alive) setTotal(s?.total ?? 0); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{t('abt.title')}</h1>
        <p className="text-base text-[#AED581] max-w-2xl mx-auto">{t('abt.sub')}</p>
      </motion.div>

      {/* Live total chip */}
      {total !== null && total > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#AED581]/30 bg-[#AED581]/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-black text-[#E8F5E9]">
              {t('home.live').replace('{n}', total.toLocaleString('en-IN'))}
            </span>
          </div>
        </div>
      )}

      {/* The platform story — content only */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">{t('abt.why_title')}</h2>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_1')}</p>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_2')}</p>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_3')}</p>
      </div>

      {/* Closed-corridor GIS map */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">{t('abt.corr_title')}</h2>
        <p className="text-sm text-[#E6F7E6]">{t('abt.corr_sub')}</p>
        <CorridorMap />
      </div>

      {/* Grievance ALREADY SUBMITTED — view it on the official portal (embed blocked) */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center space-y-4">
        <div className="text-4xl" aria-hidden>📨</div>
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">{t('abt.grv_title')}</h2>
        <p className="text-sm text-[#E6F7E6] max-w-2xl mx-auto">{t('abt.grv_sub')}</p>
        <a
          href={GRIEVANCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95"
        >
          <ExternalLink size={16} /> {t('abt.grv_btn')}
        </a>
        <p className="text-[11px] text-[#AED581]/70 leading-relaxed max-w-xl mx-auto">{t('abt.grv_note')}</p>
      </div>

      {/* Privacy note */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-xs text-[#AED581]/80 leading-relaxed max-w-xl mx-auto">{t('abt.privacy')}</p>
      </div>

      {/* Support this grievance — sign in petition */}
      <div className="rounded-3xl border border-amber-200/40 bg-gradient-to-br from-amber-50/90 to-orange-50/80 p-6 text-center space-y-4">
        <div className="text-4xl" aria-hidden>📜</div>
        <h2 className="text-lg font-black text-slate-800">{t('abt.support_title')}</h2>
        <p className="text-sm text-slate-700 max-w-md mx-auto">{t('abt.support_sub')}</p>
        {profile ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95"
          >
            <PenLine size={16} /> {t('abt.sign_cta')}
          </button>
        ) : (
          <GetGDRCard className="mx-auto" />
        )}
      </div>
    </div>
  );
};

export default Manifesto;