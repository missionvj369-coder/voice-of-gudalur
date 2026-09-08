import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AIAvatar } from './AIAvatar';
import { petitionApi, mediaApi } from '../../services/api';
import type { Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

/**
 * AIPresenter — VOG, the living greeter of Voice of Gudalur.
 * VOG wakes on every page load and greets in the user's language:
 *  - Guests:    live signature count + urgent CTA (stays until dismissed).
 *  - Residents: mission greeting — grow the movement, share posters/videos.
 * When NEW posters/videos were uploaded since the last visit, VOG fires a
 * second "share it now" chat bubble that auto-closes in 10 seconds.
 * NO chat/ask/reply UI — greet + report only.
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
    en: `Vanakam! I am VOG — your living voice of Gudalur. Right now ${n(live.total)} people have signed the Right to Life petition.`,
    ta: `வணக்கம்! நான் VOG — கூடலூரின் உயிருள்ள குரல். இப்போது ${n(live.total)} பேர் உயிர் வாழ்வுரிமை மனுவில் கையெழுத்திட்டுள்ளனர்.`,
    ml: `നമസ്കാരം! ഞാൻ VOG — ഗൂഡല്ലൂറിന്റെ ജീവനുള്ള ശബ്ദം. ഇപ്പോൾ ${n(live.total)} പേർ ജീവനവകാശ ഹർജിയിൽ ഒപ്പിട്ടിരിക്കുന്നു.`,
    kn: `ನಮಸ್ಕಾರ! ನಾನು VOG — ಗೂಡಲೂರಿನ ಜೀವಂತ ಧ್ವನಿ. ಈಗ ${n(live.total)} ಜನರು ಜೀವನದ ಹಕ್ಕಿನ ಮನವಿಯಲ್ಲಿ ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
  };

  const deltaLines: string[] = [];
  if (!isFirst && newSigns > 0) {
    deltaLines.push({
      en: `${n(newSigns)} new supporters signed since your last visit.`,
      ta: `கடந்த முறை வந்ததிலிருந்து ${n(newSigns)} புதிய ஆதரவாளர்கள் கையெழுத்திட்டனர்.`,
      ml: `കഴിഞ്ഞ സന്ദർശനത്തിനു ശേഷം ${n(newSigns)} പുതിയ പിന്തുണക്കാർ ഒപ്പിട്ടു.`,
      kn: `ಕೊನೆಯ ಭೇಟಿಯ ನಂತರ ${n(newSigns)} ಹೊಸ ಬೆಂಬಲಿಗರು ಸಹಿ ಹಾಕಿದ್ದಾರೆ.`,
    }[lang] || `${newSigns} new supporters signed since your last visit.`);
  }
  if (!isFirst && newPosters > 0) {
    deltaLines.push({
      en: `${newPosters} new poster${newPosters === 1 ? '' : 's'} uploaded.`,
      ta: `${newPosters} புதிய போஸ்டர்கள் பதிவேற்றப்பட்டுள்ளன.`,
      ml: `${newPosters} പുതിയ പോസ്റ്ററുകൾ അപ്‌ലോഡ് ചെയ്തു.`,
      kn: `${newPosters} ಹೊಸ ಪೋಸ್ಟರ್‌ಗಳು ಅಪ್‌ಲೋಡ್ ಆಗಿವೆ.`,
    }[lang] || `${newPosters} new posters uploaded.`);
  }
  if (!isFirst && newVideos > 0) {
    deltaLines.push({
      en: `${newVideos} new video${newVideos === 1 ? '' : 's'} uploaded.`,
      ta: `${newVideos} புதிய வீடியோக்கள் பதிவேற்றப்பட்டுள்ளன.`,
      ml: `${newVideos} പുതിയ വീഡിയോകൾ അപ്‌ലോഡ് ചെയ്തു.`,
      kn: `${newVideos} ಹೊಸ ವೀಡಿಯೊಗಳು ಅಪ್‌ಲೋಡ್ ಆಗಿವೆ.`,
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

/** Resident greeting — mission mode: multiply the movement, share media. */
function buildMemberGreeting(lang: Language, live: LiveStats, name: string): string {
  const n = Number(live.total).toLocaleString('en-IN');
  return {
    en: `Vanakam ${name}! We are now ${n} voices strong — and growing every hour. Your next mission: multiply us! Share a poster or video with every friend and group you know — one share today can ignite a hundred more voices tomorrow!`,
    ta: `வணக்கம் ${name}! இப்போது நாம் ${n} குரல்களாக பலமாக நிற்கிறோம் — ஒவ்வொரு மணி நேரமும் வளர்கிறோம். உங்கள் அடுத்த பணி: நம்மை இன்னும் பெரிதாக்குங்கள்! போஸ்டர் மற்றும் வீடியோக்களை உங்கள் ஒவ்வொரு நண்பருடனும் பகிருங்கள் — இன்று ஒரு பங்கீடு, நாளை நூறு குரல்கள்!`,
    ml: `വണക്കം ${name}! ഇന്ന് നമ്മൾ ${n} ശബ്ദങ്ങളായി ശക്തരായി നിൽക്കുന്നു — ഓരോ മണിക്കൂറും വളരുന്നു. അടുത്ത ദൗത്യം: നമ്മൾ വളരട്ടെ! പോസ്റ്ററുകളും വീഡിയോകളും സുഹൃത്തുക്കളുമായി പങ്കിടൂ — ഇന്ന് ഒരു ഷെയർ, നാളെ നൂറ് ശബ്ദങ്ങൾ!`,
    kn: `ವಣಕ್ಕಂ ${name}! ಈಗ ನಾವು ${n} ಧ್ವನಿಗಳಾಗಿ ಬಲವಾಗಿ ನಿಂತಿದ್ದೇವೆ — ಪ್ರತಿ ಗಂಟೆಗೂ ಬೆಳೆಯುತ್ತಿದ್ದೇವೆ. ನಿಮ್ಮ ಮುಂದಿನ ಕಾರ್ಯ: ನಮ್ಮನ್ನು ಗುಣಿಸಿ! ಪೋಸ್ಟರ್ ಮತ್ತು ವೀಡಿಯೊಗಳನ್ನು ಪ್ರತಿ ಸ್ನೇಹಿತರೊಂದಿಗೆ ಹಂಚಿ — ಇಂದು ಒಂದು ಹಂಚಿಕೆ, ನಾಳೆ ನೂರು ಧ್ವನಿಗಳು!`,
  }[lang];
}

/** "New media is live — share it NOW" call-to-action, maximum urgency. */
function buildMediaNotice(lang: Language, posters: number, videos: number): string {
  if (posters > 0 && videos > 0) {
    return {
      en: `🚀 ${posters} new poster${posters === 1 ? '' : 's'} & ${videos} new video${videos === 1 ? '' : 's'} just dropped! Share them everywhere — power the movement to victory!`,
      ta: `🚀 ${posters} புதிய போஸ்டர் & ${videos} புதிய வீடியோ வந்துள்ளன! எங்கும் பகிருங்கள் — இயக்கத்தை வெற்றியை நோக்கி முன்னெடுக்கவும்!`,
      ml: `🚀 ${posters} പുതിയ പോസ്റ്ററും ${videos} പുതിയ വീഡിയോയും എത്തി! എവിടെയും പങ്കിടൂ — പ്രസ്ഥാനത്തെ വിജയത്തിലേക്ക് നയിക്കൂ!`,
      kn: `🚀 ${posters} ಹೊಸ ಪೋಸ್ಟರ್ & ${videos} ಹೊಸ ವೀಡಿಯೊ ಬಂದಿವೆ! ಎಲ್ಲೆಡೆ ಹಂಚಿ — ಚಳುವಳಿಯನ್ನು ಗೆಲುವಿನತ್ತ ಮುನ್ನಡೆಸಿ!`,
    }[lang] || 'New poster & video just dropped — share them everywhere!';
  }
  if (posters > 0) {
    return {
      en: `🔥 Fresh poster just dropped! Blast it to the world — every share supercharges the movement!`,
      ta: `🔥 புதிய போஸ்டர் வந்துள்ளது! உலகம் முழுவதும் பகிருங்கள் — ஒவ்வொரு பங்கீடும் இயக்கத்தை வலுப்படுத்தும்!`,
      ml: `🔥 പുതിയ പോസ്റ്റർ എത്തി! ലോകമെമ്പാടും പങ്കിടൂ — ഓരോ ഷെയറും പ്രസ്ഥാനത്തെ ശക്തിപ്പെടുത്തും!`,
      kn: `🔥 ಹೊಸ ಪೋಸ್ಟರ್ ಬಂದಿದೆ! ಜಗತ್ತಿನಾದ್ಯಂತ ಹಂಚಿ — ಪ್ರತಿ ಹಂಚಿಕೆಯೂ ಚಳುವಳಿಯನ್ನು ಬಲಪಡಿಸುತ್ತದೆ!`,
    }[lang] || 'Fresh poster just dropped — share it with the world!';
  }
  return {
    en: `🎬 New video just landed! Fire it to your groups — let the world hear Gudalur roar!`,
    ta: `🎬 புதிய வீடியோ வந்துள்ளது! உங்கள் குழுக்களில் பகிருங்கள் — கூடலூரின் குரலை உலகம் கேட்கட்டும்!`,
    ml: `🎬 പുതിയ വീഡിയോ എത്തി! ഗ്രൂപ്പുകളിൽ പങ്കിടൂ — ഗൂഡല്ലൂറിന്റെ ശബ്ദം ലോകം കേട്ടാലും!`,
    kn: `🎬 ಹೊಸ ವೀಡಿಯೊ ಬಂದಿದೆ! ನಿಮ್ಮ ಗುಂಪುಗಳಲ್ಲಿ ಹಂಚಿ — ಗೂಡಲೂರಿನ ಧ್ವನಿ ಜಗತ್ತು ಕೇಳಲಿ!`,
  }[lang] || 'New video just landed — share it to your groups!';
}

const AUTO_CLOSE_SECONDS = 9;

export const AIPresenter: React.FC<AIPresenterProps> = ({ language }) => {
  const { profile } = useAuth();
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [mediaNotice, setMediaNotice] = useState('');
  const greetedRef = useRef(false);
  const liveSnapshotRef = useRef<LiveStats | null>(null);

  const saveSnapshot = useCallback((live: LiveStats) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        signs: live.total, posters: live.posters, videos: live.videos, at: Date.now(),
      }));
    } catch { /* ignore */ }
  }, []);

  const runGreeting = useCallback(async () => {
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
      liveSnapshotRef.current = live;
      const last = readLastSeen();
      const newPosters = last ? Math.max(0, live.posters - last.posters) : 0;
      const newVideos = last ? Math.max(0, live.videos - last.videos) : 0;

      // Greeting: residents get the mission greeting, guests the live-truth CTA.
      setMessage(
        profile?.name
          ? buildMemberGreeting(language, live, profile.name)
          : buildGreeting(language, live, last),
      );

      // Fresh media since last visit → urgent "share it now" bubble (9s auto-close).
      if (newPosters > 0 || newVideos > 0) {
        setMediaNotice(buildMediaNotice(language, newPosters, newVideos));
      }

      // Save the snapshot after a settle beat so a refresh mid-greeting does
      // not falsely consume the "since last visit" delta.
      setTimeout(() => saveSnapshot(live), 15000);
    } catch {
      /* never throw */
    }
  }, [language, saveSnapshot, profile?.name]);

  useEffect(() => {
    if (!greetedRef.current) void runGreeting();
  }, [runGreeting]);

  // Every VOG notification auto-closes after 9 seconds.
  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(''), AUTO_CLOSE_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [message]);

  // Media notice auto-closes after 9 seconds.
  useEffect(() => {
    if (!mediaNotice) return;
    const id = window.setTimeout(() => setMediaNotice(''), AUTO_CLOSE_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [mediaNotice]);

  // Save the snapshot before unload so deltas stay honest across sessions.
  useEffect(() => {
    const save = () => { if (liveSnapshotRef.current) saveSnapshot(liveSnapshotRef.current); };
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, [saveSnapshot]);

  const toggleMinimized = () => {
    setMinimized((m) => {
      // Reopening an empty VOG re-greets with FRESH live data.
      if (m && !message) void runGreeting();
      return !m;
    });
  };

  // Chat-bubble tail: rotated square pointing down at the VOG avatar.
  const bubbleTail = (
    <div
      className="absolute -bottom-1 right-8 h-3 w-3 rotate-45"
      style={{ background: '#9ACD32' }}
      aria-hidden="true"
    />
  );

  return (
    <div className="fixed bottom-4 right-4 z-[50] flex flex-col items-end gap-2">
      {message && !minimized && (
        <div className="relative max-w-[300px] rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-xl" style={{ background: '#9ACD32' }}>
          {bubbleTail}
          <p className="text-xs leading-relaxed font-bold" style={{ color: '#FFFDF4' }}>{message}</p>
          <button
            onClick={() => setMessage('')}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white/90 text-[#4a7a10] text-[10px] flex items-center justify-center hover:bg-white shadow"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
      {mediaNotice && !minimized && (
        <div className="relative max-w-[300px] rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-xl" style={{ background: '#9ACD32' }}>
          {bubbleTail}
          <p className="text-xs leading-relaxed font-black" style={{ color: '#FFFDF4' }}>{mediaNotice}</p>
          <button
            onClick={() => setMediaNotice('')}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-white/90 text-[#4a7a10] text-[10px] flex items-center justify-center hover:bg-white shadow"
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