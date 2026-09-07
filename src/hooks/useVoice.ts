/**
 * useVoice — Browser-native TTS/STT hook (zero latency, no server calls).
 *
 * TTS: window.speechSynthesis — built into every browser, supports
 *       Tamil, English, Malayalam, Kannada natively.
 * STT: window.SpeechRecognition / webkitSpeechRecognition — built into
 *       Chrome, Edge, Safari. Sends audio to Google's servers for
 *       transcription (free, no API key).
 *
 * No external dependencies. No performance impact on app render.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVoiceOptions {
  lang: string; // 'ta-IN', 'en-IN', 'ml-IN', 'kn-IN'
  onTranscript?: (text: string) => void;
}

export function useVoice({ lang, onTranscript }: UseVoiceOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState({ tts: false, stt: false });
  const recognitionRef = useRef<any>(null);

  // Check browser support on mount (no render impact — runs once)
  useEffect(() => {
    setSupported({
      tts: typeof window !== 'undefined' && 'speechSynthesis' in window,
      stt: typeof window !== 'undefined' && (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition),
    });
  }, []);

  // Speak text in the selected language
  const speak = useCallback(
    (text: string) => {
      if (!supported.tts) return;
      try {
        window.speechSynthesis.cancel(); // stop any ongoing speech
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang;
        utter.rate = 0.95;
        utter.pitch = 1.0;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [lang, supported.tts],
  );

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (supported.tts) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported.tts]);

  // Start listening
  const startListening = useCallback(() => {
    if (!supported.stt || isListening) return;
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0]?.transcript || '';
        if (transcript && onTranscript) onTranscript(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [lang, isListening, onTranscript, supported.stt]);

  // Stop listening
  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch { /* noop */ }
    setIsListening(false);
  }, []);

  return { speak, stopSpeaking, startListening, stopListening, isSpeaking, isListening, supported };
}

export default useVoice;

/** Map our Language code → BCP-47 tag for speech APIs. */
export function langToSpeechTag(lang: string): string {
  const map: Record<string, string> = {
    en: 'en-IN',
    ta: 'ta-IN',
    ml: 'ml-IN',
    kn: 'kn-IN',
  };
  return map[lang] || 'en-IN';
}
