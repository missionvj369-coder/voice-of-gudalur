/**
 * OpeningAnimation.tsx - Voice of Gudalur brand opening.
 * Five clean, separate scenes with proper timing.
 * Brand colors only: #1B5E20, #2E7D32, #059669, #F5F5F5, #F59E0B, #FDE047.
 */
import React, { useEffect, useRef, useState } from 'react';

const T = { scene1End: 5.0, scene2End: 7.5, scene3End: 10.0, scene4End: 13.0, scene5End: 26.0, end: 28.0 };
const G = { deep: '#1B5E20', fern: '#2E7D32', peacock: '#059669', gold: '#F59E0B', pale: '#FDE047', white: '#F5F5F5', dark: '#0a1f10' };

function isMobile() { return typeof window !== 'undefined' && (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)); }
function clamp01(v: number) { return Math.min(1, Math.max(0, v)); }
function lerp(a: number, b: number, p: number) { return a + (b - a) * p; }
function easeInOut(p: number) { return -(Math.cos(Math.PI * p) - 1) / 2; }
function easeOutBack(p: number) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
function hexRgb(h: string): [number, number, number] { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function lerpColor(c1: string, c2: string, p: number): string {
  const [r1,g1,b1]=hexRgb(c1),[r2,g2,b2]=hexRgb(c2);
  return `rgb(${Math.round(lerp(r1,r2,p))},${Math.round(lerp(g1,g2,p))},${Math.round(lerp(b1,b2,p))})`;
}
function rgba(h: string, a: number): string { const [r,g,b]=hexRgb(h); return `rgba(${r},${g},${b},${a})`; }

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string | CanvasGradient) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, family = 'system-ui,sans-serif') {
  ctx.fillStyle = color; ctx.font = `${size}px ${family}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
}
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

type P = { x: number; y: number; vx: number; vy: number; sz: number };
function createParticles(w: number, h: number, n: number): P[] {
  return Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*(h*0.6),vx:(Math.random()-0.5)*0.6,vy:(Math.random()-0.5)*0.3,sz:1+Math.random()*2}));
}
function drawP(ctx:CanvasRenderingContext2D,p:P[],alpha:number) {
  ctx.save(); ctx.fillStyle=G.pale; ctx.globalAlpha=alpha; ctx.shadowBlur=4; ctx.shadowColor=G.pale;
  for(const a of p){ctx.beginPath();ctx.arc(a.x,a.y,a.sz,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}

type Cloud = { x: number; y: number; s: number; spd: number };
function makeClouds(w:number,h:number):Cloud[] {
  return Array.from({length:12},()=>({x:Math.random()*w*1.5,y:h*0.1+Math.random()*h*0.15,s:0.6+Math.random()*0.6,spd:0.2+Math.random()*0.6}));
}
function drawClouds(ctx:CanvasRenderingContext2D,c:Cloud[],t:number,W:number,alpha:number) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle=G.white; ctx.shadowBlur=1; ctx.shadowColor=G.white;
  for(const cl of c){
    const x=(cl.x-t*10*cl.spd)%(W+600)-100;
    ctx.beginPath(); ctx.ellipse(x,cl.y,40*cl.s,18*cl.s,0,0,Math.PI*2);
    ctx.ellipse(x+30,cl.y+3,32*cl.s,14*cl.s,0,0,Math.PI*2);
    ctx.ellipse(x-30,cl.y+3,32*cl.s,14*cl.s,0,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAnimal(ctx:CanvasRenderingContext2D,x:number,y:number,type:'elephant'|'tiger'|'human',size:number,color:string,walk:number) {
  ctx.save(); ctx.fillStyle=color; ctx.strokeStyle=rgba(G.deep,0.4); ctx.lineWidth=0.8;
  if(type==='elephant'){
    ctx.beginPath(); ctx.ellipse(x,y-size*0.5,size*0.9,size*0.45,0,0,Math.PI*2);
    ctx.ellipse(x+size*0.7,y-size*0.75,size*0.28,size*0.35,0,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
    for(let i=0;i<4;i++){const lx=x-size*0.7+i*size*0.45;const sw=Math.sin(walk+i)*2;ctx.beginPath();ctx.rect(lx+sw,y-size*0.1,size*0.12,size*0.6);ctx.fill();}
    ctx.fillStyle=rgba(G.pale,0.8); ctx.beginPath(); ctx.arc(x+size*0.15,y-size*0.78,size*0.08,0,Math.PI*2); ctx.fill();
  }else if(type==='tiger'){
    ctx.beginPath(); ctx.ellipse(x,y-size*0.5,size*0.8,size*0.4,0,0,Math.PI*2);
    ctx.ellipse(x+size*0.6,y-size*0.7,size*0.25,size*0.3,0,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
    for(let i=0;i<4;i++){const lx=x-size*0.7+i*size*0.48;const sw=Math.sin(walk+i*1.5)*2;ctx.beginPath();ctx.rect(lx+sw,y-size*0.1,size*0.1,size*0.5);ctx.fill();}
    ctx.strokeStyle=rgba(color,0.6); ctx.lineWidth=size*0.15; ctx.beginPath(); ctx.arc(x-size*0.85,y-size*0.4,size*0.3,0,Math.PI); ctx.stroke();
    ctx.fillStyle=rgba(G.pale,0.9); ctx.beginPath(); ctx.arc(x+size*0.12,y-size*0.65,size*0.07,0,Math.PI*2); ctx.fill();
  }else{
    ctx.beginPath(); ctx.arc(x,y-size*1.2,size*0.25,0,Math.PI*2);
    ctx.rect(x-size*0.2,y-size*1.05,size*0.4,size*0.7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=rgba(G.deep,0.5); ctx.lineWidth=size*0.09;
    for(let i=0;i<2;i++){const sw=Math.sin(walk)*2;ctx.beginPath();ctx.moveTo(x-size*0.2+i*size*0.4,y-size*0.95);ctx.lineTo(x-size*0.35+i*size*0.7+sw,y-size*0.65);ctx.stroke();}
        ctx.fillStyle=rgba(G.pale,0.9); ctx.beginPath(); ctx.arc(x-size*0.08,y-size*1.28,size*0.06,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

/* Scene 1: Shared land -> convergence (0-5s) */
function scene1(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,particles:P[],clouds:Cloud[],mobile:boolean) {
  const k=clamp01(t/T.scene1End);
  const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,G.dark); sky.addColorStop(0.5,lerpColor(G.deep,G.peacock,k)); sky.addColorStop(1,lerpColor(G.fern,G.pale,k*0.5));
  drawRect(ctx,0,0,W,H,sky);
  const landY=H*0.72+Math.sin(t*1.8)*(mobile?1:2);
  drawRect(ctx,0,landY,W,H-landY,lerpColor(G.deep,G.peacock,k*0.4));
  drawClouds(ctx,clouds,t,W,lerp(0.1,0.25,k));
  const ground=H-24;
  const elephantX=lerp(W*0.85,W*0.52,easeInOut(k)); const tigerX=lerp(W*0.15,W*0.48,easeInOut(k));
  drawAnimal(ctx,elephantX,ground,'elephant',mobile?28:32,lerpColor(G.deep,G.peacock,k),t*4);
  drawAnimal(ctx,tigerX,ground,'tiger',mobile?24:28,lerpColor(G.deep,G.pale,k),t*4);
  const humK=clamp01((t-1.2)/3.0); const humanX=lerp(W*0.5,W*0.5+Math.sin(t*2)*20,easeInOut(humK));
  drawAnimal(ctx,humanX,ground-10,'human',mobile?20:24,lerpColor(G.deep,G.gold,humK),t*4);
  drawP(ctx,particles,lerp(0.15,0.4,k));
  drawText(ctx,'VOICE OF GUDALUR',W/2,H*0.09,lerp(20,28,k),rgba(G.gold,k));
  drawText(ctx,'ONE LAND THREE LIVES',W/2,H*0.16,lerp(12,16,k),rgba(G.white,0.6+k*0.3));
  if(k>0.9) drawText(ctx,'CONVERGING',W/2,H*0.84,16,rgba(G.pale,clamp01((k-0.9)*10)));
}

/* Scene 2: Collision -> system failure (5-7.5s) */
function scene2(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene1End)/(T.scene2End-T.scene1End));
  drawRect(ctx,0,0,W,H,lerpColor(G.dark,'#062410',k*0.7));
  if(k<0.3){ const flash=clamp01(k/0.3); drawRect(ctx,0,0,W,H,`rgba(214,38,38,${flash*0.3})`); drawText(ctx,'CONNECTION LOST',W/2,H*0.45,42+flash*8,lerpColor(G.gold,G.pale,flash)); }
  else{ const settle=clamp01((k-0.3)/0.7); drawText(ctx,'SYSTEM FAILURE',W/2,H*0.42,48,rgba(G.pale,settle)); drawText(ctx,'Shared ground cannot hold all three.',W/2,H*0.52,16,rgba(G.white,settle*0.8)); drawText(ctx,'REDESIGN INITIATED',W/2,H*0.58,14,rgba(G.gold,settle*0.7)); }
}

/* Scene 3: Reboot ripple (7.5-10s) */
function scene3(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene2End)/(T.scene3End-T.scene2End));
  const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,G.dark); sky.addColorStop(0.5,lerpColor(G.deep,G.peacock,k)); sky.addColorStop(1,lerpColor(G.gold,G.fern,k));
  drawRect(ctx,0,0,W,H,sky);
  const r=k*Math.max(W,H)*0.8;
  if(r>10){ ctx.save(); ctx.strokeStyle=rgba(G.pale,1-k*0.5); ctx.lineWidth=1+k*3; ctx.setLineDash([5,8]);
    for(let i=0;i<3;i++){const ri=r-i*60;if(ri>5)ctx.beginPath(),ctx.arc(W/2,H/2,ri,0,Math.PI*2),ctx.stroke();}
    ctx.setLineDash([]); ctx.restore(); }
  drawText(ctx,'REBOOTING',W/2,H*0.32,32+Math.sin(k*Math.PI)*2,rgba(G.pale,k));
  drawText(ctx,'three paths harmony restored',W/2,H*0.40,14,rgba(G.white,k*0.8));
    drawText(ctx,Math.max(0,Math.ceil(3-k*3)).toString()+'.',W/2,H*0.47,20,rgba(G.gold,k));
}

/* Scene 4: Harmony - three glowing corridors (10-13s) */
function scene4(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,particles:P[]) {
  const k=clamp01((t-T.scene3End)/(T.scene4End-T.scene3End));
  const sky=ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,lerpColor(G.dark,G.deep,k)); sky.addColorStop(0.4,lerpColor(G.deep,G.peacock,k)); sky.addColorStop(0.75,lerpColor(G.peacock,G.fern,k)); sky.addColorStop(1,lerpColor(G.fern,G.gold,k*0.4));
  drawRect(ctx,0,0,W,H,sky);
  const groundY=H*0.7; drawRect(ctx,0,groundY,W,H-groundY,lerpColor(G.deep,G.peacock,k*0.5));
  const gap=W*0.08; const laneW=(W-gap*2)/3; const corridorY=groundY-24;
  drawRect(ctx,gap,corridorY,laneW,24,rgba(G.peacock,0.25+k*0.15));
  drawRect(ctx,gap*2+laneW,corridorY,laneW,24,rgba(G.gold,0.25+k*0.15));
  drawRect(ctx,gap*3+laneW*2,corridorY,laneW,24,rgba(G.white,0.25+k*0.15));
  ctx.save(); ctx.shadowBlur=12+k*8; ctx.shadowColor=G.pale;
  drawAnimal(ctx,gap+laneW/2,groundY-4,'elephant',28,G.peacock,t*3);
  drawAnimal(ctx,gap*2+laneW+laneW/2,groundY-4,'tiger',24,G.gold,t*3);
  drawAnimal(ctx,gap*3+laneW*2+laneW/2,groundY-4,'human',20,G.white,t*3);
  ctx.restore();
  drawP(ctx,particles,0.3+Math.sin(t*3)*0.08);
  if(k>0.4){ const labelK=clamp01((k-0.4)/0.6); drawText(ctx,'ELEPHANT',gap+laneW/2,corridorY-8,12,rgba(G.peacock,labelK)); drawText(ctx,'TIGER',gap*2+laneW+laneW/2,corridorY-8,12,rgba(G.gold,labelK)); drawText(ctx,'HUMAN',gap*3+laneW*2+laneW/2,corridorY-8,12,rgba(G.white,labelK)); }
  if(k>0.7){ const msgK=clamp01((k-0.7)/0.3); drawText(ctx,'HARMONY RESTORED',W/2,H*0.82,16,rgba(G.pale,msgK)); }
}

/* Scene 5: Brand reveal (13-26s) */
function scene5(ctx:CanvasRenderingContext2D,W:number,H:number,t:number) {
  const k=clamp01((t-T.scene4End)/(T.scene5End-T.scene4End));
  drawRect(ctx,0,0,W,H,lerpColor(G.dark,G.deep,k));
  const scale=0.3+easeOutBack(k)*1.4;
  drawText(ctx,'VOICE OF GUDALUR',W/2,H*0.30,64*scale,rgba(G.pale,k*0.95));
  const subK=clamp01((k-0.3)/0.7);
  drawText(ctx,'ONE PLACE',W/2,H*0.40,16,rgba(G.gold,subK*0.8));
  drawText(ctx,'MANY COMMUNITIES',W/2,H*0.44,16,rgba(G.gold,subK*0.8));
  drawText(ctx,'ONE CONNECTED PEOPLE',W/2,H*0.48,16,rgba(G.peacock,subK*0.8));
  const cardK=clamp01((k-0.4)/0.6);
  if(cardK>0){
    const cardW=Math.min(W*0.86,520); const cardH=160; const cx=(W-cardW)/2; const cy=H*0.62;
    ctx.save(); roundRectPath(ctx,cx,cy,cardW,cardH,20); ctx.fillStyle=rgba(G.deep,0.7); ctx.fill();
    ctx.strokeStyle=rgba(G.peacock,0.4); ctx.lineWidth=1.2; roundRectPath(ctx,cx,cy,cardW,cardH,20); ctx.stroke();
        const kural="கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.";
    drawText(ctx,kural,W/2,cy+40,clamp01(cardK-0.1)*20,rgba(G.pale,cardK),'"Noto Sans Tamil",system-ui,sans-serif');
    const meanK=clamp01((cardK-0.3)/0.7);
    drawText(ctx,"The rain-cloud asks nothing; true service is given without expectation.",W/2,cy+90,clamp01(meanK)*13,rgba(G.white,meanK));
        ctx.restore();
  }
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
    const handleResize = () => {
      const canvas = canvasRef.current; if (!canvas) return;
      setSize({ w: canvas.offsetWidth, h: canvas.offsetHeight });
    };
    handleResize(); window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.textRendering = 'optimizeLegibility';
    const W = size.w; const H = size.h; if (W < 2) return;
    const mobile = isMobile();
    const particles = createParticles(W, H, mobile ? 32 : 56);
    const clouds = makeClouds(W, H);

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

      if (fadeOut < 0.02) { drawRect(ctx, 0, 0, W, H, G.deep); }
      else if (scene === 0) { scene1(ctx,W,H,Math.min(t,T.scene1End),particles,clouds,mobile); }
      else if (scene === 1) { scene2(ctx,W,H,Math.min(t,T.scene2End)); }
      else if (scene === 2) { scene3(ctx,W,H,Math.min(t,T.scene3End)); }
      else if (scene === 3) { scene4(ctx,W,H,Math.min(t,T.scene4End),particles); }
      else { scene5(ctx,W,H,Math.min(t,T.scene5End)); }

      if (fadeOut < 0.98) {
        ctx.globalAlpha = fadeOut; ctx.fillStyle = G.deep; ctx.fillRect(0,0,W,H); ctx.globalAlpha = 1;
      }
      if (fadeOut < 0.03 && !endFiredRef.current) {
        endFiredRef.current = true; setTimeout(onFinish, 120);
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    };

    rafRef.current = requestAnimationFrame((ts) => { startRef.current = ts; drawFrame(ts); });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [size, onFinish]);

  return <div className="fixed inset-0 z-50 overflow-hidden"><canvas ref={canvasRef} className="h-full w-full" /></div>;
}

