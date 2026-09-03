/**
 * Voice of Gudalur — canonical citizen-petition seed data.
 *
 * The SERVER owns seeding: on first read, an empty `petitions` table is
 * populated from here. This replaces the old client-driven Supabase seeding,
 * which exposed an upsert path and could drift from the canonical demands.
 */
export interface SeedPetition {
  id: string;
  title: string;
  title_ta: string;
  problem: string;
  problem_ta: string;
  demand: string;
  demand_ta: string;
  target_authority: string;
  target_authority_ta: string;
  evidence_summary: string;
  evidence_summary_ta?: string;
  support_count: number;
  supporters_json: unknown[];
  target_signatures?: number | null;
  deadline?: string | null;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const SEED_PETITIONS: SeedPetition[] = [
  {
    id: 'pet_01_tiger_wildlife_fence',
    title: "Protect Our Families - Demand Immediate AI Thermal Early Warning & Wildlife Fencing in O'Valley & Gudalur",
    title_ta: "எங்கள் குடும்பங்களைப் பாதுகாக்க - ஓ'வேலி & கூடலூரில் உடனடி AI எச்சரிக்கை & வனவிலங்கு வேலி அமைத்தல்",
    problem: "Frequent tiger incursions and elephant herd movements into residential hamlets, estate worker lines, and schools in O'Valley, SS Nagar, Cherambadi, and Thorapalli have resulted in fatal human encounters, severe livestock loss, and continuous fear among plantation workers.",
    problem_ta: "ஓ'வேலி, எஸ்.எஸ். நகர், சேரம்பாடி மற்றும் தோரப்பள்ளி பகுதிகளில் அடிக்கடி நிகழும் புலி மற்றும் யானை தாக்குதல்களால் மனித உயிரிழப்புகள், கால்நடை இழப்புகள் மற்றும் பொதுமக்கள் மத்தியில் தீவிர அச்சம் நிலவுகிறது.",
    demand: '1. Deploy AI-powered Thermal Infrared Early Warning Cameras along all forest-plantation fringes.\n2. Erect and maintain energized solar fencing along vulnerable settlements.\n3. Increase Rapid Response Team (RRT) field patrol vehicles from 2 to 8 with specialized tranquilizer veterinarians stationed permanently at Gudalur.',
    demand_ta: '1. வன எல்லையோர குடியிருப்புகளில் AI அகச்சிவப்பு தானியங்கி எச்சரிக்கை கேமராக்கள் அமைத்தல்.\n2. தகுந்த பராமரிப்புடன் கூடிய சூரிய மின்வேலி அமைத்தல்.\n3. கூடலூரில் நிரந்தர கால்நடை மருத்துவருடன் கூடிய வனத்துறை அதிரடிப்படை வாகனங்களை 8-ஆக உயர்த்துதல்.',
    target_authority: 'Chief Wildlife Warden (Tamil Nadu) & Principal Chief Conservator of Forests, Chennai',
    target_authority_ta: 'முதன்மை தலைமை வனப் பாதுகாவலர் & தலைமை வனவிலங்கு காப்பாளர், சென்னை',
    evidence_summary: 'Over 14 human casualties and 40+ livestock incidents recorded in the western slopes over 24 months.',
    support_count: 0,
    supporters_json: [],
    status: 'OPEN',
    created_by: 'civic_council_gudalur',
    created_by_name: "Gudalur People's Wildlife Safety Action Forum",
    created_at: daysAgo(14),
  },
  {
    id: 'pet_02_multispecialty_hospital',
    title: 'Stop Preventable Deaths - Demand 24x7 Emergency Trauma Care & Antivenom Center for Gudalur',
    title_ta: 'தடுக்கக்கூடிய இறப்புகளை நிறுத்த - கூடலூரில் 24x7 அவசர சிகிச்சை & விஷ மாற்று மையம் அமைக்கக் கோருங்கள்',
    problem: 'Gudalur Taluk GH lacks a dedicated CT scan, round-the-clock neurotrauma surgeons, and intensive ICU ventilators. Critically injured victims of wildlife attacks, road accidents, and snakebites must travel 75 km to Ooty or 110 km to Kozhikode Medical College, losing precious golden hour treatment.',
    problem_ta: 'கூடலூர் அரசு மருத்துவமனையில் 24 மணி நேர நரம்பியல் அறுவை சிகிச்சை, தீவிர சிகிச்சை பிரிவு (ICU) இல்லாததால் விபத்து மற்றும் வனவிலங்கு தாக்குதலுக்குள்ளாகும் நோயாளிகள் 110 கி.மீ தூரமுள்ள கோழிக்கோடு அல்லது ஊட்டிக்கு கொண்டு செல்லப்படும் வழியிலேயே உயிரிழக்கின்றனர்.',
    demand: 'Upgrade Gudalur Government Hospital into a 250-bed District Multispecialty Center with Permanent Wildlife Trauma, Cardiology, and Neuro-Trauma Wings.',
    demand_ta: 'கூடலூர் அரசு மருத்துவமனையை 250 படுக்கைகள் கொண்ட மாவட்ட பன்னோக்கு அவசர சிகிச்சை மருத்துவமனையாக தரம் உயர்த்துதல்.',
    target_authority: 'Minister for Health and Family Welfare & District Collector, The Nilgiris',
    target_authority_ta: 'மக்கள் நல்வாழ்வுத்துறை அமைச்சர், தமிழ்நாடு அரசு',
    evidence_summary: 'Average ambulance travel time to tertiary care exceeds 2.5 hours through ghat routes.',
    support_count: 0,
    supporters_json: [],
    status: 'IN_GOVT_REVIEW',
    created_by: 'gudalur_doctors_forum',
    created_by_name: 'Gudalur Citizens for Healthcare Justice',
    created_at: daysAgo(30),
  },
  {
    id: 'pet_03_section17_janmam_rights',
    title: 'Secure Our Land Rights - Expedite Patta Settlement for Smallholder Farmers in Section 17 Lands',
    title_ta: 'எங்கள் நில உரிமையைப் பாதுகாக்க - பிரிவு 17 நிலங்களில் சிறு விவசாயிகளுக்கு விரைவாக பட்டா வழங்கக் கோருங்கள்',
    problem: 'Decades of unresolved Gudalur Janmam Abolition Act (Section 17) proceedings have left thousands of smallholder tea farmers and traditional residents unable to secure housing bank loans, agricultural subsidies, or legal land transfers.',
    problem_ta: 'நீண்டகாலமாக நிலுவையில் உள்ள ஜன்மம் நில பிரச்சனைகளால் ஆயிரக்கணக்கான சிறு தேயிலை விவசாயிகள் மற்றும் எளிய மக்கள் வங்கிக் கடன் மற்றும் அரசின் மானியங்களை பெற முடியாமல் தவிக்கின்றனர்.',
    demand: 'Convene Special High-Power Settlement Commission to grant title ownership deeds to all genuine residents and smallholders holding under 5 acres.',
    demand_ta: '5 ஏக்கருக்கும் குறைவான நிலம் வைத்துள்ள உண்மையான சிறு விவசாயிகளுக்கு நிரந்தர நில உரிமை பட்டா வழங்க சிறப்பு ஆணையம் அமைத்தல்.',
    target_authority: 'Revenue and Disaster Management Department, Government of Tamil Nadu',
    target_authority_ta: 'வருவாய் மற்றும் பேரிடர் மேலாண்மை துறை, சென்னை',
    evidence_summary: 'Affects over 53,000 families across Gudalur and Nelliyalam municipal boundaries.',
    support_count: 0,
    supporters_json: [],
    status: 'OPEN',
    created_by: 'small_tea_growers_federation',
    created_by_name: 'Nilgiris Small Farmers & Citizens Janmam Rights Committee',
    created_at: daysAgo(45),
  }
];