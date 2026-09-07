/**
 * OPENING ANIMATION — blissful, supreme elegance.
 *
 * The story (unchanged theme):
 *   Phase 1: Elephant, tiger, human share ONE landscape → converge → COLLIDE
 *   Phase 2: System reboots → landscape REDESIGNED → each moves in their OWN corridor, no collision
 *
 * What's elevated:
 *   Living gradient sky, volumetric clouds, floating particles (fireflies/leaves),
 *   refined animal silhouettes, elastic easing, crossfade transitions,
 *   ripple reboot effect, glowing corridors, brand bloom, graceful Thirukural.
 *
 * Pure canvas + rAF. Zero new dependencies. Skippable. Reduced-motion aware.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

/* ── Timeline (seconds) ─────────────────────────────────────────────── */
const T = {
  convergeStart: 1.0,
  impact: 4.0,
  failureEnd: 4.8,
  rebootEnd: 5.8,
  lanesEnd: 9.5,
  brandStart: 9.5,
  kuralStart: 11.0,
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
function rgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function lerpColor(c1: string, c2: string, p: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  return `rgb(${Math.round(lerp(r1, r2, p))},${Math.round(lerp(g1, g2, p))},${Math.round(lerp(b1, b2, p))})`;
}

/* ── Living sky gradient ────────────────────────────────────────────── */
function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, phase: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (phase < 4) {
    const tension = clamp01((t - 1) / 3);
    grad.addColorStop(0, lerpColor('#E3F2FD', '#FFCDD2', tension * 0.3));
    grad.addColorStop(0.5, lerpColor('#BBFBFF', '#FFE0B2', tension * 0.2));
    grad.addColorStop(1, lerpColor('#E8F5E9', '#FFF3E0', tension * 0.1));
  } else if (phase < 5) {
    const k = clamp01((t - 4) / 0.8);
    grad.addColorStop(0, lerpColor('#FFCDD2', '#EF5350', k));
    grad.addColorStop(1, lerpColor('#FFEBEE', '#FFCDD2', k));
  } else if (phase < 6) {
    const k = clamp01((t - 4.8) / 1.0);
    grad.addColorStop(0, lerpColor('#EF5350', '#E3F2FD', k));
    grad.addColorStop(1, lerpColor('#FFCDD2', '#E8F5E9', k));
  } else {
    const k = clamp01((t - 5.8) / 3.7);
    grad.addColorStop(0, lerpColor('#E3F2FD', '#FFF8E1', k * 0.5));
    grad.addColorStop(0.5, lerpColor('#E8F5E9', '#C8E6C9', k));
    grad.addColorStop(1, lerpColor('#C8E6C9', '#A5D6A7', k));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
/* ── Child canvas helpers ───────────────────────────────────────────── */
function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  const anyCtx = ctx as any;
  if (typeof anyCtx.roundRect === 'function') { anyCtx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ── Particle system (pooled) ──────────────────────────────────────── */
interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string; kind: number; }

function createParticles(w: number, h: number, count: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const kind = Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2;
    particles.push({
      x: Math.random() * w, y: h * 0.1 + Math.random() * h * 0.7,
      vx: (Math.random() - 0.5) * 12, vy: -5 - Math.random() * 15,
      life: 3 + Math.random() * 5, maxLife: 8,
      size: kind === 2 ? 2 + Math.random() * 3 : 1 + Math.random() * 2.5,
      color: kind === 0 ? '#FFD54F' : kind === 2 ? '#81C784' : '#E8F5E9',
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
    if (p.kind === 0) { p.vx += (Math.random() - 0.5) * 20 * dt; p.vy += Math.sin(Date.now() / 500 + p.x) * 5 * dt; }
    else if (p.kind === 2) { p.vx += Math.sin(Date.now() / 800 + p.y * 0.01) * 15 * dt; p.vy += 2 * dt; }
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[], alpha: number) {
  for (const p of particles) {
    const lifeRatio = p.life / p.maxLife;
    const a = alpha * Math.min(1, lifeRatio * 2) * 0.5;
    if (a <= 0) continue;
    ctx.fillStyle = rgba(p.color, a);
    ctx.beginPath();
    if (p.kind === 2) ctx.ellipse(p.x, p.y, p.size * 1.5, p.size * 0.7, p.vx * 0.05, 0, Math.PI * 2);
    else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ── Clouds (volumetric) ───────────────────────────────────────────── */
interface Cloud { x: number; y: number; s: number; v: number; a: number; layer: number; puffs: Array<[number, number, number]>; }

function makeClouds(W: number, H: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < 12; i++) {
    const puffs: Array<[number, number, number]> = [];
    const n = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) puffs.push([(Math.random() - 0.5) * 130, (Math.random() - 0.5) * 26, 26 + Math.random() * 30]);
    clouds.push({ x: Math.random() * (W + 400) - 200, y: H * (0.06 + Math.random() * 0.30), s: 0.6 + Math.random() * 0.9, v: (10 + Math.random() * 20) * (0.5 + Math.random() * 0.5), a: 0.15 + Math.random() * 0.25, layer: Math.floor(Math.random() * 3), puffs });
  }
  return clouds;
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, style: string, shadow: string) {
  ctx.save();
  ctx.globalAlpha = c.a;
  ctx.fillStyle = shadow;
  for (const [dx, dy, r] of c.puffs) { ctx.beginPath(); ctx.ellipse(c.x + dx * c.s + 4, c.y + dy * c.s + 8 * c.s, r * c.s, r * 0.4 * c.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = style;
  for (const [dx, dy, r] of c.puffs) { ctx.beginPath(); ctx.ellipse(c.x + dx * c.s, c.y + dy * c.s, r * c.s, r * 0.55 * c.s, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/* ── Refined animal silhouettes ────────────────────────────────────── */

function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  const legX = [-38, -14, 16, 38];
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 15 * s;
  for (let i = 0; i < 4; i++) {
    const swing = Math.sin(walk + i * 1.7) * 9 * s;
    ctx.beginPath(); ctx.moveTo(x + legX[i] * s, y); ctx.lineTo(x + (legX[i] - swing * 0.4) * s, y - 42 * s); ctx.stroke();
  }
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath(); ctx.ellipse(x, y - 52 * s, 52 * s, 28 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x - 48 * s, y - 60 * s, 22 * s, 20 * s, 0, 0, Math.PI * 2); ctx.fill();
  const trunkSway = Math.sin(walk * 0.5) * 8 * s;
  ctx.lineWidth = 8 * s; ctx.strokeStyle = '#64748B';
  ctx.beginPath(); ctx.moveTo(x - 60 * s, y - 58 * s); ctx.quadraticCurveTo(x - 72 * s, y - 38 * s + trunkSway, x - 68 * s, y - 18 * s + trunkSway); ctx.stroke();
  ctx.fillStyle = '#64748B';
  ctx.beginPath(); ctx.ellipse(x - 42 * s, y - 68 * s, 12 * s, 14 * s, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(x - 52 * s, y - 62 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 3 * s; ctx.strokeStyle = '#64748B';
  ctx.beginPath(); ctx.moveTo(x + 50 * s, y - 50 * s); ctx.quadraticCurveTo(x + 62 * s, y - 40 * s + Math.sin(walk * 2) * 6 * s, x + 58 * s, y - 28 * s); ctx.stroke();
  ctx.restore();
}

function drawTiger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#78350F'; ctx.lineWidth = 10 * s;
  [-22, -8, 8, 22].forEach((dx, i) => {
    const swing = Math.sin(walk + i * 1.9) * 7 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - swing * 0.3) * s, y - 32 * s); ctx.stroke();
  });
  ctx.fillStyle = '#C2410C';
  ctx.beginPath(); ctx.ellipse(x, y - 38 * s, 42 * s, 18 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7C2D12';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x + i * 10 * s, y - 42 * s, 3.5 * s, 13 * s, 0, 0, Math.PI); ctx.fill(); }
  ctx.fillStyle = '#C2410C';
  ctx.beginPath(); ctx.ellipse(x - 38 * s, y - 44 * s, 18 * s, 14 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7C2D12';
  ctx.beginPath(); ctx.arc(x - 42 * s, y - 56 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 32 * s, y - 54 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FDE047';
  ctx.beginPath(); ctx.arc(x - 44 * s, y - 46 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 30 * s, y - 44 * s, 2.5 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#C2410C'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo(x + 40 * s, y - 36 * s);
  ctx.quadraticCurveTo(x + 56 * s, y - 28 * s + Math.sin(walk * 2.5) * 10 * s, x + 52 * s, y - 14 * s + Math.sin(walk * 2) * 6 * s);
  ctx.stroke();
  ctx.restore();
}

function drawHuman(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 5 * s;
  [-6, 6].forEach((dx, i) => {
    const swing = Math.sin(walk + i * Math.PI) * 6 * s;
    ctx.beginPath(); ctx.moveTo(x + dx * s, y); ctx.lineTo(x + (dx - swing * 0.3) * s, y - 28 * s); ctx.stroke();
  });
  ctx.fillStyle = '#0F766E';
  ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 26 * s); ctx.lineTo(x + 8 * s, y - 26 * s); ctx.lineTo(x + 6 * s, y - 52 * s); ctx.lineTo(x - 6 * s, y - 52 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FCD34D';
  ctx.beginPath(); ctx.arc(x, y - 58 * s, 8 * s, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 3 * s;
  ctx.beginPath(); ctx.moveTo(x - 6 * s, y - 46 * s); ctx.lineTo(x - 14 * s + Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 6 * s, y - 46 * s); ctx.lineTo(x + 14 * s - Math.sin(walk) * 5 * s, y - 32 * s); ctx.stroke();
  ctx.restore();
}
/* ── Phase 1: Shared landscape → converge → collide ────────────────── */

function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number, phase: number) {
  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  if (phase < 5) {
    grad.addColorStop(0, '#8D6E63');
    grad.addColorStop(1, '#5D4037');
  } else {
    grad.addColorStop(0, '#A5D6A7');
    grad.addColorStop(1, '#66BB6A');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
  ctx.strokeStyle = phase < 5 ? '#6D4C41' : '#4CAF50';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const gx = ((i / 40) * w + Math.random() * 20) % (w + 20);
    const gy = h * (0.62 + Math.random() * 0.3);
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (Math.random() - 0.5) * 8, gy - 8 - Math.random() * 6); ctx.stroke();
  }
}

function phase1(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number) {
  // adv = animation progress 0..1 (converge time)
  const groundY = h * 0.66;
  const cx = w / 2;
  // Elephant from right, tiger from right-centre, human from left
  const eleX = lerp(w * 0.85, cx + 40, easeInOutSine(adv));
  const eleY = groundY;
  const tigX = lerp(w * 0.95, cx - 10, easeInOutSine(adv * 0.9));
  const tigY = groundY - 20;
  const humX = lerp(w * 0.1, cx - 70, easeInOutSine(adv));
  const humY = groundY - 10;
  const walk = t * 4;

  // Show converging (adv 0..1 with breathing room)
  drawGround(ctx, w, h, 0);
  drawElephant(ctx, eleX, eleY, 1.4, walk, 1);
  drawTiger(ctx, tigX, tigY, 1.0, walk * 1.3, 1);
  drawHuman(ctx, humX, humY, 1.2, walk, 1);

  // Fade into impact as adv approaches 1
  const impactApproach = clamp01((adv - 0.75) / 0.25);
  ctx.globalAlpha = 1 - impactApproach * 0.8;
  // Labels
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('ELEPHANT', eleX, eleY - 95); ctx.fillText('TIGER', tigX, tigY - 75); ctx.fillText('HUMAN', humX, humY - 85);
  ctx.globalAlpha = 1;
}

function drawImpactFlash(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.6;
  // Red radial burst
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300 * k + 40);
  grad.addColorStop(0, `rgba(239,83,80,${0.9 * k})`);
  grad.addColorStop(1, 'rgba(239,83,80,0)');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // Glitch lines
  ctx.fillStyle = `rgba(255,255,255,${0.4 * k})`;
  for (let i = 0; i < 12; i++) {
    const y = Math.random() * h;
    const gl = Math.random() * 60 * k;
    ctx.fillRect(Math.random() * w, y, gl, 2);
  }
}

function drawFailureScreen(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  ctx.fillStyle = `rgba(0,0,0,${0.65 * k})`;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center'; ctx.fillStyle = `rgba(239,83,80,${1 * k})`;
  ctx.font = 'bold 34px system-ui';
  ctx.fillText('SYSTEM FAILURE', w / 2, h / 2 - 40);
  ctx.font = '16px system-ui'; ctx.fillStyle = `rgba(255,255,255,${0.85 * k})`;
  ctx.fillText('The shared ground cannot hold us all', w / 2, h / 2 + 10);
  ctx.fillText('We must redesign the landscape', w / 2, h / 2 + 38);
}
/* ── Phase 2: Reboot ripple → glowing corridors → coexistence ──────── */

function drawRebootRipple(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.6;
  // Expanding ring
  ctx.strokeStyle = `rgba(165,214,167,${0.8 * (1 - k)})`;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 50 + k * 400, 0, Math.PI * 2); ctx.stroke();
  // Inner bright core
  ctx.fillStyle = `rgba(200,230,201,${0.5 * (1 - k)})`;
  ctx.beginPath(); ctx.arc(cx, cy, 20 + k * 300, 0, Math.PI * 2); ctx.fill();
}

function drawCorridor(ctx: CanvasRenderingContext2D, w: number, h: number, y: number, xStart: number, xEnd: number, color: string, glow: number, label: string) {
  const yTop = y - 40;
  const grad = ctx.createLinearGradient(xStart, 0, xEnd, 0);
  grad.addColorStop(0, rgba(color, 0.1 + glow * 0.3));
  grad.addColorStop(1, rgba(color, 0.1 + glow * 0.5));
  ctx.fillStyle = grad;
  ctx.fillRect(xStart, yTop, xEnd - xStart, 70);
  // Glow edge
  ctx.strokeStyle = rgba(color, 0.4 + glow * 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(xStart, yTop); ctx.lineTo(xEnd, yTop); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(xStart, yTop + 70); ctx.lineTo(xEnd, yTop + 70); ctx.stroke();
  // Label
  ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
  ctx.fillStyle = rgba(color, 0.9);
  ctx.fillText(label, (xStart + xEnd) / 2, y - 18);
}

function phase2(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number) {
  const groundY = h * 0.78;
  drawGround(ctx, w, h, 1);
  // Decorations: friendly hint of separation
  const glow = 0.5 + 0.5 * Math.sin(t * 2);

  // Three corridors (own lanes)
  drawCorridor(ctx, w, h, groundY - 60, w * 0.02, w * 0.98, '#81C784', glow, 'ELEPHANT CORRIDOR');
  drawCorridor(ctx, w, h, groundY - 20, w * 0.02, w * 0.98, '#FFB74D', glow, 'TIGER PASSAGE');
  drawCorridor(ctx, w, h, groundY + 20, w * 0.02, w * 0.98, '#4DD0E1', glow, 'HUMAN SAFE PATH');

  // Three move independently in their own lanes, no collision
  const walk = t * 3;
  drawElephant(ctx, elephantXOn(adv, w), groundY - 60, 1.3, walk, 1);
  drawTiger(ctx, tigerXOn(adv, w), groundY - 20, 0.9, walk * 1.3, 1);
  drawHuman(ctx, humanXOn(adv, w), groundY + 20, 1.0, walk, 1);

  // Charming line
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 22px system-ui';
  ctx.fillText('Dedicated paths. Harmony restored.', w / 2, h * 0.16);
}

function elephantXOn(adv: number, w: number) { return (adv * w * 1.5) % (w + 100) - 50; }
function tigerXOn(adv: number, w: number) { return w - ((adv * w * 1.7) % (w + 100)) + 50; }
function humanXOn(adv: number, w: number) { return ((adv * w * 1.4) % (w + 100)) - 50; }

/* ── Brand bloom ───────────────────────────────────────────────────── */
function drawBrandBloom(ctx: CanvasRenderingContext2D, w: number, h: number, k: number) {
  const cx = w / 2, cy = h * 0.42;
  // Golden bloom behind text
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200 + k * 100);
  bloom.addColorStop(0, `rgba(255,213,79,${0.35 * k})`);
  bloom.addColorStop(1, 'rgba(255,213,79,0)');
  ctx.fillStyle = bloom; ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center'; ctx.fillStyle = `rgba(26,59,34,${1 * k})`;
  ctx.font = `bold ${42 + k * 6}px Georgia, serif`;
  ctx.fillText('VOICE OF GUDALUR', cx, cy + 12);
  ctx.font = `18px system-ui`; ctx.fillStyle = `rgba(46,125,50,${0.9 * k})`;
  ctx.fillText('One Place · Many Communities · One Connected People', cx, cy + 48);

  // Sparkles around
  for (let i = 0; i < 20; i++) {
    const ang = (i / 20) * Math.PI * 2 + k * 0.5;
    const dist = 130 + Math.sin(k * 6 + i) * 25;
    const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
    ctx.fillStyle = `rgba(255,213,79,${0.7 * k})`;
    ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fill();
  }
}
/* ── Thirukural — graceful word-by-word reveal ──────────────────────── */
const KURAL_TEXT = 'கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.';
const KURAL_WORDS = KURAL_TEXT.split(' ');
const KURAL_MEANING = 'The rain cloud asks for nothing in return; true service is given without expectation of reward.';

function drawKural(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, adv: number) {
  ctx.textAlign = 'center';
  // Soft cloud bed behind text
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.44, 360, 90, 0, 0, Math.PI * 2); ctx.fill();

  // Word-by-word reveal
  const wordsVisible = Math.floor(adv * KURAL_WORDS.length);
  ctx.font = 'bold 26px "Noto Sans Tamil", system-ui, sans-serif';
  ctx.fillStyle = '#1B5E20';
  const line1 = KURAL_WORDS.slice(0, Math.ceil(KURAL_WORDS.length / 2)).join(' ');
  const line2 = KURAL_WORDS.slice(Math.ceil(KURAL_WORDS.length / 2)).join(' ');
  ctx.fillText(line1, w / 2, h * 0.42);
  ctx.fillText(line2, w / 2, h * 0.5);

  // Meaning fades in after all words revealed
  const meaningA = clamp01((adv - 0.7) / 0.3);
  ctx.font = '16px system-ui'; ctx.fillStyle = `rgba(46,74,66,${0.85 * meaningA})`;
  ctx.fillText(`Translation: ${KURAL_MEANING}`, w / 2, h * 0.62);

  // Footer hint
  ctx.font = '11px system-ui'; ctx.fillStyle = `rgba(46,125,50,${0.5})`;
  ctx.fillText('திருக்குறள் 228', w / 2, h * 0.74);
  void wordsVisible;
}
/* ── The React component ────────────────────────────────────────────── */

export const OpeningAnimation: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});
  const particlesRef = useRef<Particle[] | null>(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    window.setTimeout(() => onFinish(), 650);
  }, [onFinish]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

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

    const clouds = makeClouds(window.innerWidth, window.innerHeight);
    particlesRef.current = createParticles(window.innerWidth, window.innerHeight, 40);

    const start = performance.now();
    let last = start, raf = 0;

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;

      // Move clouds
      for (const c of clouds) { c.x += c.v * dt; if (c.x > w + 260) c.x = -260; }
      // Move particles
      updateParticles(particlesRef.current!, dt, w, h);

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      // screen shake during impact
      if (t >= T.impact && t < T.impact + 0.4) {
        const k = 1 - (t - T.impact) / 0.4;
        ctx.translate((Math.random() - 0.5) * 18 * k, (Math.random() - 0.5) * 12 * k);
      }

      // Determine phase
      if (t < T.impact) {
        // Phase 1: converge
        drawSky(ctx, w, h, t, 1);
        drawParticles(ctx, particlesRef.current!, 0.4);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(255,255,255,0.9)', 'rgba(100,116,139,0.15)');
        const adv = clamp01((t - T.convergeStart) / (T.impact - T.convergeStart));
        phase1(ctx, w, h, t, adv);
      } else if (t < T.failureEnd) {
        // Impact flash
        drawSky(ctx, w, h, t, 4);
        const k = clamp01((t - T.impact) / (T.failureEnd - T.impact));
        phase1(ctx, w, h, t, 1);
        drawImpactFlash(ctx, w, h, k);
        drawFailureScreen(ctx, w, h, clamp01((t - T.impact - 0.05) / 0.5));
      } else if (t < T.rebootEnd) {
        // Reboot
        drawSky(ctx, w, h, t, 5);
        const k = clamp01((t - T.failureEnd) / (T.rebootEnd - T.failureEnd));
        drawRebootRipple(ctx, w, h, 1 - k);
        drawGround(ctx, w, h, 0);
      } else if (t < T.lanesEnd) {
        // Corridors phase
        drawSky(ctx, w, h, t, 6);
        drawParticles(ctx, particlesRef.current!, 0.7);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(255,255,255,0.95)', 'rgba(100,116,139,0.12)');
        const adv = clamp01((t - T.rebootEnd) / (T.lanesEnd - T.rebootEnd));
        phase2(ctx, w, h, t, adv);
      } else if (t < T.brandStart) {
        // Pre-brand cross
        drawSky(ctx, w, h, t, 6);
        drawParticles(ctx, particlesRef.current!, 0.8);
      } else if (t < T.kuralStart) {
        // Brand bloom
        drawSky(ctx, w, h, t, 6);
        drawParticles(ctx, particlesRef.current!, 0.8);
        const k = easeOutBack(clamp01((t - T.brandStart) / (T.kuralStart - T.brandStart)));
        drawBrandBloom(ctx, w, h, k);
      } else {
        // Thirukural
        drawSky(ctx, w, h, t, 6);
        drawParticles(ctx, particlesRef.current!, 0.3);
        for (const c of clouds) drawCloud(ctx, c, 'rgba(255,255,255,0.9)', 'rgba(100,116,139,0.1)');
        const adv = clamp01((t - T.kuralStart) / (T.kuralEnd - T.kuralStart));
        drawKural(ctx, w, h, t, adv);
      }
      ctx.restore();

      if (t >= T.end) { finishRef.current(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
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
        className="absolute right-4 top-4 rounded-full border border-white/30 bg-black/30 px-4 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur transition hover:bg-black/60"
      >
        SKIP ▸
      </button>
    </div>
  );
};

export default OpeningAnimation;