/**
 * OpeningAnimation - Language selection -> concern (grievance) -> VOG intro ->
 * cost of human-wildlife conflict -> open app.
 * Brand colors only: deep green, white, peacock yellow.
 * No animation load, no auto-close. User must tap to continue.
 */
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import type { Language } from "../context/LanguageContext";
import { petitionApi } from "../services/api";
import { ElephantIcon, TigerIcon, HumanIcon } from "../components/AnimalIcons";

interface Props { onChoose: (lang: Language) => void; }

const OPTIONS: { code: Language; native: string; greeting: string; cta: string }[] = [
  { code: "en", native: "English", greeting: "Welcome", cta: "Continue in English" },
  { code: "ta", native: "தமிழ்", greeting: "வணக்கம்", cta: "தமிழில் தொடரவும்" },
  { code: "ml", native: "മലയാളം", greeting: "സ്വാഗതം", cta: "മലയാളത്തിൽ തുടരുക" },
  { code: "kn", native: "ಕನ್ನಡ", greeting: "ಸ್ವಾಗತ", cta: "ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ" },
];

interface IntroCopy { self: string; live: string; cta: string; next: string; }

const FETCHING: Record<Language, string> = {
  en: "Fetching the live signature count…",
  ta: "நேரடி கையெழுத்து எண்ணிக்கை பெறப்படுகிறது…",
  ml: "നേർ പ്രതിജ്ഞാ സംഖ്യ ശേഖരിക്കുന്നു…",
  kn: "ಲೈವ್ ಸಹಿ ಸಂಖ್ಯೆಯನ್ನು ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ…",
};

function introCopy(lang: Language, count: number | null): IntroCopy {
  const n = count === null ? "" : Number(count).toLocaleString("en-IN");
  const live = count === null
    ? (FETCHING[lang] || FETCHING.en)
    : ({
        en: `${n} people have already signed the Right to Life petition.`,
        ta: `${n} பேர் ஏற்கனவே உயிர் வாழ்வுரிமை மனுவில் கையெழுத்திட்டுள்ளனர்.`,
        ml: `${n} പേർ ഇതിനകം ജീവനവകാശ ഹർജിയിൽ ഒപ്പിട്ടിരിക്കുന്നു.`,
        kn: `${n} ಜನರು ಈಗಾಗಲೇ ಜೀವನದ ಹಕ್ಕಿನ ಮನವಿಯಲ್ಲಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
      }[lang] || `${n} people have already signed the Right to Life petition.`);
  const c: Record<Language, IntroCopy> = {
    en: {
      self: "I am VOG — the living citizen assistant of Voice of Gudalur. I will guide you through the open grievance and the safety concerns of this region.",
      live,
      cta: "Human–wildlife conflict has affected families across Gudalur, Pandalur and O'Valley. Your verified signature strengthens the grievance already submitted to the Chief Minister's Grievance Cell.",
      next: "Continue",
    },
    ta: {
      self: "நான் VOG — Voice of Gudalur இன் உயிருள்ள குடிமகன் உதவியாளர். சமர்ப்பிக்கப்பட்ட குறைதீர் மனு மற்றும் இப்பகுதியின் பாதுகாப்பு கவலைகள் குறித்து உங்களை வழிநடத்துவேன்.",
      live,
      cta: "மனித–வனவிலங்கு மோதல் கூடலூர், பந்தலூர் மற்றும் ஓ'வேலி குடும்பங்களை பாதித்து வருகிறது. உங்கள் உறுதிப்படுத்தப்பட்ட கையெழுத்து முதலமைச்சர் குறைதீர்ப்பு அலுவலகத்தில் ஏற்கனவே சமர்ப்பிக்கப்பட்ட மனுவை வலுப்படுத்தும்.",
      next: "தொடரவும்",
    },
    ml: {
      self: "ഞാൻ VOG — Voice of Gudalur-ന്റെ ജീവനുള്ള പൗര സഹായി. സമർപ്പിച്ച പരാതിയിലും ഈ മേഖലയിലെ സുരക്ഷാ ആശങ്കകളിലും നിങ്ങളെ നയിക്കും.",
      live,
      cta: "മനുഷ്യ–വന്യജീവി സംഘർഷം ഗൂഡല്ലൂർ, പന്തലൂർ, ഓ'വാലി കുടുംബങ്ങളെ ബാധിച്ചിരിക്കുന്നു. നിങ്ങളുടെ പരിശോധിച്ച ഒപ്പ് മുഖ്യമന്ത്രിയുടെ പരാതി സെല്ലിൽ സമർപ്പിച്ചിട്ടുള്ള ഹർജിയെ ശക്തിപ്പെടുത്തും.",
      next: "തുടരുക",
    },
    kn: {
      self: "ನಾನು VOG — Voice of Gudalur ನ ನಿಮ್ಮ ಜೀವಂತ ನಾಗರಿಕ ಸಹಾಯಕ. ಸಲ್ಲಿಸಿದ ದೂರು ಮತ್ತು ಈ ಪ್ರದೇಶದ ಸುರಕ್ಷತಾ ಕಾಳಜಿಗಳ ಬಗ್ಗೆ ನಿಮಗೆ ಮಾರ್ಗದರ್ಶನ ಮಾಡುತ್ತೇನೆ.",
      live,
      cta: "ಮನುಷ್ಯ–ವನ್ಯಜೀವಿ ಸಂಘರ್ಷ ಗೂಡಲೂರು, ಪಂದಲೂರು ಮತ್ತು ಓ'ವ್ಯಾಲಿ ಕುಟುಂಬಗಳ ಮೇಲೆ ಪರಿಣಾಮ ಬೀರಿದೆ. ನಿಮ್ಮ ಪರಿಶೀಲಿತ ಸಹಿ ಮುಖ್ಯಮಂತ್ರಿಗಳ ದೂರು ಕೋಶಕ್ಕೆ ಈಗಾಗಲೇ ಸಲ್ಲಿಸಿರುವ ದೂರನ್ನು ಬಲಪಡಿಸುತ್ತದೆ.",
      next: "ಮುಂದುವರಿಯಿರಿ",
    },
  };
  return c[lang] || c.en;
}

interface ConcernCopy {
  subtitle: string;
  heading: string;
  org: string;
  orgName: string;
  orgTail: string;
  actionLabel: string;
  action: string;
  demandLabel: string;
  demand: string;
  approachLabel: string;
  approach: string;
  consentLabel: string;
  consent: string;
}

function concernCopy(lang: Language): ConcernCopy {
  const c: Record<Language, ConcernCopy> = {
    en: {
      subtitle: "United for Justice, Safety and the Future of Gudalur",
      heading: "Standing Together for Safety",
      org: "Organized by",
      orgName: "Universal Guard Trust (UGT)",
      orgTail: " — a non-political, citizen-led initiative documenting human–wildlife conflict in Gudalur taluk.",
      actionLabel: "Our Action:",
      action: "Grievance #18982473 filed with the Chief Minister's Grievance Cell on 03 Sep 2026 — assigned to the Gudalur District Forest Officer, pending action.",
      demandLabel: "Our Demand:",
      demand: "Protect human life and wildlife — remove life-threatening electrical hazards, strengthen early warning and rapid response, and deliver a coordinated 30/60/90/180-day action plan.",
      approachLabel: "Our Approach:",
      approach: "Strictly peaceful and legal — no protests, no politics.",
      consentLabel: "Your Consent:",
      consent: "Continuing adds your digital signature as an official supporter of this government submission. Your details remain private.",
    },
    ta: {
      subtitle: "நீதி, பாதுகாப்பு மற்றும் கூடலூரின் எதிர்காலத்திற்காக ஒன்றிணைந்தோம்",
      heading: "பாதுகாப்புக்காக ஒன்றாக நிற்கிறோம்",
      org: "ஏற்பாடு:",
      orgName: "Universal Guard Trust (UGT)",
      orgTail: " — கூடலூர் வட்டாரத்தில் மனித–வனவிலங்கு மோதலை ஆவணப்படுத்தும் அரசியல் சாராத குடிமக்கள் அமைப்பு.",
      actionLabel: "எங்கள் செயல்:",
      action: "03 செப் 2026 அன்று முதல்வர் முகவரியில் குறை #18982473 பதிவு செய்யப்பட்டது — கூடலூர் வனத்துறை அதிகாரிக்கு ஒதுக்கப்பட்டு நடவடிக்கை நிலுவையில் உள்ளது.",
      demandLabel: "எங்கள் கோரிக்கை:",
      demand: "மனித உயிரையும் வனவிலங்குகளையும் பாதுகாக்க — உயிருக்கு ஆபத்தான மின் அபாயங்களை நீக்க, முன் எச்சரிக்கையும் விரைவு நடவடிக்கையும் வலுப்படுத்த, 30/60/90/180 நாள் ஒருங்கிணைந்த செயல்திட்டத்தை நடைமுறைப்படுத்த வேண்டும்.",
      approachLabel: "எங்கள் அணுகுமுறை:",
      approach: "முற்றிலும் அமைதியானதும் சட்டபூர்வமானதும் — போராட்டம் இல்லை, அரசியல் இல்லை.",
      consentLabel: "உங்கள் சம்மதம்:",
      consent: "தொடர்வது இந்த அரசு மனுவின் அதிகாரப்பூர்வ ஆதரவாளராக உங்கள் டிஜிட்டல் கையொப்பத்தைப் பதிவு செய்யும். உங்கள் விவரங்கள் தனிப்பட்டதாகவே இருக்கும்.",
    },
    ml: {
      subtitle: "നീതി, സുരക്ഷ, ഗൂഡല്ലൂറിന്റെ ഭാവി എന്നിവയ്ക്കായി ഒന്നിച്ചു",
      heading: "സുരക്ഷയ്ക്കായി ഒന്നിച്ചു നിൽക്കാം",
      org: "സംഘടിപ്പിക്കുന്നത്:",
      orgName: "Universal Guard Trust (UGT)",
      orgTail: " — ഗൂഡല്ലൂർ താലൂക്കിലെ മനുഷ്യ–വന്യജീവി സംഘർഷം രേഖപ്പെടുത്തുന്ന രാഷ്ട്രീയമില്ലാത്ത പൗര സംഘടന.",
      actionLabel: "ഞങ്ങളുടെ പ്രവർത്തനം:",
      action: "03 സെപ്റ്റംബർ 2026-ന് മുഖ്യമന്ത്രിയുടെ മുഖവുരയിൽ പരാതി #18982473 സമർപ്പിച്ചു — ഗൂഡല്ലൂർ വനമേഖലാ ഉദ്യോഗസ്ഥനു കൈമാറി, നടപടി നിലവിലുണ്ട്.",
      demandLabel: "ഞങ്ങളുടെ ആവശ്യം:",
      demand: "മനുഷ്യജീവനും വന്യജീവികളും സംരക്ഷിക്കണം — ജീവന് ഭീഷണിയായ വൈദ്യുത അപകടങ്ങൾ നീക്കണം; മുൻകൂർ മുന്നറിയിപ്പും ദ്രുത പ്രതിരോധവും ശക്തമാക്കണം; 30/60/90/180 ദിവസത്തെ ഏകോപിത പ്രവർത്തന പദ്ധതി നടപ്പാക്കണം.",
      approachLabel: "ഞങ്ങളുടെ സമീപനം:",
      approach: "പൂർണമായും സമാധാനപരവും നിയമപരവും — സമരമില്ല, രാഷ്ട്രീയമില്ല.",
      consentLabel: "നിങ്ങളുടെ സമ്മതം:",
      consent: "തുടരുന്നത് ഈ സർക്കാർ പരാതിയുടെ ഔദ്യോഗിക പിന്തുണക്കാരനായി നിങ്ങളുടെ ഡിജിറ്റൽ ഒപ്പ് രേഖപ്പെടുത്തും. നിങ്ങളുടെ വിവരങ്ങൾ സ്വകാര്യമായി തുടരും.",
    },
    kn: {
      subtitle: "ನ್ಯಾಯ, ಸುರಕ್ಷತೆ ಮತ್ತು ಗೂಡಲೂರಿನ ಭವಿಷ್ಯಕ್ಕಾಗಿ ಒಗ್ಗೂಡಿದ್ದೇವೆ",
      heading: "ಸುರಕ್ಷತೆಗಾಗಿ ಒಟ್ಟಿಗೆ ನಿಂತಿದ್ದೇವೆ",
      org: "ಸಂಘಟನೆ:",
      orgName: "Universal Guard Trust (UGT)",
      orgTail: " — ಗೂಡಲೂರು ತಾಲೂಕಿನ ಮಾನವ–ವನ್ಯಜೀವಿ ಸಂಘರ್ಷವನ್ನು ದಾಖಲಿಸುವ ರಾಜಕೀಯೇತರ ನಾಗರಿಕ ಸಂಸ್ಥೆ.",
      actionLabel: "ನಮ್ಮ ಕ್ರಮ:",
      action: "03 ಸೆಪ್ಟೆಂಬರ್ 2026 ರಂದು ಮುಖ್ಯಮಂತ್ರಿಗಳ ಮುಖವರಿಯಲ್ಲಿ ದೂರು #18982473 ದಾಖಲಾಗಿದೆ — ಗೂಡಲೂರು ಅರಣ್ಯ ಇಲಾಖೆ ಅಧಿಕಾರಿಗೆ ನಿಯೋಜಿಸಲಾಗಿದ್ದು, ಕ್ರಮ ಬಾಕಿ ಇದೆ.",
      demandLabel: "ನಮ್ಮ ಬೇಡಿಕೆ:",
      demand: "ಮಾನವ ಜೀವ ಮತ್ತು ವನ್ಯಜೀವಿಗಳನ್ನು ರಕ್ಷಿಸಿ — ಜೀವಕ್ಕೆ ಅಪಾಯಕಾರಿ ವಿದ್ಯುತ್ ಅಪಾಯಗಳನ್ನು ತೆಗೆದುಹಾಕಿ, ಮುನ್ನೆಚ್ಚರಿಕೆ ಮತ್ತು ತ್ವರಿತ ಕ್ರಮವನ್ನು ಬಲಪಡಿಸಿ, 30/60/90/180 ದಿನಗಳ ಸಮನ್ವಯ ಕ್ರಮಯೋಜನೆಯನ್ನು ಜಾರಿಗೊಳಿಸಿ.",
      approachLabel: "ನಮ್ಮ ವಿಧಾನ:",
      approach: "ಸಂಪೂರ್ಣ ಶಾಂತಿಯುತ ಮತ್ತು ಕಾನೂನುಬದ್ಧ — ಪ್ರತಿಭಟನೆ ಇಲ್ಲ, ರಾಜಕೀಯ ಇಲ್ಲ.",
      consentLabel: "ನಿಮ್ಮ ಸಮ್ಮತಿ:",
      consent: "ಮುಂದುವರಿಯುವುದರಿಂದ ಈ ಸರ್ಕಾರಿ ದೂರಿನ ಅಧಿಕೃತ ಬೆಂಬಲಿಗನಾಗಿ ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಸಹಿ ದಾಖಲಾಗುತ್ತದೆ. ನಿಮ್ಮ ವಿವರಗಳು ಖಾಸಗಿಯಾಗಿಯೇ ಇರುತ್ತವೆ.",
    },
  };
  return c[lang] || c.en;
}

/** A compact stat tile used on the cost-of-conflict page. */
function StatTile({ value, caption, sub, className = "" }: { value: string; caption: string; sub?: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#AED581]/30 bg-[#0A3D0A]/60 px-2 py-2 text-center ${className}`}>
      <p className="text-lg font-black text-white leading-none">{value}</p>
      <p className="mt-1 text-[9.5px] leading-tight text-[#C8E6C9]">{caption}</p>
      {sub && <p className="mt-0.5 text-[9.5px] leading-tight text-[#AED581]/85">{sub}</p>}
    </div>
  );
}
interface CostCopy {
  title: string;
  gudalurLabel: string;
  c2023: string;
  c612023: string;
  c50y: string;
  tnLabel: string;
  tnCaption: string;
  natLabel: string;
  eleCaption: string;
  eleBreakdown: string;
  fencesCaption: string;
  natCaption: string;
  demandHeading: string;
  demandSub: string;
  sign: string;
  open: string;
}

function costCopy(lang: Language): CostCopy {
  const c: Record<Language, CostCopy> = {
    en: {
      title: "The Cost of Human–Wildlife Conflict",
      gudalurLabel: "Gudalur / Nilgiris",
      c2023: "human deaths in 2023",
      c612023: "human deaths (2015–2023)",
      c50y: "deaths — 50-year estimate",
      tnLabel: "Tamil Nadu",
      tnCaption: "human deaths in 10 years (522 by wild elephants)",
      natLabel: "Unnatural Wildlife & National Toll",
      eleCaption: "wild elephant deaths in 10 years",
      eleBreakdown: "741 electrocutions · 186 train strikes · 169 poaching · 64 poisoning",
      fencesCaption: "animals killed by illegal power fences",
      natCaption: "human deaths nationally in 12 years",
      demandHeading: "Demand a Permanent Solution",
      demandSub: "Protect people. Protect wildlife. End repeated deaths.",
      sign: "Sign the Petition: Gudalur Safety Plan",
      open: "Open Voice of Gudalur",
    },
    ta: {
      title: "மனித–வனவிலங்கு மோதலின் விலை",
      gudalurLabel: "கூடலூர் / நீலகிரி",
      c2023: "2023-ல் மனித உயிரிழப்புகள்",
      c612023: "மனித உயிரிழப்புகள் (2015–2023)",
      c50y: "இறப்புகள் — 50 ஆண்டு மதிப்பீடு",
      tnLabel: "தமிழ்நாடு",
      tnCaption: "10 ஆண்டுகளில் மனித உயிரிழப்புகள் (வனயானைகளால் 522)",
      natLabel: "வனவிலங்கு அசாதாரண இறப்புகள் & தேசிய புள்ளிவிவரம்",
      eleCaption: "10 ஆண்டுகளில் வனயானை உயிரிழப்புகள்",
      eleBreakdown: "741 மின்சாரம் · 186 ரயில் மோதல் · 169 வேட்டை · 64 விஷம்",
      fencesCaption: "சட்டவிரோத மின் வேலிகளால் கொல்லப்பட்ட விலங்குகள்",
      natCaption: "12 ஆண்டுகளில் நாடு முழுவதும் மனித உயிரிழப்புகள்",
      demandHeading: "நிரந்தர தீர்வைக் கோருங்கள்",
      demandSub: "மக்களைப் பாதுகாப்போம். வனவிலங்குகளைப் பாதுகாப்போம். தொடர் உயிரிழப்புகளை முடிவுக்குக் கொண்டுவருவோம்.",
      sign: "கூடலூர் பாதுகாப்புத் திட்டம் — மனுவில் கையெழுத்திடுங்கள்",
      open: "Voice of Gudalur ஐத் திறக்கவும்",
    },
    ml: {
      title: "മനുഷ്യ–വന്യജീവി സംഘർഷത്തിന്റെ വില",
      gudalurLabel: "ഗൂഡല്ലൂർ / നീലഗിരി",
      c2023: "2023-ൽ മനുഷ്യ മരണങ്ങൾ",
      c612023: "മനുഷ്യ മരണങ്ങൾ (2015–2023)",
      c50y: "മരണങ്ങൾ — 50 വർഷ കണക്ക്",
      tnLabel: "തമിഴ്നാട്",
      tnCaption: "10 വർഷത്തിൽ മനുഷ്യ മരണങ്ങൾ (വന്യാനകളാൽ 522)",
      natLabel: "വന്യജീവി അസ്വാഭാവിക മരണങ്ങൾ & ദേശീയ കണക്ക്",
      eleCaption: "10 വർഷത്തിൽ വന്യാന മരണങ്ങൾ",
      eleBreakdown: "741 വൈദ്യുതി · 186 റെയിൽ കൂട്ടിയിടി · 169 വേട്ടയാടൽ · 64 വിഷം",
      fencesCaption: "നിയമവിരുദ്ധ വൈദ്യുത വേലികളിൽ കൊല്ലപ്പെട്ട മൃഗങ്ങൾ",
      natCaption: "12 വർഷത്തിൽ രാജ്യവ്യാപകമായി മനുഷ്യ മരണങ്ങൾ",
      demandHeading: "സ്ഥിരമായ പരിഹാരം ആവശ്യപ്പെടുക",
      demandSub: "ജനങ്ങളെ സംരക്ഷിക്കുക. വന്യജീവികളെ സംരക്ഷിക്കുക. ആവർത്തിക്കുന്ന മരണങ്ങൾ അവസാനിപ്പിക്കുക.",
      sign: "ഗൂഡല്ലൂർ സുരക്ഷാ പദ്ധതി — പരാതിയിൽ ഒപ്പിടുക",
      open: "Voice of Gudalur തുറക്കുക",
    },
    kn: {
      title: "ಮಾನವ–ವನ್ಯಜೀವಿ ಸಂಘರ್ಷದ ಬೆಲೆ",
      gudalurLabel: "ಗೂಡಲೂರು / ನೀಲಗಿರಿ",
      c2023: "2023ರಲ್ಲಿ ಮಾನವ ಸಾವುಗಳು",
      c612023: "ಮಾನವ ಸಾವುಗಳು (2015–2023)",
      c50y: "ಸಾವುಗಳು — 50 ವರ್ಷದ ಅಂದಾಜು",
      tnLabel: "ತಮಿಳುನಾಡು",
      tnCaption: "10 ವರ್ಷಗಳಲ್ಲಿ ಮಾನವ ಸಾವುಗಳು (ವನ್ಯಾನೆಗಳಿಂದ 522)",
      natLabel: "ವನ್ಯಜೀವಿ ಅಸಹಜ ಸಾವುಗಳು & ರಾಷ್ಟ್ರೀಯ ಲೆಕ್ಕ",
      eleCaption: "10 ವರ್ಷಗಳಲ್ಲಿ ವನ್ಯಾನೆ ಸಾವುಗಳು",
      eleBreakdown: "741 ವಿದ್ಯುತ್ ಆಘಾತ · 186 ರೈಲು ಡಿಕ್ಕಿ · 169 ಬೇಟೆಯಾಟ · 64 ವಿಷ",
      fencesCaption: "ಅಕ್ರಮ ವಿದ್ಯುತ್ ಬೇಲಿಗಳಲ್ಲಿ ಸತ್ತ ಪ್ರಾಣಿಗಳು",
      natCaption: "12 ವರ್ಷಗಳಲ್ಲಿ ದೇಶಾದ್ಯಂತ ಮಾನವ ಸಾವುಗಳು",
      demandHeading: "ಶಾಶ್ವತ ಪರಿಹಾರ ಕೋರಿ",
      demandSub: "ಜನರನ್ನು ರಕ್ಷಿಸಿ. ವನ್ಯಜೀವಿಗಳನ್ನು ರಕ್ಷಿಸಿ. ಪುನರಾವರ್ತಿತ ಸಾವುಗಳನ್ನು ನಿಲ್ಲಿಸಿ.",
      sign: "ಗೂಡಲೂರು ಸುರಕ್ಷತಾ ಯೋಜನೆ — ಅರ್ಜಿಗೆ ಸಹಿ ಹಾಕಿ",
      open: "Voice of Gudalur ತೆರೆಯಿರಿ",
    },
  };
  return c[lang] || c.en;
}

export const OpeningAnimation: React.FC<Props> = ({ onChoose }) => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"languages" | "concern" | "intro" | "cost">("languages");
  const [chosenLang, setChosenLang] = useState<Language | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    petitionApi.signStats()
      .then((s) => {
        const n = Number(s?.total) || 0;
        if (alive && n > 0) setLiveCount((prev) => (prev === null || n > prev ? n : prev));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const handleChoose = useCallback((code: Language) => {
    setChosenLang(code);
    setPhase("concern");
  }, []);

  const handleConcernContinue = useCallback(() => {
    setPhase("intro");
  }, []);

  const handleIntroContinue = useCallback(() => {
    setPhase("cost");
  }, []);

  const openApp = useCallback((toSign: boolean) => {
    if (!chosenLang) return;
    onChoose(chosenLang);
    if (toSign) {
      setTimeout(() => { try { navigate("/sign-petition"); } catch { /* route unavailable */ } }, 0);
    }
  }, [onChoose, chosenLang, navigate]);

  const intro = chosenLang ? introCopy(chosenLang, liveCount) : null;
  const concern = chosenLang ? concernCopy(chosenLang) : null;
  const cost = chosenLang ? costCopy(chosenLang) : null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#1B5E20]" role="dialog" aria-modal="true" aria-label="Welcome">

      {/* 1. LANGUAGE SELECTION — Voice of Gudalur title + subtitle first. */}
      {phase === "languages" && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-6">
            <div className="text-center w-full max-w-md">
              <h1 className="text-white text-3xl font-black tracking-tight">Voice of Gudalur</h1>
              <p className="mt-2 text-[#AED581] text-base font-semibold leading-snug">United for Justice, Safety and the Future of Gudalur</p>
              <div className="mx-auto mt-5 h-0.5 w-24 bg-[#FDE047]/40" />
              <p className="text-[#FDE047] text-xs font-black tracking-[0.22em] uppercase mt-5">Select Your Language</p>
              <p className="text-[#C8E6C9] text-xs mt-1">Choose your language to continue</p>
            </div>
            <div className="mt-6 w-full max-w-md grid grid-cols-2 gap-3">
              {OPTIONS.map((o) => (
                <button key={o.code} type="button" onClick={() => handleChoose(o.code)} className="rounded-2xl border border-[#AED581]/35 bg-[#AED581]/10 hover:bg-[#AED581]/25 active:scale-[0.97] transition p-5 text-center focus:outline-none focus:ring-2 focus:ring-[#F59E0B]" lang={o.code}>
                  <span className="block text-2xl font-black text-white">{o.native}</span>
                  <span className="block text-xs font-bold text-[#C8E6C9] mt-1">{o.greeting}</span>
                  <span className="block text-[11px] text-[#FDE047] mt-1 font-semibold">{o.cta}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* 2. THE CONCERN — topic on header, subtitle, mission heading + action. */}
      {phase === "concern" && concern && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center px-4 pt-2 pb-5">
            {/* Animated coexistence scene */}
            <div className="relative w-full max-w-sm h-24 mb-3">
              {/* Elephant — gentle float left, facing inward */}
              <motion.div
                className="absolute left-2 bottom-0"
                animate={{ y: [0, -7, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <ElephantIcon size={44} className="text-[#AED581] drop-shadow-lg" />
              </motion.div>
              {/* Tiger — gentle float right, facing inward */}
              <motion.div
                className="absolute right-2 bottom-0"
                animate={{ y: [0, -5, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <TigerIcon size={40} className="text-[#FDE047] drop-shadow-lg" />
              </motion.div>
              {/* Human — stands peacefully center */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 bottom-0"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <HumanIcon size={30} className="text-[#E8F5E9] drop-shadow-lg" />
              </motion.div>
              {/* Subtle ground shadow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-2 rounded-full bg-black/20 blur-sm" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/95 border border-[#FDE047]/30 p-4 text-center"
            >
              {/* Topic on header */}
              <h1 className="text-[#FDE047] text-lg sm:text-xl font-black tracking-wide">Voice of Gudalur</h1>
              <p className="mt-0.5 text-[#C8E6C9] text-[12px] sm:text-[13px] font-semibold leading-snug">{concern.subtitle}</p>
              <div className="mx-auto mt-2 h-0.5 w-14 bg-[#FDE047]/40" />
              {/* Second main heading */}
              <h2 className="text-white mt-2 text-base sm:text-lg font-black leading-snug">{concern.heading}</h2>
              <p className="mt-2 text-[#AED581] text-[12px] leading-snug">
                {concern.org} <span className="font-bold text-[#FDE047]">{concern.orgName}</span>{concern.orgTail}
              </p>
              <p className="mt-1.5 text-[#E6F7E6] text-[12px] leading-snug">
                <span className="font-bold text-[#FDE047]">{concern.actionLabel}</span> {concern.action}
              </p>
              <p className="mt-1.5 text-[#E6F7E6] text-[12px] leading-snug">
                <span className="font-bold text-[#FDE047]">{concern.demandLabel}</span> {concern.demand}
              </p>
              <p className="mt-1.5 text-[#E6F7E6] text-[12px] leading-snug">
                <span className="font-bold text-[#FDE047]">{concern.approachLabel}</span> {concern.approach}
              </p>
              <p className="mt-1.5 text-[#C8E6C9] text-[11px] leading-snug">
                <span className="font-bold">{concern.consentLabel}</span> {concern.consent}
              </p>
              <button
                type="button"
                onClick={handleConcernContinue}
                className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] border border-[#AED581]/30 text-white font-bold text-[13px] tracking-wide active:scale-95 transition hover:from-[#388E3C] hover:to-[#2E7D32]"
              >
                Continue • தொடரவும் • തുടരുക • ಮುಂದುವರಿಯಿರಿ
              </button>
            </motion.div>
          </div>
        </div>
      )}
      {/* 3. VOG LIVING INTRO — the assistant introduces the movement. */}
      {phase === "intro" && intro && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center justify-center px-4 py-6">
            <div className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/90 border border-[#FDE047]/30 shadow-2xl p-4 sm:p-5 text-center">
              <p className="text-[#FDE047] font-black tracking-[0.2em] text-[10px]">VOG - VOICE OF GUDALUR</p>
              <p className="mt-3 text-white font-bold text-sm sm:text-base leading-snug">{intro.self}</p>
              <p className="mt-2 text-[#FDE047] font-bold text-sm leading-snug">{intro.live}</p>
              <p className="mt-2 text-[12px] sm:text-[13px] leading-snug text-[#AED581]/95">{intro.cta}</p>
              <button type="button" onClick={handleIntroContinue} className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-[13px] tracking-wide active:scale-95 transition">
                {intro.next}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COST OF HUMAN–WILDLIFE CONFLICT — the data behind the grievance. */}
      {phase === "cost" && cost && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center px-4 pt-2 pb-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/95 border border-[#FDE047]/30 p-4 sm:p-5"
            >
              <p className="text-[#FDE047] text-[10px] font-black tracking-[0.2em] uppercase text-center">Voice of Gudalur</p>
              <h1 className="mt-1 text-white text-lg sm:text-xl font-black tracking-tight text-center">{cost.title}</h1>

              <p className="mt-2.5 text-[#AED581] text-[11px] font-bold">{cost.gudalurLabel}</p>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <StatTile value="18" caption={cost.c2023} />
                <StatTile value="61+" caption={cost.c612023} />
                <StatTile value="300+" caption={cost.c50y} />
              </div>

              <p className="mt-2.5 text-[#AED581] text-[11px] font-bold">{cost.tnLabel}</p>
              <div className="mt-1">
                <StatTile value="685" caption={cost.tnCaption} />
              </div>

              <p className="mt-2.5 text-[#AED581] text-[11px] font-bold">{cost.natLabel}</p>
              <div className="mt-1">
                <StatTile value="1,160+" caption={cost.eleCaption} sub={cost.eleBreakdown} />
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <StatTile value="1,300+" caption={cost.fencesCaption} />
                <StatTile value="5,000+" caption={cost.natCaption} />
              </div>

              <div className="mt-3 border-t border-[#FDE047]/25" />
              <h2 className="mt-2 text-white text-base sm:text-lg font-black text-center">{cost.demandHeading}</h2>
              <p className="mt-1 text-[#E6F7E6] text-[12px] text-center leading-snug">{cost.demandSub}</p>
              <button
                type="button"
                onClick={() => openApp(true)}
                className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-[13px] tracking-wide active:scale-95 transition"
              >
                {cost.sign}
              </button>
              <button
                type="button"
                onClick={() => openApp(false)}
                className="mt-2 w-full py-2 rounded-xl border border-[#AED581]/40 text-[#AED581] font-bold text-[13px] active:scale-95 transition"
              >
                {cost.open}
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningAnimation;