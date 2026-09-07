/**
 * OpeningAnimation.tsx — Voice of Gudalur brand opening sequence.
 * Five scenes with proper separation. Brand colors: deep green, peacock blue, gold, white.
 */
import React, { useEffect, useRef, useState } from 'react';

const T = { scene1End: 5.0, scene2End: 7.5, scene3End: 10.0, scene4End: 12.5, scene5End: 25.0, end: 26.0 };

const G = {
  deep: '#1B5E20', fern: '#2E7D32', mint: '#059669', emerald: '#059669',
  gold: '#F59E0B', sun: '#FBBF24', pale: '#FDE047', white: '#FFFFFF', dark: '#0a1f10',
};

function isMobile() {
  return typeof window !== 'undefined' && (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
}
function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }
function lerp(a: number, b: number, p: number) { return a + (b - a) * p; }
function easeInOut(p: number) { return -(Math.cos(Math.PI * p) - 1) / 2; }
function hexRgb(h: string): [number, number, number] { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerpColor(c1: string, c2: string, p: number): string { const [r1,g1,b1]=hexRgb(c1),[r2,g2,b2]=hexRgb(c2); return `rgb(${Math.round(lerp(r1,r2,p))},${Math.round(lerp(g1,g2,p))},${Math.round(lerp(b1,b2,p))})`; }
function rgba(h: string, a: number): string { const [r,g,b]=hexRgb(h); return `rgba(${r},${g},${b},${a})`; }

type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number };
function createParticles(w: number, h: number, count: number): Particle[] {
  return Array.from({length:count}, () => ({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-0.5)*0.5,vy:(Math.random()-0.5)*0.5,size:1.5+Math.random()*2,alpha:Math.random()*0.5+0.1}));
}
function updateParticles(p:Particle[],dt:number,W:number,H:number) { for(const pt of p){pt.x+=pt.vx*dt*60;pt.y+=pt.vy*dt*60;if(pt.x<0)pt.x=W;if(pt.x>W)pt.x=0;if(pt.y<0)pt.y=H;if(pt.y>H)pt.y=0;} }
function drawParticles(ctx:CanvasRenderingContext2D,p:Particle[],a:number,glow:boolean,color:string) { ctx.save(); ctx.fillStyle=color; ctx.globalAlpha=a; if(glow){ctx.shadowBlur=10;ctx.shadowColor=color;} for(const pt of p){ctx.beginPath();ctx.arc(pt.x,pt.y,pt.size,0,Math.PI*2);ctx.fill();} ctx.restore(); }

function drawRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,color:string|CanvasGradient) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h); }
function drawText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,size:number,color:string,family='system-ui,sans-serif') { ctx.fillStyle=color; ctx.font=`${size}px ${family}`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,x,y); }
function roundRectPath(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); }

/* Animal silhouettes */
function drawAnimal(ctx:CanvasRenderingContext2D,x:number,groundY:number,type:'elephant'|'tiger'|'human',size:number,mobile:boolean,tint?:string) {
  const s=mobile?size*0.8:size; const fill=tint||G.deep;
  ctx.save(); ctx.fillStyle=fill; ctx.strokeStyle=tint?rgba(tint,0.8):G.gold; ctx.lineWidth=0.8;
  if(type==='elephant'){
    ctx.beginPath(); ctx.ellipse(x,groundY-s*1.1,s,s*0.5,0,0,Math.PI*2); ctx.ellipse(x+s*0.8,groundY-s*1.4,s*0.3,s*0.4,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }else if(type==='tiger'){
    ctx.beginPath(); ctx.ellipse(x,groundY-s*1.0,s*0.9,s*0.45,0,0,Math.PI*2); ctx.ellipse(x+s*0.7,groundY-s*1.4,s*0.28,s*0.35,0,0,Math.PI*2);
    ctx.fill(); ctx.stroke(); ctx.strokeStyle=rgba(fill,0.6); ctx.lineWidth=1.2;
    for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x-s*0.6+i*s*0.3,groundY-s*1.1); ctx.lineTo(x-s*0.5+i*s*0.3,groundY-s*0.9); ctx.stroke(); }
  }else{
    ctx.beginPath(); ctx.arc(x,groundY-s*1.4,s*0.3,0,Math.PI*2); ctx.rect(x-s*0.2,groundY-s*1.2,s*0.4,s*0.8); ctx.fill(); ctx.stroke();
  }
    ctx.restore();
}

/* Scene 1: Shared land — convergence */
function scene1(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,particles:Particle[],mobile:boolean) {
  const k=clamp01(t/T.scene1End);
  const sky=ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,lerpColor(G.dark,G.deep,k));
  sky.addColorStop(0.55,lerpColor(G.deep,G.fern,k));
  sky.addColorStop(1,lerpColor(G.gold,lerpColor(G.gold,G.pale,k*0.3),k));
  drawRect(ctx,0,0,W,H,sky);
  const groundY=H*0.72+Math.sin(t*2)*1;
  drawRect(ctx,0,groundY,W,H-groundY,G.deep);
  const ground=H-24;
  const eleX=lerp(W*0.85,W*0.5,easeInOut(k));
  const tigX=lerp(W*0.15,W*0.5,easeInOut(k));
  drawAnimal(ctx,eleX,ground,'elephant',32+k*4,mobile,G.mint);
  drawAnimal(ctx,tigX,ground,'tiger',28+k*4,mobile,G.pale);
  const humX=lerp(W*0.5,W*0.5,easeInOut(clamp01((t-1.2)/3.0)));
  drawAnimal(ctx,humX,ground-12,'human',24+k*2,mobile,G.white);
  drawParticles(ctx,particles,lerp(0.2,0.5,k),!mobile,G.pale);
  drawText(ctx,'VOICE OF GUDALUR',W/2,H*0.10,26+k*2,rgba(G.gold,k));
  drawText(ctx,'ONE LAND · THREE LIVES',W/2,H*0.16,14+k*2,rgba(G.white,0.6+k*0.3));
  drawText(ctx,'CONVERGING …',W/2,H*0.86,14,rgba(G.pale,clamp01((k-0.8)*5)));
}

/* Scene 2: Collision / system failure */
function scene2(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene1End)/(T.scene2End-T.scene1End));
  drawRect(ctx,0,0,W,H,lerpColor(G.deep,'#083344',k*0.8));
  drawText(ctx,'COLLISION',W/2,H*0.4,56*easeInOut(k)+12,lerpColor(G.gold,G.pale,k));
  drawText(ctx,'shared land cannot hold all',W/2,H*0.52,lerp(14,18,k),rgba(G.white,k));
  drawText(ctx,'redesign required',W/2,H*0.60,lerp(10,14,k),rgba(G.pale,k*0.7));
    for(let i=0;i<10;i++){ const x_=Math.random()*W; const y_=Math.random()*H; drawRect(ctx,x_,y_,2+Math.random()*4,2+ Math.random()*4,rgba(Math.random()>0.5?G.gold:G.pale,0.3+Math.random()*0.3)); }
}

/* Scene 3: Reboot */
function scene3(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene2End)/(T.scene3End-T.scene2End));
  const cx=W/2,cy=H/2; const r=k*180;
  if(r>10){ drawRect(ctx,0,0,W,H,G.deep); ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
    const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,G.dark); sky.addColorStop(0.5,lerpColor(G.deep,G.mint,k)); sky.addColorStop(1,lerpColor(G.gold,G.fern,k)); drawRect(ctx,0,0,W,H,sky); ctx.restore(); }
  drawText(ctx,'REBOOTING',cx,H*0.35,40+Math.sin(k*Math.PI)*3,rgba(G.pale,k));
  drawText(ctx,'three paths. harmony restored.',cx,H*0.46,16,rgba(G.white,k*0.8));
  drawText(ctx,Math.ceil((1-k)*3).toString()+'.',cx,H*0.54,24,rgba(G.gold,k));
}

/* Scene 4: Brand reveal */
function scene4(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,particles:Particle[],mobile:boolean) {
  const k=clamp01((t-T.scene3End)/(T.scene4End-T.scene3End));
  drawRect(ctx,0,0,W,H,G.deep);
  const s=0.5+easeInOut(k)*1.2;
  drawText(ctx,'VOICE OF GUDALUR',W/2,H*0.42,72*s,rgba(G.gold,k*0.95));
  drawText(ctx,'ONE PLACE · MANY COMMUNITIES',W/2,H*0.54,18*s,rgba(G.mint,k*0.8));
  drawText(ctx,'· ONE CONNECTED PEOPLE ·',W/2,H*0.59,16*s,rgba(G.white,k*0.7));
  drawParticles(ctx,particles,0.3+Math.sin(k*6)*0.1,!mobile,G.pale);
  if(k>0.6){ const subK=clamp01((k-0.6)/0.4); drawText(ctx,'Coexistence Reloaded',W/2,H*0.72,14+subK*3,rgba(G.pale,subK)); }
}

/* Scene 5: Thirukural */
function scene5(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene4End)/(T.scene5End-T.scene4End));
  drawRect(ctx,0,0,W,H,G.dark);
  drawText(ctx,'VOICE OF GUDALUR',W/2,H*0.08,22,rgba(G.gold,k));
  const cardW=Math.min(W*0.86,520); const cardH=170; const cx=(W-cardW)/2; const cy=H*0.32;
  ctx.save(); roundRectPath(ctx,cx,cy,cardW,cardH,20); ctx.fillStyle=rgba(G.deep,0.7); ctx.fill();
  ctx.strokeStyle=rgba(G.mint,0.4); ctx.lineWidth=1.2; roundRectPath(ctx,cx,cy,cardW,cardH,20); ctx.stroke();
  const kural='கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.';
  const words=kural.split(' '); const half=Math.ceil(words.length/2); const l1=words.slice(0,half).join(' '); const l2=words.slice(half).join(' ');
  drawText(ctx,l1,W/2,cy+50,clamp01(k-0.1)*22,rgba(G.pale,clamp01(k-0.1)*1),'"Noto Sans Tamil",system-ui,sans-serif');
  drawText(ctx,l2,W/2,cy+80,clamp01(k-0.1)*22,rgba(G.white,clamp01(k-0.1)*1),'"Noto Sans Tamil",system-ui,sans-serif');
  const meanA=clamp01((k-0.5)/0.5);
  drawText(ctx,'The rain-cloud asks nothing — true service is given without expectation.',W/2,cy+115,clamp01(k-0.2)*12,rgba(G.mint,meanA));
  ctx.restore();
}

/* Main component */
export interface OpeningAnimationProps { onFinish: () => void; }

export default function OpeningAnimation({ onFinish }: OpeningAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const endFiredRef = useRef<boolean>(false);

  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current; if (!canvas) return;
      setSize({ w: canvas.offsetWidth, h: canvas.offsetHeight });
    }
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    // SAFETY NET: if the canvas never initializes (e.g. measured zero-size before
    // layout), the fixed z-50 overlay would otherwise cover the whole app forever.
    // This guarantees the app always becomes interactive after the animation window.
    const fallback = setTimeout(() => {
      if (!endFiredRef.current) { endFiredRef.current = true; onFinish(); }
    }, (T.end + 3) * 1000);
    const W = size.w; const H = size.h; if (W < 2) return () => clearTimeout(fallback);
    const mobile = isMobile();
    const particles = createParticles(W, H, mobile ? 32 : 56);

    const drawFrame = (now: number) => {
      const start = startRef.current || now; startRef.current = start;
      const t = (now - start) / 1000;
      canvas.width = W; canvas.height = H;
      ctx.clearRect(0, 0, W, H);

      let scene = 0;
      if (t >= T.scene1End) scene = 1;
      if (t >= T.scene2End) scene = 2;
      if (t >= T.scene3End) scene = 3;
      if (t >= T.scene4End) scene = 4;
      if (t >= T.scene5End) scene = 5;

      const fadeOut = t > T.end - 2 ? Math.min(1, (T.end - t) / 2) : 1;

      if (fadeOut < 0.02) { drawRect(ctx,0,0,W,H,G.deep); }
      else if (scene === 0) { scene1(ctx,W,H,Math.min(t,T.scene1End),particles,mobile); }
      else if (scene === 1) { scene2(ctx,W,H,Math.min(t,T.scene2End)); }
      else if (scene === 2) { scene3(ctx,W,H,Math.min(t,T.scene3End)); }
      else if (scene === 3) { scene4(ctx,W,H,Math.min(t,T.scene4End),particles,mobile); }
      else { scene5(ctx,W,H,Math.min(t,T.scene5End)); }

      if (fadeOut < 0.98) {
        ctx.globalAlpha = fadeOut; ctx.fillStyle = G.deep; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1;
      }

      if (fadeOut < 0.03 && !endFiredRef.current) {
        endFiredRef.current = true; clearTimeout(fallback); setTimeout(onFinish, 120);
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    rafRef.current = requestAnimationFrame((ts) => { startRef.current = ts; drawFrame(ts); });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); clearTimeout(fallback); };
  }, [size, onFinish]);

  return <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-b from-green-900 to-green-950"><canvas ref={canvasRef} className="h-full w-full" /></div>;
}

