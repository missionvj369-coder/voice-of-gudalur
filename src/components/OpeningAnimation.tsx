/**
 * OpeningAnimation — VOG brand emergence + language selection + living intro.
 * Brand colors only: deep green, white, peacock yellow.
 * Flow: dots converge → VOG forms → language overlay → VOG intro in chosen
 * language (live petition count + urgent CTA) → open the app.
 * Force-show for demos/testing with ?intro=1 in the URL.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../context/LanguageContext';
import { AIAvatar } from './AIPresenter/AIAvatar';
import { petitionApi } from '../services/api';

// Guard to prevent animation from running twice
let animationStarted = false;

interface Props { onChoose: (lang: Language) => void; }

const DEEP = '#1B5E20', FERN = '#2E7D32', WHITE = '#F5F5F5', YELLOW = '#F59E0B', PALE = '#FDE047';

const OPTIONS: { code: Language; native: string; greeting: string; cta: string }[] = [
  { code: 'en', native: 'English', greeting: 'Welcome', cta: 'Continue in English' },
  { code: 'ta', native: 'தமிழ்', greeting: 'வணக்கம்', cta: 'தமிழில் தொடரவும்' },
  { code: 'ml', native: 'മലയാളം', greeting: 'സ്വാഗതം', cta: 'മലയാളത്തിൽ തുടരുക' },
  { code: 'kn', native: 'ಕನ್ನಡ', greeting: 'ಸ್ವಾಗತ', cta: 'ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
];

interface IntroCopy { self: string; live: string; cta: string; open: string; auto: string; }

const FETCHING: Record<Language, string> = {
  en: 'Fetching the live signature count…',
  ta: 'நேரடி கையெழுத்து எண்ணிக்கை பெறப்படுகிறது…',
  ml: 'നേർ പ്രതിജ്ഞാ സംഖ്യ ശേഖരിക്കുന്നു…',
  kn: 'ಲೈವ್ ಸಹಿ ಸಂಖ್ಯೆಯನ್ನು ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ…',
};

function introCopy(lang: Language, count: number | null): IntroCopy {
  const n = count === null ? '' : Number(count).toLocaleString('en-IN');
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
      self: 'I am VOG — your living intelligent guide of Gudalur. Together, we will solve every problem of Gudalur.',
      live,
      cta: 'Every moment we waste, someone in Gudalur is left as a victim of an animal attack. Act immediately — sign, share, stand as one.',
      open: 'Open Voice of Gudalur',
      auto: 'Opening automatically in a moment…',
    },
    ta: {
      self: 'நான் VOG — கூடலூரின் உங்கள் உயிருள்ள நுண்ணறிவு வழிகாட்டி. ஒன்றாக இணைந்து, கூடலூரின் ஒவ்வொரு பிரச்சனையையும் நாம் தீர்ப்போம்.',
      live,
      cta: 'நாம் வீணாக்கும் ஒவ்வொரு கணமும் கூடலூரில் ஒருவர் வனவிலங்கு தாக்குதலுக்கு இரையாக நேரிடும். உடனே செயல்படுங்கள் — கையெழுத்திடுங்கள், பகிருங்கள், ஒன்றாக நிற்போம்.',
      open: 'Voice of Gudalur ஐத் திறக்கவும்',
      auto: 'சில கணங்களில் தானாக திறக்கப்படும்…',
    },
    ml: {
      self: 'ഞാൻ VOG — ഗൂഡല്ലൂറിന്റെ നിങ്ങളുടെ ജീവനുള്ള ബുദ്ധിമാൻ ഗൈഡ്. ഒന്നിച്ച്, ഗൂഡല്ലൂറിന്റെ എല്ലാ പ്രശ്നങ്ങളും നമുക്ക് പരിഹരിക്കാം.',
      live,
      cta: 'നാം പാഴാക്കുന്ന ഒരു നിമിഷം ഗൂഡല്ലൂറിലെ ഒരാളെ വന്യമൃഗ ആക്രമണത്തിന് ഇരയാക്കും. ഉടൻ പ്രവർത്തിക്കുക — ഒപ്പിടുക, പങ്കിടുക, ഒന്നായി നിൽക്കുക.',
      open: 'Voice of Gudalur തുറക്കുക',
      auto: 'കുറച്ചു നിമിഷങ്ങളിൽ സ്വയം തുറക്കും…',
    },
    kn: {
      self: 'ನಾನು VOG — ಗೂಡಲೂರಿನ ನಿಮ್ಮ ಜೀವಂತ ಬುದ್ಧಿವಂತ ಮಾರ್ಗದರ್ಶಕ. ಒಟ್ಟಿಗೆ, ಗೂಡಲೂರಿನ ಪ್ರತಿ ಸಮಸ್ಯೆಯನ್ನು ನಾವು ಪರಿಹರಿಸೋಣ.',
      live,
      cta: 'ನಾವು ವ್ಯರ್ಥ ಮಾಡುವ ಪ್ರತಿ ಕ್ಷಣವೂ ಗೂಡಲೂರಿನಲ್ಲಿ ಯಾರೋ ಒಬ್ಬರು ವನ್ಯಜೀವಿ ದಾಳಿಗೆ ಬಲಿಯಾಗಬಹುದು. ತಕ್ಷಣ ಕಾರ್ಯನಿರ್ವಹಿಸಿ — ಸಹಿ, ಹಂಚಿಕೆ, ಒಗ್ಗಟ್ಟು.',
      open: 'Voice of Gudalur ತೆರೆಯಿರಿ',
      auto: 'ಕೆಲವೇ ಕ್ಷಣಗಳಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ತೆರೆಯುತ್ತದೆ…',
    },
  };
  return c[lang] || c.en;
}
export const OpeningAnimation: React.FC<Props> = ({ onChoose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'emerge' | 'languages' | 'intro' | 'done'>('emerge');
  const phaseRef = useRef<'emerge' | 'languages' | 'intro' | 'done'>('emerge');
  const rafRef = useRef<number>(0);
  phaseRef.current = phase;
  const [chosenLang, setChosenLang] = useState<Language | null>(null);
  const chosenLangRef = useRef<Language | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const resolvedRef = useRef(false);
  const transitionedRef = useRef(false);
  const openedRef = useRef(false);

  useEffect(() => {
    if (animationStarted) return;
    animationStarted = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = window.innerWidth < 768 ? 72 : 150;
    let W = 0, H = 0;
    const resize = () => {
      W = canvas.clientWidth || window.innerWidth;
      H = canvas.clientHeight || window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const cx = () => W / 2, cy = () => H / 2;
    const sc = () => Math.min(W, H) / 420;
    const targets: Array<{ x: number; y: number }> = [];
    const buildTargets = () => {
      targets.length = 0;
      const s = sc(), sp = 72 * s, sx = cx() - sp;
      for (let i = 0; i < 9; i++) { const t = i / 8; targets.push({ x: sx + t * 26 * s, y: cy() - 62 * s + t * 58 * s }); targets.push({ x: sx + (26 - t * 26) * s, y: cy() - 62 * s + t * 58 * s }); }
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; targets.push({ x: sx + sp + Math.cos(a) * 26 * s, y: cy() + Math.sin(a) * 32 * s }); }
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 1.6 - Math.PI * 0.7; targets.push({ x: sx + sp * 2 + Math.cos(a) * 26 * s, y: cy() + Math.sin(a) * 32 * s }); }
      while (targets.length < N) targets.push({ x: cx() + (Math.random() - 0.5) * W * 0.4, y: cy() + (Math.random() - 0.5) * H * 0.4 });
    };
    buildTargets();
    interface P { x: number; y: number; tx: number; ty: number; c: string; r: number; }
    const particles: P[] = [];
    for (let i = 0; i < N; i++) {
      const t = targets[i % targets.length];
      particles.push({ x: Math.random() * W, y: Math.random() * H, tx: t.x, ty: t.y, c: Math.random() < 0.14 ? YELLOW : Math.random() < 0.3 ? PALE : WHITE, r: 1.6 + Math.random() * 2.4 });
    }
    const start = performance.now();
    const dur = reduce ? 0.6 : 2.6;
    const draw = (now: number) => {
      const el = (now - start) / 1000;
      const fade = phaseRef.current === 'done' ? Math.min(1, (now - doneAt) / 450) : 0;
      ctx.fillStyle = DEEP;
      ctx.fillRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), Math.max(W, H) * 0.65);
      grad.addColorStop(0, 'rgba(46,125,50,0.35)');
      grad.addColorStop(1, 'rgba(27,94,32,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      const prog = reduce ? 1 : Math.min(1, Math.pow(Math.max(0, el) / dur, 0.42));
      for (const p of particles) {
        p.x += (p.tx - p.x) * (reduce ? 1 : 0.055);
        p.y += (p.ty - p.y) * (reduce ? 1 : 0.055);
        const pulse = 1 + Math.sin(el * 2.6 + p.tx * 0.013) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = (0.65 + prog * 0.35) * (1 - fade);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Giant VOG wordmark only in the emerge phase — never overlaps the
      // language overlay or the intro card.
      if (prog > 0.55 && phaseRef.current === 'emerge') {
        const a = Math.min(1, (prog - 0.55) / 0.45) * (1 - fade);
        ctx.globalAlpha = a;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = WHITE;
        ctx.font = `900 ${54 * sc()}px Inter, system-ui, sans-serif`;
        ctx.shadowColor = YELLOW;
        ctx.shadowBlur = 26;
        ctx.fillText('VOG', cx(), cy() + 84 * sc());
        ctx.shadowBlur = 0;
        ctx.fillStyle = PALE;
        ctx.font = `700 ${13 * sc()}px Inter, system-ui, sans-serif`;
        ctx.fillText('V O I C E   O F   G U D A L U R', cx(), cy() + 116 * sc());
        ctx.globalAlpha = 1;
      }
      if (el > dur + 0.45 && phaseRef.current === 'emerge' && !transitionedRef.current) { transitionedRef.current = true; setPhase('languages'); }
      rafRef.current = requestAnimationFrame(draw);
    };
    let doneAt = 0;
    const origDraw = draw;
    const loop = (now: number) => {
      if (phaseRef.current === 'done' && !doneAt) doneAt = now;
      origDraw(now);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch live signature count early (before language is chosen) so it is ready
  // by intro time. Fail-safe: stays null → intro shows a fetching line.
  useEffect(() => {
    let alive = true;
    petitionApi.signStats()
      .then((s) => { if (alive && s) { setLiveCount(Number(s.total) || 0); } })
      .catch(() => { /* offline is fine — fallback line shows */ })
      .finally(() => { if (alive) resolvedRef.current = true; });
    const t = setTimeout(() => { if (alive && !resolvedRef.current) setLiveCount(0); }, 4200);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishIntro = useCallback(() => {
    const code = chosenLangRef.current;
    if (!code || openedRef.current) return;
    transitionedRef.current = true;
    openedRef.current = true;
    setPhase('done');
    setTimeout(() => onChoose(code), 450);
  }, [onChoose]);

  const handleChoose = useCallback((code: Language) => {
    chosenLangRef.current = code;
    transitionedRef.current = true;
    phaseRef.current = 'intro';
    setChosenLang(code);
    setPhase('intro');
  }, []);

  // Auto-open a short beat after the intro has fully revealed.
  useEffect(() => {
    if (phase !== 'intro') return;
    const id = setTimeout(finishIntro, 7000);
    return () => clearTimeout(id);
  }, [phase, finishIntro]);

  const intro = chosenLang ? introCopy(chosenLang, liveCount) : null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true" aria-label="Welcome">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {phase === 'languages' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{ animation: 'vogFadeIn 0.5s ease-out' }}>
          <div className="text-center mb-8">
            <p className="text-[#FDE047] font-black tracking-[0.3em] text-[11px] mb-3">SELECT YOUR LANGUAGE</p>
            <p className="text-[#AED581] text-sm">Choose your language to continue</p>
          </div>
          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            {OPTIONS.map((o, i) => (
              <button key={o.code} type="button" onClick={() => handleChoose(o.code)} className="rounded-2xl border border-[#AED581]/35 bg-[#AED581]/10 hover:bg-[#AED581]/25 active:scale-[0.97] transition p-5 text-center focus:outline-none focus:ring-2 focus:ring-[#F59E0B]" style={{ animation: `vogSlideUp 0.4s ease-out ${i * 80}ms both` }} lang={o.code}>
                <span className="block text-2xl font-black text-white">{o.native}</span>
                <span className="block text-xs font-bold text-[#C8E6C9] mt-1">{o.greeting}</span>
                <span className="block text-[10px] text-[#FDE047] mt-1 font-semibold">{o.cta}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'intro' && intro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pb-8" style={{ animation: 'vogFadeIn 0.5s ease-out' }}>
          <div className="w-full max-w-md rounded-3xl bg-[#0A3D0A]/90 border border-[#FDE047]/30 shadow-2xl p-5 sm:p-6 text-center" style={{ animation: 'vogSlideUp 0.45s ease-out' }}>
            <div className="relative mx-auto mb-3" style={{ animation: 'vogPulse 2s ease-in-out infinite' }}>
              <AIAvatar isSpeaking={false} isListening={false} size={92} />
            </div>
            <p className="text-[#FDE047] font-black tracking-[0.22em] text-[11px]">VOG · VOICE OF GUDALUR</p>

            <p className="mt-3 text-white font-bold text-base sm:text-lg leading-relaxed" style={{ animation: 'vogFadeIn 0.5s ease-out 0.2s both' }}>
              {intro.self}
            </p>

            <p className="mt-3 text-[#FDE047] font-bold text-base leading-snug" style={{ animation: 'vogFadeIn 0.5s ease-out 0.8s both' }}>
              {intro.live}
            </p>

            <p className="mt-3 text-[13px] leading-relaxed text-[#AED581]/95" style={{ animation: 'vogFadeIn 0.5s ease-out 1.4s both' }}>
              {intro.cta}
            </p>

            <button type="button" onClick={finishIntro} className="mt-4 w-full py-3 rounded-xl bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-[#F5F5F5] font-black text-sm tracking-wide active:scale-95 transition" style={{ animation: 'vogFadeIn 0.4s ease-out 1.8s both' }}>
              {intro.open} →
            </button>
            <p className="mt-2 text-[10px] text-[#AED581]/75" style={{ animation: 'vogFadeIn 0.4s ease-out 2.1s both' }}>
              {intro.auto}
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[#1B5E20] pointer-events-none transition-opacity duration-500" style={{ opacity: phase === 'done' ? 1 : 0 }} />
    </div>
  );
};

export default OpeningAnimation;

