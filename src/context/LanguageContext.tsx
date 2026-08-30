import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ta' | 'ml' | 'kn';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Brand & Navigation
    'brand.title': 'VOICE OF GUDALUR',
    'brand.tagline': 'One Place. Many Communities. One Connected People.',
    'nav.manifesto': 'Right to Life Manifesto',
    'nav.home': 'Manifesto',
    'nav.hub': 'Civic Hub & Pulse',
    'nav.places': 'Localities',
    'nav.live': 'Gudalur Live',
    'nav.alerts': 'Urgent Alerts',
    'nav.issues': 'Civic Issues',
    'nav.wildlife': 'Wildlife Hub',
    'nav.petitions': 'Act For Gudalur',
    'nav.government': 'Govt Grievances',
    'nav.bus': 'Bus Timings',
    'nav.services': 'Services',
    'nav.story': 'The Story',
    'nav.guide': 'AI Civic Guide',
    'nav.id': 'Gudalur ID',
    'nav.admin': 'Console',
    'nav.join': 'Join Gudalur',

    // Hero Section
    'hero.badge': 'Living Intelligence & Civic Action Platform',
    'hero.headline': 'Gudalur United.',
    'hero.subheadline': 'From O\'Valley to Nadugani, from Thorapalli to Devala — connect with your locality, track real civic problems, receive verified emergency alerts, and organize lawful citizen action.',
    'hero.join_btn': 'Get Your Gudalur ID',
    'hero.explore_map': 'Explore Localities',
    'hero.active_residents': 'Verified Residents',
    'hero.verified_localities': 'Verified Localities',
    'hero.active_petitions': 'Active Civic Petitions',
    'hero.resolved_issues': 'Issues Documented',

    // Gudalur Live
    'live.title': 'Gudalur Live',
    'live.subtitle': 'Real-time environmental, mobility and emergency pulse of the Nilgiris western plateau',
    'live.weather_temp': 'Temperature',
    'live.weather_air': 'Air Quality (AQI)',
    'live.weather_rain': 'Rain Probability',
    'live.weather_humidity': 'Humidity',
    'live.weather_wind': 'Wind Speed',
    'live.ghat_status': 'Ghat Roads Status',
    'live.night_traffic': 'Mudumalai Night Ban: 9:00 PM – 6:00 AM Active',
    'live.emergency_hotline': '24x7 Nilgiris Emergency Lifeline',

    // Localities
    'places.title': 'Explore Gudalur Localities',
    'places.subtitle': 'Every neighborhood is a living community node. Discover local services, coordinators, active civic demands, and join your place.',
    'places.search_placeholder': 'Search locality (e.g. SS Nagar, First Mile, Kasimvayal, Devala)...',
    'places.filter_all': 'All Localities',
    'places.join_locality': 'Join Locality',
    'places.report_issue': 'Report Issue in Locality',
    'places.coordinator': 'Local Coordinator',
    'places.active_issues': 'Active Issues',
    'places.members': 'Residents',

    // Identity / Gudalur ID
    'id.title': 'The Gudalur Resident Identity',
    'id.subtitle': 'Your unique digital proof of community belonging and verified civic participation.',
    'id.card_title': 'RESIDENT CITIZEN CARD',
    'id.number_label': 'GUDALUR ID',
    'id.place_label': 'MY LOCALITY',
    'id.status_label': 'VERIFICATION TIER',
    'id.share_whatsapp': 'Share ID on WhatsApp',
    'id.download_card': 'Save Digital Card',
    'id.privacy_notice': 'Your personal phone number remains strictly private and encrypted.',

    // Civic Issues
    'issues.title': 'Civic Issue Engine',
    'issues.subtitle': 'Evidence-driven citizen reporting. Every pothole, broken streetlight, or water failure is logged with a permanent tracking ID and transparent status progression.',
    'issues.report_btn': 'Report Civic Issue',
    'issues.status_reported': 'Reported',
    'issues.status_verification': 'Verification',
    'issues.status_assigned': 'Assigned to Dept',
    'issues.status_action': 'Action in Progress',
    'issues.status_resolved': 'Resolved & Verified',

    // Wildlife
    'wildlife.title': 'Human-Wildlife Coexistence Hub',
    'wildlife.subtitle': 'Protecting human life and wild elephants through early warning, corridor intelligence, and rapid response coordination with Gudalur Forest Division.',
    'wildlife.log_sighting': 'Log Wildlife Sighting',
    'wildlife.active_corridors': 'Active Elephant Corridors',
    'wildlife.safety_guidelines': 'Safety Guidelines for Commuters',

    // Act for Gudalur / Petitions
    'act.title': 'Act For Gudalur',
    'act.subtitle': 'Lawful, peaceful, and evidence-based collective civic demands. Join thousands of verified residents to demand administrative action on essential infrastructure.',
    'act.sign_petition': 'Support This Demand',
    'act.already_supported': 'You Supported This Demand',
    'act.target_authority': 'Target Administrative Authority',
    'act.evidence_docket': 'Evidence Docket & Background',
    'act.govt_response': 'Official Government Response',

    // Government Grievance
    'govt.title': 'Government Action Directory',
    'govt.subtitle': 'Official Tamil Nadu and National grievance redressal portals, CM Helpline 1100, TANGEDCO Minnal, and Collectorate grievance workflows.',
    'govt.file_official': 'Submit Official Grievance',
    'govt.track_complaint': 'Track Official Complaint ID',

    // Story
    'story.title': 'The Story of Gudalur',
    'story.subtitle': 'A grounded historical documentary of our land, shola forests, indigenous tribes, plantation heritage, and united civic future.',
    'story.chapter': 'Chapter',

    // AI Guide
    'ai.title': 'AI Civic Guide & Crop Doctor',
    'ai.subtitle': 'Instant assistance on Gudalur administrative processes, transport timings, and agricultural diagnostics for tea, pepper, and ginger growers.',
    'ai.placeholder': 'Ask about bus routes, government grievance steps, or describe crop leaf symptoms...'
  },
  ta: {
    // Brand & Navigation
    'brand.title': 'VOICE OF GUDALUR',
    'brand.tagline': 'ஒரே பூமி. பல சமூகங்கள். ஒன்றுபட்ட மக்கள்.',
    'nav.manifesto': 'உரிமைக்குரல் பிரகடனம்',
    'nav.home': 'பிரகடனம்',
    'nav.hub': 'தகவல் மையம்',
    'nav.places': 'பகுதிகள்',
    'nav.live': 'கூடலூர் லைவ்',
    'nav.alerts': 'அவசர எச்சரிக்கை',
    'nav.issues': 'மக்கள் புகார்கள்',
    'nav.wildlife': 'வனவிலங்கு மையம்',
    'nav.petitions': 'கூடலூருக்கான குரல்',
    'nav.government': 'அரசு குறைதீர்ப்பு',
    'nav.bus': 'பேருந்து நேரம்',
    'nav.services': 'சேவைகள்',
    'nav.story': 'கூடலூர் வரலாறு',
    'nav.guide': 'ஏஐ வழிகாட்டி',
    'nav.id': 'கூடலூர் ஐடி',
    'nav.admin': 'நிர்வாகம்',
    'nav.join': 'இணையுங்கள்',

    // Hero Section
    'hero.badge': 'வாழும் தகவல் மற்றும் மக்கள் உரிமைத் தளம்',
    'hero.headline': 'ஒன்றுபட்ட கூடலூர்.',
    'hero.subheadline': 'ஓ\'வேலி முதல் நாடுகாணி வரை, தொரப்பள்ளி முதல் தேவாலா வரை — உங்கள் பகுதியோடு இணையுங்கள், மக்கள் பிரச்னைகளை பதிவு செய்யுங்கள், எச்சரிக்கைகளைப் பெறுங்கள்.',
    'hero.join_btn': 'உங்கள் கூடலூர் ஐடி பெறுங்கள்',
    'hero.explore_map': 'பகுதிகளைப் பாருங்கள்',
    'hero.active_residents': 'இணைந்த மக்கள்',
    'hero.verified_localities': 'சரிபார்க்கப்பட்ட பகுதிகள்',
    'hero.active_petitions': 'மக்கள் கோரிக்கைகள்',
    'hero.resolved_issues': 'பதிவு செய்யப்பட்ட புகார்கள்',

    // Gudalur Live
    'live.title': 'கூடலூர் லைவ்',
    'live.subtitle': 'நீலகிரி மேற்கு பீடபூமியின் வானிலை, சாலை நிலவரம் மற்றும் அவசர தகவல்கள்',
    'live.weather_temp': 'வெப்பநிலை',
    'live.weather_air': 'காற்று தரம் (AQI)',
    'live.weather_rain': 'மழை வாய்ப்பு',
    'live.weather_humidity': 'ஈரப்பதம்',
    'live.weather_wind': 'காற்றின் வேகம்',
    'live.ghat_status': 'மலைப்பாதை நிலவரம்',
    'live.night_traffic': 'முதுமலை இரவு போக்குவரத்து தடை: இரவு 9:00 – காலை 6:00 மணி வரை',
    'live.emergency_hotline': '24x7 நீலகிரி அவசர உதவி எண்கள்',

    // Localities
    'places.title': 'கூடலூர் பகுதிகள்',
    'places.subtitle': 'ஒவ்வொரு குடியிருப்பு பகுதியும் ஒரு நேரடி சமூக மையம். ஒருங்கிணைப்பாளர்கள், சேவைகள் மற்றும் கோரிக்கைகளை அறியுங்கள்.',
    'places.search_placeholder': 'பகுதியைத் தேடுங்கள் (எ.கா: எஸ்.எஸ். நகர், முதல் மைல், காசிம்வயல், தேவாலா)...',
    'places.filter_all': 'அனைத்து பகுதிகள்',
    'places.join_locality': 'பகுதியில் இணையுங்கள்',
    'places.report_issue': 'பகுதி பிரச்சனையைப் பதிவுசெய்',
    'places.coordinator': 'பகுதி ஒருங்கிணைப்பாளர்',
    'places.active_issues': 'நிலுவை பிரச்சனைகள்',
    'places.members': 'குடிமக்கள்',

    // Identity / Gudalur ID
    'id.title': 'கூடலூர் குடியுரிமை அடையாளம்',
    'id.subtitle': 'கூடலூர் சமூகத்தில் உங்கள் பங்களிப்பிற்கான பிரத்யேக டிஜிட்டல் அடையாள அட்டை.',
    'id.card_title': 'கூடலூர் குடியுரிமை அட்டை',
    'id.number_label': 'கூடலூர் ஐடி எண்',
    'id.place_label': 'எனது பகுதி',
    'id.status_label': 'சரிபார்ப்பு நிலை',
    'id.share_whatsapp': 'வாட்ஸ்அப்பில் பகிருங்கள்',
    'id.download_card': 'அட்டையை சேமிக்க',
    'id.privacy_notice': 'உங்கள் தொலைபேசி எண் பாதுகாப்பாக வைக்கப்படும், பொதுவெளியில் காட்டப்படாது.',

    // Civic Issues
    'issues.title': 'மக்கள் பிரச்சனை கண்காணிப்பு பிரிவு',
    'issues.subtitle': 'சாலைப் பழுது, குடிநீர் தட்டுப்பாடு, மின்தடை போன்ற பிரச்னைகளை ஆதாரத்துடன் பதிவு செய்து அரசு தீர்வை கண்காணிக்கலாம்.',
    'issues.report_btn': 'பிரச்சனையைப் பதிவு செய்க',
    'issues.status_reported': 'பதிவு செய்யப்பட்டது',
    'issues.status_verification': 'சரிபார்ப்பில்',
    'issues.status_assigned': 'துறைக்கு அனுப்பப்பட்டது',
    'issues.status_action': 'நடவடிக்கையில்',
    'issues.status_resolved': 'தீர்வு காணப்பட்டது',

    // Wildlife
    'wildlife.title': 'வனவிலங்கு & மனித சகவாழ்வு மையம்',
    'wildlife.subtitle': 'காட்டு யானைகள் மற்றும் மனித பாதுகாப்பிற்கான முன்கூட்டிய எச்சரிக்கை மற்றும் வனத்துறை கண்காணிப்பு பிரிவு.',
    'wildlife.log_sighting': 'யானை நடமாட்டத்தை பதிவிடுக',
    'wildlife.active_corridors': 'முக்கிய யானை வழித்தடங்கள்',
    'wildlife.safety_guidelines': 'பயணிகளுக்கான பாதுகாப்பு வழிகாட்டுதல்',

    // Act for Gudalur / Petitions
    'act.title': 'கூடலூருக்கான குரல் (கோரிக்கைகள்)',
    'act.subtitle': 'சட்டப்பூர்வ, அமைதியான மற்றும் ஆதாரபூர்வ கூட்டு மக்கள் மனுக்கள். அரசு மருத்துவமனை மேம்பாடு போன்ற முக்கிய கோரிக்கைகளுக்கு ஆதரவு தெரிவியுங்கள்.',
    'act.sign_petition': 'இக்கோரிக்கையை ஆதரிக்கிறேன்',
    'act.already_supported': 'நீங்கள் இக்கோரிக்கையை ஆதரித்துள்ளீர்கள்',
    'act.target_authority': 'தொடர்புடைய அரசுத் துறை',
    'act.evidence_docket': 'ஆதாரங்கள் & பின்னணி விவரம்',
    'act.govt_response': 'அரசின் அதிகாரப்பூர்வ பதில்',

    // Government Grievance
    'govt.title': 'அரசு குறைதீர்ப்பு வழிகாட்டி',
    'govt.subtitle': 'முதல்வரின் முகவரி (1100), மின்வாரிய மின்னகம், கூடலூர் நகராட்சி மற்றும் மாவட்ட ஆட்சியர் குறைதீர்ப்பு முகாம்கள்.',
    'govt.file_official': 'அரசு மனு தாக்கல் செய்ய',
    'govt.track_complaint': 'அரசு புகார் எண்ணைக் கண்காணிக்க',

    // Story
    'story.title': 'கூடலூரின் வரலாறு & மரபு',
    'story.subtitle': 'சோலை காடுகள், பூர்வகுடி மக்கள், தேயிலைத் தோட்டங்கள் மற்றும் கூடலூரின் கூட்டு வரலாறு.',
    'story.chapter': 'அத்தியாயம்',

    // AI Guide
    'ai.title': 'ஏஐ கூடலூர் வழிகாட்டி & பயிர் மருத்துவர்',
    'ai.subtitle': 'பேருந்து நேரம், அரசு குறைதீர்ப்பு வழிகள் மற்றும் தேயிலை/இஞ்சி பயிர் நோய் தடுப்பு ஆலோசனைகள் பெறுங்கள்.',
    'ai.placeholder': 'பேருந்து நேரம் அல்லது பயிர் அறிகுறிகளைப் பற்றி கேளுங்கள்...'
  },
  ml: {
    // Nav & Brand
    'brand.title': 'VOICE OF GUDALUR',
    'brand.tagline': 'ഒരു ദേശം. പല സമൂഹങ്ങൾ. ഒന്നിച്ച ജനത.',
    'nav.manifesto': 'അവകാശ പ്രകടനപത്രിക',
    'nav.home': 'പ്രഖ്യാപനം',
    'nav.hub': 'സിറ്റി ഹബ്',
    'nav.places': 'സ്ഥലങ്ങൾ',
    'nav.live': 'ഗൂഡല്ലൂർ ലൈവ്',
    'nav.alerts': 'അലേർട്ടുകൾ',
    'nav.issues': 'പ്രശ്നങ്ങൾ',
    'nav.wildlife': 'വന്യജീവി ഹബ്',
    'nav.petitions': 'പ്രവർത്തിക്കുക',
    'nav.government': 'പരാതികൾ',
    'nav.bus': 'ബസ് സമയങ്ങൾ',
    'nav.services': 'സേവനങ്ങൾ',
    'nav.story': 'ചരിത്രം',
    'nav.guide': 'എഐ ഗൈഡ്',
    'nav.id': 'ഗൂഡല്ലൂർ ഐഡി',
    'nav.admin': 'കൺസോൾ',
    'nav.join': 'ചേരുക',
    'hero.badge': 'ലൈവിംഗ് ഇന്റലിജൻസ് പ്ലാറ്റ്‌ഫോം',
    'hero.headline': 'ഐക്യ ഗൂഡല്ലൂർ.',
    'hero.subheadline': 'കാസിംവയൽ മുതൽ എസ്.എസ്. നഗർ വരെ, തൊരപ്പള്ളി മുതൽ ദേവാല വരെ — നിങ്ങളുടെ സ്ഥലവുമായി ബന്ധപ്പെടുക.',
    'hero.join_btn': 'ഗൂഡല്ലൂർ ഐഡി നേടുക',
    'hero.explore_map': 'സ്ഥലങ്ങൾ കാണുക',
    'hero.active_residents': 'രജിസ്റ്റർ ചെയ്തവർ',
    'hero.verified_localities': 'സ്ഥലങ്ങൾ',
    'hero.active_petitions': 'പരാതികൾ',
    'hero.resolved_issues': 'പരിഹരിച്ചവ',
    'live.title': 'ഗൂഡല്ലൂർ ലൈവ്',
    'live.subtitle': 'തത്സമയ കാലാവസ്ഥ, റോഡ് വിവരങ്ങൾ, സുരക്ഷാ മുന്നറിയിപ്പുകൾ',
    'places.title': 'സ്ഥലങ്ങൾ',
    'places.subtitle': 'ഓരോ പ്രദേശത്തെയും സേവനങ്ങളും വിവരങ്ങളും അറിയുക',
    'id.title': 'ഗൂഡല്ലൂർ ഐഡി',
    'id.subtitle': 'നിങ്ങളുടെ ഐഡന്റിറ്റി കാർഡ്',
    'issues.title': 'ജനകീയ പ്രശ്നങ്ങൾ',
    'issues.subtitle': 'റോഡ്, വെള്ളം, വൈദ്യുതി പ്രശ്നങ്ങൾ രേഖപ്പെടുത്തുക',
    'wildlife.title': 'വന്യജീവി സഹവർത്തിത്വം',
    'wildlife.subtitle': 'ആന സാന്നിധ്യ മുന്നറിയിപ്പുകൾ',
    'act.title': 'ഗൂഡല്ലൂരിനായി പ്രവർത്തിക്കുക',
    'act.subtitle': 'കൂട്ടായ ജനകീയ ആവശ്യങ്ങൾ',
    'govt.title': 'സർക്കാർ സഹായങ്ങൾ',
    'govt.subtitle': 'ഔദ്യോഗിക പരാതി പരിഹാര മാർഗങ്ങൾ',
    'story.title': 'ഗൂഡല്ലൂർ ചരിത്രം',
    'story.subtitle': 'നമ്മുടെ സംസ്കാരവും പാരമ്പര്യവും',
    'ai.title': 'എഐ ഗൈഡ്',
    'ai.subtitle': 'ചോദ്യങ്ങൾക്ക് ഉത്തരം നേടുക'
  },
  kn: {
    // Brand & Navigation
    'brand.title': 'VOICE OF GUDALUR',
    'brand.tagline': 'ಒಂದು ಭೂಮಿ. ಹಲವು ಸಮುದಾಯಗಳು. ಒಂದಾದ ಜನತೆ.',
    'nav.manifesto': 'ಬದುಕುವ ಹಕ್ಕು ಪ್ರಣಾಳಿಕೆ',
    'nav.home': 'ಪ್ರಣಾಳಿಕೆ',
    'nav.hub': 'ನಾಗರಿಕ ಮಾಹಿತಿ ಕೇಂದ್ರ',
    'nav.places': 'ಪ್ರದೇಶಗಳು',
    'nav.live': 'ಗೂಡಲೂರು ಲೈವ್',
    'nav.alerts': 'ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳು',
    'nav.issues': 'ಜನರ ಸಮಸ್ಯೆಗಳು',
    'nav.wildlife': 'ವನ್ಯಜೀವಿ ಕೇಂದ್ರ',
    'nav.petitions': 'ಗೂಡಲೂರಿನ ಧ್ವನಿ',
    'nav.government': 'ಸರ್ಕಾರಿ ಪರಿಹಾರ',
    'nav.bus': 'ಬಸ್ ಸಮಯ',
    'nav.services': 'ಸೇವೆಗಳು',
    'nav.story': 'ಗೂಡಲೂರಿನ ಇತಿಹಾಸ',
    'nav.guide': 'ಎಐ ಮಾರ್ಗದರ್ಶಿ',
    'nav.id': 'ಗೂಡಲೂರು ಐಡಿ',
    'nav.admin': 'ಆಡಳಿತ',
    'nav.join': 'ಸೇರ್ಪಡೆಗೊಳ್ಳಿ',

    // Hero Section
    'hero.badge': 'ನೈಜ ಮಾಹಿತಿ ಮತ್ತು ನಾಗರಿಕ ಕ್ರಿಯಾ ವೇದಿಕೆ',
    'hero.headline': 'ಐಕ್ಯ ಗೂಡಲೂರು.',
    'hero.subheadline': 'ಓವೆಲಿಯಿಂದ ನಾಡುಗಾಣಿವರೆಗೆ, ತೊರಪಳ್ಳಿಯಿಂದ ದೇವಾಲದವರೆಗೆ — ನಿಮ್ಮ ಪ್ರದೇಶದೊಂದಿಗೆ ಸಂಪರ್ಕ ಸಾಧಿಸಿ, ನೈಜ ಸಮಸ್ಯೆಗಳನ್ನು ದಾಖಲಿಸಿ, ತುರ್ತು ಎಚ್ಚರಿಕೆಗಳನ್ನು ಪಡೆಯಿರಿ.',
    'hero.join_btn': 'ನಿಮ್ಮ ಗೂಡಲೂರು ಐಡಿ ಪಡೆಯಿರಿ',
    'hero.explore_map': 'ಪ್ರದೇಶಗಳನ್ನು ವೀಕ್ಷಿಸಿ',
    'hero.active_residents': 'ನೊಂದಾಯಿತ ನಾಗರಿಕರು',
    'hero.verified_localities': 'ಪರಿಶೀಲಿತ ಪ್ರದೇಶಗಳು',
    'hero.active_petitions': 'ಸಕ್ರಿಯ ಬೇಡಿಕೆಗಳು',
    'hero.resolved_issues': 'ದಾಖಲಾದ ಸಮಸ್ಯೆಗಳು',

    // Gudalur Live
    'live.title': 'ಗೂಡಲೂರು ಲೈವ್',
    'live.subtitle': 'ನೀಲಗಿರಿ ಪಶ್ಚಿಮ ಪ್ರಸ್ಥಭೂಮಿಯ ನೈಜ ಹವಾಮಾನ, ರಸ್ತೆ ಪರಿಸ್ಥಿತಿ ಮತ್ತು ತುರ್ತು ಮಾಹಿತಿ',
    'live.weather_temp': 'ತಾಪಮಾನ',
    'live.weather_air': 'ವಾಯು ಗುಣಮಟ್ಟ (AQI)',
    'live.weather_rain': 'ಮಳೆಯ ಸಂಭವನೀಯತೆ',
    'live.weather_humidity': 'ಆರ್ದ್ರತೆ',
    'live.weather_wind': 'ಗಾಳಿಯ ವೇಗ',
    'live.ghat_status': 'ಘಾಟ್ ರಸ್ತೆಗಳ ಸ್ಥಿತಿ',
    'live.night_traffic': 'ಮುಡುಮಲೈ ರಾತ್ರಿ ಸಂಚಾರ ನಿಷೇಧ: ರಾತ್ರಿ 9:00 ರಿಂದ ಬೆಳಿಗ್ಗೆ 6:00 ರವರೆಗೆ',
    'live.emergency_hotline': '24x7 ನೀಲಗಿರಿ ತುರ್ತು ಸಹಾಯವಾಣಿ',

    // Localities
    'places.title': 'ಗೂಡಲೂರಿನ ಪ್ರದೇಶಗಳು',
    'places.subtitle': 'ಪ್ರತಿಯೊಂದು ಬಡಾವಣೆಯೂ ಒಂದು ಜೀವಂತ ಸಮುದಾಯ ಕೇಂದ್ರ. ಸ್ಥಳೀಯ ಸೇವೆಗಳು, ಸಂಯೋಜಕರು ಮತ್ತು ಸಕ್ರಿಯ ಬೇಡಿಕೆಗಳನ್ನು ತಿಳಿಯಿರಿ.',
    'places.search_placeholder': 'ಪ್ರದೇಶವನ್ನು ಹುಡುಕಿ (ಉದಾ: ಎಸ್.ಎಸ್. ನಗರ, ಫಸ್ಟ್ ಮೈಲ್, ಕಾಸಿಂವಯಲ್, ದೇವಾಲ)...',
    'places.filter_all': 'ಎಲ್ಲಾ ಪ್ರದೇಶಗಳು',
    'places.join_locality': 'ಪ್ರದೇಶಕ್ಕೆ ಸೇರಿ',
    'places.report_issue': 'ಸ್ಥಳೀಯ ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    'places.coordinator': 'ಸ್ಥಳೀಯ ಸಂಯೋಜಕರು',
    'places.active_issues': 'ಸಕ್ರಿಯ ಸಮಸ್ಯೆಗಳು',
    'places.members': 'ನಾಗರಿಕರು',

    // Identity / Gudalur ID
    'id.title': 'ಗೂಡಲೂರು ನಾಗರಿಕ ಗುರುತು',
    'id.subtitle': 'ಸಮುದಾಯದಲ್ಲಿ ನಿಮ್ಮ ಪಾಲ್ಗೊಳ್ಳುವಿಕೆಯ ಡಿಜಿಟಲ್ ಪುರಾವೆ ಮತ್ತು ಗುರುತಿನ ಚೀಟಿ.',
    'id.card_title': 'ಗೂಡಲೂರು ನಿವಾಸಿ ಗುರುತಿನ ಚೀಟಿ',
    'id.number_label': 'ಗೂಡಲೂರು ಐಡಿ ಸಂಖ್ಯೆ',
    'id.place_label': 'ನನ್ನ ಪ್ರದೇಶ',
    'id.status_label': 'ಪರಿಶೀಲನಾ ಹಂತ',
    'id.share_whatsapp': 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿಕೊಳ್ಳಿ',
    'id.download_card': 'ಕಾರ್ಡ್ ಉಳಿಸಿ',
    'id.privacy_notice': 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಸುರಕ್ಷಿತವಾಗಿರುತ್ತದೆ, ಸಾರ್ವಜನಿಕವಾಗಿ ಪ್ರದರ್ಶಿಸಲಾಗುವುದಿಲ್ಲ.',

    // Civic Issues
    'issues.title': 'ನಾಗರಿಕ ಸಮಸ್ಯೆ ನಿವಾರಣಾ ವ್ಯವಸ್ಥೆ',
    'issues.subtitle': 'ರಸ್ತೆ ಹಾನಿ, ಕುಡಿಯುವ ನೀರಿನ ಕೊರತೆ, ವಿದ್ಯುತ್ ವ್ಯತ್ಯಯ ಮುಂತಾದ ಸಮಸ್ಯೆಗಳನ್ನು ಸಾಕ್ಷ್ಯ ಸಮೇತ ದಾಖಲಿಸಿ ಸರ್ಕಾರದ ಪರಿಹಾರವನ್ನು ಗಮನಿಸಿ.',
    'issues.report_btn': 'ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ',
    'issues.status_reported': 'ವರದಿಯಾಗಿದೆ',
    'issues.status_verification': 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
    'issues.status_assigned': 'ಇಲಾಖೆಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ',
    'issues.status_action': 'ಕ್ರಮ ಪ್ರಗತಿಯಲ್ಲಿದೆ',
    'issues.status_resolved': 'ಪರಿಹರಿಸಲಾಗಿದೆ',

    // Wildlife
    'wildlife.title': 'ಮಾನವ-ವನ್ಯಜೀವಿ ಸಹಬಾಳ್ವೆ ಕೇಂದ್ರ',
    'wildlife.subtitle': 'ಕಾಡಾನೆಗಳು ಮತ್ತು ಮಾನವ ಸುರಕ್ಷತೆಗಾಗಿ ಮುನ್ನೆಚ್ಚರಿಕೆ, ಕಾರಿಡಾರ್ ಮಾಹಿತಿ ಮತ್ತು ಅರಣ್ಯ ಇಲಾಖೆ ಸಮನ್ವಯ.',
    'wildlife.log_sighting': 'ವನ್ಯಜೀವಿ ಸಂಚಾರ ದಾಖಲಿಸಿ',
    'wildlife.active_corridors': 'ಸಕ್ರಿಯ ಆನೆ ಕಾರಿಡಾರ್‌ಗಳು',
    'wildlife.safety_guidelines': 'ಪ್ರಯಾಣಿಕರ ಸುರಕ್ಷತಾ ಮಾರ್ಗಸೂಚಿಗಳು',

    // Act for Gudalur / Petitions
    'act.title': 'ಗೂಡಲೂರಿನ ಒಗ್ಗಟ್ಟಿನ ಧ್ವನಿ',
    'act.subtitle': 'ಕಾನೂನುಬದ್ಧ, ಶಾಂತಿಯುತ ಮತ್ತು ಸಾಕ್ಷ್ಯಾಧಾರಿತ ಸಾಮೂಹಿಕ ನಾಗರಿಕ ಬೇಡಿಕೆಗಳು. ಅಗತ್ಯ ಮೂಲಸೌಕರ್ಯಗಳಿಗಾಗಿ ಸಾವಿರಾರು ನಾಗರಿಕರೊಂದಿಗೆ ಧ್ವನಿ ಎತ್ತಿ.',
    'act.sign_petition': 'ಈ ಬೇಡಿಕೆಯನ್ನು ಬೆಂಬಲಿಸಿ',
    'act.already_supported': 'ನೀವು ಈಗಾಗಲೇ ಬೆಂಬಲಿಸಿದ್ದೀರಿ',
    'act.target_authority': 'ಸಂಬಂಧಿತ ಸರ್ಕಾರಿ ಇಲಾಖೆ',
    'act.evidence_docket': 'ಸಾಕ್ಷ್ಯಗಳು ಮತ್ತು ಹಿನ್ನೆಲೆ ವಿವರ',
    'act.govt_response': 'ಸರ್ಕಾರದ ಅಧಿಕೃತ ಪ್ರತಿಕ್ರಿಯೆ',

    // Government Grievance
    'govt.title': 'ಸರ್ಕಾರಿ ಪರಿಹಾರ ಮಾರ್ಗದರ್ಶಿ',
    'govt.subtitle': 'ಮುಖ್ಯಮಂತ್ರಿಗಳ ಸಹಾಯವಾಣಿ 1100, ಮಿನ್ನಲ್ ವಿದ್ಯುತ್ ಪರಿಹಾರ, ಗೂಡಲೂರು ಪುರಸಭೆ ಮತ್ತು ಜಿಲ್ಲಾಧಿಕಾರಿಗಳ ಕುಂದುಕೊರತೆ ನಿವಾರಣೆ.',
    'govt.file_official': 'ಅಧಿಕೃತ ದೂರು ಸಲ್ಲಿಸಿ',
    'govt.track_complaint': 'ದೂರಿನ ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ',

    // Story
    'story.title': 'ಗೂಡಲೂರಿನ ಇತಿಹಾಸ ಮತ್ತು ಪರಂಪರೆ',
    'story.subtitle': 'ಶೋಲಾ ಕಾಡುಗಳು, ಸ್ಥಳೀಯ ಬುಡಕಟ್ಟುಗಳು, ಚಹಾ ತೋಟಗಳು ಮತ್ತು ನಮ್ಮ ಐಕ್ಯ ನಾಗರಿಕ ಭವಿಷ್ಯ.',
    'story.chapter': 'ಅಧ್ಯಾಯ',

    // AI Guide
    'ai.title': 'ಎಐ ಗೂಡಲೂರು ಮಾರ್ಗದರ್ಶಿ ಮತ್ತು ಬೆಳೆ ವೈದ್ಯ',
    'ai.subtitle': 'ಬಸ್ ಸಮಯ, ಸರ್ಕಾರಿ ಪರಿಹಾರ ಕ್ರಮಗಳು ಮತ್ತು ಚಹಾ/ಕಾಳುಮೆಣಸು ಬೆಳೆ ರೋಗ ನಿರ್ಣಯಕ್ಕೆ ತ್ವರಿತ ನೆರವು.',
    'ai.placeholder': 'ಬಸ್ ಸಮಯ ಅಥವಾ ಕೃಷಿ ಬೆಳೆ ರೋಗ ಲಕ್ಷಣಗಳ ಬಗ್ಗೆ ಕೇಳಿ...'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('VoiceOfGudalur_lang') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('VoiceOfGudalur_lang', lang);
  }, [lang]);

  const t = (key: string) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
