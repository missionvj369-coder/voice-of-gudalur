/**
 * OPENING ANIMATION — Voice of Gudalur brand theme.
 * Optimized for iOS (iPhone 8+) and Android: cached gradients, reduced
 * particles/shadows on mobile, GPU-layer hints, smooth 60fps flow.
 *
 * Story: Elephant + tiger + human share ONE land → converge → collide →
 * system REDESIGNS → each moves in their OWN glowing corridor, zero collision.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ── Timeline (seconds) ─────────────────────────────────────────────── */
const T = {
  convergeStart: 1.0,
  impact: 4.2,
  failureEnd: 5.0,
  rebootEnd: 6.0,
  lanesEnd: 9.6,
  brandStart: 9.6,
  kuralStart: 11.2,
  kuralEnd: 22.0,
  end: 23.5,
};

/* ── Easing ─────────────────────────────────────────────────────────── */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const easeOutElastic = (p: number) => {
  if (p === 0 || p === 1) return p;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

/* ── Brand colors ───────────────────────────────────────────────────── */
const G = {
  deep: '#1B5E20', fern: '#2E7D32', mint: '#AED581', emerald: '#059669',
  gold: '#F59E0B', sun: '#FBBF24', pale: '#FDE047', white: '#F5F5F5',
  dark: '#0a1f10',
};

/* ── Color helpers ──────────────────────────────────────────────────── */
function hexRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function lerpColor(c1: string, c2: string, p: number): string {
  const [r1, g1, b1] = hexRgb(c1);
  const [r2, g2, b2] = hexRgb(c2);
  return `rgb(${Math.round(lerp(r1, r2, p))},${Math.round(lerp(g1, g2, p))},${Math.round(lerp(b1, b2, p))})`;
}

/* ── Detect mobile for performance scaling ───────────────────────────── */
function isMobile() {
  return typeof window !== 'undefined' && (window.innerWidth < 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
}

/* ── Cached sky gradient (recreated only on phase change) ────────────── */
let _skyCache: { phase: number; w: number; h: number; grad: CanvasGradient } | null = null;
function getSkyGradient(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number, t: number) {
  if (_skyCache && _skyCache.phase === phase && _skyCache.w === w && _skyCache.h === h) return _skyCache.grad;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (phase < 4) {
    const k = clamp01((t - 1) / 3.2);
    g.addColorStop(0, lerpColor(G.dark, '#0f2010', k * 0.2));
    g.addColorStop(0.4, lerpColor(G.deep, G.fern, k * 0.15));
    g.addColorStop(0.72, lerpColor(G.mint, '#c8e6c9', k * 0.1));
    g.addColorStop(1, lerpColor(G.gold, G.pale, k * 0.2));
  } else if (phase < 5) {
    const k = clamp01((t - T.impact) / 0.8);
    g.addColorStop(0, lerpColor('#7f1d1d', '#fef3c7', k));
    g.addColorStop(0.5, lerpColor('#b91c1c', '#fde68a', k));
    g.addColorStop(1, lerpColor(G.gold, '#fffbeb', k));
  } else if (phase < 6) {
    const k = clamp01((t - T.failureEnd) / 1.0);
    g.addColorStop(0, lerpColor('#b91c1c', G.dark, k));
    g.addColorStop(0.5, lerpColor('#7f1d1d', G.deep, k));
    g.addColorStop(1, lerpColor(G.gold, G.mint, k));
  } else {
    const k = clamp01((t - T.rebootEnd) / 3.6);
    g.addColorStop(0, lerpColor(G.dark, '#0f1f14', k));
    g.addColorStop(0.5, lerpColor(G.deep, G.fern, k));
    g.addColorStop(1, lerpColor(G.mint, G.emerald, k));
  }
  _skyCache = { phase, w, h, grad: g };
  return g;
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, phase: number) {
  ctx.fillStyle = getSkyGradient(ctx, w, h, phase, t);
  ctx.fillRect(0, 0, w, h);
}

/* ── Aurora (cheap additive blobs) ──────────────────────────────────── */
function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, c1: string, c2: string, intensity: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const t2 = t * 0.4;
  const blobs: Array<[number, number, number, string]> = [
    [w * 0.2 + Math.sin(t2) * 40, h * 0.2, 260, c1],
    [w * 0.8 + Math.cos(t2 * 0.8) * 60, h * 0.15, 240, c2],
    [w * 0.5 + Math.sin(t2 * 0.6) * 80, h * 0.28, 260, c1],
  ];
  for (const [x, y, r, c] of blobs) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r * intensity + r * 0.2);
    rg.addColorStop(0, rgba(c, 0.12 * intensity));
    rg.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function drawGlowOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, rgba(c, a));
  rg.addColorStop(1, rgba(c, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  const a = ctx as any;
  if (typeof a.roundRect === 'function') { a.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* ── Particles (mobile-optimized: fewer, no shadowBlur) ──────────────── */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; kind: number; }

function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = [G.mint, G.pale, G.gold, G.emerald, G.white];
  for (let i = 0; i < count; i++) {
    const kind = Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2;
    particles.push({
      x: Math.random() * w, y: h * 0.1 + Math.random() * h * 0.7,
      vx: (Math.random() - 0.5) * 12, vy: -5 - Math.random() * 15,
      life: 3 + Math.random() * 5, maxLife: 8,
      size: kind === 2 ? 2 + Math.random() * 2 : 1 + Math.random() * 2,
      color: colors[(Math.random() * colors.length) | 0],
      kind,
    });
  }
  return particles;
}

function updateParticles(particles: Particle[], dt: number, w: number, h: number) {
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) { p.x = Math.random() * w; p.y = h * 0.1 + Math.random() * h * 0.7; p.life = p.maxLife; p.vx = (Math.random() - 0.5) * 12; p.vy = -5 - Math.random() * 15; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 0) { p.vx += (Math.random() - 0.5) * 22 * dt; p.vy += Math.sin(Date.now() / 520 + p.x) * 6 * dt; }
    else if (p.kind === 2) { p.vx += Math.sin(Date.now() / 800 + p.y * 0.01) * 16 * dt; p.vy += 2 * dt; }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], alpha: number, useShadow: boolean) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const ratio = p.life / p.maxLife;
    const a = alpha * Math.min(1, ratio * 2) * 0.6;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    if (useShadow) { ctx.shadowColor = p.color; ctx.shadowBlur = 6; }
    ctx.beginPath();
    if (p.kind === 2) ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.7, p.vx * 0.06, 0, Math.PI * 2);
    else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Clouds ─────────────────────────────────────────────────────────── */
interface Cloud { x: number; y: number; s: number; v: number; a: number; puffs: Array<[number, number, number]>; }

function makeClouds(W: number, H: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < 8; i++) {
    const puffs: Array<[number, number, number]> = [];
    const n = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) puffs.push([(Math.random() - 0.5) * 140, (Math.random() - 0.5) * 24, 28 + Math.random() * 34]);
    clouds.push({ x: Math.random() * (W + 400) - 200, y: H * (0.05 + Math.random() * 0.28), s: 0.6 + Math.random() * 0.9, v: (12 + Math.random() * 22) * 0.7, a: 0.12 + Math.random() * 0.2, puffs });
  }
  return clouds;
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, style: string) {
  ctx.save();
  ctx.globalAlpha = c.a;
  ctx.fillStyle = style;
  for (const [dx, dy, r] of c.puffs) { ctx.beginPath(); ctx.ellipse(c.x + dx * c.s, c.y + dy * c.s, r * c.s, r * 0.5 * c.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* ── Ground (peacock green, no brown) ────────────────────────────────── */
function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gy = h * 0.6;
  const g = ctx.createLinearGradient(0, gy, 0, h);
  g.addColorStop(0, '#1a2e05');
  g.addColorStop(0.3, '#0f1f14');
  g.addColorStop(1, G.dark);
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, w, h - gy);
  // Gold horizon glow
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createLinearGradient(0, gy, 0, gy + 4);
  hg.addColorStop(0, rgba(G.pale, 0.9));
  hg.addColorStop(1, rgba(G.pale, 0));
  ctx.fillStyle = hg;
  ctx.fillRect(0, gy - 2, w, 6);
  ctx.restore();
  // Glowing grass tufts
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(G.mint, 0.5);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) {
    const gx = ((i / 40) * w + ((i * 37) % 13)) % (w + 10);
    const gy2 = gy + 6 + (i * 7) % Math.max(12, Math.floor((h - gy) * 0.7));
    ctx.beginPath(); ctx.moveTo(gx, gy2); ctx.lineTo(gx + (i % 2 ? 5 : -5), gy2 - 10 - (i % 7)); ctx.stroke();
  }
  ctx.restore();
}
/* ── Simplified luminous animals (performant) ───────────────────────── */

function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, glow: boolean) {
  ctx.save();
  ctx.lineCap = 'round';
  if (glow) { ctx.shadowColor = rgba(G.mint, 0.7); ctx.shadowBlur = 14; }
  ctx.fillStyle = '#c8e6c9';
  ctx.beginPath(); ctx.ellipse(x, y - 52 * s, 52 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 48 * s, y - 60 * s, 21 * s, 19 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#c8e6c9'; ctx.lineWidth = 8 * s;
  ctx.beginPath(); ctx.moveTo(x - 60 * s, y - 58 * s); ctx.quadraticCurveTo(x - 72 * s, y - 38 * s + Math.sin(walk * 0.5) * 8 * s, x - 68 * s, y - 20 * s); ctx.stroke();
  ctx.strokeStyle = '#90a4ae'; ctx.lineWidth = 13 * s;
  [-38, -14, 16, 38].forEach((dx, i) => {
    const sw = Math.sin(walk + i * 1.7) * 9 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.4) * s, y - 40 * s); ctx.stroke();
  });
  ctx.fillStyle = '#90a4ae';
  ctx.beginPath(); ctx.ellipse(x - 42 * s, y - 68 * s, 11 * s, 13 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = G.deep;
  ctx.beginPath(); ctx.arc(x - 53 * s, y - 62 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTiger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, glow: boolean) {
  ctx.save();
  ctx.lineCap = 'round';
  if (glow) { ctx.shadowColor = rgba(G.pale, 0.75); ctx.shadowBlur = 14; }
  ctx.fillStyle = G.gold;
  ctx.beginPath(); ctx.ellipse(x, y - 38 * s, 40 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 36 * s, y - 44 * s, 18 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7c2d12';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + i * 10 * s, y - 42 * s, 3.5 * s, 12 * s, 0, 0, Math.PI); ctx.fill(); }
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 9 * s;
  [-22, -8, 8, 22].forEach((dx, i) => {
    const sw = Math.sin(walk + i * 1.9) * 7 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.3) * s, y - 31 * s); ctx.stroke();
  });
  ctx.fillStyle = G.pale;
  ctx.beginPath(); ctx.arc(x - 42 * s, y - 46 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 28 * s, y - 44 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, glow: boolean) {
  ctx.save();
  ctx.lineCap = 'round';
  if (glow) { ctx.shadowColor = rgba(G.white, 0.7); ctx.shadowBlur = 12; }
  ctx.fillStyle = G.white;
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 26 * s); ctx.lineTo(x + 8 * s, y - 26 * s); ctx.lineTo(x + 6 * s, y - 52 * s); ctx.lineTo(x - 6 * s, y - 52 * s); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fde68a';
  ctx.beginPath(); ctx.arc(x, y - 58 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = rgba(G.fern, 0.9); ctx.lineWidth = 4.5 * s;
  [-6, 6].forEach((dx, i) => {
    const sw = Math.sin(walk + i * Math.PI) * 6 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.3) * s, y - 27 * s); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 46 * s); ctx.lineTo(x - 14 * s + Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 46 * s); ctx.lineTo(x + 14 * s - Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.restore();
}

/* ── Glassmorphism caption (fits text properly) ─────────────────────── */
function glassCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lines: string[], alpha: number, accent: string) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRectPath(ctx, x, y, w, h, 14);
  ctx.fillStyle = 'rgba(10,31,16,0.62)';
  ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.55);
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x, y, w, h, 14);
  ctx.stroke();
  ctx.fillStyle = G.white;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px system-ui, sans-serif';
  lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, y + 22 + i * 18));
  ctx.restore();
}
/* ── Phase 1: shared land → converge → collide ────────────────────── */

function phase1(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number, glow: boolean) {
  const gy = h * 0.6;
  const cx = w / 2;
  const eleX = lerp(w * 0.85, cx + 50, easeInOutSine(adv));
  const tigX = lerp(w * 0.95, cx - 10, easeInOutSine(adv * 0.92));
  const humX = lerp(w * 0.08, cx - 75, easeInOutSine(adv));
  const walk = t * 4;

  drawGround(ctx, w, h);
  drawElephant(ctx, eleX, gy + 6, 1.3, walk, glow);
  drawTiger(ctx, tigX, gy - 8, 0.95, walk * 1.3, glow);
  drawHuman(ctx, humX, gy - 6, 1.05, walk, glow);

  // Brand-colored labels
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba(G.mint, 0.9);
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ELEPHANT', eleX, gy - 92);
  ctx.fillStyle = rgba(G.pale, 0.95);
  ctx.fillText('TIGER', tigX, gy - 72);
  ctx.fillStyle = rgba(G.white, 0.95);
  ctx.fillText('HUMAN', humX, gy - 82);
  ctx.restore();

  // System-failure story caption
  const storyA = clamp01((t - 0.8) / 1.2) * (1 - clamp01((adv - 0.6) / 0.4));
  glassCard(ctx, w / 2 - 160, h * 0.12, 320, 56, [
    'ONE LAND · THREE LIVES',
    'COLLISION IMMINENT',
  ], storyA, G.gold);
  void cx;
}

function drawShockwave(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320 * k + 20);
  rg.addColorStop(0, rgba(G.pale, 0.95 * k));
  rg.addColorStop(0.2, rgba(G.gold, 0.7 * k));
  rg.addColorStop(1, rgba(G.gold, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = rgba(G.white, 0.9 * (1 - k));
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 60 + k * 340, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(10,31,16,0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 14; i++) {
    const y = Math.random() * h;
    const gl = 20 + Math.random() * 50;
    ctx.fillStyle = `rgba(245,158,11,${k * 0.5})`;
    ctx.fillRect(Math.random() * w, y, gl, 2);
    ctx.fillStyle = `rgba(134,239,172,${k * 0.5})`;
    ctx.fillRect(Math.random() * w, y + 3, gl * 0.6, 2);
  }
  ctx.restore();
}

function drawFailureCard(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(10,31,16,0.78)';
  ctx.fillRect(0, 0, w, h);
  // Peacock gold card (no brown)
  const cw = w * 0.82, cx = w / 2 - cw / 2, cy = h * 0.34;
  roundRectPath(ctx, cx, cy, cw, 96, 18);
  ctx.fillStyle = 'rgba(245,158,11,0.25)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(253,224,71,0.7)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, cx, cy, cw, 96, 18);
  ctx.stroke();
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.font = 'bold 24px system-ui';
  ctx.fillText('SYSTEM FAILURE', w / 2, cy + 38);
  ctx.font = '14px system-ui';
  ctx.fillStyle = '#fde68a';
  ctx.fillText('The shared ground cannot hold us all', w / 2, cy + 66);
  ctx.restore();
}
/* ── Reboot → glowing corridors → harmony ───────────────────────────── */

function drawReboot(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + k * 320);
  rg.addColorStop(0, rgba(G.mint, 0.9 * (1 - k)));
  rg.addColorStop(0.2, rgba(G.emerald, 0.5 * (1 - k)));
  rg.addColorStop(1, rgba(G.emerald, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  const sx = w * k;
  const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
  sg.addColorStop(0, rgba(G.mint, 0));
  sg.addColorStop(0.5, rgba(G.mint, 0.5));
  sg.addColorStop(1, rgba(G.mint, 0));
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 60, 0, 120, h);
  ctx.restore();
}

function drawCorridor(ctx: CanvasRenderingContext2D, gy: number, yOffset: number, color: string, glowP: number, label: string, w: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const yTop = gy + yOffset - 18;
  ctx.strokeStyle = rgba(color, 0.5 + glowP * 0.5);
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  ctx.lineDashOffset = -Date.now() / 30;
  ctx.beginPath(); ctx.moveTo(10, yTop + 18); ctx.quadraticCurveTo(w * 0.25, yTop - 8, w * 0.5, yTop + 18); ctx.quadraticCurveTo(w * 0.75, yTop + 44, w - 10, yTop + 18); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.4 + glowP * 0.35;
  ctx.fillStyle = rgba(color, 0.12);
  ctx.fillRect(0, yTop, w, 40);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(color, 0.95);
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, w / 2, yTop - 6);
  ctx.restore();
}

function phase2(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number, glow: boolean) {
  const gy = h * 0.62;
  const glowP = 0.5 + 0.5 * Math.sin(t * 2.2);

  drawGround(ctx, w, h);
  drawCorridor(ctx, gy, -70, G.mint, glowP, 'ELEPHANT CORRIDOR', w);
  drawCorridor(ctx, gy, -10, G.pale, glowP, 'TIGER PASSAGE', w);
  drawCorridor(ctx, gy, 50, G.white, glowP, 'HUMAN SAFE PATH', w);

  const walk = t * 3;
  const eP = (adv * 1.4) % 1, tP = (adv * 1.7 + 0.33) % 1, hP = (adv * 1.2 + 0.66) % 1;
  const eX = eP < 0.5 ? lerp(-40, w + 40, easeInOutSine(eP / 0.5)) : lerp(w + 40, -40, easeInOutSine((eP - 0.5) / 0.5));
  const tX = tP < 0.5 ? lerp(w + 40, -40, easeInOutSine(tP / 0.5)) : lerp(-40, w + 40, easeInOutSine((tP - 0.5) / 0.5));
  const hX = hP < 0.5 ? lerp(-40, w + 40, easeInOutSine(hP / 0.5)) : lerp(w + 40, -40, easeInOutSine((hP - 0.5) / 0.5));

  drawElephant(ctx, eX, gy - 60, 1.15, walk, glow);
  drawTiger(ctx, tX, gy - 1, 0.8, walk * 1.3, glow);
  drawHuman(ctx, hX, gy + 56, 0.9, walk, glow);

  const cap = clamp01((t - T.rebootEnd - 0.5) / 1.4);
  // Two-line caption that fits inside the box
  glassCard(ctx, w / 2 - 165, h * 0.09, 330, 52, [
    'REDESIGNED: Three paths.',
    'Harmony restored.',
  ], cap * 0.95, G.emerald);
}

/* ── Brand bloom ────────────────────────────────────────────────────── */
function drawBrand(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.4;
  drawGlowOrb(ctx, cx, cy, 220, G.pale, 0.35 * k);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  const size = 40 + easeOutElastic(clamp01(k * 1.2)) * 8;
  ctx.fillStyle = rgba(G.pale, 0.95);
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.fillText('VOICE OF GUDALUR', cx, cy + 12);
  ctx.fillStyle = rgba(G.mint, 0.9);
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('ONE PLACE · MANY COMMUNITIES · ONE CONNECTED PEOPLE', cx, cy + 42);
  ctx.restore();
}

/* ── Thirukural (no footer, centered) ───────────────────────────────── */
const KURAL_TEXT = 'கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.';
const KURAL_WORDS = KURAL_TEXT.split(' ');
const KURAL_MEAN = 'The rain cloud asks for nothing; true service is given without expectation.';

function drawKural(ctx: CanvasRenderingContext2D, w: number, h: number, adv: number) {
  ctx.save();
  ctx.textAlign = 'center';
  const cardW = w * 0.86, cardH = 160, cx = w / 2 - cardW / 2, cy = h * 0.3;
  roundRectPath(ctx, cx, cy, cardW, cardH, 24);
  ctx.fillStyle = 'rgba(10,31,16,0.55)';
  ctx.fill();
  ctx.strokeStyle = rgba(G.mint, 0.4);
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, cx, cy, cardW, cardH, 24);
  ctx.stroke();

  const half = Math.ceil(KURAL_WORDS.length / 2);
  const l1 = KURAL_WORDS.slice(0, half).join(' ');
  const l2 = KURAL_WORDS.slice(half).join(' ');

  ctx.fillStyle = '#e2fbe9';
  ctx.font = 'bold 22px "Noto Sans Tamil", system-ui, sans-serif';
  ctx.fillText(l1, w / 2, h * 0.36);
  ctx.fillText(l2, w / 2, h * 0.44);

  const meanA = clamp01((adv - 0.7) / 0.3);
  ctx.globalAlpha = meanA;
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '13px system-ui';
  ctx.fillText(KURAL_MEAN, w / 2, h * 0.49);
  ctx.globalAlpha = 1;
  ctx.restore();
}