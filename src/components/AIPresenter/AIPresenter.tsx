/**
 * AIPresenter - Floating living-intelligence guide, present on every page.
 * Speaks with live petition numbers, knows the user's state and route,
 * answers real questions in the chosen language (voice in + voice out).
 * Lazy-mounted, browser-native voice, zero performance impact.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AIAvatar } from './AIAvatar';
import { useVoice, langToSpeechTag } from '../../hooks/useVoice';
import { getGuidance, answerQuestion, brainSpeak, type PresenterContext } from '../../services/aiPresenter';
import type { Language } from '../../context/LanguageContext';

type ChatMsg = { role: 'user' | 'assistant'; content: string };
const msg = (role: 'user' | 'assistant', content: string): ChatMsg => ({ role, content });

const LIVE_LABEL: Record<Language, string> = {
  en: 'LIVE', ta: 'நேரலை', ml: 'ലൈവ്', kn: 'ಲೈವ್',
};

const CHIP_LABELS: Record<Language, Record<string, string>> = {
  en: { register: 'Register', sign: 'Sign petition', share: 'Share poster', sightings: 'Report sighting', about: 'Why movement?' },
  ta: { register: 'பதிவு', sign: 'மனுவில் சேர', share: 'போஸ்டர் பகிர்', sightings: 'நடமாட்டம் பதிவு', about: 'நமது நோக்கம்?' },
  ml: { register: 'രജിസ്റ്റർ', sign: 'ഒപ്പുവെക്കൂ', share: 'പോസ്റ്റർ ഷെയർ', sightings: 'സാന്നിധ്യം', about: 'ലക്ഷ്യം?' },
  kn: { register: 'ನೋಂದಣಿ', sign: 'ಸಹಿ ಹಾಕಿ', share: 'ಪೋಸ್ಟರ್ ಹಂಚಿ', sightings: 'ಸಂಚಾರ ವರದಿ', about: 'ಗುರಿ?' },
};

const ASK_PLACEHOLDER: Record<Language, string> = {
  en: 'Ask me...', ta: 'கேளுங்கள்...', ml: 'ചോദിക്കൂ...', kn: 'ಕೇಳಿ...',
};

interface AIPresenterProps {
  language: Language;
  currentPage: string;
  isRegistered: boolean;
  hasSigned: boolean;
  hasShared: boolean;
  profile?: { name?: string; gudalurId?: string; localityName?: string; pincode?: string } | null;
  onAction?: (action: string) => void;
}

export const AIPresenter: React.FC<AIPresenterProps> = ({
  language, currentPage, isRegistered, hasSigned, hasShared, profile, onAction,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const greetedRef = useRef(false);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const langTag = langToSpeechTag(language);

  const { speak, stopSpeaking, startListening, stopListening, isSpeaking, isListening, supported } = useVoice({
    lang: langTag,
    onTranscript: (text) => handleQuestion(text),
  });

  const buildCtx = useCallback((): PresenterContext => ({
    currentPage, language, isRegistered, hasSigned, hasShared,
    totalSignatures: 0, mediaCount: 0, profile,
  }), [currentPage, language, isRegistered, hasSigned, hasShared, profile]);

  const speakGuidance = useCallback(async () => {
    setBusy(true);
    let text = '';
    let action: string | undefined;
    try {
      const brain = await brainSpeak('__GREET__', language, buildCtx(), historyRef.current);
      if (brain) {
        text = brain.text;
        action = brain.action;
        historyRef.current = [...historyRef.current, msg('assistant', text)].slice(-8);
      } else {
        const response = await getGuidance(buildCtx());
        text = response.text;
        action = response.action;
        historyRef.current = [...historyRef.current, msg('assistant', text)].slice(-8);
      }
      setMessage(text);
      speak(text);
      if (action && onAction) onAction(action);
    } catch { /* silent */ } finally { setBusy(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildCtx, speak, onAction]);

  useEffect(() => {
    if (!greetedRef.current) {
      greetedRef.current = true;
      const timer = setTimeout(() => speakGuidance(), 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => speakGuidance(), 800);
    return () => clearTimeout(timer);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    stopListening();
    const q = question.trim();
    historyRef.current = [...historyRef.current, msg('user', q)].slice(-8);
    setBusy(true);
    let text = '';
    try {
      const brain = await brainSpeak(q, language, buildCtx(), historyRef.current);
      if (brain) {
        text = brain.text;
      } else {
        text = await answerQuestion(q, language, buildCtx());
      }
      historyRef.current = [...historyRef.current, msg('assistant', text)].slice(-8);
      setMessage(text);
      speak(text);
    } catch { /* silent */ } finally { setBusy(false); }
  }, [language, buildCtx, speak, stopListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) handleQuestion(inputText);
    setInputText('');
    setShowInput(false);
  };

  const chips: Array<{ action: string; label: string }> = (() => {
    const lbl = CHIP_LABELS[language] || CHIP_LABELS.en;
    if (!isRegistered) return [{ action: 'register', label: lbl.register }, { action: 'about', label: lbl.about }];
    if (!hasSigned) return [{ action: 'sign', label: lbl.sign }, { action: 'about', label: lbl.about }];
    if (!hasShared) return [{ action: 'share', label: lbl.share }, { action: 'sightings', label: lbl.sightings }];
    return [{ action: 'sightings', label: lbl.sightings }, { action: 'share', label: lbl.share }];
  })();

  const toggleMinimized = () => {
    if (!minimized) stopSpeaking();
    setMinimized(!minimized);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {(message || busy) && !minimized && (
        <div className="relative max-w-[280px] rounded-2xl bg-white p-3 shadow-xl border border-emerald-100">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[9px] font-black tracking-widest text-emerald-600">
              {LIVE_LABEL[language] || LIVE_LABEL.en}
            </span>
          </div>
          {busy ? (
            <p className="pr-4 text-xs text-slate-400">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-400 [animation-delay:240ms]" />
              </span>
            </p>
          ) : (
            <p className="pr-4 text-xs text-slate-700 leading-relaxed">{message}</p>
          )}
          {!busy && (
            <button onClick={() => { setMessage(''); stopSpeaking(); }} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center hover:bg-slate-300" aria-label="Dismiss">✕</button>
          )}
        </div>
      )}
      {!busy && !minimized && message && (
        <div className="flex flex-wrap justify-end gap-1.5">
          {chips.map((c) => (
            <button
              key={c.action}
              onClick={() => onAction && onAction(c.action)}
              className="rounded-full bg-[#1B5E20] px-2.5 py-1 text-[10px] font-bold text-[#F5F5F5] shadow-md transition hover:bg-[#2E7D32] active:scale-95"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
      {showInput && !minimized && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-xl border border-emerald-200">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={ASK_PLACEHOLDER[language] || ASK_PLACEHOLDER.en} className="w-32 text-xs outline-none bg-transparent" autoFocus />
          <button type="submit" className="text-emerald-600 text-xs font-bold" aria-label="Send">→</button>
        </form>
      )}
      <div className="flex items-center gap-2">
        {!minimized && (
          <div className="flex flex-col gap-1.5">
            {supported.stt && (
              <button onClick={() => isListening ? stopListening() : startListening()} className={`h-9 w-9 rounded-full flex items-center justify-center shadow-lg ${isListening ? 'bg-orange-500 text-white animate-pulse' : 'bg-white text-orange-600 border border-orange-200'}`} title="Speak" aria-label="Speak">
                🎤
              </button>
            )}
            <button onClick={() => setShowInput(!showInput)} className="h-9 w-9 rounded-full bg-white text-blue-600 border border-blue-200 flex items-center justify-center shadow-lg" title="Ask" aria-label="Ask">
              ❓
            </button>
            <button onClick={() => { if (message) speak(message); }} className="h-9 w-9 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-lg" title="Repeat" aria-label="Repeat">
              🔊
            </button>
          </div>
        )}
        <button onClick={toggleMinimized} className="transition-transform hover:scale-105 active:scale-95" title={minimized ? 'Open guide' : 'Minimize'} aria-label={minimized ? 'Open guide' : 'Minimize'}>
          <AIAvatar isSpeaking={isSpeaking} isListening={isListening} minimized={minimized} />
        </button>
      </div>
      {!minimized && <div className="text-[9px] text-slate-400 font-mono">{language.toUpperCase()} {isSpeaking ? '🔊' : isListening ? '🎤' : ''}</div>}
    </div>
  );
};

export default AIPresenter;