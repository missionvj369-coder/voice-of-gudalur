export interface EmailRecipient {
  name: string;
  email: string;
  role: string;
  category: 'primary' | 'cc_state' | 'cc_national' | 'cc_global';
}

export interface EmailPetitionContent {
  subject: string;
  salutation: string;
  body: string;
  signoff: string;
}

export const EMAIL_RECIPIENTS = {
  to: [
    { name: "Chief Minister's Special Cell, Tamil Nadu", email: "cmcell@tn.gov.in", role: "Chief Minister's Grievance Cell", category: "primary" },
    { name: "Chief Minister's Office, Tamil Nadu", email: "cmo@tn.gov.in", role: "CM Executive Office", category: "primary" }
  ] as EmailRecipient[],
  cc: [
    { name: "National Tiger Conservation Authority (Member Secretary)", email: "ms-ntca@nic.in", role: "NTCA Headquarters - New Delhi", category: "cc_national" },
    { name: "Inspector General of Forests, NTCA", email: "ig-ntca@nic.in", role: "NTCA Regional Oversight", category: "cc_national" },
    { name: "District Collector, The Nilgiris", email: "collrnlg@tn.nic.in", role: "District Magistrate & Executive Authority", category: "cc_state" },
    { name: "Member of Legislative Assembly (MLA), Gudalur", email: "mlagudalur@tn.gov.in", role: "Elected Peoples Representative", category: "cc_state" },
    { name: "TN Forest Wildlife Crime Control Board", email: "tnfwccb@gmail.com", role: "State Wildlife Enforcement", category: "cc_state" },
    { name: "International Union for Conservation of Nature (IUCN)", email: "info@iucn.org", role: "Global Habitat & Species Protection", category: "cc_global" },
    { name: "United Nations Environment Programme (UNEP)", email: "unep-news@un.org", role: "UN Environmental Body", category: "cc_global" },
    { name: "UN High Commissioner for Human Rights (OHCHR)", email: "ohchr-info@un.org", role: "Global Human Rights Body", category: "cc_global" }
  ] as EmailRecipient[]
};

export const EMAIL_PETITION_DATA: Record<'en' | 'ta' | 'ml' | 'kn', EmailPetitionContent> = {
  en: {
    subject: "URGENT PUBLIC SAFETY & HUMAN RIGHTS CRISIS: Fatal Encounters and Systemic Corridor Blockades in Gudalur, India",
    salutation: "Respected Authorities and Global Representatives,",
    body: `We, the undersigned citizens, taxpayers, and residents of Gudalur, O'Valley, Cherambadi, and Pandalur, write to you with grave urgency. Our region has transformed into an active crisis zone where human life is severely compromised.

As documented by independent investigations and official assessments, large commercial estates and unauthorized constructions have illegally blocked all 11 traditional elephant and wildlife migratory paths in Gudalur. Trapped by barriers with nowhere to go, wildlife populations have become permanent residents right beside human habitations, resulting in tragic fatalities (such as recent fatal tiger and elephant attacks in O'Valley).

While substantial central and state funds are allocated under Project Tiger, these budgets are legally restricted to inside notified forest boundaries. Gudalur’s residential fringe zones remain an administrative blind spot, completely devoid of structural safety infrastructure.

We demand the immediate implementation of the following emergency measures under the constitutional Right to Life (Article 21):

1. Unconditional Corridor Clearance: Legally enforce the dismantling of unauthorized walls, buildings, and restrictive fencing blocking historic animal paths in Gudalur and O'Valley.

2. AI-Driven Early Warning Systems: Implement advanced AI thermal cameras, acoustic sensors, and automated siren alert systems around all vulnerable residential pockets.

3. Dedicated 24/7 Local Rapid Response Teams (RRTs): Station fully equipped emergency response units with tranquilizing capabilities directly inside high-conflict zones.

4. Invasive Weed Eradication: Clear all choking Lantana bushes and abandoned estate overgrowths serving as predator cover near human homes.

We urge immediate intervention and accountability.`,
    signoff: `In Solidarity,

One Voice of Gudalur`
  },

  ta: {
    subject: "அவசர பொதுப் பாதுகாப்பு மற்றும் மனித உரிமைகள் நெருக்கடி: கூடலூரில் மனித உயிர்களைப் பலியிடும் கொடூரச் சூழல் மற்றும் உடனடித் தலையீட்டிற்கான கோரிக்கை",
    salutation: "மதிப்பிற்குரிய அதிகாரிகளே மற்றும் உலகளாவிய பிரதிநிதிகளே,",
    body: `கூடலூர், ஓவேலி, சேரம்பாடி மற்றும் பந்தலூர் ஆகிய பகுதிகளைச் சேர்ந்த குடிமக்களாகிய நாங்கள், மிகுந்த அவசரத்துடன் இந்த மடலை எழுதுகிறோம். எங்களது பகுதி தற்போது மனித உயிர் பாதுகாப்பற்ற ஒரு அபாய மண்டலமாக மாறிவிட்டது.

அதிகாரப்பூர்வ மதிப்பீடுகள் மற்றும் ஊடக விசாரணைகளின்படி, பெரிய வணிகத் தேயிலைத் தோட்டங்கள் மற்றும் அனுமதியற்ற கட்டுமானங்கள் காரணமாக கூடலூரில் உள்ள 11 பாரம்பரிய யானை மற்றும் வனவிலங்கு வழித்தடங்களும் சட்டவிரோதமாக அடைக்கப்பட்டுள்ளன. இதனால் வனவிலங்குகள் குடியிருப்புகளுக்கு அருகில் நிரந்தரமாகத் தங்கிவிட்டன; ஓவேலி பகுதியில் சமீபத்தில் நடந்த சோகமான உயிரிழப்புகள் இதற்கு சான்றாகும்.

மத்திய மற்றும் மாநில அரசுகளால் கோடிக்கணக்கான நிதி ஒதுக்கப்படினும், அது காடுகளுக்கு உள்ளே மட்டுமே பயன்படுத்தப்படுவதால், கூடலூரின் விளிம்புப் பகுதி மக்கள் பாதுகாப்பின்றி தவிக்கின்றனர்.

அரசியலமைப்புச் சட்டத்தின்படி மனித உயிரைப் பாதுகாக்க உடனடியாக கீழ்க்கண்ட நடவடிக்கைகளை எடுக்கக் கோருகிறோம்:

1. வழித்தடங்களில் உள்ள ஆக்கிரமிப்புகளை அகற்றுதல்: கூடலூர் மற்றும் ஓவேலியில் விலங்குப் பாதைகளை மறித்துள்ள சட்டவிரோதக் கட்டிடங்கள் மற்றும் வேலிகளை உடனடியாக அகற்ற வேண்டும்.

2. செயற்கை நுண்ணறிவு (AI) எச்சரிக்கை அமைப்புகள்: அனைத்துக் குடியிருப்புப் பகுதிகளிலும் நவீன AI தெர்மல் கேமராக்கள் மற்றும் எச்சரிக்கை மணிகளை நிறுவ வேண்டும்.

3. உள்ளூர் அவசரப் படைகள் (RRTs): ஆபத்து நிறைந்த பகுதிகளில் 24 மணி நேரமும் செயல்படும் அவசர மீட்புக் குழுக்களை உடனே அமைக்க வேண்டும்.

4. களைகளை அகற்றுதல்: குடியிருப்புகளுக்கு அருகில் விலங்குகள் பதுங்கியிருக்கும் லண்டானா புதர்களை உடனடியாக அப்புறப்படுத்த வேண்டும்.

உடனடி நடவடிக்கையை எதிர்பார்க்கிறோம்.`,
    signoff: `இவண்,

கூடலூரின் ஒற்றைக் குரல்`
  },

  ml: {
    subject: "അടിയന്തര പൊതുസുരക്ഷയും മനുഷ്യാവകാശ പ്രതിസന്ധിയും: ഗൂഡലൂരിൽ മനുഷ്യജീവനുകൾ പൊലിയുന്ന സാഹചര്യത്തിൽ അടിയന്തര ഇടപെടൽ അഭ്യർത്ഥിക്കുന്നു",
    salutation: "ബഹുമാനപ്പെട്ട അധികാരികൾക്കും ആഗോള പ്രതിനിധികൾക്കും,",
    body: `ഗൂഡലൂർ, ഓവേലി, ചേരമ്പാടി, പന്തല്ലൂർ എന്നിവിടങ്ങളിലെ പൗരന്മാരായ ഞങ്ങൾ അതീവ ഗൗരവത്തോടെ ഈ കത്ത് എഴുതുന്നു. നമ്മുടെ പ്രദേശം മനുഷ്യജീവിതം അപകടത്തിലായ ഒരു മേഖലയായി മാറിയിരിക്കുന്നു.

ഔദ്യോഗിക അന്വേഷണങ്ങൾ വ്യക്തമാക്കുന്നത് പോലെ, വൻകിട തോട്ടങ്ങളും അനധികൃത നിർമ്മാണങ്ങളും കാരണം ഗൂഡലൂരിലെ 11 പരമ്പരാഗത വന്യജീവി ഇടനാടുകളും നിയമവിരുദ്ധമായി അടച്ചിരിക്കുകയാണ്. ഇത് വന്യമൃഗങ്ങളെ ജനവാസ മേഖലകളിലേക്ക് നയിക്കുകയും, ഓവേലിയിലുണ്ടായതുപോലുള്ള ദാരുണമായ മനുഷ്യ മരണങ്ങൾക്ക് കാരണമാവുകയും ചെയ്തു.

കോടികളുടെ ഫണ്ടുകൾ വനത്തിനുള്ളിൽ മാത്രം വിനിയോഗിക്കപ്പെടുന്നതിനാൽ, ഗൂഡലൂരിലെ ജനവാസ മേഖലകൾ യാതൊരുവിധ സുരക്ഷാ സംവിധാനവുമില്ലാതെ അവഗണിക്കപ്പെട്ടിരിക്കുന്നു.

ഭരണഘടനാപരമായ ജീവിക്കാനുള്ള അവകാശത്തിന്റെ അടിസ്ഥാനത്തിൽ താഴെ പറയുന്ന അടിയന്തര നടപടികൾ സ്വീകരിക്കണമെന്ന് ഞങ്ങൾ ആവശ്യപ്പെടുന്നു:

1. ഇടനാടുകളിലെ കയ്യേറ്റങ്ങൾ നീക്കം ചെയ്യുക: ഗൂഡലൂരിലും ഓവേലിയിലുമുള്ള അനധികൃത മതിലുകളും വേലികളും തകർത്ത് സ്വാഭാവിക പാതകൾ തുറക്കുക.

2. AI മുന്നറിയിപ്പ് സംവിധാനങ്ങൾ നടപ്പിലാക്കുക: എല്ലാ ജനവാസ മേഖലകളിലും ആധുനിക തെർമൽ ക്യാമറകളും സെൻസറുകളും സ്ഥാപിക്കുക.

3. പ്രാദേശിക റാപ്പിഡ് റെസ്പോൺസ് ടീമുകൾ (RRTs): ഉയർന്ന സംഘർഷ സാധ്യതയുള്ള പ്രദേശങ്ങളിൽ 24 മണിക്കൂറും പ്രവർത്തിക്കുന്ന എമർജൻസി യൂണിറ്റുകൾ സ്ഥാപിക്കുക.

4. കാട്ടുചെടികൾ വെട്ടിമാറ്റുക: ജനവാസ മേഖലകൾക്ക് സമീപമുള്ള അപകടകരമായ കാടുകളും കളകളും പൂർണ്ണമായി നീക്കം ചെയ്യുക.

അടിയന്തര നടപടി പ്രതീക്ഷിക്കുന്നു.`,
    signoff: `വിശ്വസ്തതയോടെ,

ഗൂഡലൂരിന്റെ ഏക ശബ്ദം`
  },

  kn: {
    subject: "ತುರ್ತು ಸಾರ್ವಜನಿಕ ಸುರಕ್ಷತೆ ಮತ್ತು ಮಾನವ ಹಕ್ಕುಗಳ ಬಿಕ್ಕಟ್ಟು: ಗೂಡಲೂರಿನಲ್ಲಿ ಮಾನವ ಜೀವಗಳು ಬಲಿಯಾಗುವುದನ್ನು ತಡೆಯಲು ತಕ್ಷಣದ ಕ್ರಮಕ್ಕಾಗಿ ಮನವಿ",
    salutation: "ಗೌರವಾನ್ವಿತ ಅಧಿಕಾರಿಗಳಿಗೆ ಮತ್ತು ಜಾಗತಿಕ ಪ್ರತಿನಿಧಿಗಳಿಗೆ,",
    body: `ಗೂಡಲೂರು, ಓವೆಲಿ, ಚೆಂಬಾಡಿ ಮತ್ತು ಪಂದಲೂರು ಪ್ರದೇಶಗಳ ಪ್ರಜೆಗಳಾದ ನಾವು ತೀವ್ರ ಕಳಕಳಿಯಿಂದ ಈ ಇಮೇಲ್ ಬರೆಯುತ್ತಿದ್ದೇವೆ. ನಮ್ಮ ಪ್ರದೇಶವು ಮಾನವ ಜೀವಗಳಿಗೆ ಅತ್ಯಂತ ಅಪಾಯಕಾರಿ ವಲಯವಾಗಿ ಮಾರ್ಪಟ್ಟಿದೆ.

ಅಧಿಕೃತ ವರದಿಗಳ ಪ್ರಕಾರ, ದೊಡ್ಡ ವಾಣಿಜ್ಯ ತೋಟಗಳು ಮತ್ತು ಅನಧಿಕೃತ ನಿರ್ಮಾಣಗಳಿಂದಾಗಿ ಗೂಡಲೂರಿನ 11 ಸಾಂಪ್ರದಾಯಿಕ ವನ್ಯಜೀವಿ ಕಾರಿಡಾರ್ಗಳು ಕಾನೂನುಬಾಹಿರವಾಗಿ ಮುಚ್ಚಲ್ಪಟ್ಟಿವೆ. ಇದು ಪ್ರಾಣಿಗಳು ನೇರವಾಗಿ ಜನವಸತಿ ಪ್ರದೇಶಗಳಿಗೆ ಬರುವಂತೆ ಮಾಡಿದ್ದು, ಓವೆಲಿಯಲ್ಲಿ ಸಂಭವಿಸಿದ ದುರಂತ ಸಾವುಗಳಿಗೆ ನೇರ ಕಾರಣವಾಗಿದೆ.

ಕೋಟ್ಯಂತರ ಅನುದಾನಗಳು ಅರಣ್ಯದ ಒಳಗೆ ಮಾತ್ರ ಬಳಕೆಯಾಗುತ್ತಿರುವುದರಿಂದ, ಗೂಡಲೂರಿನ ಅಂಚಿನ ವಲಯಗಳು ಯಾವುದೇ ಸುರಕ್ಷತಾ ಸೌಲಭ್ಯಗಳಿಲ್ಲದೆ ಅಸುರಕ್ಷಿತವಾಗಿ ಉಳಿದಿವೆ.

ಸಂವಿಧಾನಬದ್ಧವಾಗಿ ಬದುಕುವ ಹಕ್ಕನ್ನು ಕಾಪಾಡಲು ತಕ್ಷಣವೇ ಈ ಕೆಳಗಿನ ಕ್ರಮಗಳನ್ನು ಜರುಗಿಸಬೇಕಾಗಿ ವಿನಂತಿ:

1. ಒತ್ತುವರಿಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ: ಗೂಡಲೂರು ಮತ್ತು ಓವೆಲಿಯಲ್ಲಿ ಪ್ರಾಣಿ ಮಾರ್ಗಗಳನ್ನು ನಿರ್ಬಂಧಿಸಿರುವ ಅನಧಿಕೃತ ಗೋಡೆಗಳು ಮತ್ತು ಬೇಲಿಗಳನ್ನು ಕೂಡಲೇ ತೆರವುಗೊಳಿಸಿ.

2. AI ಆಧಾರಿತ ಎಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆ: ಎಲ್ಲಾ ಜನವಸತಿ ಪ್ರದೇಶಗಳ ಸುತ್ತಲೂ ಆಧುನಿಕ ಥರ್ಮಲ್ ಕ್ಯಾಮೆರಾಗಳು ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಎಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆಗಳನ್ನು ಅಳವಡಿಸಿ.

3. ಸ್ಥಳೀಯ ತುರ್ತು ಸ್ಪಂದನಾ ತಂಡಗಳು (RRTs): ಸಂಘರ್ಷ ಪೀಡಿತ ಪ್ರದೇಶಗಳಲ್ಲಿ 24 ಗಂಟೆಗಳ ಕಾಲ ಕಾರ್ಯನಿರ್ವಹಿಸುವ ತುರ್ತು ರಕ್ಷಣಾ ಘಟಕಗಳನ್ನು ಸ್ಥಾಪಿಸಿ.

4. ಕಳೆಗಳನ್ನು ನಿರ್ಮೂಲನೆ ಮಾಡಿ: ಜನವಸತಿಗಳ ಬಳಿ ಪ್ರಾಣಿಗಳು ಅಡಗಿಕೊಳ್ಳಲು ಕಾರಣವಾಗಿರುವ ಕಳೆ ಗಿಡಗಳನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತೆರವುಗೊಳಿಸಿ.

ತಕ್ಷಣದ ಸ್ಪಂದನೆಯನ್ನು ನಿರೀಕ್ಷಿಸುತ್ತೇವೆ.`,
    signoff: `ಇಂತಿ,

ಗೂಡಲೂರಿನ ಒಂದೇ ಧ್ವನಿ`
  }
};
