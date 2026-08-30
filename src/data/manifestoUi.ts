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
  /** Main action button labels — written so any first-time user instantly understands */
  tabs: {
    endorse: string;
    endorsed: string;
    email: string;
    share: string;
    pdf: string;
  };
  /** Secondary line shown under each action button label */
  actionSubs: {
    endorse: string;
    email: string;
    share: string;
    pdf: string;
    signed: string;
    pdfLocked: string;
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
    tabs: { endorse: 'Sign Petition', endorsed: 'Petition Signed', email: 'Send instant email to CM', share: 'Spread on WhatsApp', pdf: 'Download petition copy' },
    actionSubs: {
      endorse: 'Add your name & show support for the Right to Life demand',
      email: 'to the Chief Minister & all related departments',
      share: '& social media — every share amplifies the movement',
      pdf: 'to print & submit to the authorities',
      signed: 'Your signature is recorded in the official ledger',
      pdfLocked: 'Unlocks after your official email is sent — your docket number is printed on the PDF',
    },
    endorsements: 'Signatures',
    forestRrt: 'Forest RRT:',
    medical: 'Medical:',
    quote: 'We live in constant fear during evening hours. Our children cannot walk home safely after school without thermal detection and early warning.',
    quoteBy: '— Local Estate Resident, O\'Valley',
    signTitle: 'Sign the Gudalur Right to Life Petition',
    signSub: 'Your signature is a real, verifiable record submitted to the authorities.',
    autoDetected: 'Auto-detected from your registered Resident Card',
    nameLabel: 'Name:',
    phoneLabel: 'Phone:',
    idLabel: 'Resident ID:',
    localityLabel: 'Locality:',
    confirmBtn: 'Sign & Confirm',
    cancelBtn: 'Cancel',
  },
  ta: {
    weptTitle: 'நாங்கள் பல காலமாக மௌனத்தில் அழுதுகொண்டிருக்கிறோம்.',
    weptSub: 'வெற்று வாக்குறுதல்கள் வேண்டாம், சேத இழப்பீட்டு கடிதங்கள் வேண்டாம், மரணங்கள் வேண்டாம். இப்போதே செயல்படுங்கள் — ஒரு நிமிடம் கூட ஆகாது:',
    tabs: { endorse: 'மனுவில் கையொப்பமிடு', endorsed: 'கையொப்பமிடப்பட்டது', email: 'உடனடி மின்னஞ்சல் CM-க்கு அனுப்பு', share: 'வாட்ஸ்அப்பில் பகிர்', pdf: 'மனு நகலை பதிவிறக்கு' },
    actionSubs: {
      endorse: 'உங்கள் பெயரைச் சேர்த்து வாழ்வுரிமை கோரிக்கைக்கு ஆதரவளியுங்கள்',
      email: 'முதல்வர் & அனைத்து சம்பந்தப்பட்ட துறைகளுக்கும்',
      share: '& சமூக ஊடகங்கள் — ஒவ்வொரு பகிர்வும் இயக்கத்தை வலுப்படுத்தும்',
      pdf: 'அச்சிட்டு அதிகாரிகளிடம் சமர்ப்பிக்க',
      signed: 'உங்கள் கையொப்பம் அதிகாரப்பூர்வ பதிவேட்டில் பதிவு செய்யப்பட்டது',
      pdfLocked: 'அதிகாரப்பூர்வ மின்னஞ்சல் அனுப்பியபின் கிடைக்கும் — உங்கள் டாக்கெட் எண் PDF-இல் அச்சிடப்படும்',
    },
    endorsements: 'கையொப்பங்கள்',
    forestRrt: 'வனத்துறை அவசரக் குழு:',
    medical: 'மருத்துவம்:',
    quote: 'மாலை நேரங்களில் நாங்கள் எப்போதும் அச்சத்தில் வாழ்கிறோம். வெப்நிலை கண்டறிதல் மற்றும் முன்னெச்சரிக்கை இல்லாமல் பள்ளியிலிருந்து எங்கள் குழந்தைகள் பாதுகாப்பாக வீடு திரும்ப முடியவில்லை.',
    quoteBy: '— ஓ\'வலி தோட்ட உள்ளூர் குடிமகன்',
    signTitle: 'கூடலூர் வாழ்வுரிமை மனுவில் கையொப்பமிடுங்கள்',
    signSub: 'உங்கள் கையொப்பம் அதிகாரிகளிடம் சமர்ப்பிக்கப்படும் உண்மையான, சரிபார்க்கக்கூடிய பதிவு.',
    autoDetected: 'உங்கள் பதிவுசெய்யப்பட்ட குடியுரிமை அட்டையிலிருந்து தானாக எடுக்கப்பட்டது',
    nameLabel: 'பெயர்:',
    phoneLabel: 'கைபேசி:',
    idLabel: 'குடியிருப்பு ஐடி:',
    localityLabel: 'பகுதி:',
    confirmBtn: 'கையொப்பமிட்டு உறுதிசெய்',
    cancelBtn: 'ரத்து',
  },
  ml: {
    weptTitle: 'നമ്മൾ വളരെ കാലം മൗനത്തോടെ കരയുകയാണ് ചെയ്തിട്ടുള്ളത്.',
    weptSub: 'വെറും വാഗ്ദാനങ്ങൾ വേണ്ട, മരണശേഷമുള്ള നഷ്ടപരിഹാര കത്തുകൾ വേണ്ട, മരണങ്ങൾ വേണ്ട. ഇപ്പോൾ തന്നെ പ്രവർത്തിക്കൂ — ഒരു മിനിറ്റ് മതി:',
    tabs: { endorse: 'ഹർജിയിൽ ഒപ്പിടുക', endorsed: 'ഒപ്പിട്ടു', email: 'ഉടൻ ഇമെയിൽ CM-ന് അയയ്ക്കുക', share: 'വാട്സ്ആപ്പിൽ പങ്കിടുക', pdf: 'ഹർജി പകർപ്പ് ഡൗൺലോഡ് ചെയ്യുക' },
    actionSubs: {
      endorse: 'പേര് ചേർത്ത് ജീവനവകാശ ആവശ്യത്തിന് പിന്തുണ അറിയിക്കുക',
      email: 'മുഖ്യമന്ത്രിക്കും ബന്ധപ്പെട്ട എല്ലാ വകുപ്പുകൾക്കും',
      share: '& സോഷ്യൽ മീഡിയ — ഓരോ പങ്കിടലും പ്രസ്ഥാനത്തെ ശക്തിപ്പെടുത്തുന്നു',
      pdf: 'അച്ചടിച്ച് അധികാരികൾക്ക് സമർപ്പിക്കാൻ',
      signed: 'നിങ്ങളുടെ ഒപ്പ് ഔദ്യോഗിക രേഖയിൽ രേഖപ്പെടുത്തിയിട്ടുണ്ട്',
      pdfLocked: 'ഔദ്യോഗിക ഇമെയിൽ അയച്ചതിനുശേഷം ലഭ്യമാകും — നിങ്ങളുടെ ഡോക്കറ്റ് നമ്പർ PDF-ൽ അച്ചടിക്കും',
    },
    endorsements: 'ഒപ്പുകൾ',
    forestRrt: 'വനം റാപിഡ് ടീം:',
    medical: 'മെഡിക്കൽ:',
    quote: 'വൈകുന്നേരങ്ങളിൽ നമ്മൾ എപ്പോഴും ഭയത്തോടെയാണ് ജീവിക്കുന്നത്. തെർമൽ കണ്ടെത്തലും മുൻകരുതൽ മുന്നറിയിപ്പും ഇല്ലാതെ സ്കൂളിൽ നിന്ന് നമ്മുടെ കുട്ടികൾക്ക് സുരക്ഷിതമായി വീട്ടിലേക്ക് മടങ്ങാൻ കഴിയുന്നില്ല.',
    quoteBy: '— ഓ\'വാലി തോട്ടത്തിലെ പ്രാദേശിക നിവാസി',
    signTitle: 'ഗൂഡലൂർ ജീവനവകാശ ഹർജിയിൽ ഒപ്പിടുക',
    signSub: 'നിങ്ങളുടെ ഒപ്പ് അധികാരികൾക്ക് സമർപ്പിക്കുന്ന യഥാർത്ഥവും സ്ഥിരീകരിക്കാവുന്നതുമായ രേഖയാണ്.',
    autoDetected: 'നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത റെസിഡന്റ് കാർഡിൽ നിന്ന് സ്വയമേവ എടുത്തത്',
    nameLabel: 'പേര്:',
    phoneLabel: 'ഫോൺ:',
    idLabel: 'റസിഡന്റ് ഐഡി:',
    localityLabel: 'പ്രദേശം:',
    confirmBtn: 'ഒപ്പിട്ട് സ്ഥിരീകരിക്കുക',
    cancelBtn: 'റദ്ദാകാക്കുക',
  },
  kn: {
    weptTitle: 'ನಾವು ಬಹಳ ಕಾಲ ಮೌನದಲ್ಲಿ ಅಳುತ್ತಿದ್ದೇವೆ.',
    weptSub: 'ಖಾಲಿ ಭರವಸೆಗಳ ಬೇಡ, ದುರಂತದ ನಂತರದ ಪರಿಹಾರ ಪತ್ರಗಳ ಬೇಡ, ಸಾವುಗಳ ಬೇಡ. ಈಗಲೇ ಕ್ರಿಯೆ ಮಾಡಿ — ಒಂದು ನಿಮಿಷ ಸಾಕು:',
    tabs: { endorse: 'ಅರ್ಜಿಗೆ ಸಹಿ ಮಾಡಿ', endorsed: 'ಸಹಿ ಮಾಡಲಾಗಿದೆ', email: 'ತಕ್ಷಣ ಇಮೇಲ್ CM-ಗೆ ಕಳುಹಿಸಿ', share: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ', pdf: 'ಅರ್ಜಿ ಪ್ರತಿ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ' },
    actionSubs: {
      endorse: 'ನಿಮ್ಮ ಹೆಸರು ಸೇರಿಸಿ ಬದುಕುವ ಹಕ್ಕಿನ ಬೇಡಿಕೆಗೆ ಬೆಂಬಲ ನೀಡಿ',
      email: 'ಮುಖ್ಯಮಂತ್ರಿ & ಸಂಬಂಧಿತ ಎಲ್ಲಾ ಇಲಾಖೆಗಳಿಗೆ',
      share: '& ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ — ಪ್ರತಿ ಹಂಚಿಕೆಯೂ ಆಂದೋಲನವನ್ನು ಬಲಪಡಿಸುತ್ತದೆ',
      pdf: 'ಮುದ್ರಿಸಿ ಅಧಿಕಾರಿಗಳಿಗೆ ಸಲ್ಲಿಸಲು',
      signed: 'ನಿಮ್ಮ ಸಹಿ ಅಧಿಕೃತ ದಾಖಲೆಯಲ್ಲಿ ದಾಖಲಾಗಿದೆ',
      pdfLocked: 'ಅಧಿಕೃತ ಇಮೇಲ್ ಕಳುಹಿಸಿದ ನಂತರ ಲಭ್ಯವಾಗುತ್ತದೆ — ನಿಮ್ಮ ಡಾಕೆಟ್ ಸಂಖ್ಯೆ PDF ನಲ್ಲಿ ಮುದ್ರಿಸಲಾಗುತ್ತದೆ',
    },
    endorsements: 'ಸಹಿಗಳು',
    forestRrt: 'ಅರಣ್ಯ ತುರ್ತು ತಂಡ:',
    medical: 'ವೈದ್ಯಕೀಯ:',
    quote: 'ಸಂಜೆ ವೇಳೆಗಳಲ್ಲಿ ನಾವು ಯಾವಾಗಲೂ ಭಯದಲ್ಲಿ ಬದುಕುತ್ತಿದ್ದೇವೆ. ಥರ್ಮಲ್ ಪತ್ತೆ ಮತ್ತು ಮುನ್ನೆಚ್ಚರಿಕೆ ಇಲ್ಲದೆ ಶಾಲೆಯಿಂದ ನಮ್ಮ ಮಕ್ಕಳು ಸುರಕ್ಷಿತವಾಗಿ ಮನೆಗೆ ಹಿಂತಿರುಗಲು ಸಾಧ್ಯವಿಲ್ಲ.',
    quoteBy: '— ಓ\'ವ್ಯಾಲಿ ತೋಟದ ಸ್ಥಳೀಯ ನಿವಾಸಿ',
    signTitle: 'ಗೂಡಲೂರು ಜೀವನ ಹಕ್ಕು ಅರ್ಜಿಗೆ ಸಹಿ ಮಾಡಿ',
    signSub: 'ನಿಮ್ಮ ಸಹಿ ಅಧಿಕಾರಿಗಳಿಗೆ ಸಲ್ಲಿಸಲಾದ ನಿಜವಾದ, ಪರಿಶೀಲಿಸಬಹುದಾದ ದಾಖಲೆ.',
    autoDetected: 'ನಿಮ್ಮ ನೋಂದಾಯಿತ ರೆಸಿಡೆಂಟ್ ಕಾರ್ಡ್‌ನಿಂದ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಪಡೆಯಲಾಗಿದೆ',
    nameLabel: 'ಹೆಸರು:',
    phoneLabel: 'ಫೋನ್:',
    idLabel: 'ರೆಸಿಡೆಂಟ್ ಐಡಿ:',
    localityLabel: 'ಪ್ರದೇಶ:',
    confirmBtn: 'ಸಹಿ ಮಾಡಿ ದೃಢೀಕರಿಸಿ',
    cancelBtn: 'ರದ್ದುಮಾಡಿ',
  },
};
