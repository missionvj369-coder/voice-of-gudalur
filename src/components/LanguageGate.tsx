import React from 'react';
import { motion } from 'motion/react';
import { Languages } from 'lucide-react';
import type { Language } from '../context/LanguageContext';

/**
 * LanguageGate — full-screen first-visit language picker shown BEFORE the app
 * front page (and before the opening animation). Four languages are offered in
 * their own native script so every visitor can read their choice; picking one
 * stores it and the whole app opens in that language. Shown only once — the
 * choice persists in localStorage (VoiceOfGudalur_lang + _lang_chosen).
 */

interface GateOption {
  code: Language;
  native: string;   // the language's own name, in its own script
  greeting: string; // "Welcome" in that language
  cta: string;      // "Continue in …" in that language
}

const GATE_OPTIONS: GateOption[] = [
  { code: 'en', native: 'English', greeting: 'Welcome', cta: 'Continue in English' },
  { code: 'ta', native: 'தமிழ்', greeting: 'வணக்கம்', cta: 'தமிழில் தொடரவும்' },
  { code: 'ml', native: 'മലയാളം', greeting: 'സ്വാഗതം', cta: 'മലയാളത്തിൽ തുടരുക' },
  { code: 'kn', native: 'ಕನ್ನಡ', greeting: 'ಸ್ವಾಗತ', cta: 'ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
];

export const LanguageGate: React.FC<{ onChoose: (lang: Language) => void }> = ({ onChoose }) => (
  <div
    className="fixed inset-0 z-[100] overflow-y-auto bg-gradient-to-b from-[#1B5E20] via-[#2E7D32] to-[#1B5E20]"
    role="dialog"
    aria-modal="true"
    aria-label="Select your language"
  >
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-10">
      <div className="w-14 h-14 rounded-2xl bg-[#AED581]/20 border border-[#AED581]/40 flex items-center justify-center mb-5">
        <Languages size={28} className="text-[#AED581]" />
      </div>
      <p className="text-[#AED581] font-black tracking-[0.25em] text-[11px] mb-2">VOICE OF GUDALUR</p>

      {/* The heading itself is rendered in all four languages, so nobody is
          locked out before choosing. */}
      <div className="text-center mb-8 space-y-1">
        {GATE_OPTIONS.map((o) => (
          <p key={o.code} className="text-white font-bold text-lg leading-snug">
            {o.greeting} · <span className="text-[#E8F5E9]">{o.cta}</span>
          </p>
        ))}
      </div>

      <div className="w-full max-w-md grid grid-cols-2 gap-3">
        {GATE_OPTIONS.map((o, i) => (
          <motion.button
            key={o.code}
            type="button"
            onClick={() => onChoose(o.code)}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.3, ease: 'easeOut' }}
            className="rounded-2xl border border-[#AED581]/35 bg-[#AED581]/10 hover:bg-[#AED581]/25 active:scale-[0.98] transition p-4 text-center focus:outline-none focus:ring-2 focus:ring-[#AED581]"
            lang={o.code}
          >
            <span className="block text-xl font-black text-white">{o.native}</span>
            <span className="block text-[11px] font-bold text-[#C8E6C9] mt-1">{o.cta}</span>
          </motion.button>
        ))}
      </div>

      <p className="mt-8 text-[10px] text-[#AED581]/70 text-center max-w-xs leading-relaxed">
        You can change the language anytime from the menu. · மெனுவில் எப்போது வேண்டுமானாலும் மொழியை மாற்றலாம்.
      </p>
    </div>
  </div>
);

export default LanguageGate;