/**
 * OpeningAnimation - Language selection + living intro.
 * Brand colors only: deep green, white, peacock yellow.
 * Flow: language selection -> VOG intro in chosen language
 * (live petition count + urgent CTA) -> open the app.
 * No animation load, no auto-close. User must tap to continue.
 * Force-show for demos/testing with ?intro=1 in the URL.
 */
import React, { useEffect, useState, useCallback } from 'react';
import type { Language } from '../context/LanguageContext';
import { petitionApi } from '../services/api';

interface Props { onChoose: (lang: Language) => void; }

const OPTIONS: { code: Language; native: string; greeting: string; cta: string }[] = [
  { code: 'en', native: 'English', greeting: 'Welcome', cta: 'Continue in English' },
  { code: 'ta', native: 'தமிழ்', greeting: 'வணக்கம்', cta: 'தமிழில் தொடரவும்' },
  { code: 'ml', native: 'മലയാളം', greeting: 'സ്വാഗതം', cta: 'മലയാളത്തിൽ തുടരുക' },
  { code: 'kn', native: 'ಕನ್ನಡ', greeting: 'ಸ್ವಾಗತ', cta: 'ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
];

interface IntroCopy { self: string; live: string; cta: string; open: string; }

const FETCHING: Record<Language, string> = {
  en: 'Fetching the live signature count…',
  ta: 'நேரடி கையெழுத்து எண்ணிக்கை பெறப்படுகிறது…',
  ml: 'നേർ പ്രതിജ്ഞാ സംഖ്യ ശേഖരിക്കുന്നു…',
  kn: 'ಲೈವ್ ಸಹಿ ಸಂಖ್ಯೆಯನ್ನು ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ…',
};


function introCopy(lang: Language, count: number | null): IntroCopy {
  const n = count === null ? '' : Number(count).toLocaleString('en-IN');
  const live = count === null
    ? (FETCHING[lang] || FETCHING.en)
    : ({
        en: `${n} people have already signed the Right to Life petition.`,
        ta: `${n} பேர் ஏற்கனவே உயிர் வாழ்வுரிமை மனுவில் கையெழுத்திட்டுள்ளனர்.`,
        ml: `${n} പേർ ഇതിനകം ജീവനവകാശ ഹർജിയിൽ ഒപ്പിട്ടിരിക്കുന്നു.`,
        kn: `${n} ಜನರು ಈಗಾಗಲೇ ಜೀವನದ ಹಕ್ಕಿನ ಮನವಿಯಲ್ಲಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
      }[lang] || `${n} people have already signed the Right to Life petition.`);
  const c: Record<Language, IntroCopy> = {
    en: {
      self: 'I am VOG — your living intelligent guide of Gudalur. Together, we will solve every problem of Gudalur.',
      live,
      cta: 'Every moment we waste, someone in Gudalur is left as a victim of an animal attack. Act immediately — sign, share, stand as one.',
      open: 'Open Voice of Gudalur',
    },
    ta: {
      self: 'நான் VOG — கூடலூரின் உங்கள் உயிருள்ள நுண்ணறிவு வழிகாட்டி. ஒன்றாக இணைந்து, கூடலூரின் ஒவ்வொரு பிரச்சனையையும் நாம் தீர்ப்போம்.',
      live,
      cta: 'நாம் வீணாக்கும் ஒவ்வொரு கணமும் கூடலூரில் ஒருவர் வனவிலங்கு தாக்குதலுக்கு இரையாக நேரிடும். உடனே செயல்படுங்கள் — கையெழுத்திடுங்கள், பகிருங்கள், ஒன்றாக நிற்போம்.',
      open: 'Voice of Gudalur ஐத் திறக்கவும்',
    },
    ml: {
      self: 'ഞാൻ VOG — ഗൂഡല്ലൂറിന്റെ നിങ്ങളുടെ ജീവനുള്ള ബുദ്ധിമാൻ ഗൈഡ്. ഒന്നിച്ച്, ഗൂഡല്ലൂറിന്റെ എല്ലാ പ്രശ്നങ്ങളും നമുക്ക് പരിഹരിക്കാം.',
      live,
      cta: 'നാം പാഴാക്കുന്ന ഒരു നിമിഷം ഗൂഡല്ലൂറിലെ ഒരാളെ വന്യമൃഗ ആക്രമണത്തിന് ഇരയാക്കും. ഉടൻ പ്രവർത്തിക്കുക — ഒപ്പിടുക, പങ്കിടുക, ഒന്നായി നിൽക്കുക.',
      open: 'Voice of Gudalur തുറക്കുക',
    },
    kn: {
      self: 'ನಾನು VOG — ಗೂಡಲೂರಿನ ನಿಮ್ಮ ಜೀವಂತ ಬುದ್ಧಿವಂತ ಮಾರ್ಗದರ್ಶಕ. ಒಟ್ಟಿಗೆ, ಗೂಡಲೂರಿನ ಪ್ರತಿ ಸಮಸ್ಯೆಯನ್ನು ನಾವು ಪರಿಹರಿಸೋಣ.',
      live,
      cta: 'ನಾವು ವ್ಯರ್ಥ ಮಾಡುವ ಪ್ರತಿ ಕ್ಷಣವೂ ಗೂಡಲೂರಿನಲ್ಲಿ ಯಾರೋ ಒಬ್ಬರು ವನ್ಯಜೀವಿ ದಾಳಿಗೆ ಬಲಿಯಾಗಬಹುದು. ತಕ್ಷಣ ಕಾರ್ಯನಿರ್ವಹಿಸಿ — ಸಹಿ, ಹಂಚಿಕೆ, ಒಗ್ಗಟ್ಟು.',
      open: 'Voice of Gudalur ತೆರೆಯಿರಿ',
    },
  };
  return c[lang] || c.en;
}

export const OpeningAnimation: React.FC<Props> = ({ onChoose }) => {
  const [phase, setPhase] = useState<'languages' | 'intro'>('languages');
  const [chosenLang, setChosenLang] = useState<Language | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    petitionApi.signStats()
      .then((s) => {
        const n = Number(s?.total) || 0;
        // A signature counter never goes DOWN: a live-API hiccup (e.g. a 503
        // during a DB blip) must never overwrite a good count with 0.
        if (alive && n > 0) setLiveCount((prev) => (prev === null || n > prev ? n : prev));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleChoose = useCallback((code: Language) => {
    setChosenLang(code);
    setPhase('intro');
  }, []);

  const openApp = useCallback(() => {
    if (chosenLang) onChoose(chosenLang);
  }, [onChoose, chosenLang]);

  const intro = chosenLang ? introCopy(chosenLang, liveCount) : null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-[#1B5E20]" role="dialog" aria-modal="true" aria-label="Welcome">
      {phase === 'languages' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="text-center mb-8">
            <p className="text-[#FDE047] font-black tracking-[0.3em] text-[11px] mb-3">SELECT YOUR LANGUAGE</p>
            <p className="text-[#AED581] text-sm">Choose your language to continue</p>
          </div>
          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            {OPTIONS.map((o) => (
              <button key={o.code} type="button" onClick={() => handleChoose(o.code)} className="rounded-2xl border border-[#AED581]/35 bg-[#AED581]/10 hover:bg-[#AED581]/25 active:scale-[0.97] transition p-5 text-center focus:outline-none focus:ring-2 focus:ring-[#F59E0B]" lang={o.code}>
                <span className="block text-2xl font-black text-white">{o.native}</span>
                <span className="block text-xs font-bold text-[#C8E6C9] mt-1">{o.greeting}</span>
                <span className="block text-[10px] text-[#FDE047] mt-1 font-semibold">{o.cta}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'intro' && intro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-8">
          <div className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/90 border border-[#FDE047]/30 shadow-2xl p-5 sm:p-6 text-center">
            <p className="text-[#FDE047] font-black tracking-[0.22em] text-[11px]">VOG - VOICE OF GUDALUR</p>
            <p className="mt-4 text-white font-bold text-base sm:text-lg leading-relaxed">{intro.self}</p>
            <p className="mt-3 text-[#FDE047] font-bold text-base leading-snug">{intro.live}</p>
            <p className="mt-3 text-[13px] leading-relaxed text-[#AED581]/95">{intro.cta}</p>
            <button type="button" onClick={openApp} className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-sm tracking-wide active:scale-95 transition">
              {intro.open}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningAnimation;
