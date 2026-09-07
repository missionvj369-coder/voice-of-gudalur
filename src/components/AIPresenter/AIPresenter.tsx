/**
 * AIPresenter — Floating AI guide that talks to users in their language.
 * Lazy-mounted, browser-native voice, zero performance impact.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AIAvatar } from './AIAvatar';
import { useVoice, langToSpeechTag } from '../../hooks/useVoice';
import { getGuidance, answerQuestion, type PresenterContext } from '../../services/aiPresenter';
import type { Language } from '../../context/LanguageContext';

interface AIPresenterProps {
  language: Language;
  currentPage: string;
  isRegistered: boolean;
  hasSigned: boolean;
  hasShared: boolean;
  totalSignatures: number;
  mediaCount: number;
  onAction?: (action: string) => void;
}

export const AIPresenter: React.FC<AIPresenterProps> = ({
  language, currentPage, isRegistered, hasSigned, hasShared,
  totalSignatures, mediaCount, onAction,
}) => {
  const [minimized, setMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [inputText, setInputText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const greetedRef = useRef(false);
  const langTag = langToSpeechTag(language);

  const { speak, stopSpeaking, startListening, stopListening, isSpeaking, isListening, supported } = useVoice({
    lang: langTag,
    onTranscript: (text) => handleQuestion(text),
  });

  useEffect(() => {
    if (!greetedRef.current) {
      greetedRef.current = true;
      const timer = setTimeout(() => speakGuidance(), 1200);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => speakGuidance(), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const speakGuidance = useCallback(async () => {
    try {
      const ctx: PresenterContext = { currentPage, language, isRegistered, hasSigned, hasShared, totalSignatures, mediaCount };
      const response = await getGuidance(ctx);
      setMessage(response.text);
      speak(response.text);
      if (response.action && onAction) onAction(response.action);
    } catch { /* silent */ }
  }, [currentPage, language, isRegistered, hasSigned, hasShared, totalSignatures, mediaCount, speak, onAction]);

  const handleQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    stopListening();
    try {
      const answer = await answerQuestion(question, language);
      setMessage(answer);
      speak(answer);
    } catch { /* silent */ }
  }, [language, speak, stopListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) handleQuestion(inputText);
    setInputText('');
    setShowInput(false);
  };

  const toggleMinimized = () => {
    if (!minimized) stopSpeaking();
    setMinimized(!minimized);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2">
      {message && !minimized && (
        <div className="relative max-w-[280px] rounded-2xl bg-white p-3 shadow-xl border border-emerald-100">
          <p className="text-xs text-slate-700 leading-relaxed pr-4">{message}</p>
          <button onClick={() => { setMessage(''); stopSpeaking(); }} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-slate-200 text-slate-500 text-[10px] flex items-center justify-center hover:bg-slate-300">✕</button>
        </div>
      )}
      {showInput && !minimized && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-xl border border-emerald-200">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Ask me..." className="w-32 text-xs outline-none bg-transparent" autoFocus />
          <button type="submit" className="text-emerald-600 text-xs font-bold">→</button>
        </form>
      )}
      <div className="flex items-center gap-2">
        {!minimized && (
          <div className="flex flex-col gap-1.5">
            {supported.stt && (
              <button onClick={() => isListening ? stopListening() : startListening()} className={`h-9 w-9 rounded-full flex items-center justify-center shadow-lg ${isListening ? 'bg-orange-500 text-white animate-pulse' : 'bg-white text-orange-600 border border-orange-200'}`} title="Speak">
                🎤
              </button>
            )}
            <button onClick={() => setShowInput(!showInput)} className="h-9 w-9 rounded-full bg-white text-blue-600 border border-blue-200 flex items-center justify-center shadow-lg" title="Ask">
              ❓
            </button>
            <button onClick={() => { if (message) speak(message); }} className="h-9 w-9 rounded-full bg-white text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-lg" title="Repeat">
              🔊
            </button>
          </div>
        )}
        <button onClick={toggleMinimized} className="transition-transform hover:scale-105 active:scale-95" title={minimized ? 'Open guide' : 'Minimize'}>
          <AIAvatar isSpeaking={isSpeaking} isListening={isListening} minimized={minimized} />
        </button>
      </div>
      {!minimized && <div className="text-[9px] text-slate-400 font-mono">{language.toUpperCase()} {isSpeaking ? '🔊' : isListening ? '🎤' : ''}</div>}
    </div>
  );
};

export default AIPresenter;