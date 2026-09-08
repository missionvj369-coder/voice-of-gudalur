import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AIAvatar } from './AIAvatar';
import { petitionApi, mediaApi } from '../../services/api';
import type { Language } from '../../context/LanguageContext';

/**
 * AIPresenter — VOG, the living greeter of Voice of Gudalur.
 * VOG wakes on every page load, greets in the user's language and speaks the
 * CURRENT live truth: total signatures, NEW signatures since last visit, NEW
 * posters/videos since last visit. NO chat/ask/reply UI — greet + report only.
 */
interface AIPresenterProps { language: Language; }

const LS_KEY = 'vog_last_seen';
interface LastSeen { signs: number; posters: number; videos: number; at: number; }

function readLastSeen(): LastSeen | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<LastSeen>;
    return typeof o?.signs === 'number'
      ? { signs: o.signs, posters: Number(o.posters) || 0, videos: Number(o.videos) || 0, at: Number(o.at) || 0 }
      : null;
  } catch { return null; }
}

interface LiveStats { total: number; posters: number; videos: number; }

async function fetchLiveStats(): Promise<LiveStats | null> {
  try {
    const s = await petitionApi.signStats();
    const media = await mediaApi.list();
    return {
      total: Number(s?.total) || 0,
      posters: media.filter((m) => m.kind === 'poster').length,
      videos: media.filter((m) => m.kind === 'video').length,
    };
  } catch { return null; }
}

function buildGreeting(lang: Language, live: LiveStats, last: LastSeen | null): string {
  const n = (v: number) => Number(v).toLocaleString('en-IN');
  const isFirst = last === null;
  const newSigns = last ? Math.max(0, live.total - last.signs) : 0;
  const newPosters = last ? Math.max(0, live.posters - last.posters) : 0;
  const newVideos = last ? Math.max(0, live.videos - last.videos) : 0;

  const headline: Record<Language, string> = {
    en: `Namaste! I am VOG — your living voice of Gudalur. Right now ${n(live.total)} people have signed the Right to Life petition.`,
    ta: `வணக்கம்! நான் VOG — கூடலூரின் உயிருள்ள குரல். இப்போது ${n(live.total)} பேர் உயிர் வாழ்வுரிமை மனுவில் கையெழுத்திட்டுள்ளனர்.`,
    ml: `നമസ്കാരം! ഞാൻ VOG — ഗൂഡല്ലൂറിന്റെ ജീവനുള്ള ശബ്ദം. ഇപ്പോൾ ${n(live.total)} പേർ ജീവനവകാശ ഹർജിയിൽ ഒപ്പിട്ടിരിക്കുന്നു.`,
    kn: `ನಮಸ್ಕಾರ! ನಾನು VOG — ಗೂಡಲೂರಿನ ಜೀವಂತ ಧ್ವನಿ. ಈಗ ${n(live.total)} ಜನರು ಜೀವನದ ಹಕ್ಕಿನ ಮನವಿಯಲ್ಲಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
  };

  const deltaLines: string[] = [];
  if (!isFirst) {
    if (newSigns > 0) deltaLines.push({
      en: `${n(newSigns)} new supporters signed since your last visit.`,
      ta: `கடந்த முறை வந்ததிலிருந்து ${n(newSigns)} புதிய ஆதரவாளர்கள் கையெழுத்திட்டனர்.`,
      ml: `കഴിഞ്ഞ സന്ദർശനത്തിക് ശേഷം ${n(newSigns)} പുതിയ പിന്തുണകാർ ഒപ്പിട്ടു.`,
      kn: `ಕೊನೆಯ ಭೇಟಿಯ ನಂತರ ${n(newSigns)} ಹೊಸ ಬೆಂಬಲಿಗರು ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
    }[lang] || `${newSigns} new supporters signed since your last visit.`);
    if (newPosters > 0) deltaLines.push({
      en: `${newPosters} new poster${newPosters === 1 ? '' : 's'} uploaded.`,
      ta: `${newPosters} புதிய போஸ்டர்கள் பதிவேற்றப்பட்டுள்ளன.`,
      ml: `${newPosters} പുതിയ പോസ്റ്റർ.`,
      kn: `${newPosters} ಹೊಸ ಪೋಸ್ಟರ್ಗಳು ಅಪ్‌ಲోಡ್ ಆಗಿವೆ.`,
    }[lang] || `${newPosters} new posters uploaded.`);
    if (newVideos > 0) deltaLines.push({
      en: `${newVideos} new video${newVideos === 1 ? '' : 's'} uploaded.`,
      ta: `${newVideos} புதிய வீடியோக்கள் பதிவேற்றப்பட்டுள்ளன.`,
      ml: `${newVideos} പുതിയ വീഡിയോ.`,
      kn: `${newVideos} ಹೊಸ ವೀಡಿಯೊಗಳು ಅಪ్‌ಲೋಡ್ ಆಗಿವೆ.`,
    }[lang] || `${newVideos} new videos uploaded.`);
  }

  const closer: Record<Language, string> = {
    en: 'Be the next voice — sign, share, and stand as one.',
    ta: 'அடுத்த குரலாக இருங்கள் — கையெழுத்திடுங்கள், பகிருங்கள், ஒன்றாக நிற்போம்.',
    ml: 'അടുത്ത ശബ്ദമായി മാറുക — ഒപ്പിടുക, പങ്കിടുക, ഒന്നായി നിൽക്കുക.',
    kn: 'ಮುಂದಿನ ಧ್ವನಿಯಾಗಿ — ಸಹಿ ಮಾಡಿ, ಹಂಚಿ, ಒಗ್ಗಟ್ಟಾಗಿರಿ.',
  };

  return `${headline[lang] || headline.en} ${deltaLines.join(' ')} ${closer[lang] || closer.en}`.trim();
}

const LIVE_LABEL: Record<Language, string> = { en: 'LIVE', ta: 'நேரலை', ml: 'ലൈവ്', kn: 'ಲೈವ್' };
export const AIPresenter: React.FC<AIPresenterProps> = ({ language }) => {
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [liveBadge, setLiveBadge] = useState(false);
  const greetedRef = useRef(false);

  const runGreeting = useCallback(async () => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    try {
      const live = await fetchLiveStats();
      if (!live) {
        setMessage({
          en: 'Namaste! I am VOG. The movement is alive — check back in a moment to see the latest numbers.',
          ta: 'வணக்கம்! நான் VOG. இயக்கம் உயிரோடு உள்ளது — சற்று நேரத்தில் சமீபத்திய எண்களைப் பாருங்கள்.',
          ml: 'നമസ്കാരം! ഞാൻ VOG. പ്രസ്ഥാനം ജീവനുള്ളതാണ് — കുറച്ചു കഴിഞ്ഞ് പുതിയ സംഖ്യകൾ കാണുക.',
          kn: 'ನಮಸ್ಕಾರ! ನಾನು VOG. ಚಳುವಳಿ ಜೀವಂತವಾಗಿದೆ — ಸ್ವಲ್ಪ ಹೊತ್ತಿನಲ್ಲಿ ಇತ್ತೀಚಿನ ಸಂಖ್ಯೆಗಳನ್ನು ನೋಡಿ.',
        }[language] || 'Namaste! I am VOG.');
        return;
      }
      const last = readLastSeen();
      setMessage(buildGreeting(language, live, last));
      setLiveBadge(true);
      // Persist the snapshot as "last seen" on unload (so refreshing mid-greeting
      // doesn't move the bar prematurely), plus a 15s safety settle.
      const save = () => {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ signs: live.total, posters: live.posters, videos: live.videos, at: Date.now() }));
        } catch { /* ignore */ }
      };
      window.addEventListener('beforeunload', save, { once: true });
      setTimeout(save, 15000);
    } catch {
      /* never throw */
    }
  }, [language]);

  useEffect(() => {
    void runGreeting();
  }, [runGreeting]);

  const toggleMinimized = () => setMinimized(!minimized);

  return (
    <div className="fixed bottom-4 right-4 z-[50] flex flex-col items-end gap-2">
      {message && !minimized && (
        <div className="relative max-w-[300px] rounded-2xl bg-white p-3.5 shadow-xl border border-emerald-100">
          <div className="mb-1 flex items-center gap-1.5">
            {liveBadge && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
            <span className="text-[9px] font-black tracking-widest text-emerald-600">
              {LIVE_LABEL[language] || LIVE_LABEL.en}
            </span>
          </div>
          <p className="pr-0 text-xs text-slate-700 leading-relaxed">{message}</p>
          <button
            onClick={() => setMessage('')}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center hover:bg-slate-300"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      <button
        onClick={toggleMinimized}
        className="transition-transform hover:scale-105 active:scale-95"
        title={minimized ? 'Open VOG' : 'Minimize VOG'}
        aria-label={minimized ? 'Open VOG' : 'Minimize VOG'}
      >
        <AIAvatar isSpeaking={false} isListening={false} minimized={minimized} />
      </button>
    </div>
  );
};

export default AIPresenter;