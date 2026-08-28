// ============================================================================
// MANIFESTO UI STRINGS — every visible word outside the manifesto content,
// translated for all four languages so nothing on the page stays English-only.
// ============================================================================
import type { Language } from '../context/LanguageContext';

export interface ManifestoUiStrings {
  /** Big CTA heading */
  weptTitle: string;
  /** CTA sub-line */
  weptSub: string;
  /** Tab titles — written so any first-time user instantly understands */
  tabs: {
    endorse: string;
    endorsed: string;
    email: string;
    share: string;
    pdf: string;
  };
  /** End-of-page action counter label */
  endorsements: string;
  /** Emergency hotline labels */
  forestRrt: string;
  medical: string;
  /** Testimonial */
  quote: string;
  quoteBy: string;
  /** Sign modal */
  signTitle: string;
  signSub: string;
  autoDetected: string;
  nameLabel: string;
  phoneLabel: string;
  idLabel: string;
  localityLabel: string;
  confirmBtn: string;
  cancelBtn: string;
}

export const MANIFESTO_UI: Record<Language, ManifestoUiStrings> = {
  en: {
    weptTitle: 'We Have Wept in Silence for Too Long.',
    weptSub: 'No more empty promises, no more post-tragedy compensation memos, and no more funerals. Take action now — it takes less than a minute:',
    tabs: { endorse: 'Endorse', endorsed: 'Endorsed', email: 'Email', share: 'Share', pdf: 'PDF' },
    endorsements: 'Endorsements',
    forestRrt: 'Forest RRT:',
    medical: 'Medical:',
    quote: 'We live in constant fear during evening hours. Our children cannot walk home safely after school without thermal detection and early warning.',
    quoteBy: '— Local Estate Resident, O\'Valley',
    signTitle: 'Endorse the Gudalur Right to Life Proclamation',
    signSub: 'Your endorsement is a real, verifiable record submitted to the authorities.',
    autoDetected: 'Auto-detected from your registered Resident Card',
    nameLabel: 'Name:',
    phoneLabel: 'Phone:',
    idLabel: 'Resident ID:',
    localityLabel: 'Locality:',
    confirmBtn: 'Confirm Endorsement',
    cancelBtn: 'Cancel',
  },
  ta: {
    weptTitle: 'நாங்கள் பல காலமாக மௌனத்தில் அழுதுகொண்டிருக்கிறோம்.',
    weptSub: 'வெற்று வாக்குறுதல்கள் வேண்டாம், சேத இழப்பீட்டு கடிதங்கள் வேண்டாம், மரணங்கள் வேண்டாம். இப்போதே செயல்படுங்கள் — ஒரு நிமிடம் கூட ஆகாது:',
    tabs: { endorse: 'ஒப்புதல்', endorsed: 'ஒப்படைக்கப்பட்டது', email: 'மின்னஞ்சல்', share: 'பங்கிடு', pdf: 'PDF' },
    endorsements: 'ஒப்புதல்கள்',
    forestRrt: 'வனத்துறை அவசரக் குழு:',
    medical: 'மருத்துவம்:',
    quote: 'மாலை நேரங்களில் நாங்கள் எப்போதும் அச்சத்தில் வாழ்கிறோம். வெப்நிலை கண்டறிதல் மற்றும் முன்னெச்சரிக்கை இல்லாமல் பள்ளியிலிருந்து எங்கள் குழந்தைகள் பாதுகாப்பாக வீடு திரும்ப முடியவில்லை.',
    quoteBy: '— ஓ\'வலி தோட்ட உள்ளூர் குடிமகன்',
    signTitle: 'கூடலூர் வாழ்வுரிமை பிரகடனத்திற்கு ஒப்புதல் அளிங்கள்',
    signSub: 'உங்கள் ஒப்புதல் அதிகாரிகளிடம் சமர்ப்பிக்கப்படும் உண்மையான, சரிபார்க்கக்கூடிய பதிவு.',
    autoDetected: 'உங்கள் பதிவுசெய்யப்பட்ட குடியுரிமை அட்டையிலிருந்து தானாக எடுக்கப்பட்டது',
    nameLabel: 'பெயர்:',
    phoneLabel: 'கைபேசி:',
    idLabel: 'குடியிருப்பு ஐடி:',
    localityLabel: 'பகுதி:',
    confirmBtn: 'ஒப்புதலை உறுதிசெய்',
    cancelBtn: 'ரத்து',
  },
  ml: {
    weptTitle: 'നമ്മൾ വളരെ കാലം മൗനത്തോടെ കരയുകയാണ് ചെയ്തിട്ടുള്ളത്.',
    weptSub: 'വെറും വാഗ്ദാനങ്ങൾ വേണ്ട, മരണശേഷമുള്ള നഷ്ടപരിഹാര കത്തുകൾ വേണ്ട, മരണങ്ങൾ വേണ്ട. ഇപ്പോൾ തന്നെ പ്രവർത്തിക്കൂ — ഒരു മിനിറ്റ് മതി:',
    tabs: { endorse: 'അംഗീകരിക്കുക', endorsed: 'അംഗീകരിച്ചു', email: 'ഇമെയിൽ', share: 'പങ്കിടുക', pdf: 'PDF' },
    endorsements: 'അംഗീകാരങ്ങൾ',
    forestRrt: 'വനം റാപിഡ് ടീം:',
    medical: 'മെഡിക്കൽ:',
    quote: 'വൈകുന്നേരങ്ങളിൽ നമ്മൾ എപ്പോഴും ഭയത്തോടെയാണ് ജീവിക്കുന്നത്. തെർമൽ കണ്ടെത്തലും മുൻകരുതൽ മുന്നറിയിപ്പും ഇല്ലാതെ സ്കൂളിൽ നിന്ന് നമ്മുടെ കുട്ടികൾക്ക് സുരക്ഷിതമായി വീട്ടിലേക്ക് മടങ്ങാൻ കഴിയുന്നില്ല.',
    quoteBy: '— ഓ\'വാലി തോട്ടത്തിലെ പ്രാദേശിക നിവാസി',
    signTitle: 'ഗൂഡലൂർ ജീവനവകാശ പ്രഖ്യാപനത്തെ അംഗീകരിക്കുക',
    signSub: 'നിങ്ങളുടെ അംഗീകാരം അധികാരികൾക്ക് സമർപ്പിക്കുന്ന യഥാർത്ഥവും സ്ഥിരീകരിക്കാവുന്നതുമായ രേഖയാണ്.',
    autoDetected: 'നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത റെസിഡന്റ് കാർഡിൽ നിന്ന് സ്വയമേവ എടുത്തത്',
    nameLabel: 'പേര്:',
    phoneLabel: 'ഫോൺ:',
    idLabel: 'റസിഡന്റ് ഐഡി:',
    localityLabel: 'പ്രദേശം:',
    confirmBtn: 'അംഗീകാരം സ്ഥിരീകരിക്കുക',
    cancelBtn: 'റദ്ദാകാക്കുക',
  },
  kn: {
    weptTitle: 'ನಾವು ಬಹಳ ಕಾಲ ಮೌನದಲ್ಲಿ ಅಳುತ್ತಿದ್ದೇವೆ.',
    weptSub: 'ಖಾಲಿ ಭರವಸೆಗಳ ಬೇಡ, ದುರಂತದ ನಂತರದ ಪರಿಹಾರ ಪತ್ರಗಳ ಬೇಡ, ಸಾವುಗಳ ಬೇಡ. ಈಗಲೇ ಕ್ರಿಯೆ ಮಾಡಿ — ಒಂದು ನಿಮಿಷ ಸಾಕು:',
    tabs: { endorse: 'ಅನುಮೋದಿಸು', endorsed: 'ಅನುಮೋದಿತ', email: 'ಇಮೇಲ್', share: 'ಹಂಚಿಕೊಳ್ಳಿ', pdf: 'PDF' },
    endorsements: 'ಅನುಮೋದನೆಗಳು',
    forestRrt: 'ಅರಣ್ಯ ತುರ್ತು ತಂಡ:',
    medical: 'ವೈದ್ಯಕೀಯ:',
    quote: 'ಸಂಜೆ ವೇಳೆಗಳಲ್ಲಿ ನಾವು ಯಾವಾಗಲೂ ಭಯದಲ್ಲಿ ಬದುಕುತ್ತಿದ್ದೇವೆ. ಥರ್ಮಲ್ ಪತ್ತೆ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ ಇಲ್ಲದೆ ಶಾಲೆಯಿಂದ ನಮ್ಮ ಮಕ್ಕಳು ಸುರಕ್ಷಿತವಾಗಿ ಮನೆಗೆ ಹಿಂತಿರುಗಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    quoteBy: '— ಓ\'ವ್ಯಾಲಿ ತೋಟದ ಸ್ಥಳೀಯ ನಿವಾಸಿ',
    signTitle: 'ಗೂಡಲೂರು ಜೀವನ ಹಕ್ಕು ಘೋಷಣೆಗೆ ಅನುಮೋದನೆ ನೀಡಿ',
    signSub: 'ನಿಮ್ಮ ಅನುಮೋದನೆ ಅಧಿಕಾರಿಗಳಿಗೆ ಸಲ್ಲಿಸಲಾದ ನಿಜವಾದ, ಪರಿಶೀಲಿಸಬಹುದಾದ ದಾಖಲೆ.',
    autoDetected: 'ನಿಮ್ಮ ನೋಂದಾಯಿತ ರೆಸಿಡೆಂಟ್ ಕಾರ್ಡ್‌ನಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪಡೆಯಲಾಗಿದೆ',
    nameLabel: 'ಹೆಸರು:',
    phoneLabel: 'ಫೋನ್:',
    idLabel: 'ರೆಸಿಡೆಂಟ್ ಐಡಿ:',
    localityLabel: 'ಪ್ರದೇಶ:',
    confirmBtn: 'ಅನುಮೋದನೆ ದೃಢೀಕರಿಸಿ',
    cancelBtn: 'ರದ್ದುಮಾಡಿ',
  },
};
