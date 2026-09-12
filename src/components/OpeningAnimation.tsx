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

/** A compact stat tile used on the cost-of-conflict page. */
function StatTile({ value, caption, className = "" }: { value: string; caption: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#AED581]/30 bg-[#0A3D0A]/60 px-3 py-2.5 text-center ${className}`}>
      <p className="text-2xl font-black text-white leading-none">{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-[#C8E6C9]">{caption}</p>
    </div>
  );
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
      {phase === "concern" && chosenLang && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center px-4 pt-2 pb-8">
            {/* Animated coexistence scene */}
            <div className="relative w-full max-w-sm h-32 mb-4">
              {/* Elephant — gentle float left, facing inward */}
              <motion.div
                className="absolute left-2 bottom-0"
                animate={{ y: [0, -7, 0], rotate: [0, 2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <ElephantIcon size={52} className="text-[#AED581] drop-shadow-lg" />
              </motion.div>
              {/* Tiger — gentle float right, facing inward */}
              <motion.div
                className="absolute right-2 bottom-0"
                animate={{ y: [0, -5, 0], rotate: [0, -2, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                <TigerIcon size={46} className="text-[#FDE047] drop-shadow-lg" />
              </motion.div>
              {/* Human — stands peacefully center */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 bottom-0"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <HumanIcon size={36} className="text-[#E8F5E9] drop-shadow-lg" />
              </motion.div>
              {/* Subtle ground shadow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-2 rounded-full bg-black/20 blur-sm" />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/95 border border-[#FDE047]/30 p-5 text-center"
            >
              {/* Topic on header */}
              <h1 className="text-[#FDE047] text-xl sm:text-2xl font-black tracking-wide">Voice of Gudalur</h1>
              <p className="mt-1 text-[#C8E6C9] text-sm sm:text-base font-semibold leading-snug">United for Justice, Safety and the Future of Gudalur</p>
              <div className="mx-auto mt-3 h-0.5 w-16 bg-[#FDE047]/40" />
              {/* Second main heading */}
              <h2 className="text-white mt-3 text-lg sm:text-xl font-black leading-snug">Standing Together for Safety</h2>
              <p className="mt-3 text-[#AED581] text-[13px] leading-relaxed">
                Organized by <span className="font-bold text-[#FDE047]">Universal Guard Trust (UGT)</span> — a non-political, citizen-led initiative documenting human–wildlife conflict in Gudalur taluk.
              </p>
              <p className="mt-2 text-[#E6F7E6] text-[13px] leading-relaxed">
                <span className="font-bold text-[#FDE047]">Our Action:</span> UGT filed Grievance <span className="font-bold">#18982473</span> with the Chief Minister's Grievance Cell on 03 Sep 2026. It is assigned to the Gudalur District Forest Officer and is pending action.
              </p>
              <p className="mt-2 text-[#E6F7E6] text-[13px] leading-relaxed">
                <span className="font-bold text-[#FDE047]">Our Demand:</span> Protect human life and wildlife — remove life-threatening electrical hazards, strengthen early warning and rapid response, and deliver a coordinated 30/60/90/180-day action plan.
              </p>
              <p className="mt-2 text-[#E6F7E6] text-[13px] leading-relaxed">
                <span className="font-bold text-[#FDE047]">Our Approach:</span> Strictly peaceful and legal — no protests, no politics.
              </p>
              <p className="mt-2 text-[#C8E6C9] text-xs leading-relaxed">
                <span className="font-bold">Your Consent:</span> Continuing adds your digital signature as an official supporter of this government submission. Your details remain private.
              </p>
              <button
                type="button"
                onClick={handleConcernContinue}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] border border-[#AED581]/30 text-white font-bold text-sm tracking-wide active:scale-95 transition hover:from-[#388E3C] hover:to-[#2E7D32]"
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
            <div className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/90 border border-[#FDE047]/30 shadow-2xl p-5 sm:p-6 text-center">
              <p className="text-[#FDE047] font-black tracking-[0.2em] text-[11px]">VOG - VOICE OF GUDALUR</p>
              <p className="mt-4 text-white font-bold text-base sm:text-lg leading-relaxed">{intro.self}</p>
              <p className="mt-3 text-[#FDE047] font-bold text-sm sm:text-base leading-snug">{intro.live}</p>
              <p className="mt-3 text-[13px] sm:text-sm leading-relaxed text-[#AED581]/95">{intro.cta}</p>
              <button type="button" onClick={handleIntroContinue} className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-sm tracking-wide active:scale-95 transition">
                {intro.next}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. COST OF HUMAN–WILDLIFE CONFLICT — the data behind the grievance. */}
      {phase === "cost" && chosenLang && (
        <div className="absolute inset-0 overflow-y-auto">
          <div className="min-h-full flex flex-col items-center px-4 pt-2 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/95 border border-[#FDE047]/30 p-5 sm:p-6"
            >
              <p className="text-[#FDE047] text-xs font-black tracking-[0.2em] uppercase text-center">Voice of Gudalur</p>
              <h1 className="mt-2 text-white text-xl sm:text-2xl font-black tracking-tight text-center">The Cost of Human–Wildlife Conflict</h1>

              <p className="mt-4 text-[#AED581] text-sm font-bold">Gudalur / Nilgiris</p>
              <div className="grid grid-cols-3 gap-2">
                <StatTile value="18" caption="human deaths in 2023" />
                <StatTile value="61+" caption="human deaths (2015–2023)" />
                <StatTile value="300+" caption="deaths — 50-year estimate" />
              </div>

              <p className="mt-4 text-[#AED581] text-sm font-bold">Tamil Nadu</p>
              <StatTile value="685" caption="human deaths in 10 years (522 by wild elephants)" />

              <p className="mt-4 text-[#AED581] text-sm font-bold">Unnatural Wildlife &amp; National Toll</p>
              <StatTile value="1,160+" caption="wild elephant deaths in 10 years — 741 electrocutions · 186 train strikes · 169 poaching · 64 poisoning" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <StatTile value="1,300+" caption="animals killed by illegal power fences" />
                <StatTile value="5,000+" caption="human deaths nationally in 12 years" />
              </div>

              <div className="mt-5 border-t border-[#FDE047]/25" />
              <h2 className="mt-3 text-white text-lg sm:text-xl font-black text-center">Demand a Permanent Solution</h2>
              <p className="mt-1 text-[#E6F7E6] text-sm text-center leading-relaxed">Protect people. Protect wildlife. End repeated deaths.</p>
              <button
                type="button"
                onClick={() => openApp(true)}
                className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-sm tracking-wide active:scale-95 transition"
              >
                Sign the Petition: Gudalur Safety Plan
              </button>
              <button
                type="button"
                onClick={() => openApp(false)}
                className="mt-2 w-full py-2.5 rounded-xl border border-[#AED581]/40 text-[#AED581] font-bold text-sm active:scale-95 transition"
              >
                Open Voice of Gudalur
              </button>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningAnimation;