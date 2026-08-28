import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta' | 'ml' | 'kn';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Voice of Gudalur — safety platform strings.
// Full-prose content lives in dedicated data files (rightToLifeData,
// gudalur365Data); this dictionary covers navigation and core UI.
const translations: Record<Language, Record<string, string>> = {
  en: {
    'brand.title': 'ONE GUDALUR',
    'brand.tagline': 'Protect People. Protect Wildlife. Protect Gudalur.',
    'nav.safety': 'Safety',
    'nav.places': 'Localities',
    'nav.manifesto': 'Right to Life',
    'nav.evidence': 'Evidence',
    'nav.action': 'Action',
    'nav.about': 'About',
    'nav.report': 'Report',
    'hero.eyebrow': 'ONE GUDALUR',
    'hero.headline': 'Gudalur Has a Right to Live Safely.',
    'hero.sub': 'People and wildlife share this landscape. Human life must be protected, wildlife must be protected, and Gudalur needs a permanent system that prevents conflict before lives are lost.',
    'hero.cta.report': 'Report Animal Sighting',
    'hero.cta.alerts': 'Get Safety Alerts',
    'hero.cta.rtl': 'Read the Right to Life',
    'safety.title': 'Gudalur Safety Now',
    'safety.message': 'If you see an elephant, tiger or other dangerous wildlife, do not approach, chase, surround or provoke the animal.',
    'safety.report': 'Report a Sighting',
    'safety.alerts': 'Active Alerts',
    'safety.emergency': 'Emergency Help',
  },
  ta: {
    'brand.title': 'ஒரே கூடலூர்',
    'brand.tagline': 'மக்களைக் காப்போம். வனவிலங்குகளைக் காப்போம். கூடலூரைக் காப்போம்.',
    'nav.safety': 'பாதுகாப்பு',
    'nav.places': 'பகுதிகள்',
    'nav.manifesto': 'வாழ்வுரிமை',
    'nav.evidence': 'ஆதாரங்கள்',
    'nav.action': 'செயல்',
    'nav.about': 'எங்களைப் பற்றி',
    'nav.report': 'புகார்',
    'hero.eyebrow': 'ஒரே கூடலூர்',
    'hero.headline': 'கூடலூருக்கு பாதுகாப்பாக வாழும் உரிமை உண்டு.',
    'hero.sub': 'மக்களும் வனவிலங்குகளும் இந்த நிலத்தைப் பகிர்கின்றனர். மனித உயிர் காக்கப்பட வேண்டும், வனவிலங்குகள் காக்கப்பட வேண்டும், உயிரிழப்பு ஏற்படுவதற்கு முன்பே மோதலைத் தடுக்கும் நிரந்தர அமைப்பு கூடலூருக்குத் தேவை.',
    'hero.cta.report': 'விலங்கு காட்சியைப் பதிவு செய்யுங்கள்',
    'hero.cta.alerts': 'பாதுகாப்பு எச்சரிக்கைகள்',
    'hero.cta.rtl': 'வாழ்வுரிமை அறிக்கை',
    'safety.title': 'கூடலூர் பாதுகாப்பு இப்போது',
    'safety.message': 'யானை, புலி அல்லது ஆபத்தான வனவிலங்கைக் கண்டால் — அணுக வேண்டாம், துரத்த வேண்டாம், சூழ வேண்டாம், கிண்டல் செய்ய வேண்டாம்.',
    'safety.report': 'காட்சி பதிவு',
    'safety.alerts': 'எச்சரிக்கைகள்',
    'safety.emergency': 'அவசர உதவி',
  },
  ml: {
    'brand.title': 'ഒരേ ഗൂഡലൂർ',
    'brand.tagline': 'ജനങ്ങളെ സംരക്ഷിക്കുക. വന്യജീവികളെ സംരക്ഷിക്കുക. ഗൂഡലൂരിനെ സംരക്ഷിക്കുക.',
    'nav.safety': 'സുരക്ഷ',
    'nav.places': 'പ്രദേശങ്ങൾ',
    'nav.manifesto': 'ജീവനവകാശം',
    'nav.evidence': 'തെളിവുകൾ',
    'nav.action': 'പ്രവർത്തനം',
    'nav.about': 'ഞങ്ങളെക്കുറിച്ച്',
    'nav.report': 'റിപ്പോർട്ട്',
    'hero.eyebrow': 'ഒരേ ഗൂഡലൂർ',
    'hero.headline': 'ഗൂഡലൂരിന് സുരക്ഷിതമായി ജീവിക്കാൻ അവകാശമുണ്ട്.',
    'hero.sub': 'ജനങ്ങളും വന്യജീവികളും ഈ ഭൂപ്രദേശം പങ്കിടുന്നു. മനുഷ്യജീവൻ സംരക്ഷിക്കപ്പെടണം, വന്യജീവികൾ സംരക്ഷിക്കപ്പെടണം, ജീവൻ നഷ്ടപ്പെടും മുൻപേ സംഘർഷം തടയുന്ന ഒരു ശാശ്വത സംവിധാനം ഗൂഡലൂരിന് വേണം.',
    'hero.cta.report': 'കാഴ്ച റിപ്പോർട്ട് ചെയ്യുക',
    'hero.cta.alerts': 'സുരക്ഷാ അലേർട്ടുകൾ',
    'hero.cta.rtl': 'ജീവനവകാശ പ്രഖ്യാപനം',
    'safety.title': 'ഗൂഡലൂർ സുരക്ഷ ഇപ്പോൾ',
    'safety.message': 'ആനയോ പുലിയോ മറ്റ് അപകടകരമായ വന്യജീവിയോ കണ്ടാൽ — സമീപിക്കരുത്, ഓടിക്കരുത്, വളയരുത്, പ്രകോപിപ്പിക്കരുത്.',
    'safety.report': 'കാഴ്ച റിപ്പോർട്ട്',
    'safety.alerts': 'അലേർട്ടുകൾ',
    'safety.emergency': 'അത്യാവശ്യ സഹായം',
  },
  kn: {
    'brand.title': 'ಒಂದೇ ಗೂಡಲೂರು',
    'brand.tagline': 'ಜನರನ್ನು ರಕ್ಷಿಸಿ. ವನ್ಯಜೀವಿಗಳನ್ನು ರಕ್ಷಿಸಿ. ಗೂಡಲೂರನ್ನು ರಕ್ಷಿಸಿ.',
    'nav.safety': 'ಸುರಕ್ಷತೆ',
    'nav.places': 'ಪ್ರದೇಶಗಳು',
    'nav.manifesto': 'ಜೀವನದ ಹಕ್ಕು',
    'nav.evidence': 'ಪುರಾವೆ',
    'nav.action': 'ಕ್ರಿಯೆ',
    'nav.about': 'ನಮ್ಮ ಬಗ್ಗೆ',
    'nav.report': 'ವರದಿ',
    'hero.eyebrow': 'ಒಂದೇ ಗೂಡಲೂರು',
    'hero.headline': 'ಗೂಡಲೂರು ಸುರಕ್ಷಿತವಾಗಿ ಬದುಕುವ ಹಕ್ಕನ್ನು ಹೊಂದಿದೆ.',
    'hero.sub': 'ಜನರು ಮತ್ತು ವನ್ಯಜೀವಿಗಳು ಈ ಭೂಪ್ರದೇಶವನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತಾರೆ. ಮಾನವ ಜೀವ ರಕ್ಷಿಸಲ್ಪಡಬೇಕು, ವನ್ಯಜೀವಿ ರಕ್ಷಿಸಲ್ಪಡಬೇಕು, ಜೀವ ನಷ್ಟವಾಗುವ ಮೊದಲೇ ಸಂಘರ್ಷವನ್ನು ತಡೆಯುವ ಶಾಶ್ವತ ವ್ಯವಸ್ಥೆ ಗೂಡಲೂರಿಗೆ ಬೇಕು.',
    'hero.cta.report': 'ಕಾಣಿಸಿಕೆ ವರದಿ ಮಾಡಿ',
    'hero.cta.alerts': 'ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆಗಳು',
    'hero.cta.rtl': 'ಜೀವನದ ಹಕ್ಕಿನ ಘೋಷಣೆ',
    'safety.title': 'ಗೂಡಲೂರು ಸುರಕ್ಷತೆ ಈಗ',
    'safety.message': 'ಆನೆ, ಹುಲಿ ಅಥವಾ ಅಪಾಯಕಾರಿ ವನ್ಯಜೀವಿ ಕಂಡರೆ — ಹತ್ತಿರ ಹೋಗಬೇಡಿ, ಬೆನ್ನಟ್ಟಬೇಡಿ, ಸುತ್ತುವರಿಯಬೇಡಿ, ಕಾದಿಸಬೇಡಿ.',
    'safety.report': 'ಕಾಣಿಸಿಕೆ ವರದಿ',
    'safety.alerts': 'ಎಚ್ಚರಿಕೆಗಳು',
    'safety.emergency': 'ತುರ್ತು ಸಹಾಯ',
  },
};

const STORAGE_KEY = 'vg_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && translations[saved]) return saved;
    } catch { /* private mode */ }
    return 'en';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = (l: Language) => setLangState(l);
  const t = (key: string) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
