export interface ManifestoSection {
  part: string;
  /** Optional — Part I intentionally has no title because the hero title already carries it (no repetition). */
  title?: string;
  subtitle?: string;
  content: string[];
  highlights?: {
    heading: string;
    description: string;
    badge?: string;
    iconType?: 'corridor' | 'trap' | 'court' | 'apathy' | 'ai' | 'rrt' | 'flora' | 'alert';
  }[];
}

export interface ManifestoContent {
  title: string;
  subtitle: string;
  badge: string;
  /** One-line citizen proclamation (rendered once in the hero). */
  proclamation: string;
  sections: ManifestoSection[];
  callToAction: {
    title: string;
    slogans: string[];
    closing: string;
  };
}

export const MANIFESTO_DATA: Record<'en' | 'ta' | 'ml' | 'kn', ManifestoContent> = {
  en: {
    title: "The Silent Grief of Gudalur — Our Homes Have Become Open-Air Cages",
    subtitle: "We are not asking for favors. We are asking for the right to breathe, sleep, and walk on our own soil without fearing the dark.",
    badge: "Official Citizen Proclamation",
    proclamation: "To the world, Gudalur is a scenic paradise of mist and tea estates. To us, it is a landscape of perpetual fear.",
    sections: [
      {
        part: "Part I",
        content: [
          "Generations of our families have lived here, nurtured these hills, paid our taxes, and respected the law. Yet today, our doorsteps have turned into open-air containment zones. What used to be rare, distant wildlife sightings deep inside remote estates like Lauriston (O'Valley) and Cherambadi are now daily, heart-stopping encounters right where our children play.",
          "Every time a family member steps out for work or school, our hearts stop. We have buried mothers, fathers, and brothers not to natural causes, but to a man-made wildlife crisis. We refuse to be treated as silent collateral damage. Today, Gudalur speaks with One Voice."
        ]
      },
      {
        part: "Part II",
        title: "The Hard Truth — Why Are We Dying?",
        content: [
          "Our pain is not born of panic; it is born of systemic neglect and trapped realities. Expert assessments and investigative reporting by outlets like The Hindu reveal the true architects of this catastrophe:"
        ],
        highlights: [
          {
            heading: "The 11 Blocked Migratory Paths",
            description: "Historically, Gudalur was merely a seasonal corridor connecting the Mudumalai Tiger Reserve with Wayanad and Nilambur. Today, impenetrable fences, concrete walls, and unauthorized commercial encroachments have choked off all 11 traditional elephant migratory pathways.",
            badge: "11 Corridors Blocked",
            iconType: "corridor"
          },
          {
            heading: "The 'Trap Effect'",
            description: "Trapped by private walls from all sides, magnificent animals lost their natural migratory instincts. They have become permanent, stressed resident populations cornered into fragmented pockets right beside our tiny labor lines and backyards.",
            badge: "The Trap Effect",
            iconType: "trap"
          },
          {
            heading: "Bureaucratic Blind Spots",
            description: "While crores of rupees in conservation funds flow into Project Tiger, these budgets are legally restricted strictly inside notified forest boundaries. Gudalur’s residential fringe zones are treated as administrative no-man's-lands where no agency takes responsibility for human life.",
            badge: "Administrative Blind Spot",
            iconType: "apathy"
          }
        ]
      },
      {
        part: "Part III",
        title: "What Must Be Done Now (No More Excuses)",
        content: [
          "Safety is a constitutional mandate, not an administrative afterthought. We demand immediate, uncompromising action:"
        ],
        highlights: [
          {
            heading: "Unconditional Removal of Blockades",
            description: "Tear down illegal walls, barriers, and restrictive fencing choking the 11 historical wildlife corridors across Gudalur and O'Valley.",
            badge: "Immediate Action 1",
            iconType: "corridor"
          },
          {
            heading: "AI-Driven Early Warning Systems",
            description: "Deploy real-time thermal cameras, acoustic sensors, and automated text alerts to warn villages before wildlife enters human layouts.",
            badge: "Immediate Action 2",
            iconType: "ai"
          },
          {
            heading: "Decentralized 24/7 Rapid Response Teams (RRTs)",
            description: "Station fully equipped emergency units with tranquilizing gear and dedicated vehicles directly inside high-conflict zones like Pandalur, Cherambadi, and O'Valley—not hours away.",
            badge: "Immediate Action 3",
            iconType: "rrt"
          },
          {
            heading: "Eradication of Lethal Overgrowth",
            description: "Clear out choking, unmanaged Lantana bushes and abandoned estate overgrowth serving as hiding spots for leopards and tigers right next to our homes.",
            badge: "Immediate Action 4",
            iconType: "flora"
          }
        ]
      }
    ],
    callToAction: {
      title: "Call to Action — Stand As One",
      slogans: [
        "Protect Human Life!",
        "Secure Our Homes!",
        "Dismantle Illegal Encroachments on Corridors!"
      ],
      closing: "JAI HIND. LONG LIVE THE PEOPLE OF GUDALUR. 🇮🇳"
    }
  },

  ta: {
    title: "கூடலூரின் மௌனக் கதறல் — எங்கள் வீடுகள் திறந்தவெளி கூண்டுகளாக மாறிவிட்டன",
    subtitle: "நாங்கள் அரசிடம் சலுகை கேட்கவில்லை; இருளுக்கு அஞ்சாமல் எங்கள் சொந்த மண்ணில் சுவாசிக்க, தூங்க, நடக்கக்கூடிய உரிமையையே கேட்கிறோம்.",
    badge: "மக்களின் அதிகாரப்பூர்வ பிரகடனம்",
    proclamation: "உலகிற்கு கூடலூர் என்பது பனிமூட்டமும் தேயிலைத் தோட்டங்களும் நிறைந்த எழில் சொர்க்கம். ஆனால் எங்களுக்கு, இது முடிவில்லா மரண பயத்தின் நிலப்பரப்பு.",
    sections: [
      {
        part: "பகுதி I",
        content: [
          "எங்கள் குடும்பங்களின் தலைமுறைகள் இங்கு வாழ்ந்து, இந்த மலைகளைப் பேணி, வரி செலுத்தி, சட்டத்தை மதித்து வந்துள்ளன. ஆனால் இன்று, எங்கள் வீட்டு வாசல்கள் திறந்தவெளி தடுப்பு மண்டலங்களாக மாறிவிட்டன. ஒரு காலத்தில் லாரிஸ்டன் (ஓவேலி) மற்றும் சேரம்பாடி போன்ற அடர்ந்த தோட்டங்களுக்குள் மட்டுமே அரிதாகக் காணப்பட்ட வனவிலங்குகள், இன்று எங்கள் குழந்தைகள் விளையாடும் முற்றத்திலேயே நாள்தோறும் இதயத்தை அதிர வைக்கும் மரண பயமாக நிற்கின்றன.",
          "ஒவ்வொரு முறையும் ஒரு குடும்ப உறுப்பினர் வேலைக்கோ அல்லது பள்ளி பெற்றோருக்கோ வெளியே செல்லும்போது, எங்கள் நெஞ்சம் படபடக்கிறது. நாங்கள் எங்கள் தாய்மார்கள், தந்தையர், சகோதரர்களை இயற்கை காரணங்களுக்காக புதைக்கவில்லை; மனிதனால் உருவாக்கப்பட்ட இந்த வனவிலங்கு நெருக்கடியால் பலிகொடுத்து வருகிறோம். நாங்கள் இனி அமைதியான பலியாடுகளாக இருக்க மாட்டோம். இன்று, கூடலூர் ஒரே குரலில் பேசுகிறது."
        ]
      },
      {
        part: "பகுதி II",
        title: "கசப்பான உண்மை — நாங்கள் ஏன் மடிகிறோம்?",
        content: [
          "எங்கள் வலி பீதியினால் பிறக்கவில்லை; அமைப்புரீதியான புறக்கணிப்பு மற்றும் சிக்கிய யதார்த்தங்களால் பிறந்தது. 'தி இந்து' (The Hindu) உள்ளிட்ட முன்னணி ஊடகங்களின் புலனாய்வு மற்றும் நிபுணர் மதிப்பீடுகள் இந்த பேரழிவின் உண்மையான காரணங்களை அம்பலப்படுத்துகின்றன:"
        ],
        highlights: [
          {
            heading: "அடைக்கப்பட்ட 11 வழித்தடங்கள்",
            description: "வரலாற்று ரீதியாக, கூடலூர் என்பது முதுமலை புலிகள் காப்பகத்தை வயநாடு மற்றும் நிலம்பூருடன் இணைக்கும் ஒரு பருவகால வழித்தடமாக மட்டுமே இருந்தது. இன்று, ஊடுருவ முடியாத வேலிகள், கான்கிரீட் சுவர்கள் மற்றும் அனுமதியற்ற வணிக ஆக்கிரமிப்புகள் 11 பாரம்பரிய யானை வழித்தடங்களையும் முழுமையாக அடைத்துவிட்டன.",
            badge: "11 வழித்தடங்கள் அடைப்பு",
            iconType: "corridor"
          },
          {
            heading: "'பொறி' விளைவு (The Trap Effect)",
            description: "எல்லா பக்கங்களிலிருந்தும் தனியார் சுவர்களால் சூழப்பட்டதால், கம்பீரமான விலங்குகள் தங்களின் இயற்கை இடம்பெயர்வு உணர்வை இழந்துவிட்டன. அவை எங்கள் தொழிலாளர் குடியிருப்புகள் மற்றும் கொல்லைப்புறங்களுக்கு அருகிலுள்ள சிறு துண்டு நிலங்களுக்குள் நிரந்தரமாக சிக்கிய, மன உளைச்சலுக்கு ஆளான வசிப்பிட கூட்டமாக மாறிவிட்டன.",
            badge: "பொறி விளைவு",
            iconType: "trap"
          },
          {
            heading: "அதிகாரத்துவ குருட்டுப் புள்ளிகள்",
            description: "புராஜெக்ட் டைகர் திட்டத்தின் கீழ் கோடிக்கணக்கான ரூபாய் பாதுகாப்பு நிதி வந்தாலும், அவை வன எல்லைகளுக்குள் மட்டுமே செலவிட சட்டப்பூர்வமாக கட்டுப்படுத்தப்பட்டுள்ளன. கூடலூரின் விளிம்புப் பகுதி குடியிருப்பு மண்டலங்கள் எந்தவொரு துறையும் மனித உயிருக்கு பொறுப்பேற்காத நிர்வாக அநாதை நிலமாக நடத்தப்படுகின்றன.",
            badge: "நிர்வாக குருட்டுப் புள்ளி",
            iconType: "apathy"
          }
        ]
      },
      {
        part: "பகுதி III",
        title: "உடனடியாக செய்ய வேண்டியவை (இனி சாக்குப்போக்குகள் வேண்டாம்)",
        content: [
          "பாதுகாப்பு என்பது அரசியலமைப்புச் சட்டத்தின் ஆணை; அது நிர்வாகத்தின் பின்தோன்றிய யோசனை அல்ல. சமரசமற்ற உடனடி நடவடிக்கையை நாங்கள் கோருகிறோம்:"
        ],
        highlights: [
          {
            heading: "தடைகளை நிபந்தனையின்றி அகற்றுதல்",
            description: "கூடலூர் மற்றும் ஓவேலி முழுவதும் உள்ள 11 வரலாற்று சிறப்புமிக்க வனவிலங்கு வழித்தடங்களை அடைத்துள்ள சட்டவிரோத சுவர்கள், தடைகள் மற்றும் கட்டுப்பாட்டு வேலிகளை உடனடியாக இடித்துத் தள்ள வேண்டும்.",
            badge: "உடனடி நடவடிக்கை 1",
            iconType: "corridor"
          },
          {
            heading: "செயற்கை நுண்ணறிவு (AI) எச்சரிக்கை அமைப்புகள்",
            description: "வனவிலங்குகள் குடியிருப்புகளுக்குள் நுழைவதற்கு முன்பே கிராம மக்களை எச்சரிக்க நிகழ்நேர தெர்மல் கேமராக்கள், ஒலி சென்சார்கள் மற்றும் தானியங்கி குறுஞ்செய்தி எச்சரிக்கைகளை நிலைநிறுத்த வேண்டும்.",
            badge: "உடனடி நடவடிக்கை 2",
            iconType: "ai"
          },
          {
            heading: "24/7 உள்ளூர் அவசர மீட்புக் குழுக்கள் (RRTs)",
            description: "பந்தலூர், சேரம்பாடி மற்றும் ஓவேலி போன்ற தீவிர மோதல் உள்ள பகுதிகளில், மணிநேரங்கள் தள்ளி இல்லாமல், மயக்க மருந்து கருவிகள் மற்றும் பிரத்யேக வாகனங்களுடன் கூடிய அவசரப் படைகளை நேரடியாக நிறுத்த வேண்டும்.",
            badge: "உடனடி நடவடிக்கை 3",
            iconType: "rrt"
          },
          {
            heading: "ஆபத்தான காட்டுப் புதர்களை அழித்தல்",
            description: "எங்கள் வீடுகளுக்கு அருகில் சிறுத்தைகள் மற்றும் புலிகள் பதுங்கும் இடங்களாக செயல்படும் அடர்ந்த லண்டானா (Lantana) புதர்கள் மற்றும் கைவிடப்பட்ட தோட்டக் காடுகளை உடனடியாக அகற்ற வேண்டும்.",
            badge: "உடனடி நடவடிக்கை 4",
            iconType: "flora"
          }
        ]
      }
    ],
    callToAction: {
      title: "செயலுக்கான அழைப்பு — ஒன்றாக எழுவோம்",
      slogans: [
        "மனித உயிரைப் பாதுகாப்போம்!",
        "நமது வீடுகளைப் பாதுகாப்போம்!",
        "விலங்கு வழித்தடங்களில் உள்ள சட்டவிரோத ஆக்கிரமிப்புகளை அகற்றுவோம்!"
      ],
      closing: "ஜெய் ஹிந்த். கூடலூர் மக்கள் வாழ்க! 🇮🇳"
    }
  },

  ml: {
    title: "ഗൂഡലൂരിന്റെ നിശ്ശബ്ദ വിലാപം — നമ്മുടെ വീടുകൾ തുറന്ന ജയിലുകളായി മാറിയിരിക്കുന്നു",
    subtitle: "ഞങ്ങൾ ഔദാര്യം ചോദിക്കുകയല്ല. ഇരുട്ടിനെ ഭയപ്പെടാതെ ഞങ്ങളുടെ സ്വന്തം മണ്ണിൽ ശ്വസിക്കാനും ഉറങ്ങാനും നടക്കാനുമുള്ള അവകാശമാണ് ഞങ്ങൾ ചോദിക്കുന്നത്.",
    badge: "ഔദ്യോഗിക പൗര പ്രഖ്യാപനം",
    proclamation: "ലോകത്തിന് ഗൂഡലൂർ കോടമഞ്ഞും തേയിലത്തോട്ടങ്ങളും നിറഞ്ഞ മനോഹരമായ ഒരു പറുദീസയാണ്. എന്നാൽ ഞങ്ങൾക്ക് ഇത് നിരന്തരമായ മരണഭയത്തിന്റെ ഭൂമികയാണ്.",
    sections: [
      {
        part: "ഭാഗം I",
        content: [
          "തലമുറകളായി ഞങ്ങളുടെ കുടുംബങ്ങൾ ഇവിടെ ജീവിക്കുകയും ഈ മലകളെ സംരക്ഷിക്കുകയും നികുതി നൽകുകയും നിയമം പാലിക്കുകയും ചെയ്തുവരുന്നു. എന്നാൽ ഇന്ന് ഞങ്ങളുടെ വീട്ടുപടിക്കൽ തുറന്ന ജയിലുകളായി മാറിയിരിക്കുന്നു. ലാരിസ്റ്റൺ (ഓവേലി), ചേരമ്പാടി തുടങ്ങിയ ഉൾത്തോട്ടങ്ങളിൽ പണ്ട് വല്ലപ്പോഴും മാത്രം കണ്ടിരുന്ന വന്യമൃഗങ്ങൾ ഇന്ന് ഞങ്ങളുടെ കുഞ്ഞുങ്ങൾ കളിക്കുന്നിടത്ത് നിത്യേനയുള്ള ഭീതിയായി മാറിയിരിക്കുന്നു.",
          "ഓരോ തവണയും കുടുംബാംഗങ്ങൾ ജോലിക്കോ സ്കൂളിലോ പോകുമ്പോൾ ഞങ്ങളുടെ നെഞ്ചിടിക്കുന്നു. സ്വാഭാവിക കാരണങ്ങളാലല്ല, മറിച്ച് മനുഷ്യനിർമ്മിതമായ ഈ വന്യജീവി പ്രതിസന്ധിയിലാണ് ഞങ്ങൾ അമ്മമാരെയും അച്ഛന്മാരെയും സഹോദരങ്ങളെയും സംസ്കരിച്ചത്. നിശ്ശബ്ദരായ ഇരകളാകാൻ ഞങ്ങൾ വിസമ്മതിക്കുന്നു. ഇന്ന് ഗൂഡലൂർ ഒരൊറ്റ ശബ്ദത്തിൽ സംസാരിക്കുന്നു."
        ]
      },
      {
        part: "ഭാഗം II",
        title: "കഠിനമായ സത്യം — നാം എന്തിനാണ് മരിക്കുന്നത്?",
        content: [
          "ഞങ്ങളുടെ വേദന കേവല ഭയത്തിൽ നിന്നല്ല, വ്യവസ്ഥാപിതമായ അവഗണനയിൽ നിന്നും കുടുങ്ങിയ യാഥാർത്ഥ്യങ്ങളിൽ നിന്നും ഉടലെടുത്തതാണ്. 'ദി ഹിന്ദു' (The Hindu) ഉൾപ്പെടെയുള്ള പ്രമുഖ മാധ്യമങ്ങളുടെ അന്വേഷണങ്ങളും വിദഗ്ദ്ധ പഠനങ്ങളും ഈ ദുരന്തത്തിന്റെ യഥാർത്ഥ കാരണങ്ങൾ വെളിപ്പെടുത്തുന്നു:"
        ],
        highlights: [
          {
            heading: "തടസ്സപ്പെടുത്തിയ 11 ആനപ്പാതകൾ",
            description: "ചരിത്രപരമായി, മുതുമല കടുവാ സങ്കേതത്തെ വയനാടും നിലമ്പൂറുമായി ബന്ധിപ്പിക്കുന്ന ഒരു സീസണൽ ഇടനാഴി മാത്രമായിരുന്നു ഗൂഡലൂർ. ഇന്ന്, കടക്കാനാവാത്ത വേലികളും കോൺക്രീറ്റ് മതിലുകളും അനധികൃത വാണിജ്യ കയ്യേറ്റങ്ങളും 11 പരമ്പരാഗത ആനപ്പാതകളെയും പൂർണ്ണമായി തടസ്സപ്പെടുത്തിയിരിക്കുന്നു.",
            badge: "11 ഇടനാഴികൾ അടച്ചു",
            iconType: "corridor"
          },
          {
            heading: "'ട്രാപ്പ് എഫക്റ്റ്' (The Trap Effect)",
            description: "എല്ലാ വശത്തുനിന്നും സ്വകാര്യ മതിലുകളാൽ ചുറ്റപ്പെട്ടതോടെ, ആനകൾക്ക് അവയുടെ സ്വാഭാവിക ദേശാടന സ്വഭാവം നഷ്ടപ്പെട്ടു. അവ ഞങ്ങളുടെ ചെറിയ ലേബർ ലൈനുകൾക്കും മുറ്റങ്ങൾക്കും തൊട്ടടുത്തുള്ള ചെറിയ പ്രദേശങ്ങളിൽ കുടുങ്ങിക്കിടക്കുന്ന, കടുത്ത സമ്മർദ്ദത്തിലായ സ്ഥിരവാസികളായി മാറി.",
            badge: "ട്രാപ്പ് എഫക്റ്റ്",
            iconType: "trap"
          },
          {
            heading: "ഉദ്യോഗസ്ഥരുടെ അന്ധത",
            description: "പ്രൊജക്റ്റ് ടൈഗറിന് കീഴിൽ കോടിക്കണക്കിന് രൂപ സംരക്ഷണ ഫണ്ടുകളായി ഒഴുകിയെത്തുമ്പോഴും, ഈ ബജറ്റുകൾ വനമേഖലകൾക്കുള്ളിൽ മാത്രമായി നിയമപരമായി പരിമിതപ്പെടുത്തിയിരിക്കുന്നു. ഗൂഡലൂരിലെ ജനവാസ മേഖലകൾ ഒരു ഏജൻസിയും മനുഷ്യജീവിതത്തിന് ഉത്തരവാദിത്തം ഏൽക്കാത്ത അനാഥ ഭൂമിയായി മാറുന്നു.",
            badge: "ഭരണപരമായ അന്ധത",
            iconType: "apathy"
          }
        ]
      },
      {
        part: "ഭാഗം III",
        title: "ഇപ്പോൾ ചെയ്യേണ്ട കാര്യങ്ങൾ (ഇനി ന്യായീകരണങ്ങളില്ല)",
        content: [
          "സുരക്ഷ എന്നത് ഭരണഘടനാപരമായ അവകാശമാണ്, അല്ലാതെ ഭരണാധികാരികളുടെ ഔദാര്യമല്ല. വിട്ടുവീഴ്ചയില്ലാത്ത അടിയന്തര നടപടി ഞങ്ങൾ ആവശ്യപ്പെടുന്നു:"
        ],
        highlights: [
          {
            heading: "തടസ്സങ്ങൾ ഉപാധികളില്ലാതെ നീക്കം ചെയ്യുക",
            description: "ഗൂഡലൂരിലും ഓവേലിയിലുമുള്ള 11 ചരിത്രപ്രസിദ്ധമായ വന്യജീവി ഇടനാടുകൾ അടച്ചുപൂട്ടിയ അനധികൃത മതിലുകളും തടസ്സങ്ങളും വേലികളും പൊളിച്ചുമാറ്റുക.",
            badge: "അടിയന്തര നടപടി 1",
            iconType: "corridor"
          },
          {
            heading: "AI അടിസ്ഥാനമാക്കിയുള്ള മുന്നറിയിപ്പ് സംവിധാനങ്ങൾ",
            description: "വന്യമൃഗങ്ങൾ ജനവാസ മേഖലകളിൽ എത്തുന്നതിന് മുൻപ് തന്നെ ഗ്രാമങ്ങൾക്ക് മുന്നറിയിപ്പ് നൽകാൻ റിയൽ-ടൈം തെർമൽ ക്യാമറകളും ശബ്ദ സെൻസറുകളും ഓട്ടോമേറ്റഡ് മെസ്സേജ് അലേർട്ടുകളും വിന്യസിക്കുക.",
            badge: "അടിയന്തര നടപടി 2",
            iconType: "ai"
          },
          {
            heading: "വികേന്ദ്രീകൃത 24/7 റാപ്പിഡ് റെസ്പോൺസ് ടീമുകൾ (RRTs)",
            description: "പന്തല്ലൂർ, ചേരമ്പാടി, ഓവേലി തുടങ്ങിയ സംഘർഷബാധിത പ്രദേശങ്ങളിൽ മണിക്കൂറുകൾ അകലെയല്ലാതെ മയക്കുവെടി സാമഗ്രികളും പ്രത്യേക വാഹനങ്ങളുമുള്ള സജ്ജമായ എമർജൻസി യൂണിറ്റുകൾ നേരിട്ട് വിന്യസിക്കുക.",
            badge: "അടിയന്തര നടപടി 3",
            iconType: "rrt"
          },
          {
            heading: "അപകടകരമായ കാടുകൾ വെട്ടിമാറ്റുക",
            description: "നമ്മുടെ വീടുകൾക്ക് തൊട്ടടുത്ത് പുലികളും കടുവകളും പതുങ്ങിയിരിക്കാൻ സഹായിക്കുന്ന ലണ്ടാന (Lantana) കാടുകളും ഉപേക്ഷിക്കപ്പെട്ട തോട്ടങ്ങളിലെ കാടുകളും ഉടൻ നീക്കം ചെയ്യുക.",
            badge: "അടിയന്തര നടപടി 4",
            iconType: "flora"
          }
        ]
      }
    ],
    callToAction: {
      title: "ആഹ്വാനം — ഒറ്റക്കെട്ടായി നിൽക്കുക",
      slogans: [
        "മനുഷ്യജീവൻ സംരക്ഷിക്കുക!",
        "നമ്മുടെ വീടുകൾ സുരക്ഷിതമാക്കുക!",
        "ഇടനാടുകളിലെ അനധികൃത കയ്യേറ്റങ്ങൾ തകർക്കുക!"
      ],
      closing: "ജയ് ഹിന്ദ്. ഗൂഡലൂർ ജനത വാഴട്ടെ! 🇮🇳"
    }
  },

  kn: {
    title: "ಗೂಡಲೂರಿನ ಮೂಕ ರೋದನ — ನಮ್ಮ ಮನೆಗಳು ತೆರೆದ ಜೈಲುಗಳಾಗಿ ಮಾರ್ಪಟ್ಟಿವೆ",
    subtitle: "ನಾವು ಯಾವುದೇ ಭಿಕ್ಷೆಯನ್ನು ಕೇಳುತ್ತಿಲ್ಲ. ಕತ್ತಲೆಗೆ ಹೆದರದೆ ನಮ್ಮದೇ ನೆಲದಲ್ಲಿ ಉಸಿರಾಡುವ, ಮಲಗುವ ಮತ್ತು ನಡೆಯುವ ಬದುಕುವ ಹಕ್ಕನ್ನು ಮಾತ್ರ ಕೇಳುತ್ತಿದ್ದೇವೆ.",
    badge: "ಅಧಿಕೃತ ನಾಗರಿಕ ಪ್ರಣಾಳಿಕೆ",
    proclamation: "ಜಗತ್ತಿಗೆ ಗೂಡಲೂರು ಮಂಜು ಮತ್ತು ಚಹಾ ತೋಟಗಳ ಸುಂದರ ಸ್ವರ್ಗ. ಆದರೆ ನಮಗೆ, ಇದು ಅಂತ್ಯವಿಲ್ಲದ ಸಾವಿನ ಭಯದ ಭೂಮಿ.",
    sections: [
      {
        part: "ಭಾಗ I",
        content: [
          "ನಮ್ಮ ಕುಟುಂಬಗಳ ತಲೆಮಾರುಗಳು ಇಲ್ಲಿ ವಾಸಿಸಿವೆ, ಈ ಬೆಟ್ಟಗಳನ್ನು ಪೋಷಿಸಿವೆ, ತೆರಿಗೆ ಪಾವತಿಸಿವೆ ಮತ್ತು ಕಾನೂನನ್ನು ಗೌರವಿಸಿವೆ. ಆದರೆ ಇಂದು ನಮ್ಮ ಮನೆ ಬಾಗಿಲುಗಳೇ ತೆರೆದ ಬಂಧನ ವಲಯಗಳಾಗಿ ಬದಲಾಗಿವೆ. ಹಿಂದೆ ಲಾರಿಸ್ಟನ್ (ಓವೆಲಿ) ಮತ್ತು ಚೆಂಬಾಡಿಯಂತಹ ದೂರದ ತೋಟಗಳ ಒಳಗೆ ಮಾತ್ರ ಅಪರೂಪಕ್ಕೆ ಕಾಣುತ್ತಿದ್ದ ವನ್ಯಜೀವಿಗಳು, ಇಂದು ನಮ್ಮ ಮಕ್ಕಳು ಆಟವಾಡುವ ಸ್ಥಳಗಳಲ್ಲೇ ನಿತ್ಯವೂ ಎದೆಬಡಿತ ನಿಲ್ಲಿಸುವ ಅಪಾಯವಾಗಿ ನಿಂತಿವೆ.",
          "ಕುಟುಂಬದ ಸದಸ್ಯರು ಕೆಲಸಕ್ಕೆ ಅಥವಾ ಶಾಲೆಗೆ ಹೊರಟಾಗಲೆಲ್ಲಾ ನಮ್ಮ ಹೃದಯ ಬಡಿದುಕೊಳ್ಳುತ್ತದೆ. ನೈಸರ್ಗಿಕ ಕಾರಣಗಳಿಂದಲ್ಲ, ಮಾನವ ನಿರ್ಮಿತ ವನ್ಯಜೀವಿ ಬಿಕ್ಕಟ್ಟಿನಿಂದಾಗಿ ನಾವು ತಾಯಂದಿರು, ತಂದೆಯರು ಮತ್ತು ಸಹೋದರರನ್ನು ಕಳೆದುಕೊಂಡು ಮಣ್ಣು ಮಾಡಿದ್ದೇವೆ. ಮೂಕ ಬಲಿಪಶುಗಳಾಗಲು ನಾವು ಇನ್ನು ಒಪ್ಪುವುದಿಲ್ಲ. ಇಂದು ಗೂಡಲೂರು ಒಂದೇ ಧ್ವನಿಯಲ್ಲಿ ಮಾತನಾಡುತ್ತದೆ."
        ]
      },
      {
        part: "ಭಾಗ II",
        title: "ಕಠೋರ ಸತ್ಯ — ನಾವೇಕೆ ಸಾಯುತ್ತಿದ್ದೇವೆ?",
        content: [
          "ನಮ್ಮ ನೋವು ಕೇವಲ ಭಯದಿಂದ ಹುಟ್ಟಿದ್ದಲ್ಲ; ವ್ಯವಸ್ಥಿತ ನಿರ್ಲಕ್ಷ್ಯ ಮತ್ತು ಸಿಲುಕಿಕೊಂಡ ವಾಸ್ತವಗಳಿಂದ ಹುಟ್ಟಿದೆ. 'ದಿ ಹಿಂದೂ' (The Hindu) ಸೇರಿದಂತೆ ಪ್ರಮುಖ ಮಾಧ್ಯಮಗಳ ತನಿಖೆಗಳು ಮತ್ತು ತಜ್ಞರ ವರದಿಗಳು ಈ ದುರಂತದ ನಿಜವಾದ ಕಾರಣಗಳನ್ನು ಬಯಲಿಗೆಳೆದಿವೆ:"
        ],
        highlights: [
          {
            heading: "ಮುಚ್ಚಲ್ಪಟ್ಟ 11 ವನ್ಯಜೀವಿ ಕಾರಿಡಾರ್‌ಗಳು",
            description: "ಐತಿಹಾಸಿಕವಾಗಿ, ಗೂಡಲೂರು ಮುಡುಮಲೈ ಹುಲಿ ಸಂರಕ್ಷಿತ ಪ್ರದೇಶವನ್ನು ವಯನಾಡು ಮತ್ತು ನಿಲಂಬೂರ್ ಜೊತೆ ಸಂಪರ್ಕಿಸುವ ಕಾಲೋಚಿತ ಕಾರಿಡಾರ್ ಆಗಿತ್ತು. ಇಂದು, ಅಭೇದ್ಯ ಬೇಲಿಗಳು, ಕಾಂಕ್ರೀಟ್ ಗೋಡೆಗಳು ಮತ್ತು ಅನಧಿಕೃತ ವಾಣಿಜ್ಯ ಒತ್ತುವರಿಗಳು ಎಲ್ಲಾ 11 ಸಾಂಪ್ರದಾಯಿಕ ಆನೆ ಕಾರಿಡಾರ್‌ಗಳನ್ನು ಉಸಿರುಗಟ್ಟಿಸಿ ಮುಚ್ಚಿವೆ.",
            badge: "11 ಕಾರಿಡಾರ್‌ಗಳು ಬಂದ್",
            iconType: "corridor"
          },
          {
            heading: "'ಟ್ರ್ಯಾಪ್ ಎಫೆಕ್ಟ್' (The Trap Effect)",
            description: "ಎಲ್ಲಾ ಕಡೆಗಳಿಂದ ಖಾಸಗಿ ಗೋಡೆಗಳಿಂದ ಸುತ್ತುವರಿದ ಕಾರಣ, ಪ್ರಾಣಿಗಳು ತಮ್ಮ ನೈಸರ್ಗಿಕ ವಲಸೆಯ ಪ್ರವೃತ್ತಿಯನ್ನು ಕಳೆದುಕೊಂಡಿವೆ. ಅವು ನಮ್ಮ ಪುಟ್ಟ ಕಾರ್ಮಿಕ ಸಾಲುಗಳು ಮತ್ತು ಹಿತ್ತಲುಗಳ ಪಕ್ಕದಲ್ಲಿಯೇ ಸಿಕ್ಕಿಬಿದ್ದ ಶಾಶ್ವತ, ತೀವ್ರ ಒತ್ತಡದ ವಾಸಿ ಪ್ರಾಣಿಗಳಾಗಿ ಮಾರ್ಪಟ್ಟಿವೆ.",
            badge: "ಟ್ರ್ಯಾಪ್ ಎಫೆಕ್ಟ್",
            iconType: "trap"
          },
          {
            heading: "ಅಧಿಕಾರಶಾಹಿಯ ಕುರುಡುತನ",
            description: "ಪ್ರಾಜೆಕ್ಟ್ ಟೈಗರ್ ಅಡಿಯಲ್ಲಿ ಕೋಟ್ಯಂತರ ರೂಪಾಯಿಗಳ ಸಂರಕ್ಷಣಾ ನಿಧಿ ಹರಿದುಬಂದರೂ, ಆ ಬಜೆಟ್‌ಗಳು ಕೇವಲ ಅರಣ್ಯದ ಒಳಗೆ ಮಾತ್ರ ಬಳಕೆಯಾಗುವಂತೆ ನಿರ್ಬಂಧಿಸಲ್ಪಟ್ಟಿವೆ. ಗೂಡಲೂರಿನ ಜನವಸತಿ ಗಡಿ ಪ್ರದೇಶಗಳು ಯಾವುದೇ ಇಲಾಖೆಯೂ ಮಾನವ ಜೀವಕ್ಕೆ ಜವಾಬ್ದಾರಿ ತೆಗೆದುಕೊಳ್ಳದ ಆಡಳಿತಾತ್ಮಕ ಅನಾಥ ಭೂಮಿಯಾಗಿವೆ.",
            badge: "ಆಡಳಿತಾತ್ಮಕ ನಿರ್ಲಕ್ಷ್ಯ",
            iconType: "apathy"
          }
        ]
      },
      {
        part: "ಭಾಗ III",
        title: "ಈಗಲೇ ಏನು ಮಾಡಬೇಕು (ಇನ್ನು ಸಬೂಬುಗಳಿಲ್ಲ)",
        content: [
          "ಸುರಕ್ಷತೆ ಎಂಬುದು ಸಂವಿಧಾನಬದ್ಧ ಹಕ್ಕು, ಆಡಳಿತದ ಉಪಕಾರವಲ್ಲ. ರಾಜಿ ಇಲ್ಲದ ತಕ್ಷಣದ ಕ್ರಮವನ್ನು ನಾವು ಒತ್ತಾಯಿಸುತ್ತೇವೆ:"
        ],
        highlights: [
          {
            heading: "ತಡೆಗೋಡೆಗಳನ್ನು ಬೇಷರತ್ತಾಗಿ ತೆರವುಗೊಳಿಸಿ",
            description: "ಗೂಡಲೂರು ಮತ್ತು ಓವೆಲಿಯುದ್ದಕ್ಕೂ 11 ಐತಿಹಾಸಿಕ ವನ್ಯಜೀವಿ ಕಾರಿಡಾರ್‌ಗಳನ್ನು ನಿರ್ಬಂಧಿಸಿರುವ ಕಾನೂನುಬಾಹಿರ ಗೋಡೆಗಳು, ತಡೆಗಳು ಮತ್ತು ಬೇಲಿಗಳನ್ನು ಧ್ವಂಸಗೊಳಿಸಿ.",
            badge: "ತಕ್ಷಣದ ಕ್ರಮ 1",
            iconType: "corridor"
          },
          {
            heading: "AI ಆಧಾರಿತ ಮುನ್ನೆಚ್ಚರಿಕೆ ವ್ಯವಸ್ಥೆಗಳು",
            description: "ವನ್ಯಜೀವಿಗಳು ಜನವಸತಿ ಪ್ರದೇಶಗಳಿಗೆ ಪ್ರವೇಶಿಸುವ ಮುನ್ನವೇ ಜನರಿಗೆ ಎಚ್ಚರಿಕೆ ನೀಡಲು ನೈಜ-ಸಮಯದ ಥರ್ಮಲ್ ಕ್ಯಾಮೆರಾಗಳು, ಅಕೌಸ್ಟಿಕ್ ಸೆನ್ಸರ್‌ಗಳು ಮತ್ತು ಸ್ವಯಂಚಾಲಿತ ಸಂದೇಶ ಎಚ್ಚರಿಕೆಗಳನ್ನು ನಿಯೋಜಿಸಿ.",
            badge: "ತಕ್ಷಣದ ಕ್ರಮ 2",
            iconType: "ai"
          },
          {
            heading: "ವಿಕೇಂದ್ರೀಕೃತ 24/7 ಕ್ಷಿಪ್ರ ಸ್ಪಂದನಾ ತಂಡಗಳು (RRTs)",
            description: "ಪಂದಲೂರು, ಚೆಂಬಾಡಿ ಮತ್ತು ಓವೆಲಿಯಂತಹ ಹೈ-ಕಾನ್ಫ್ಲಿಕ್ಟ್ ಪ್ರದೇಶಗಳಲ್ಲಿ ಪ್ರಾಣಿಗಳಿಗೆ ಮದ್ದು ನೀಡುವ ಸಾಧನಗಳು ಮತ್ತು ವಾಹನಗಳೊಂದಿಗೆ ಸಜ್ಜಾದ ತುರ್ತು ರಕ್ಷಣಾ ಘಟಕಗಳನ್ನು ನೇರವಾಗಿ ಸ್ಥಾಪಿಸಿ.",
            badge: "ತಕ್ಷಣದ ಕ್ರಮ 3",
            iconType: "rrt"
          },
          {
            heading: "ಮಾರಣಾಂತಿಕ ಕಳೆ ಗಿಡಗಳ ನಿರ್ಮೂಲನೆ",
            description: "ನಮ್ಮ ಮನೆಗಳ ಪಕ್ಕದಲ್ಲಿಯೇ ಚಿರತೆಗಳು ಮತ್ತು ಹುಲಿಗಳು ಅಡಗಿಕೊಳ್ಳಲು ಆಶ್ರಯ ನೀಡುವ ದಟ್ಟ ಲಂಟಾನಾ (Lantana) ಗಿಡಗಳು ಮತ್ತು ಮುಳ್ಳುಪೊದೆಗಳನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತೆರವುಗೊಳಿಸಿ.",
            badge: "ತಕ್ಷಣದ ಕ್ರಮ 4",
            iconType: "flora"
          }
        ]
      }
    ],
    callToAction: {
      title: "ಕರೆಯೇಲೆ — ಒಂದಾಗಿ ನಿಲ್ಲಿ",
      slogans: [
        "ಮಾನವ ಜೀವವನ್ನು ರಕ್ಷಿಸಿ!",
        "ನಮ್ಮ ಮನೆಗಳನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ!",
        "ಕಾರಿಡಾರ್‌ಗಳಲ್ಲಿನ ಕಾನೂನುಬಾಹಿರ ಒತ್ತುವರಿಗಳನ್ನು ತೆರವುಗೊಳಿಸಿ!"
      ],
      closing: "ಜೈ ಹಿಂದ್. ಗೂಡಲೂರು ಜನತೆ ಚಿರಾಯುವಾಗಲಿ! 🇮🇳"
    }
  }
};
