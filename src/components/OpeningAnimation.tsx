/**
 * OPENING ANIMATION — cinematic, modern, luminous.
 *
 * Story kept: Elephant + tiger + human share ONE land → converge → collide →
 * system redesigns → each moves in their OWN glowing corridor, zero collision.
 *
 * Presentation (modern):
 *  - Vibrant dawn gradient (violet → magenta → amber) with aurora glow + stars
 *  - Additive-blend neon particles, light shafts, volumetric atmosphere
 *  - Luminous glass-card story captions
 *  - Gradient + glow animal renders
 *  - Shockwave + chromatic glitch on impact
 *  - Neon glowing corridors in phase 2
 *  - Gradient brand reveal + glass Thirukural
 *
 * Pure canvas + rAF. No dependencies. Skippable. Reduced-motion aware.
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
const easeInCubic = (p: number) => p * p * p;
const easeOutBack = (p: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
const easeOutElastic = (p: number) => {
  if (p === 0 || p === 1) return p;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};

/* ── Color helpers ──────────────────────────────────────────────────── */
function hexRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
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
/** Blend many colors by weights → for aurora gradients. */
function aurora(stops: Array<{ t: number; hex: string }>): CanvasGradient | null {
  return null; // placeholder replaced by concrete gradient below
}

/* ── Cinematic sky (sunset → neon paradise) ─────────────────────────── */
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, big: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (big < 4) {
    // Phase 1: stunning violet→magenta→amber sunset (peaceful but shared)
    const k = clamp01((t - 1) / 3.2);
    g.addColorStop(0, lerpColor('#1e1b4b', '#3b0764', k * 0.3));
    g.addColorStop(0.45, lerpColor('#6d28d9', '#a21caf', k * 0.3));
    g.addColorStop(0.75, lerpColor('#db2777', '#fb7185', k * 0.3));
    g.addColorStop(1, lerpColor('#f59e0b', '#fbbf24', k * 0.5));
  } else if (big < 5) {
    // Impact flash: white-hot burst
    const k = clamp01((t - T.impact) / 0.8);
    g.addColorStop(0, lerpColor('#7f1d1d', '#fef2f2', k));
    g.addColorStop(0.5, lerpColor('#b91c1c', '#fca5a5', k));
    g.addColorStop(1, lerpColor('#f59e0b', '#ffedd5', k));
  } else if (big < 6) {
    // Reboot: emerald-teal transform
    const k = clamp01((t - T.failureEnd) / 1.0);
    g.addColorStop(0, lerpColor('#0c4a6e', '#083344', k));
    g.addColorStop(0.5, lerpColor('#155e75', '#134e4a', k));
    g.addColorStop(1, lerpColor('#0f766e', '#065f46', k));
  } else {
    // Paradise: cool emerald→teal→soft gold
    const k = clamp01((t - T.rebootEnd) / 3.6);
    g.addColorStop(0, lerpColor('#042f2e', '#0f172a', k));
    g.addColorStop(0.5, lerpColor('#065f46', '#134e4a', k));
    g.addColorStop(1, lerpColor('#0d9488', '#1e293b', k));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Aurora / light-shaft glow = additive radial blobs. */
function drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, base: string, bright: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const t2 = t * 0.4;
  const blobs: Array<[number, number, number, string]> = [
    [w * 0.2 + Math.sin(t2) * 40, h * 0.2, 260, '#22d3ee'],
    [w * 0.8 + Math.cos(t2 * 0.8) * 60, h * 0.15, 240, '#a21caf'],
    [w * 0.5 + Math.sin(t2 * 0.6) * 80, h * 0.28, 260, '#f59e0b'],
  ];
  for (const [x, y, r, c] of blobs) {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r * bright + r * 0.2);
    rg.addColorStop(0, rgba(c, 0.14 * bright));
    rg.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  void base;
}

/** Ambient glow behind caption panels. */
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
/* ── Neon particles (additive glow) ─────────────────────────────────── */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; kind: number; }

function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = [];
  const colors = ['#67e8f9', '#f0abfc', '#fde047', '#86efac', '#fb7185'];
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

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], alpha: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const ratio = p.life / p.maxLife;
    const a = alpha * Math.min(1, ratio * 2) * 0.65;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (p.kind === 2) ctx.ellipse(p.x, p.y, p.size * 1.6, p.size * 0.7, p.vx * 0.06, 0, Math.PI * 2);
    else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Soft clouds (glow-tinted) ──────────────────────────────────────── */
interface Cloud { x: number; y: number; s: number; v: number; a: number; puffs: Array<[number, number, number]>; }

function makeClouds(W: number, H: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < 10; i++) {
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

/* ── Luminous ground ────────────────────────────────────────────────── */
function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gy = h * 0.6;
  const g = ctx.createLinearGradient(0, gy, 0, h);
  g.addColorStop(0, '#311c0d');
  g.addColorStop(0.3, '#0f1f14');
  g.addColorStop(1, '#07130d');
  ctx.fillStyle = g;
  ctx.fillRect(0, gy, w, h - gy);
  // Neon glow line at horizon
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const hg = ctx.createLinearGradient(0, gy, 0, gy + 4);
  hg.addColorStop(0, 'rgba(253, 186, 116, 0.9)');
  hg.addColorStop(1, 'rgba(253, 186, 116, 0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, gy - 2, w, 6);
  ctx.restore();
  // Glowing grass tufts
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(134,239,172,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 50; i++) {
    const gx = ((i / 50) * w + ((i * 37) % 13)) % (w + 10);
    const gy2 = gy + 6 + Math.random() * (h - gy - 22);
    ctx.beginPath(); ctx.moveTo(gx, gy2); ctx.lineTo(gx + (Math.random() - 0.5) * 8, gy2 - 10 - Math.random() * 12); ctx.stroke();
  }
  ctx.restore();
}
/* ── Luminous animal renders (gradient + glow) ──────────────────────── */

function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  const bodyC = 'rgba(203,213,225,0.95)';
  const limbC = 'rgba(148,163,184,0.9)';
  ctx.save();
  ctx.shadowColor = 'rgba(103,232,249,0.7)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = bodyC;
  ctx.beginPath(); ctx.ellipse(x, y - 52 * s, 52 * s, 26 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 48 * s, y - 60 * s, 21 * s, 19 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // trunk
  ctx.strokeStyle = bodyC; ctx.lineWidth = 8 * s;
  ctx.beginPath(); ctx.moveTo(x - 60 * s, y - 58 * s); ctx.quadraticCurveTo(x - 72 * s, y - 38 * s + Math.sin(walk * 0.5) * 8 * s, x - 68 * s, y - 20 * s); ctx.stroke();
  // legs
  ctx.strokeStyle = limbC; ctx.lineWidth = 13 * s;
  [-38, -14, 16, 38].forEach((dx, i) => {
    const sw = Math.sin(walk + i * 1.7) * 9 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.4) * s, y - 40 * s); ctx.stroke();
  });
  // ear
  ctx.fillStyle = limbC;
  ctx.beginPath(); ctx.ellipse(x - 42 * s, y - 68 * s, 11 * s, 13 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  // eye
  ctx.fillStyle = '#0e7490';
  ctx.beginPath(); ctx.arc(x - 53 * s, y - 62 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTiger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.save();
  ctx.shadowColor = 'rgba(253,224,71,0.75)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath(); ctx.ellipse(x, y - 38 * s, 40 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 36 * s, y - 44 * s, 18 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // stripes
  ctx.fillStyle = '#7c2d12';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + i * 10 * s, y - 42 * s, 3.5 * s, 12 * s, 0, 0, Math.PI); ctx.fill(); }
  // legs
  ctx.strokeStyle = '#b45309'; ctx.lineWidth = 9 * s;
  [-22, -8, 8, 22].forEach((dx, i) => {
    const sw = Math.sin(walk + i * 1.9) * 7 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.3) * s, y - 31 * s); ctx.stroke();
  });
  // ears
  ctx.fillStyle = '#92400e';
  ctx.beginPath(); ctx.arc(x - 42 * s, y - 56 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 32 * s, y - 54 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  // eyes
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(x - 42 * s, y - 46 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 28 * s, y - 44 * s, 2.6 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  const suit = 'rgba(34,211,238,0.95)';
  ctx.save();
  ctx.shadowColor = 'rgba(34,211,238,0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = suit;
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 26 * s); ctx.lineTo(x + 8 * s, y - 26 * s); ctx.lineTo(x + 6 * s, y - 52 * s); ctx.lineTo(x - 6 * s, y - 52 * s); ctx.closePath(); ctx.fill();
  ctx.restore();
  // head
  ctx.fillStyle = '#fde68a';
  ctx.save(); ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(x, y - 58 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // limbs
  ctx.strokeStyle = 'rgba(14,116,144,0.9)'; ctx.lineWidth = 4.5 * s;
  [-6, 6].forEach((dx, i) => {
    const sw = Math.sin(walk + i * Math.PI) * 6 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - sw * 0.3) * s, y - 27 * s); ctx.stroke();
  });
  ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 46 * s); ctx.lineTo(x - 14 * s + Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 46 * s); ctx.lineTo(x + 14 * s - Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.restore();
}

/* ── Glassmorphism caption panel ────────────────────────────────────── */
function glassCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lines: string[], alpha: number, accent: string) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.shadowColor = rgba(accent, 0.4);
  ctx.shadowBlur = 24;
  ctx.fillStyle = 'rgba(15,23,42,0.55)';
  ctx.fill();
  ctx.strokeStyle = rgba(accent, 0.6);
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  lines.forEach((ln, i) => ctx.fillText(ln, x + w / 2, y + 26 + i * 22));
  ctx.restore();
}
/* ── Phase 1: shared landscape → converge → collide ────────────────── */

function phase1(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number) {
  const gy = h * 0.6;
  const cx = w / 2;
  // Luminous animals converge on shared ground (beautiful, but colliding)
  const eleX = lerp(w * 0.85, cx + 50, easeInOutSine(adv));
  const tigX = lerp(w * 0.95, cx - 10, easeInOutSine(adv * 0.92));
  const humX = lerp(w * 0.08, cx - 75, easeInOutSine(adv));
  const walk = t * 4;

  drawGround(ctx, w, h);
  drawElephant(ctx, eleX, gy + 6, 1.3, walk, 1);
  drawTiger(ctx, tigX, gy - 8, 0.95, walk * 1.3, 1);
  drawHuman(ctx, humX, gy - 6, 1.05, walk, 1);

  // Glowing labels
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(254,240,138,0.9)';
  ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('ELEPHANT', eleX, gy - 92);
  ctx.fillStyle = 'rgba(253,224,71,0.95)';
  ctx.fillText('TIGER', tigX, gy - 72);
  ctx.fillStyle = 'rgba(165,243,252,0.95)';
  ctx.fillText('HUMAN', humX, gy - 82);
  ctx.restore();

  // Story caption
  const storyA = clamp01((t - 0.8) / 1.2) * (1 - clamp01((adv - 0.6) / 0.4));
  glassCard(ctx, w / 2 - 150, h * 0.12, 300, 64, ['One land. Three lives.', 'It cannot hold them all.'], storyA, '#f59e0b');
  void cx;
}

function drawShockwave(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.55;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 320 * k + 20);
  rg.addColorStop(0, `rgba(255,237,213,${0.95 * k})`);
  rg.addColorStop(0.2, `rgba(251,146,60,${0.7 * k})`);
  rg.addColorStop(1, 'rgba(251,146,60,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  // Ring
  ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(cx, cy, 60 + k * 340, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawGlitch(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(2,6,23,0.65)';
  ctx.fillRect(0, 0, w, h);
  // chromatic offset lines
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 16; i++) {
    const y = Math.random() * h;
    const gl = 20 + Math.random() * 50;
    ctx.fillStyle = `rgba(244,63,94,${k * 0.5})`;
    ctx.fillRect(Math.random() * w, y, gl, 2);
    ctx.fillStyle = `rgba(56,189,248,${k * 0.5})`;
    ctx.fillRect(Math.random() * w, y + 3, gl * 0.6, 2);
    ctx.fillStyle = `rgba(74,222,128,${k * 0.5})`;
    ctx.fillRect(Math.random() * w, y + 6, gl * 0.4, 2);
  }
  ctx.restore();
}

function drawFailureCard(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  if (k <= 0) return;
  const cap = [
    'SYSTEM FAILURE',
    'The shared ground cannot hold us all.',
  ];
  // Dark central panel
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = 'rgba(2,6,23,0.72)';
  ctx.fillRect(0, 0, w, h);
  const cw = w * 0.8, cx = w / 2 - cw / 2, cy = h * 0.36;
  roundRectPath(ctx, cx, cy, cw, 90, 18);
  ctx.fillStyle = 'rgba(127,29,29,0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(248,113,113,0.7)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, cx, cy, cw, 90, 18);
  ctx.stroke();
  ctx.fillStyle = '#fecaca';
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px system-ui';
  ctx.fillText(cap[0], w / 2, cy + 36);
  ctx.font = '15px system-ui';
  ctx.fillStyle = '#fed7aa';
  ctx.fillText(cap[1], w / 2, cy + 64);
  ctx.restore();
}
/* ── Reboot → glowing corridors → harmony ───────────────────────────── */

function drawReboot(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  // Expanding emerald ring that "redesigns" the world
  const cx = w / 2, cy = h * 0.5;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Inner glowing core
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40 + k * 320);
  rg.addColorStop(0, `rgba(134,239,172,${0.9 * (1 - k)})`);
  rg.addColorStop(0.2, `rgba(45,212,191,${0.5 * (1 - k)})`);
  rg.addColorStop(1, 'rgba(16,185,129,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  // Clean vertical scan sweep
  const sx = w * k;
  const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
  sg.addColorStop(0, 'rgba(209,250,229,0)');
  sg.addColorStop(0.5, 'rgba(209,250,229,0.5)');
  sg.addColorStop(1, 'rgba(209,250,229,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - 60, 0, 120, h);
  ctx.restore();
}

function drawCorridor(ctx: CanvasRenderingContext2D, y: number, gy: number, color: string, glowP: number, label: string, w: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const yTop = gy + y - 18;
  // Neon path
  ctx.strokeStyle = rgba(color, 0.5 + glowP * 0.5);
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 12]);
  ctx.lineDashOffset = -Date.now() / 30;
  ctx.beginPath(); ctx.moveTo(10, yTop + 18); ctx.quadraticCurveTo(w * 0.25, yTop - 8, w * 0.5, yTop + 18); ctx.quadraticCurveTo(w * 0.75, yTop + 44, w - 10, yTop + 18); ctx.stroke();
  ctx.setLineDash([]);
  // Edge glow
  ctx.globalAlpha = 0.4 + glowP * 0.35;
  ctx.shadowColor = color; ctx.shadowBlur = 18;
  ctx.fillStyle = rgba(color, 0.12);
  ctx.fillRect(0, yTop, w, 40);
  ctx.shadowBlur = 0;
  // Label
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(color, 0.95);
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, w / 2, yTop - 6);
  ctx.restore();
}

function phase2(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number) {
  const gy = h * 0.62;
  const glowP = 0.5 + 0.5 * Math.sin(t * 2.2);

  drawGround(ctx, w, h);
  // Three glowing corridors, separated
  drawCorridor(ctx, gy - 70, gy, '#34d399', glowP, 'ELEPHANT CORRIDOR', w);
  drawCorridor(ctx, gy - 10, gy, '#fbbf24', glowP, 'TIGER PASSAGE', w);
  drawCorridor(ctx, gy + 50, gy, '#38bdf8', glowP, 'HUMAN SAFE PATH', w);

  const walk = t * 3;
  // Each in their own lane — never collide
  const eP = (adv * 1.4) % 1, tP = (adv * 1.7 + 0.33) % 1, hP = (adv * 1.2 + 0.66) % 1;
  const eX = eP < 0.5 ? lerp(-40, w + 40, easeInOutSine(eP / 0.5)) : lerp(w + 40, -40, easeInOutSine((eP - 0.5) / 0.5));
  const tX = tP < 0.5 ? lerp(w + 40, -40, easeInOutSine(tP / 0.5)) : lerp(-40, w + 40, easeInOutSine((tP - 0.5) / 0.5));
  const hX = hP < 0.5 ? lerp(-40, w + 40, easeInOutSine(hP / 0.5)) : lerp(w + 40, -40, easeInOutSine((hP - 0.5) / 0.5));

  drawElephant(ctx, eX, gy - 60, 1.15, walk, 1);
  drawTiger(ctx, tX, gy - 1, 0.8, walk * 1.3, 1);
  drawHuman(ctx, hX, gy + 56, 0.9, walk, 1);

  const cap = clamp01((t - T.rebootEnd - 0.5) / 1.4);
  glassCard(ctx, w / 2 - 160, h * 0.09, 320, 50, ['Dedicated paths. Harmony restored.'], cap * 0.95, '#34d399');
}

function easeIn(p: number) { return p * p * (3 - 2 * p); }

/* ── Brand bloom + Thirukural ───────────────────────────────────────── */

function drawBrand(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  // Gradient brand text with neon backdrop
  const cx = w / 2, cy = h * 0.4;
  drawGlowOrb(ctx, cx, cy, 220, '#f59e0b', 0.35 * k);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  const size = 40 + easeOutElastic(clamp01(k * 1.2)) * 8;
  ctx.shadowColor = 'rgba(251,191,36,0.9)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(254,240,138,0.95)';
  ctx.font = `bold ${size}px Georgia, serif`;
  ctx.fillText('VOICE OF GUDALUR', cx, cy + 12);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(165,243,252,0.9)';
  ctx.font = 'bold 15px system-ui';
  ctx.fillText('ONE PLACE · MANY COMMUNITIES · ONE CONNECTED PEOPLE', cx, cy + 42);
  ctx.restore();
}

const KURAL_TEXT = 'கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.';
const KURAL_WORDS = KURAL_TEXT.split(' ');
const KURAL_MEAN = 'The rain cloud asks for nothing; true service is given without expectation.';
const KURAL_LINES = [KURAL_TEXT];

function drawKural(ctx: CanvasRenderingContext2D, w: number, h: number, adv: number) {
  ctx.save();
  ctx.textAlign = 'center';
  const cardW = w * 0.86, cardH = 170, cx = w / 2 - cardW / 2, cy = h * 0.3;
  roundRectPath(ctx, cx, cy, cardW, cardH, 24);
  ctx.fillStyle = 'rgba(15,23,42,0.55)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(134,239,172,0.4)';
  ctx.lineWidth = 1.2;
  roundRectPath(ctx, cx, cy, cardW, cardH, 24);
  ctx.stroke();

  const wordsVisible = Math.round(adv * KURAL_WORDS.length);
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
  ctx.fillStyle = 'rgba(167,243,208,0.6)';
  ctx.font = '11px system-ui';
  ctx.fillText('திருக்குறள் 228 · OPPOSITION', w / 2, h * 0.51);
  ctx.restore();
  void wordsVisible;
}

/* ── Main React component ───────────────────────────────────────────── */

export const OpeningAnimation: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const particlesRef = useRef<Particle[] | null>(null);
  const cloudsRef = useRef<Cloud[] | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    window.setTimeout(() => onFinish(), 650);
  }, [onFinish]);

  useEffect(() => { finishRef.current = finish; }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth || window.innerWidth;
      h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    cloudsRef.current = makeClouds(window.innerWidth, window.innerHeight);
    particlesRef.current = createParticles(window.innerWidth, window.innerHeight, 45);

    const start = performance.now();
    let last = start;
    let raf = 0;

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      const clouds = cloudsRef.current!;
      const particles = particlesRef.current!;
      for (const c of clouds) { c.x += c.v * dt; if (c.x > w + 260) c.x = -260; }
      updateParticles(particles, dt, w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      // Impact screen shake
      if (t >= T.impact && t < T.impact + 0.4) {
        const k = 1 - (t - T.impact) / 0.4;
        ctx.translate((Math.random() - 0.5) * 18 * k, (Math.random() - 0.5) * 14 * k);
      }

      // Draw the phase
      if (t < T.impact) {
        // Dusk sky with aurora + stars
        drawSky(ctx, w, h, t, 1);
        drawAurora(ctx, w, h, t, '#f59e0b', 0.6);
        drawParticles(ctx, particles, 0.6);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(244,208,220,0.28)');
        const adv = clamp01((t - T.convergeStart) / (T.impact - T.convergeStart));
        phase1(ctx, w, h, t, adv);
      } else if (t < T.failureEnd) {
        drawSky(ctx, w, h, t, 5);
        phase1(ctx, w, h, t, 1);
        const k = clamp01((t - T.impact) / (T.failureEnd - T.impact));
        drawShockwave(ctx, w, h, k);
        drawGlitch(ctx, w, h, k * 0.8);
        drawFailureCard(ctx, w, h, clamp01((t - T.impact - 0.05) / 0.45));
      } else if (t < T.rebootEnd) {
        drawSky(ctx, w, h, t, 6);
        const k = clamp01((t - T.failureEnd) / (T.rebootEnd - T.failureEnd));
        drawReboot(ctx, w, h, 1 - k);
        drawGround(ctx, w, h);
      } else if (t < T.lanesEnd) {
        drawSky(ctx, w, h, t, 6);
        drawAurora(ctx, w, h, t, '#34d399', 0.5);
        drawParticles(ctx, particles, 0.7);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(165,243,252,0.18)');
        const adv = clamp01((t - T.rebootEnd) / (T.lanesEnd - T.rebootEnd));
        phase2(ctx, w, h, t, adv);
      } else if (t < T.kuralStart) {
        drawSky(ctx, w, h, t, 6);
        drawAurora(ctx, w, h, t, '#34d399', 0.55);
        drawParticles(ctx, particles, 0.75);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(165,243,252,0.2)');
        const k = easeOutBack(clamp01((t - T.brandStart) / (T.kuralStart - T.brandStart)));
        drawBrand(ctx, w, h, k);
      } else {
        drawSky(ctx, w, h, t, 6);
        drawAurora(ctx, w, h, t, '#34d399', 0.5);
        drawParticles(ctx, particles, 0.5);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(165,243,252,0.18)');
        const adv = clamp01((t - T.kuralStart) / (T.kuralEnd - T.kuralStart));
        drawKural(ctx, w, h, adv);
      }
      ctx.restore();

      if (t >= T.end) { finishRef.current(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-label="Voice of Gudalur opening animation"
      className={`fixed inset-0 z-[100] transition-opacity duration-700 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      onClick={() => finishRef.current()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finishRef.current(); }}
        className="absolute right-4 top-4 rounded-full border border-white/25 bg-black/35 px-4 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur transition hover:bg-black/60"
      >
        SKIP ▸
      </button>
    </div>
  );
};

export default OpeningAnimation;