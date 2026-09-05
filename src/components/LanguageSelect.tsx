import React from 'react';
import { motion } from 'motion/react';
import { useLanguage, Language } from '../context/LanguageContext';
import { Globe, Check } from 'lucide-react';

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  selectText: string;
  greeting: string;
}

const languages: LanguageOption[] = [
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    selectText: 'மொழியைத் தேர்ந்தெடுக்கவும்',
    greeting: 'வணக்கம்!',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    selectText: 'Select Language',
    greeting: 'Hello!',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    selectText: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
    greeting: 'നമസ്കാരം!',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    selectText: 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ',
    greeting: 'ನಮಸ್ಕಾರ!',
  },
];

export const LanguageSelect: React.FC = () => {
  const { lang, setLang } = useLanguage();

  const handleSelect = (code: Language) => {
    setLang(code);
  };

  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] px-4 py-8"
        style={{
          background:
            'linear-gradient(180deg, rgba(240,248,240,0.99) 0%, rgba(255,255,255,0.97) 50%, rgba(240,248,240,0.99) 100%)',
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white mb-4 shadow-lg">
            <Globe size={32} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#1B5E20] mb-2">
            Choose Your Language
          </h2>
          <p className="text-sm text-slate-600">
            Select your preferred language to continue
          </p>
        </motion.div>

        {/* Language Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          {languages.map((language, index) => {
            const isSelected = lang === language.code;
            return (
              <motion.button
                key={language.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                onClick={() => handleSelect(language.code)}
                className={`relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center"
                  >
                    <Check size={14} />
                  </motion.div>
                )}

                {/* Native name */}
                <span
                  className={`text-2xl font-bold mb-1 ${
                    isSelected ? 'text-emerald-700' : 'text-slate-800'
                  }`}
                >
                  {language.nativeName}
                </span>

                {/* English name */}
                <span className="text-sm text-slate-500 mb-2">{language.name}</span>

                {/* Select text in native language */}
                <span
                  className={`text-xs ${
                    isSelected ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {language.selectText}
                </span>

                {/* Greeting */}
                <span className="text-lg mt-2">{language.greeting}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Current selection indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xs text-slate-500 text-center"
        >
          Current language:{' '}
          <span className="font-bold text-emerald-700">
            {languages.find((l) => l.code === language.code)?.nativeName}
          </span>
        </motion.p>
      </div>

      {/* Decorative border */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
    </section>
  );
};

export default LanguageSelect;
