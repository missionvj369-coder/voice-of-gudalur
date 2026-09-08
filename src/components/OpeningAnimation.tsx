/**
 * OpeningAnimation — VOG brand emergence + language selection.
 * Brand colors only: deep green, white, peacock yellow.
 * High-performance canvas (single RAF loop, mobile-aware, never restarts).
 * Flow: dots converge → VOG forms → language overlay → onChoose → fade out.
 * Force-show for demos/testing with ?intro=1 in the URL.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../context/LanguageContext';

interface Props { onChoose: (lang: Language) => void; }

const DEEP = '#1B5E20', FERN = '#2E7D32', WHITE = '#F5F5F5', YELLOW = '#F59E0B', PALE = '#FDE047';

const OPTIONS: { code: Language; native: string; greeting: string; cta: string }[] = [
  { code: 'en', native: 'English', greeting: 'Welcome', cta: 'Continue in English' },
  { code: 'ta', native: 'தமிழ்', greeting: 'வணக்கம்', cta: 'தமிழில் தொடரவும்' },
  { code: 'ml', native: 'മലയാളം', greeting: 'സ്വാഗതം', cta: 'മലയാളത്തിൽ തുടരുക' },
  { code: 'kn', native: 'ಕನ್ನಡ', greeting: 'ಸ್ವಾಗತ', cta: 'ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
];

export const OpeningAnimation: React.FC<Props> = ({ onChoose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'emerge' | 'languages' | 'done'>('emerge');
  const phaseRef = useRef<'emerge' | 'languages' | 'done'>('emerge');
  const rafRef = useRef<number>(0);
  phaseRef.current = phase;

  // Single animation loop — mounted once, never restarted (no jank on phase change).
  useEffect(() => {
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

    // VOG letter targets (dot-matrix V, O, G)
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
      particles.push({
        x: Math.random() * W, y: Math.random() * H, tx: t.x, ty: t.y,
        c: Math.random() < 0.14 ? YELLOW : Math.random() < 0.3 ? PALE : WHITE,
        r: 1.6 + Math.random() * 2.4,
      });
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

      if (prog > 0.55 && phaseRef.current !== 'done') {
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

      // Emerge -> languages (once)
      if (el > dur + 0.45 && phaseRef.current === 'emerge') setPhase('languages');

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
  }, []);

  const handleChoose = useCallback((code: Language) => {
    setPhase('done');
    window.setTimeout(() => onChoose(code), 500);
  }, [onChoose]);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true" aria-label="Welcome">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {phase === 'languages' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{ animation: 'vogFadeIn 0.5s ease-out' }}>
          <div className="text-center mb-8">
            <p className="text-[#FDE047] font-black tracking-[0.3em] text-[11px] mb-3">SELECT YOUR LANGUAGE</p>
            <h2 className="text-white font-bold text-xl sm:text-2xl mb-2">வணக்கம் · സ്വാഗതം · ಸ್ವಾಗತ · Welcome</h2>
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
      <div className="absolute inset-0 bg-[#1B5E20] pointer-events-none transition-opacity duration-500" style={{ opacity: phase === 'done' ? 1 : 0 }} />
    </div>
  );
};

export default OpeningAnimation;
