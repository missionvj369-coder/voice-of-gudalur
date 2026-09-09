import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, PenLine, ScrollText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, readLocalSignature } from '../context/AuthContext';
import { CorridorMap } from '../components/CorridorMap';
import { GrievanceTicket } from '../components/GrievanceTicket';
import { GetGDRCard } from './about_helpers';
import { petitionApi } from '../services/api';

/**
 * About the Movement — the full story, the closed-corridor GIS map, the ALREADY
 * SUBMITTED grievance (rendered inline from the official portal's saved page),
 * and the sign-in-petition call to action that supports it.
 */

export const Manifesto: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [total, setTotal] = useState<number | null>(null);
  // "Petition Signed" — the CTA locks ONLY for a real server-issued (VG-*) sign.
  // After a re-login / new device / cleared cache the flag is restored from the
  // authoritative petition_signs ledger (petitionApi.mySign), never just local.
  const [hasSigned, setHasSigned] = useState<boolean>(() => readLocalSignature().signed);

  React.useEffect(() => {
    // Re-query the server whenever the logged-in resident changes so an
    // already-signed user never sees "Sign in Petition" after logging in.
    let alive = true;
    (async () => {
      if (profile) {
        try {
          const { sign } = await petitionApi.mySign();
          if (!alive) return;
          if (sign) {
            try {
              localStorage.setItem('vog_petition_signed', '1');
              localStorage.setItem('vog_petition_result', JSON.stringify({
                hash: sign.signHash,
                verifyUrl: new URL(sign.verifyUrl, window.location.origin).toString(),
                batchNo: sign.batchNo,
                signedAt: sign.signedAt,
                name: profile.name,
                gudalurId: profile.gudalurId || '',
                locality: profile.customPlaceName || profile.localityName || sign.village || '',
              }));
            } catch { /* ignore */ }
            setHasSigned(true);
            window.dispatchEvent(new Event('vog:petition-signed'));
          } else {
            try {
              localStorage.removeItem('vog_petition_signed');
              localStorage.removeItem('vog_petition_result');
            } catch { /* ignore */ }
            setHasSigned(false);
          }
        } catch {
          // Offline / service down — keep the locally cached flag.
          if (alive) {
            try { setHasSigned(readLocalSignature().signed); } catch { /* ignore */ }
          }
        }
      } else {
        // Logged out — fall back to whatever the local cache holds.
        try { setHasSigned(readLocalSignature().signed); } catch { /* ignore */ }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  React.useEffect(() => {
    const syncFromLocal = () => {
      try { setHasSigned(readLocalSignature().signed); } catch { /* ignore */ }
    };
    window.addEventListener('vog:petition-signed', syncFromLocal);
    window.addEventListener('storage', syncFromLocal);
    window.addEventListener('focus', syncFromLocal);
    return () => {
      window.removeEventListener('vog:petition-signed', syncFromLocal);
      window.removeEventListener('storage', syncFromLocal);
      window.removeEventListener('focus', syncFromLocal);
    };
  }, []);

  React.useEffect(() => {
    let alive = true;
    petitionApi.signStats().then((s) => { if (alive) setTotal(s?.total ?? 0); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

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

      {/* Grievance ALREADY SUBMITTED - inline from the official portal's saved page (embed blocked) */}
      <GrievanceTicket />

      {/* Privacy note */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-xs text-[#AED581]/80 leading-relaxed max-w-xl mx-auto">{t('abt.privacy')}</p>
      </div>

      {/* Support this grievance — sign in petition */}
      <div className="rounded-3xl border border-amber-200/40 bg-gradient-to-br from-amber-50/90 to-orange-50/80 p-6 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
          <ScrollText size={26} className="text-white" />
        </div>
        <h2 className="text-lg font-black text-slate-800">{t('abt.support_title')}</h2>
        <p className="text-sm text-slate-700 max-w-md mx-auto">{t('abt.support_sub')}</p>
        {hasSigned ? (
          /* After a successful sign — locked, untouchable "Petition Signed" state */
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="You have already signed the petition"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg cursor-not-allowed select-none opacity-95"
          >
            <BadgeCheck size={16} /> {t('abt.signed_cta')}
          </button>
        ) : profile ? (
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