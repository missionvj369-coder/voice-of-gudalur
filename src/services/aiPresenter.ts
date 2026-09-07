/**
 * aiPresenter.ts — Talks to Ollama LLM for contextual guidance.
 * Lightweight: only called on page change or user question.
 */
import type { Language } from '../context/LanguageContext';

export interface PresenterContext {
  currentPage: string;
  language: Language;
  isRegistered: boolean;
  hasSigned: boolean;
  hasShared: boolean;
  totalSignatures: number;
  mediaCount: number;
}

export interface PresenterResponse {
  text: string;
  action?: string;
}

const OLLAMA_URL = (import.meta as any)?.env?.VITE_OLLAMA_URL || '';
const OLLAMA_MODEL = (import.meta as any)?.env?.VITE_OLLAMA_MODEL || 'llama3.2';

function buildSystemPrompt(): string {
  return `You are the AI presenter for Voice of Gudalur — a wildlife protection
and citizen action platform in Tamil Nadu, India. Guide users in their chosen
language (Tamil, English, Malayalam, Kannada). Keep responses SHORT (1-2 sentences).
Always end with what to do next. Key facts: Right to Life petition to Chief Minister,
register with phone (no OTP), Gudalur ID, PDF receipt after signing, share posters/videos.`;
}

function buildUserPrompt(ctx: PresenterContext): string {
  const state: string[] = [];
  if (!ctx.isRegistered) state.push('not registered');
  if (ctx.hasSigned) state.push('has signed');
  if (ctx.hasShared) state.push('has shared');
  return `User on "${ctx.currentPage}". State: ${state.join(', ') || 'new'}. Lang: ${ctx.language}.
Signatures: ${ctx.totalSignatures}. Media: ${ctx.mediaCount}. Give SHORT guidance.`;
}

function buildQASystemPrompt(lang: string): string {
  return `Voice of Gudalur AI assistant. Answer about: petition, signing, registration,
Gudalur ID, PDF receipt, sharing, wildlife sightings, grievances. SHORT answers. Lang: ${lang}.`;
}

function staticGuidance(ctx: PresenterContext): PresenterResponse {
  const g: Record<string, PresenterResponse> = {
    ta: { text: !ctx.isRegistered ? 'வணக்கம்! முதலில் பதிவு செய்யுங்கள்.' : !ctx.hasSigned ? 'மனுவில் கையெழுத்திடலாம்.' : 'பகிரலாம்!', action: !ctx.isRegistered ? 'register' : !ctx.hasSigned ? 'sign' : 'share' },
    en: { text: !ctx.isRegistered ? 'Welcome! Register first.' : !ctx.hasSigned ? 'Now sign the petition.' : 'Share to spread the word!', action: !ctx.isRegistered ? 'register' : !ctx.hasSigned ? 'sign' : 'share' },
    ml: { text: !ctx.isRegistered ? 'സ്വാഗതം! രജിസ്റ്റർ ചെയ്യാം.' : !ctx.hasSigned ? 'ഹർജിയിൽ ഒപ്പിടാം.' : 'ഷെയർ ചെയ്യാം!', action: !ctx.isRegistered ? 'register' : !ctx.hasSigned ? 'sign' : 'share' },
    kn: { text: !ctx.isRegistered ? 'ಸ್ವಾಗತ! ನೋಂದಣಿ ಮಾಡೋಣ.' : !ctx.hasSigned ? 'ಮನವಿಗೆ ಸಹಿ ಮಾಡೋವ.' : 'ಹಂಚಿಕೊಳ್ಳೋಣ!', action: !ctx.isRegistered ? 'register' : !ctx.hasSigned ? 'sign' : 'share' },
  };
  return g[ctx.language] || g.en;
}

function staticAnswer(question: string, lang: Language): string {
  const a: Record<string, string> = {
    ta: 'கூடலூரின் குரல் — வனவிலங்கு பாதுகாப்பு தளம்.',
    en: 'Voice of Gudalur — wildlife protection platform. Sign, share, report sightings.',
    ml: 'കൂടലൂർ വന്യജീവി സംരക്ഷണ പ്ലാറ്റ്ഫോം.',
    kn: 'ಕೂಡಲೂರ್ ವನ್ಯಜೀವಿ ಸಂರಕ್ಷಣೆ ವೇದಿಕೆ.',
  };
  return a[lang] || a.en;
}

function detectAction(text: string): string | undefined {
  const l = text.toLowerCase();
  if (/sign|கையெழுத்து|ഒപ്പಿടುಕ|ಸಹಿ/.test(l)) return 'sign';
  if (/share|பகிர்|ഷെയർ|ಹಂಚಿ/.test(l)) return 'share';
  if (/register|பதிவு|രജിസ്റ്റർ|ನೋಂದಣಿ/.test(l)) return 'register';
  return undefined;
}

export async function getGuidance(ctx: PresenterContext): Promise<PresenterResponse> {
  if (!OLLAMA_URL) return staticGuidance(ctx);
  try {
    const res = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(ctx) },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });
    if (!res.ok) return staticGuidance(ctx);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return staticGuidance(ctx);
    return { text: text.slice(0, 300), action: detectAction(text) };
  } catch {
    return staticGuidance(ctx);
  }
}

export async function answerQuestion(question: string, lang: Language): Promise<string> {
  if (!OLLAMA_URL) return staticAnswer(question, lang);
  try {
    const res = await fetch(`${OLLAMA_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: 'system', content: buildQASystemPrompt(lang) },
          { role: 'user', content: question },
        ],
        temperature: 0.5,
        stream: false,
      }),
    });
    if (!res.ok) return staticAnswer(question, lang);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || staticAnswer(question, lang);
  } catch {
    return staticAnswer(question, lang);
  }
}

export default { getGuidance, answerQuestion };