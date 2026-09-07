/**
 * aiPresenter.ts - Living Intelligence for Voice of Gudalur.
 * Keyless: builds personalized guidance from LIVE app data (petition
 * totals, leaderboard, recent signers, media, wildlife) plus the user's
 * own state/profile/activity. Every data source is fail-safe: an outage
 * in one never blocks the assistant.
 */
import type { Language } from '../context/LanguageContext';
import { petitionApi, mediaApi, wildlifeApi } from './api';

export interface PresenterContext {
  currentPage: string;
  language: Language;
  isRegistered: boolean;
  hasSigned: boolean;
  hasShared: boolean;
  totalSignatures: number;
  mediaCount: number;
  profile?: { name?: string; gudalurId?: string; localityName?: string; pincode?: string } | null;
}

export interface PresenterResponse {
  text: string;
  action?: string;
}

/** Raw live intel the assistant can talk about. Always defined, safe defaults. */
export interface LiveIntel {
  total: number;
  places: Array<{ place: string; count: number }>;
  recent: Array<{ name: string; village?: string; batchNo?: number | null; signedAt?: string }>;
  mediaCount: number;
  wildlifeCount: number;
}

// ---------------------------------------------------------------------------
// Activity tracker - tiny session log (never throws, never blocks)
// ---------------------------------------------------------------------------

const ACTIVITY_KEY = 'vog_ai_activity';

function readActivity(): Array<{ k: string; t: number }> {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const arr = raw ? (JSON.parse(raw) as Array<{ k: string; t: number }>) : [];
    return arr.filter((it) => typeof it?.k === 'string' && typeof it?.t === 'number');
  } catch {
    return [];
  }
}

function logActivity(kind: string): void {
  try {
    const arr = readActivity();
    arr.push({ k: kind, t: Date.now() });
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(arr.slice(-60)));
  } catch {
    /* storage may be private - never throw */
  }
}

function logVisit(page: string): void {
  if (page) logActivity(`visit:${page}`);
}

function countActivityInWindow(kind: string, ms: number): number {
  const now = Date.now();
  return readActivity().filter((it) => it.k === kind && now - it.t < ms).length;
}

// ---------------------------------------------------------------------------
// Live data - parallel, fail-safe, race-capped at 2.5s per source
// ---------------------------------------------------------------------------

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const id = setTimeout(() => resolve(null), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }).catch(() => { clearTimeout(id); resolve(null); });
  });
}

async function fetchIntel(): Promise<LiveIntel> {
  const intel: LiveIntel = { total: 0, places: [], recent: [], mediaCount: 0, wildlifeCount: 0 };
  const [stats, media, wild] = await Promise.all([
    withTimeout(petitionApi.signStats().catch(() => null), 2500),
    withTimeout(mediaApi.list().catch(() => null), 2500),
    withTimeout(wildlifeApi.incidents().catch(() => null), 2500),
  ]);
  if (stats) {
    intel.total = Number(stats.total) || 0;
    intel.places = (stats.places || []).slice(0, 5);
    const ledger = await withTimeout(petitionApi.ledger().catch(() => null), 2500);
    if (ledger && Array.isArray(ledger.signs)) {
      intel.recent = ledger.signs.slice(0, 5).map((s) => ({
        name: s.name || 'A supporter',
        village: s.village,
        batchNo: s.batchNo,
        signedAt: s.signedAt,
      }));
    }
  }
  if (Array.isArray(media)) intel.mediaCount = media.length;
  if (wild && Array.isArray(wild.incidents)) intel.wildlifeCount = wild.incidents.length;
  return intel;
}

// ---------------------------------------------------------------------------
// Localization - living guidance templates (real numbers fill the {slots})
// ---------------------------------------------------------------------------

const fmt = (n: number): string => {
  try { return n.toLocaleString('en-IN'); } catch { return String(n); }
};

function topPlace(places: LiveIntel['places']): string {
  if (!places.length) return '';
  const p = places[0];
  return `| ${p.place}: ${fmt(p.count)}`;
}

function firstName(profile: PresenterContext['profile']): string {
  const n = (profile?.name || '').trim();
  return n ? ` ${n.split(/\s+/)[0]}` : '';
}

const L: Record<Language, {
  new: string; reg: string; signed: string; done: string;
  page: Record<string, string>;
  live: string;
}> = {
  en: {
    new: 'Namaste! {total} supporters have signed the Right to Life petition{top}. Register in 10 seconds (no OTP) and add your voice.',
    reg: 'Welcome{name}! You hold a Gudalur ID but your signature is still missing - {total} of us have signed. It takes 10 seconds.',
    signed: 'Your support is on the public ledger, {name}. We are {total} strong now{top}. Share a poster to carry the voice further.',
    done: 'You signed and shared - the movement breathes because of you{name}. {wild} wildlife reports keep our corridors watched.',
    page: {
      about: 'This page is our why: coexistence, not conflict - elephants, tigers and people, each with a safe lane.',
      corridors: 'These are the closed elephant corridors. Knowing them keeps night drives safe for both sides.',
      sightings: 'Every sighting logged here sharpens the early-warning map for your locality.',
      'media-gallery': 'Posters and clips made by neighbours - pick one and send it to your family groups.',
      verify: 'Paste any VG- hash here and the public ledger confirms it in seconds.',
    },
    live: 'LIVE',
  },
  ta: {
    new: 'வணக்கம்! உரிமை வாழ்வு மனுவில் {total} பேர் கையெழுத்திட்டுள்ளனர்{top}. 10 வினாடியில் பதிவு செய்து உங்கள் குரலையும் சேருங்கள்.',
    reg: 'வரவேற்கிறோம்{name}! உங்களிடம் கூடலூர் ஐடி உண்டு, ஆனால் கையெழுத்து மட்டும் மீதம் - {total} பேர் கையெழுத்திட்டுள்ளனர். 10 வினாடி மட்டுமே.',
    signed: 'உங்கள் ஆதரவு பொது பதிவேட்டில் பதிவாகியது, {name}. இப்போது நாம் {total} பேர்{top}. குரலை மேலும் பரப்ப ஒரு போஸ்டரைப் பகிருங்கள்.',
    done: 'நீங்கள் கையெழுத்திட்டு பகிர்ந்துவிட்டீர்கள்{name} - இயக்கம் உயிருடன் இருப்பது உங்களால். {wild} வனவிலங்கு அறிக்கைகள் வழித்தடங்களை கண்காணிக்கின்றன.',
    page: {
      about: 'இது நமது நோக்கம்: மோதல் அல்ல, சகவாழ்வு - யானை, சிறுத்தை, மனிதன் ஒவ்வொருவருக்கும் பாதுகாப்பான பாதை.',
      corridors: 'இவை மூடப்பட்ட யானை வழித்தடங்கள். இரவு பயணத்தில் இரு தரப்பினருக்கும் இது பாதுகாப்பு.',
      sightings: 'இங்கே பதிவாகும் ஒவ்வொரு நடமாட்டமும் உங்கள் பகுதிக்கான முன்னெச்சரிக்கை வரைபடத்தை கூர்மையாக்குகிறது.',
      'media-gallery': 'அக்கம்பக்கத்தினர் உருவாக்கிய போஸ்டர்கள் - ஒன்றைத் தேர்ந்து குடும்ப குழுக்களில் பகிருங்கள்.',
      verify: 'எந்த VG- ஹாஷையும் இங்கே ஒட்டினால், பொது பதிவேடு சில வினாடிகளில் உறுதிப்படுத்தும்.',
    },
    live: 'நேரலை',
  },
  ml: {
    new: 'നമസ്കാരം! ജീവിക്കാനുള്ള അവകാശ ഹർജിയിൽ {total} പേർ ഒപ്പുവെച്ചു{top}. 10 സെക്കൻഡിൽ രജിസ്റ്റർ ചെയ്ത് നിങ്ങളുടെ ശബ്ദവും ചേർക്കൂ.',
    reg: 'സ്വാഗതം{name}! ഗൂഡല്ലൂർ ഐഡി ഉണ്ട്, ഒപ്പു മാത്രം ബാക്കി - {total} പേർ ഒപ്പുവെച്ചു. 10 സെക്കൻഡ് മതി.',
    signed: 'നിങ്ങളുടെ പിന്തുണ പൊതു രേഖയിലുണ്ട്, {name}. ഇനി നമ്മൾ {total} പേർ{top}. ശബ്ദം പരന്നു പോകാൻ ഒരു പോസ്റ്റർ ഷെയർ ചെയ്യൂ.',
    done: 'ഒപ്പും ഷെയറും കഴിഞ്ഞു{name} - പ്രസ്ഥാനം ജീവനുള്ളത് നിങ്ങളാൽ. {wild} വന്യജീവി റിപ്പോർട്ടുകൾ ഇടനാഴികൾ നിരീക്ഷിക്കുന്നു.',
    page: {
      about: 'ഇതാണ് നമ്മുടെ ലക്ഷ്യം: ഏറ്റുമുട്ടലല്ല, സഹവാസം - ആനയ്ക്കും പുലിക്കും മനുഷ്യനും സുരക്ഷിത പാത.',
      corridors: 'ഇവയാണ് അടഞ്ഞ ആനപ്പാതകൾ. രാത്രി യാത്രയിൽ ഇരുവിഭാഗത്തിനും ഇത് സുരക്ഷയാണ്.',
      sightings: 'ഇവിടെ രേഖപ്പെടുത്തുന്ന ഓരോ സാന്നിധ്യവും നിങ്ങളുടെ പ്രദേശത്തെ മുൻകൂർ മുന്നറിയിപ്പ് ഭൂപടം മെച്ചപ്പെടുത്തുന്നു.',
      'media-gallery': 'അയൽക്കാർ തയ്യാറാക്കിയ പോസ്റ്ററുകൾ - ഒന്ന് തിരഞ്ഞെടുത്ത് കുടുംബ ഗ്രൂപ്പുകളിൽ പങ്കുവെക്കൂ.',
      verify: 'ഏത് VG- ഹാഷും ഇവിടെ ഒട്ടിച്ചാൽ പൊതു രേഖ സെക്കൻഡുകൾക്കുള്ളിൽ സ്ഥിരീകരിക്കും.',
    },
    live: 'ലൈവ്',
  },
  kn: {
    new: 'ನಮಸ್ಕಾರ! ಜೀವನದ ಹಕ್ಕು ಮನವಿಗೆ {total} ಮಂದಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ{top}. 10 ಸೆಕೆಂಡಿನಲ್ಲಿ ನೋಂದಣಿ ಮಾಡಿ ನಿಮ್ಮ ಧ್ವನಿಯನ್ನೂ ಸೇರಿಸಿ.',
    reg: 'ಸ್ವಾಗತ{name}! ಗೂಡಲ್ಲೂರು ಐಡಿ ಇದೆ, ಸಹಿ ಮಾತ್ರ ಉಳಿದಿದೆ - {total} ಮಂದಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ. 10 ಸೆಕೆಂಡ್ ಸಾಕು.',
    signed: 'ನಿಮ್ಮ ಬೆಂಬಲ ಸಾರ್ವಜನಿಕ ದಾಖಲೆಯಲ್ಲಿದೆ, {name}. ಈಗ ನಾವು {total} ಮಂದಿ{top}. ಧ್ವನಿಯನ್ನು ಮುಂದೆ ಸಾಗಿಸಲು ಒಂದು ಪೋಸ್ಟರ್ ಹಂಚಿ.',
    done: 'ಸಹಿ ಮತ್ತು ಹಂಚಿಕೆ ಪೂರ್ಣ{name} - ಚಳುವಳಿ ಜೀವಂತವಾಗಿರುವುದು ನಿಮಿಂದ. {wild} ವನ್ಯಜೀವಿ ವರದಿಗಳು ಕಾರಿಡಾರ್‌ಗಳನ್ನು ಕಣ್ಗಾವಲು ಇಡುತ್ತವೆ.',
    page: {
      about: 'ಇದು ನಮ್ಮ ಉದ್ದೇಶ: ಘರ್ಷಣೆಯಲ್ಲ, ಸಹಬಾಳ್ವೆ - ಆನೆ, ಚಿರತೆ, ಮನುಷ್ಯ ಪ್ರತಿಯೊಬ್ಬರಿಗೂ ಸುರಕ್ಷಿತ ದಾರಿ.',
      corridors: 'ಇವು ಮುಚ್ಚಿದ ಆನೆ ಕಾರಿಡಾರ್‌ಗಳು. ರಾತ್ರಿ ಪ್ರಯಾಣದಲ್ಲಿ ಎರಡೂ ಕಡೆಗೆ ಇದು ಸುರಕ್ಷೆ.',
      sightings: 'ಇಲ್ಲಿ ದಾಖಲಾಗುವ ಪ್ರತಿ ಸಂಚಾರವೂ ನಿಮ್ಮ ಪ್ರದೇಶದ ಎಚ್ಚರಿಕೆ ನಕ್ಷೆಯನ್ನು ಹೆಚ್ಚು ನಿಖರವಾಗಿಸುತ್ತದೆ.',
      'media-gallery': 'ಪಕ್ಕದವರು ತಯಾರಿಸಿದ ಪೋಸ್ಟರ್‌ಗಳು - ಒಂದನ್ನು ಆಯ್ದು ಕುಟುಂಬ ಗುಂಪುಗಳಲ್ಲಿ ಹಂಚಿ.',
      verify: 'ಯಾವುದೇ VG- ಹ್ಯಾಶ್ ಅನ್ನು ಇಲ್ಲಿ ಅಂಟಿಸಿದರೆ ಸಾರ್ವಜನಿಕ ದಾಖಲೆ ಕೆಲವೇ ಸೆಕೆಂಡುಗಳಲ್ಲಿ ದೃಢೀಕರಿಸುತ್ತದೆ.',
    },
    live: 'ಲೈವ್',
  },
};

// ---------------------------------------------------------------------------
// Living guidance - composes a unique reply from state + page + live intel
// ---------------------------------------------------------------------------

function fill(t: string, ctx: PresenterContext, intel: LiveIntel): string {
  return t
    .replace('{total}', fmt(intel.total))
    .replace('{top}', topPlace(intel.places))
    .replace('{name}', firstName(ctx.profile))
    .replace('{wild}', fmt(intel.wildlifeCount))
    .replace('{media}', fmt(intel.mediaCount));
}

function pageKey(page: string): string {
  const p = (page || '').toLowerCase();
  if (p.includes('about')) return 'about';
  if (p.includes('corridor')) return 'corridors';
  if (p.includes('sighting')) return 'sightings';
  if (p.includes('gallery') || p.includes('media')) return 'media-gallery';
  if (p.includes('verify')) return 'verify';
  return '';
}

const NUDGE: Record<Language, (n: number) => string> = {
  en: (n) => `You have explored ${n} pages today - ready to make it official?`,
  ta: (n) => `இன்று நீங்கள் ${n} பக்கங்களைப் பார்த்துவிட்டீர்கள் - இப்போது உங்கள் முத்திரையைப் பதியுங்கள்.`,
  ml: (n) => `ഇന്ന് നിങ്ങൾ ${n} താളുകൾ കണ്ടു - ഇനി ഔദ്യോഗികമാക്കാം.`,
  kn: (n) => `ಇಂದು ನೀವು ${n} ಪುಟಗಳನ್ನು ನೋಡಿದ್ದೀರಿ - ಈಗ ಅಧಿಕೃತವಾಗಿ ಸೇರಿ.`,
};

function livingGuidance(ctx: PresenterContext, intel: LiveIntel): PresenterResponse {
  const s = L[ctx.language] || L.en;
  let key: 'new' | 'reg' | 'signed' | 'done';
  let action: string;
  if (!ctx.isRegistered) { key = 'new'; action = 'register'; }
  else if (!ctx.hasSigned) { key = 'reg'; action = 'sign'; }
  else if (!ctx.hasShared) { key = 'signed'; action = 'share'; }
  else { key = 'done'; action = 'sightings'; }

  let text = fill(s[key], ctx, intel);

  // Page awareness - understands where the user is in the app
  const pk = pageKey(ctx.currentPage);
  if (pk && s.page[pk] && key !== 'new') text += ' ' + s.page[pk];

  // Activity awareness - gentle nudge after the user has explored
  if (!ctx.hasSigned && !ctx.isRegistered) {
    const visits = countActivityInWindow('visit', 30 * 60 * 1000);
    if (visits >= 3) text += ' ' + NUDGE[ctx.language](visits);
  }

  // Social proof - mention the most recent real signer (English/Tamil only)
  if (!ctx.hasSigned && intel.recent.length) {
    const r = intel.recent[0];
    if (r.village) {
      if (ctx.language === 'en') text += ` Latest: ${r.name} of ${r.village}, batch ${r.batchNo ?? '-'}.`;
      else if (ctx.language === 'ta') text += ` சமீபத்தில்: ${r.village} மாண்புமிகு ${r.name}, பதிவு ${r.batchNo ?? '-'}.`;
    }
  }

  return { text, action };
}

// 60s cache - "live" without hammering the API on every page change
let intelCache: { at: number; data: LiveIntel } | null = null;
async function getIntel(): Promise<LiveIntel> {
  if (intelCache && Date.now() - intelCache.at < 60000) return intelCache.data;
  const data = await fetchIntel();
  intelCache = { at: Date.now(), data };
  return data;
}

export async function getGuidance(ctx: PresenterContext): Promise<PresenterResponse> {
  logVisit(ctx.currentPage);
  const intel = await getIntel();
  return livingGuidance(ctx, intel);
}

// ---------------------------------------------------------------------------
// Living answers - intent detection + real FAQ, grounded in live numbers
// ---------------------------------------------------------------------------

type Intent =
  | 'sign' | 'register' | 'id' | 'receipt' | 'share' | 'corridors'
  | 'sighting' | 'grievance' | 'vision' | 'night' | 'app' | 'total';

const INTENT_RE: Array<[Intent, RegExp]> = [
  ['sign', /sign|signature|கையெழுத்து|ஒப்பம்|ഒപ്പ്|ಸಹಿ/i],
  ['register', /register|join|பதிவு|രജിസ്റ്റർ|ചേരാൻ|ನೋಂದಣಿ|ಸೇರಲು/i],
  ['id', /gudalur\s*id|my card|identity|ஐடி|அட்டை|ഐഡി|കാർഡ്|ಐಡಿ|ಕಾರ್ಡ್/i],
  ['receipt', /receipt|pdf|verify|proof|ரசீது|சான்ற|சரிபார்|രശീത്|തെളിവ്|ರಸೀದಿ|ಪರಿಶೀಲನೆ/i],
  ['share', /share|poster|video|whatsapp|status|பகிர்|ஷேர்|போஸ்டர்|ഷെയർ|പങ്കിടുക|ಹಂಚು|ಪೋಸ್ಟರ್/i],
  ['corridors', /corridor|road|வழித்தட|பாதை|சாலை|ഇടനാഴി|പാത|ಕಾರಿಡಾರ್|ರಸ್ತೆ/i],
  ['sighting', /sighting|elephant|tiger|leopard|wildlife|animal|யானை|சிறுத்தை|வனவிலங்கு|மிருகம்|ആന|പുലി|വന്യജീവി|ಆನೆ|ಚಿರತೆ|ವನ್ಯಜೀವಿ/i],
  ['grievance', /grievance|complaint|pothole|water|streetlight|helpline|புகார்|குறை|குடிநீர்|விளக்கு|പരാതി|വെള്ളം|ದೂರು|ನೀರು/i],
  ['vision', /vision|why|movement|manifesto|goal|நோக்கம்|ஏன்|இயக்கம்|குறிக்கோள்|ലക്ഷ്യ|എന്തുകൊണ്ട്|ಉದ್ದೇಶ|ಯಾಕೆ|ಚಳುವಳಿ/i],
  ['night', /night|9.*6|ban|traffic|இரவு|தடை|போக்குவரத்து|രാത്രി|നിരോധനം|ರಾತ್ರಿ|ನಿಷೇಧ/i],
  ['app', /what.*(app|site|platform)|who are you|voice of gudalur|இந்த.*தளம்|நீ யார்|கூடலூரின் குரல்|ഈ ആപ്പ്|നീ ആരാണ്|ಈ ಆ್ಯಪ್|ನೀನು ಯಾರು/i],
  ['total', /how many|total|count|எத்தனை|எண்ணிக்கை|மொத்தம்|എത്ര|എണ്ണം|ಎಷ್ಟು|ಒಟ್ಟು/i],
];

function detectIntent(q: string): Intent | null {
  for (const [intent, re] of INTENT_RE) if (re.test(q)) return intent;
  return null;
}

const FAQ_EN: Record<Intent, string> = {
  sign: 'Open the petition at the top of the home page, confirm your name and locality, and sign - you get a VG- hash receipt that anyone can verify. Takes about 10 seconds.',
  register: 'Registering creates your Gudalur ID: name, phone and locality, no OTP needed. Tap the avatar in the header and pick Register - the ID appears instantly on your card.',
  id: 'Your Gudalur ID (GD-YYYY-XXXXXX) is your digital supporter identity. Tap your avatar in the header to view, download or share the card.',
  receipt: 'After signing you receive a VG- hash. Verify it anytime on the Verify page - the public ledger shows your name, village and batch number.',
  share: 'The gallery has posters and short videos made by neighbours. Share one to your family or status groups - that is how the petition crosses 1,000 signatures.',
  corridors: 'Elephant corridors stay closed for vehicles at night so herds can cross safely. The corridors page shows the live map and why each stretch is closed.',
  sighting: 'Report what you saw - place, time, herd size if visible. It feeds the early-warning map that protects both your street and the herd.',
  grievance: 'Civic issues like water, lights or roads get a tracking ID and go to the right desk. Emergency lines: Forest Rapid Response 1800 425 6100, CM Helpline 1100.',
  vision: 'Our vision is coexistence, not conflict: safe corridors for elephants and tigers, dignity for residents, and one civic voice that reaches government desks. That is the Right to Life petition.',
  night: 'Mudumalai and Bandipur roads close 9 PM to 6 AM for wildlife. Plan ghat travel before 9 PM - the corridors page shows current status.',
  app: 'I am the Voice of Gudalur guide - a living assistant for this citizen platform: the Right to Life petition, Gudalur IDs, corridor maps, wildlife sightings and grievances.',
  total: '',
};

const FAQ_TA: Record<Intent, string> = {
  sign: 'முதற்பக்கத்தில் உரிமை வாழ்வு மனுவைத் திறந்து, பெயர்-பகுதியை உறுதி செய்து கையெழுத்திடுங்கள் - யாரும் சரிபார்க்கக்கூடிய VG- ரசீது கிடைக்கும். 10 வினாடி மட்டுமே.',
  register: 'பதிவு செய்தால் கூடலூர் ஐடி கிடைக்கும்: பெயர், தொலைபேசி, பகுதி - OTP இல்லை. தலைப்பில் உள்ள உருவத்தை தட்டி Register தேர்வு செய்யுங்கள்.',
  id: 'உங்கள் கூடலூர் ஐடி (GD-YYYY-XXXXXX) டிஜிட்டல் ஆதரவாளர் அடையாளம். தலைப்பில் உள்ள உருவத்தை தட்டி பார்க்கலாம், பதிவிறக்கலாம், பகிரலாம்.',
  receipt: 'கையெழுத்துக்குப் பின் VG- ஹாஷ் கிடைக்கும். Verify பக்கத்தில் எப்போது வேண்டுமானாலும் சரிபாருங்கள் - பொது பதிவேட்டில் பெயர், ஊர், பதிவு எண் தெரியும்.',
  share: 'கேலரியில் அண்டை வீட்டினர் தயாரித்த போஸ்டர்கள், குறுமீடியங்கள் உண்டு. குடும்ப/ஸ்டேட்டஸ் குழுக்களில் பகிருங்கள் - மனு 1000 என்ற எண்ணிக்கையை நோக்கி செல்கிறது.',
  corridors: 'யானைக் கூட்டம் பாதுகாப்பாக கடக்க இரவில் வழித்தடங்கள் வாகனங்களுக்கு மூடப்படும். Corridors பக்கத்தில் நேரடி வரைபடம் உண்டு.',
  sighting: 'நீங்கள் பார்த்ததை பதிவு செய்யுங்கள் - இடம், நேரம், கூட்ட அளவு. இது உங்கள் தெருவையும், மந்தையையும் பாதுகாக்கும் முன்னெச்சரிக்கை வரைபடத்திற்கு பயன்படும்.',
  grievance: 'குடிநீர், விளக்கு, சாலை போன்ற குறைகளுக்கு கண்காணிப்பு எண் வழங்கப்பட்டு சரியான அலுவலகத்தை அடையும். அவசரம்: வனத்துறை 1800 425 6100, முதல்வர் சிறப்பு செல் 1100.',
  vision: 'நமது குறிக்கோள் சகவாழ்வு: யானை-சிறுத்தைக்கு பாதுகாப்பான வழித்தடம், மக்களுக்கு கண்ணியம், அரசிடம் ஒரே குடிமக்கள் குரல் - அதுவே உரிமை வாழ்வு மனு.',
  night: 'முதுமலை-பந்திப்பூர் சாலைகள் இரவு 9 முதல் காலை 6 வரை மூடப்படும். மேற்கு தொடர்ச்சி பயணத்தை 9 மணிக்குள் முடித்துக்கொள்ளுங்கள்.',
  app: 'நான் கூடலூரின் குரல் வழிகாட்டி - மனு, கூடலூர் ஐடி, வழித்தட வரைபடம், வனவிலங்கு நடமாட்டம், குறைகள் அனைத்திற்கும் உயிருள்ள உதவியாளர்.',
  total: '',
};

const FAQ_ML: Record<Intent, string> = {
  sign: 'ഹോം പേജിലെ ഹർജി തുറന്ന് പേരും പ്രദേശവും സ്ഥിരീകരിച്ച് ഒപ്പുവെക്കൂ - ആർക്കും പരിശോധിക്കാവുന്ന VG- രശീത് ലഭിക്കും. 10 സെക്കൻഡ്.',
  register: 'രജിസ്റ്റർ ചെയ്യുമ്പോൾ ഗൂഡല്ലൂർ ഐഡി ലഭിക്കും: പേര്, ഫോൺ, പ്രദേശം - OTP വേണ്ട. തലക്കെട്ടിലെ അവതാറിൽ തൊട്ട് Register തിരഞ്ഞെടുക്കൂ.',
  id: 'നിങ്ങളുടെ ഗൂഡല്ലൂർ ഐഡി (GD-YYYY-XXXXXX) ഡിജിറ്റൽ അടുപ്പമാണ്. അവതാറിൽ തൊട്ട് കാർഡ് കാണാം, ഡൗൺലോഡ് ചെയ്യാം, ഷെയർ ചെയ്യാം.',
  receipt: 'ഒപ്പിട്ടാൽ VG- ഹാഷ് ലഭിക്കും. Verify പേജിൽ എപ്പോൾ വേണമെങ്കിലും പരിശോധിക്കാം - പേര്, ഗ്രാമം, ബാച്ച് നമ്പർ കാണാം.',
  share: 'ഗാലറിയിൽ അയൽവാസികളുടെ പോസ്റ്ററുകളും വീഡിയോകളും ഉണ്ട്. കുടുംബ ഗ്രൂപ്പുകളിൽ പങ്കുവെക്കൂ - അതാണ് ഹർജി വളരാൻ വഴി.',
  corridors: 'ആനകൾ സുരക്ഷിതമായി കടക്കാൻ രാത്രി ഇടനാഴികൾ വാഹനങ്ങൾക്ക് അടയ്ക്കും. Corridors പേജിൽ ലൈവ് ഭൂപടമുണ്ട്.',
  sighting: 'കണ്ടത് റിപ്പോർട്ട് ചെയ്യൂ - സ്ഥലം, സമയം, കൂട്ടം. ഇത് നിങ്ങളുടെ പ്രദേശത്തെ മുൻകൂർ മുന്നറിയിപ്പ് ഭൂപടത്തിന് പ്രധാനമാണ്.',
  grievance: 'വെള്ളം, വിളക്ക്, റോഡ് തുടങ്ങിയ പരാതികൾക്ക് ട്രാക്കിംഗ് ഐഡി ലഭിക്കും. അത്യാവശ്യം: വനം 1800 425 6100, മുഖ്യമന്ത്രി 1100.',
  vision: 'ലക്ഷ്യം സഹവാസം: ആനയ്ക്കും പുലിക്കും സുരക്ഷിത പാത, ജനങ്ങൾക്ക് അന്തസ്സ്, സർക്കാരിലേക്ക് ഒരേ പൗരശബ്ദം - അതാണ് ഈ ഹർജി.',
  night: 'മുതുമല-ബാന്ദിപ്പൂർ റോഡുകൾ രാത്രി 9 മുതൽ രാവിലെ 6 വരെ അടയ്ക്കും. ഘാട്ട് യാത്ര 9-ന് മുൻപ് പൂർത്തിയാക്കൂ.',
  app: 'ഞാൻ ഗൂഡല്ലൂരിന്റെ വോയ്സ് ഗൈഡ് - ഹർജി, ഐഡി, ഇടനാഴി, വന്യജീവി, പരാതികൾക്കൊപ്പം ജീവനുള്ള സഹായി.',
  total: '',
};

const FAQ_KN: Record<Intent, string> = {
  sign: 'ಮುಖಪುಟದ ಮನವಿ ತೆರೆದು ಹೆಸರು-ಸ್ಥಳ ದೃಢೀಕರಿಸಿ ಸಹಿ ಹಾಕಿ - ಯಾರೂ ಪರಿಶೀಲಿಸಬಹುದಾದ VG- ರಶೀದಿ ಸಿಗುತ್ತದೆ. 10 ಸೆಕೆಂಡ್.',
  register: 'ನೋಂದಣಿಯಿಂದ ಗೂಡಲ್ಲೂರು ಐಡಿ ಸಿಗುತ್ತದೆ: ಹೆಸರು, ಫೋನ್, ಸ್ಥಳ - OTP ಬೇಡ. ಹೆಡರ್ ಅವತಾರವನ್ನು ಒತ್ತಿ Register ಆಯ್ಕೆ ಮಾಡಿ.',
  id: 'ನಿಮ್ಮ ಗೂಡಲ್ಲೂರು ಐಡಿ (GD-YYYY-XXXXXX) ಡಿಜಿಟಲ್ ಗುರುತು. ಅವತಾರವನ್ನು ಒತ್ತಿ ಕಾರ್ಡ್ ನೋಡಿ, ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ, ಹಂಚಿ.',
  receipt: 'ಸಹಿಯ ನಂತರ VG- ಹ್ಯಾಶ್ ಸಿಗುತ್ತದೆ. Verify ಪುಟದಲ್ಲಿ ಯಾವಾಗ ಬೇಕಾದರೂ ಪರಿಶೀಲಿಸಿ - ಹೆಸರು, ಊರು, ಬ್ಯಾಚ್ ಸಂಖ್ಯೆ ಕಾಣುತ್ತದೆ.',
  share: 'ಗ್ಯಾಲರಿಯಲ್ಲಿ ನೆರೆಯವರ ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ವೀಡಿಯೊಗಳಿವೆ. ಕುಟುಂಬ ಗುಂಪುಗಳಲ್ಲಿ ಹಂಚಿ - ಮನವಿ ಬೆಳೆಯುವುದು ಅದರಿಂದ.',
  corridors: 'ಆನೆಗಳು ಸುರಕ್ಷಿತವಾಗಿ ದಾಟಲು ರಾತ್ರಿ ಕಾರಿಡಾರ್‌ಗಳು ವಾಹನಗಳಿಗೆ ಮುಚ್ಚಿರುತ್ತವೆ. Corridors ಪುಟದಲ್ಲಿ ಲೈವ್ ನಕ್ಷೆ ಇದೆ.',
  sighting: 'ಕಂಡದ್ದನ್ನು ವರದಿ ಮಾಡಿ - ಸ್ಥಳ, ಸಮಯ, ಗುಂಪು. ಇದು ನಿಮ್ಮ ಪ್ರದೇಶದ ಮುನ್ನೆಚ್ಚರಿಕೆ ನಕ್ಷೆಗೆ ಮುಖ್ಯ.',
  grievance: 'ನೀರು, ದೀಪ, ರಸ್ತೆ ದೂರುಗಳಿಗೆ ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡಿ ಸಿಗುತ್ತದೆ. ತುರ್ತು: ಅರಣ್ಯ 1800 425 6100, ಮುಖ್ಯಮಂತ್ರಿ 1100.',
  vision: 'ಗುರಿ ಸಹಬಾಳ್ವೆ: ಆನೆ-ಚಿರತೆಗೆ ಸುರಕ್ಷಿತ ದಾರಿ, ಜನರಿಗೆ ಘನತೆ, ಸರ್ಕಾರಕ್ಕೆ ಒಂದೇ ಪೌರ ಧ್ವನಿ - ಅದೇ ಈ ಮನವಿ.',
  night: 'ಮುತುಮಲೈ-ಬಂಡೀಪುರ ರಸ್ತೆಗಳು ರಾತ್ರಿ 9 ರಿಂದ ಬೆಳಿಗ್ಗೆ 6 ರವರೆಗೆ ಮುಚ್ಚುತ್ತವೆ. ಘಟ್ ಪ್ರಯಾಣ 9-ರೊಳಗೆ ಮುಗಿಸಿ.',
  app: 'ನಾನು ಗೂಡಲ್ಲೂರಿನ ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ - ಮನವಿ, ಐಡಿ, ಕಾರಿಡಾರ್, ವನ್ಯಜೀವಿ, ದೂರುಗಳಿಗೆಲ್ಲ ಜೀವಂತ ಸಹಾಯಕ.',
  total: '',
};

function ctxFor(lang: Language, ctx?: PresenterContext): PresenterContext {
  return ctx ?? {
    currentPage: '', language: lang, isRegistered: false, hasSigned: false,
    hasShared: false, totalSignatures: 0, mediaCount: 0, profile: null,
  };
}

function totalLine(lang: Language, intel: LiveIntel): string {
  const t = fmt(intel.total);
  const top = topPlace(intel.places);
  switch (lang) {
    case 'ta': return `இதுவரை ${t} பேர் கையெழுத்திட்டுள்ளனர்${top}.`;
    case 'ml': return `ഇതുവരെ ${t} പേർ ഒപ്പുവെച്ചു${top}.`;
    case 'kn': return `ಈವರೆಗೆ ${t} ಮಂದಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ${top}.`;
    default: return `${t} supporters have signed so far${top}.`;
  }
}

const CANT_LIST: Record<Language, string> = {
  en: 'I can help with signing, registration, your Gudalur ID, receipts, sharing, corridors, sightings, grievances and our vision. What would you like to know?',
  ta: 'கையெழுத்து, பதிவு, கூடலூர் ஐடி, ரசீது, பகிர்தல், வழித்தடங்கள், நடமாட்டம், குறைகள், நமது நோக்கம் - இவை குறித்து கேளுங்கள்.',
  ml: 'ഒപ്പ്, രജിസ്റ്റ്രേഷൻ, ഐഡി, രശീത്, ഷെയറിംഗ്, ഇടനാഴി, സാന്നിധ്യം, പരാതി, ലക്ഷ്യം - ഇവയെക്കുറിച്ച് ചോദിക്കൂ.',
  kn: 'ಸಹಿ, ನೋಂದಣಿ, ಐಡಿ, ರಶೀದಿ, ಹಂಚಿಕೆ, ಕಾರಿಡಾರ್, ಸಂಚಾರ, ದೂರು, ಗುರಿ - ಇವುಗಳ ಬಗ್ಗೆ ಕೇಳಿ.',
};

export async function answerQuestion(question: string, lang: Language, ctx?: PresenterContext): Promise<string> {
  logActivity('ask');
  const intel = await getIntel();
  const c = ctxFor(lang, ctx);
  const q = (question || '').trim();
  if (!q) return livingGuidance(c, intel).text;

  const intent = detectIntent(q);

  // Already-signed / already-registered users get the right next step
  if (intent === 'sign' && c.hasSigned) return fill((L[lang] || L.en).signed, c, intel);
  if (intent === 'register' && c.isRegistered && !c.hasSigned) return fill((L[lang] || L.en).reg, c, intel);

  if (intent === 'total' || !FAQ_EN[intent]) {
    const base = totalLine(lang, intel);
    return intent === 'total' ? base : `${base} ${CANT_LIST[lang] || CANT_LIST.en}`;
  }

  const faq = lang === 'ta' ? FAQ_TA[intent] : lang === 'ml' ? FAQ_ML[intent] : lang === 'kn' ? FAQ_KN[intent] : FAQ_EN[intent];
  return fill(faq, c, intel);
}