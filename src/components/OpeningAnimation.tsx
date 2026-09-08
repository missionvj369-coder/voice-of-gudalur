import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../context/LanguageContext';
interface Props { onChoose: (lang: Language) => void; }
const DEEP = '#1B5E20', WHITE = '#F5F5F5', YELLOW = '#F59E0B', PALE = '#FDE047';
const OPTIONS: { code: Language; native: string; greeting: string; cta: string }[] = [
  { code: 'en', native: 'English', greeting: 'Welcome', cta: 'Continue in English' },
  { code: 'ta', native: 'தமிழ்', greeting: 'வணக்கம்', cta: 'தமிழில் தொடரவும்' },
  { code: 'ml', native: 'മലയാളം', greeting: 'സ്വാഗതം', cta: 'മലയാളത്തിൽ തുടരുക' },
  { code: 'kn', native: 'ಕನ್ನಡ', greeting: 'ಸ್ವಾಗತ', cta: 'ಕನ್ನಡದಲ್ಲಿ ಮುಂದುವರಿಯಿರಿ' },
];
export const OpeningAnimation: React.FC<Props> = ({ onChoose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'emerge' | 'languages' | 'done'>('emerge');
  const animRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const N = window.innerWidth < 768 ? 80 : 160;
    let W = 0, H = 0;
    const resize = () => { W = canvas.clientWidth; H = canvas.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize(); window.addEventListener('resize', resize);
    const cx = () => W / 2, cy = () => H / 2, s = () => Math.min(W, H) / 400;
    interface P { x: number; y: number; tx: number; ty: number; c: string; s: number; }
    const particles: P[] = [], targets: Array<{ x: number; y: number }> = [];
    const sc = s(), sp = 70 * sc, sx = cx() - sp;
    for (let i = 0; i < 8; i++) { const t = i / 7; targets.push({ x: sx + t * 25 * sc, y: cy() - 60 * sc + t * 60 * sc }); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; targets.push({ x: sx + sp + Math.cos(a) * 25 * sc, y: cy() + Math.sin(a) * 30 * sc }); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 1.5 - Math.PI * 0.75; targets.push({ x: sx + sp * 2 + Math.cos(a) * 25 * sc, y: cy() + Math.sin(a) * 30 * sc }); }
    while (targets.length < N) targets.push({ x: cx() + (Math.random() - 0.5) * W * 0.3, y: cy() + (Math.random() - 0.5) * H * 0.3 });
    for (let i = 0; i < N; i++) { const t = targets[i % targets.length]; particles.push({ x: Math.random() * W, y: Math.random() * H, tx: t.x, ty: t.y, c: Math.random() < 0.15 ? YELLOW : Math.random() < 0.3 ? PALE : WHITE, s: 1.5 + Math.random() * 2.5 }); }
    let startTime = performance.now();
    const animate = (now: number) => {
      const el = (now - startTime) / 1000;
      ctx.fillStyle = DEEP; ctx.fillRect(0, 0, W, H);
      const grad = ctx.createRadialGradient(cx(), cy(), 0, cx(), cy(), Math.max(W, H) * 0.6);
      grad.addColorStop(0, 'rgba(46,125,50,0.3)'); grad.addColorStop(1, 'rgba(27,94,32,0)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
      const dur = reduce ? 0.5 : 2.5, prog = Math.min(1, Math.pow(el / dur, 0.4));
      for (const p of particles) { p.x += (p.tx - p.x) * (reduce ? 1 : 0.06); p.y += (p.ty - p.y) * (reduce ? 1 : 0.06); const pu = 1 + Math.sin(el * 3 + p.tx * 0.01) * 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * pu, 0, Math.PI * 2); ctx.fillStyle = p.c; ctx.globalAlpha = 0.7 + prog * 0.3; ctx.fill(); ctx.globalAlpha = 1; }
      if (prog > 0.6) { const a2 = Math.min(1, (prog - 0.6) / 0.4); ctx.globalAlpha = a2; ctx.fillStyle = WHITE; ctx.font = `bold ${50 * s()}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.shadowColor = YELLOW; ctx.shadowBlur = 20; ctx.fillText('VOG', cx(), cy() + 80 * s()); ctx.shadowBlur = 0; ctx.font = `600 ${14 * s()}px system-ui, sans-serif`; ctx.fillStyle = PALE; ctx.fillText('VOICE OF GUDALUR', cx(), cy() + 110 * s()); ctx.globalAlpha = 1; }
      if (el > dur + 0.5) setPhase('languages');
      if (phase === 'done') { ctx.fillStyle = `rgba(27,94,32,${Math.min(1, (el - dur - 1) * 2)})`; ctx.fillRect(0, 0, W, H); }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [phase]);
  const handleChoose = useCallback((code: Language) => { setPhase('done'); setTimeout(() => onChoose(code), 600); }, [onChoose]);
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {phase === 'languages' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className="text-center mb-8">
            <p className="text-[#FDE047] font-black tracking-[0.25em] text-[11px] mb-3">SELECT YOUR LANGUAGE</p>
            <h2 className="text-white font-bold text-2xl mb-2">வணக்கம் · സ്വാഗതം · ಸ್ವಾಗತ · Welcome</h2>
            <p className="text-[#AED581] text-sm">Choose your language to continue</p>
          </div>
          <div className="w-full max-w-md grid grid-cols-2 gap-3">
            {OPTIONS.map((o, i) => (
              <button key={o.code} type="button" onClick={() => handleChoose(o.code)} className="rounded-2xl border border-[#AED581]/35 bg-[#AED581]/10 hover:bg-[#AED581]/25 active:scale-[0.97] transition p-5 text-center focus:outline-none focus:ring-2 focus:ring-[#F59E0B]" style={{ animation: `slideUp 0.4s ease-out ${i * 80}ms both` }} lang={o.code}>
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