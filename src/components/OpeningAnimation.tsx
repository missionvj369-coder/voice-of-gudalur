import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * OPENING ANIMATION — the whole platform vision in ~10 seconds.
 *
 * Phase 1 (0:00-0:05) "The System Failure":
 *   white sky + drifting clouds; an elephant (right), a tiger (centre) and a
 *   human (left) converge on the same patch of ground and COLLIDE -> red
 *   glitch, screen shake, SYSTEM FAILURE error screen.
 * Phase 2 (0:05-0:10) "Redesigned Coexistence":
 *   the system reboots into a redesigned landscape of dedicated lanes —
 *   elephant corridor, tiger passage, human safe path — where all three
 *   traverse smoothly without ever colliding. Brand reveal -> fade into the
 *   website.
 *
 * Pure HTML5 Canvas + a single rAF timeline: no extra dependencies, mobile
 * friendly, skippable, once per session, and fully skipped for users who
 * prefer reduced motion.
 */

/** Timeline anchors (seconds) — the Kural phase is extended for comfortable reading. */
const T = {
  convergeStart: 1.2,
  impact: 4.2,
  failureEnd: 5.0,
  rebootEnd: 5.6,
  lanesEnd: 8.8,
  brandStart: 8.8,
  kuralStart: 10.4,
  kuralEnd: 16.5,
  end: 18.0,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const easeInCubic = (p: number) => p * p * p;
const easeInOutSine = (p: number) => -(Math.cos(Math.PI * p) - 1) / 2;

interface Cloud {
  x: number;
  y: number;
  s: number;
  v: number;
  a: number;
  puffs: Array<[number, number, number]>;
}

function makeClouds(W: number, H: number): Cloud[] {
  const clouds: Cloud[] = [];
  for (let i = 0; i < 9; i++) {
    const puffs: Array<[number, number, number]> = [];
    const n = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      puffs.push([(Math.random() - 0.5) * 130, (Math.random() - 0.5) * 26, 26 + Math.random() * 30]);
    }
    clouds.push({
      x: Math.random() * (W + 400) - 200,
      y: H * (0.06 + Math.random() * 0.30),
      s: 0.6 + Math.random() * 0.9,
      v: 14 + Math.random() * 30, // px/s — the cloud layer drifts left -> right
      a: 0.25 + Math.random() * 0.35,
      puffs,
    });
  }
  return clouds;
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud, style: string) {
  ctx.fillStyle = style;
  for (const [dx, dy, r] of c.puffs) {
    ctx.beginPath();
    ctx.ellipse(c.x + dx * c.s, c.y + dy * c.s, r * c.s, r * 0.55 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  const anyCtx = ctx as any;
  if (typeof anyCtx.roundRect === 'function') {
    anyCtx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Stylized elephant silhouette, facing LEFT, baseline at (x, y). */
function drawElephant(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number) {
  const body = '#94a3b8';
  const shade = '#64748b';
  ctx.save();
  ctx.lineCap = 'round';
  // legs (alternating swing)
  ctx.strokeStyle = shade;
  ctx.lineWidth = 15 * s;
  ([-38, -14, 16, 38] as const).forEach((dx, i) => {
    const swing = Math.sin(walk + i * 1.7) * 9 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y - 42 * s);
    ctx.lineTo(x + dx * s + swing, y);
    ctx.stroke();
  });
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, y - 62 * s, 66 * s, 42 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(x - 64 * s, y - 74 * s, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  // ear
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.ellipse(x - 50 * s, y - 76 * s, 18 * s, 24 * s, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // trunk (swaying)
  ctx.strokeStyle = body;
  ctx.lineWidth = 13 * s;
  const sway = Math.sin(walk * 0.9) * 6 * s;
  ctx.beginPath();
  ctx.moveTo(x - 86 * s, y - 82 * s);
  ctx.bezierCurveTo(x - 104 * s, y - 60 * s, x - 100 * s + sway, y - 30 * s, x - 96 * s + sway * 1.6, y - 4 * s);
  ctx.stroke();
  // tusk
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 5 * s;
  ctx.beginPath();
  ctx.moveTo(x - 78 * s, y - 60 * s);
  ctx.quadraticCurveTo(x - 88 * s, y - 48 * s, x - 84 * s, y - 38 * s);
  ctx.stroke();
  // eye
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 74 * s, y - 80 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Stylized tiger silhouette, facing LEFT, baseline at (x, y). */
function drawTiger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number) {
  const fur = '#f97316';
  const dark = '#7c2d12';
  ctx.save();
  ctx.lineCap = 'round';
  // tail
  ctx.strokeStyle = fur;
  ctx.lineWidth = 8 * s;
  ctx.beginPath();
  ctx.moveTo(x + 48 * s, y - 44 * s);
  ctx.bezierCurveTo(x + 78 * s, y - 58 * s + Math.sin(walk) * 6 * s, x + 84 * s, y - 78 * s, x + 70 * s, y - 86 * s);
  ctx.stroke();
  // legs
  ctx.lineWidth = 11 * s;
  ([-30, -14, 26, 40] as const).forEach((dx, i) => {
    const swing = Math.sin(walk + i * 1.9) * 10 * s;
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y - 34 * s);
    ctx.lineTo(x + dx * s + swing, y);
    ctx.stroke();
  });
  // body
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(x, y - 42 * s, 52 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // head + ears
  ctx.beginPath();
  ctx.arc(x - 54 * s, y - 52 * s, 21 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = dark;
  [-10, 8].forEach((dx) => {
    ctx.beginPath();
    ctx.arc(x - 54 * s + dx * s, y - 70 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  });
  // muzzle + eye
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.ellipse(x - 66 * s, y - 47 * s, 9 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x - 60 * s, y - 56 * s, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
  // stripes
  ctx.strokeStyle = dark;
  ctx.lineWidth = 4 * s;
  ctx.lineCap = 'butt';
  [-18, 0, 16, 32].forEach((dx, i) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y - 62 * s);
    ctx.lineTo(x + dx * s + 4 * s, y - 30 * s + Math.sin(i) * 3 * s);
    ctx.stroke();
  });
  ctx.restore();
}

/** Stylized human walker, facing RIGHT, baseline at (x, y). */
function drawHuman(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, walk: number) {
  const skin = '#334155';
  ctx.save();
  ctx.strokeStyle = skin;
  ctx.fillStyle = skin;
  ctx.lineCap = 'round';
  const bob = Math.abs(Math.sin(walk)) * 2.5 * s;
  const hipY = y - 30 * s - bob;
  const headY = y - 62 * s - bob;
  // legs
  ctx.lineWidth = 7 * s;
  [0, Math.PI].forEach((off, idx) => {
    const swing = Math.sin(walk + off) * 13 * s;
    ctx.beginPath();
    ctx.moveTo(x, hipY);
    ctx.lineTo(x + swing, y - (idx ? 2 : 0));
    ctx.stroke();
  });
  // torso
  ctx.lineWidth = 9 * s;
  ctx.beginPath();
  ctx.moveTo(x, hipY - 2 * s);
  ctx.lineTo(x, headY + 10 * s);
  ctx.stroke();
  // arms (opposite swing)
  ctx.lineWidth = 6 * s;
  const armSw = Math.sin(walk) * 11 * s;
  ctx.beginPath();
  ctx.moveTo(x, headY + 14 * s);
  ctx.lineTo(x + armSw, hipY - 6 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, headY + 14 * s);
  ctx.lineTo(x - armSw, hipY - 6 * s);
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(x, headY, 9.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** PHASE 1 — white sky, clouds, converging actors, impact, failure overlay. */
function drawPhase1(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  clouds: Cloud[],
) {
  // Sky
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.8);
  sky.addColorStop(0, 'rgba(214,234,255,0.85)');
  sky.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.8);

  // Moving cloud layer (left -> right)
  for (const c of clouds) drawCloud(ctx, c, `rgba(203,213,225,${c.a})`);

  // Ground
  const gy = H * 0.74;
  ctx.fillStyle = 'rgba(16,185,129,0.10)';
  ctx.fillRect(0, gy, W, H - gy);
  ctx.strokeStyle = 'rgba(15,23,42,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, gy);
  ctx.lineTo(W, gy);
  ctx.stroke();

  // Opening captions
  const titleA = clamp01((t - 0.2) / 0.6);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = `rgba(15,23,42,${0.85 * titleA})`;
  ctx.font = `700 ${Math.min(W * 0.032, 22)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('GUDALUR · THE NILGIRIS', 24, 20);
  ctx.fillStyle = `rgba(71,85,105,${0.8 * titleA})`;
  ctx.font = `500 ${Math.min(W * 0.024, 15)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('One shared home — until the space runs out.', 24, 50);

  // Actors converge on the same patch of ground
  const p = t < T.convergeStart ? 0 : easeInCubic(clamp01((t - T.convergeStart) / (T.impact - T.convergeStart)));
  const walk = 2 + t * (6 + p * 16);
  const scale = Math.min(W / 900, 1);
  const ex = lerp(W * 0.94, W * 0.53, p);
  const tx = lerp(W * 0.60, W * 0.495, p);
  const hx = lerp(W * 0.16, W * 0.45, p);

  // speed lines while charging
  if (p > 0.35) {
    ctx.strokeStyle = `rgba(100,116,139,${0.3 * p})`;
    ctx.lineWidth = 2;
    [ex - 90, ex - 130, tx - 70, tx - 110, hx + 70, hx + 110].forEach((lx, i) => {
      const ly = gy - 18 - (i % 3) * 22;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 46 + p * 30, ly);
      ctx.stroke();
    });
  }

  drawElephant(ctx, ex, gy, scale * 0.95, walk);
  drawTiger(ctx, tx, gy, scale * 0.9, walk * 1.1);
  drawHuman(ctx, hx, gy, scale * 0.95, walk);

  // IMPACT — flash + shock ring
  if (t >= T.impact) {
    const k = clamp01((t - T.impact) / 0.35);
    ctx.fillStyle = `rgba(255,255,255,${1 - k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(239,68,68,${0.6 * (1 - k)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W * 0.5, gy - 60, 20 + 260 * k, 0, Math.PI * 2);
    ctx.stroke();
  }

  // SYSTEM FAILURE overlay
  if (t >= T.impact + 0.15) drawFailure(ctx, W, H, t);
}

/** The red glitch "SYSTEM FAILURE" screen with a fake crash modal. */
function drawFailure(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const start = T.impact + 0.15;
  const k = clamp01((t - start) / 0.25);

  // dark red wash + pulse
  ctx.fillStyle = `rgba(26,0,0,${0.82 * k})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = `rgba(220,38,38,${(0.10 + 0.08 * Math.sin(t * 42)) * k})`;
  ctx.fillRect(0, 0, W, H);

  // glitch bars (deterministic jitter per animation step)
  const step = Math.floor(t * 24);
  let seed = (step * 9301 + 49297) % 233280;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < 14; i++) {
    const y = rnd() * H;
    const hgt = 3 + rnd() * 26;
    const off = (rnd() - 0.5) * 70;
    ctx.fillStyle = `rgba(${i % 3 === 0 ? '148,163,184' : '239,68,68'},${(0.08 + rnd() * 0.22) * k})`;
    ctx.fillRect(off, y, W, hgt);
  }

  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // headline — RGB split + flicker
  const fs = Math.min(W * 0.085, 78);
  const cx = W / 2;
  const cy = H * 0.34;
  const flicker = Math.sin(t * 48) > -0.4 ? 1 : 0.25;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fs}px 'Courier New', monospace`;
  ctx.fillStyle = `rgba(239,68,68,${0.8 * k * flicker})`;
  ctx.fillText('SYSTEM FAILURE', cx - 4, cy);
  ctx.fillStyle = `rgba(34,211,238,${0.6 * k * flicker})`;
  ctx.fillText('SYSTEM FAILURE', cx + 4, cy + 1);
  ctx.fillStyle = `rgba(255,241,242,${k * flicker})`;
  ctx.fillText('SYSTEM FAILURE', cx, cy);

  ctx.font = `600 ${Math.min(W * 0.026, 18)}px 'Courier New', monospace`;
  ctx.fillStyle = `rgba(248,113,113,${0.9 * k})`;
  ctx.fillText('humans and wildlife are colliding', cx, cy + fs * 0.78);

  // crash modal with typewriter lines
  const mw = Math.min(W * 0.78, 520);
  const mh = Math.min(H * 0.28, 190);
  const mx = cx - mw / 2;
  const my = H * 0.52;
  ctx.fillStyle = `rgba(10,10,12,${0.92 * k})`;
  ctx.strokeStyle = `rgba(239,68,68,${0.9 * k})`;
  ctx.lineWidth = 2;
  roundRectPath(ctx, mx, my, mw, mh, 12);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  roundRectPath(ctx, mx, my, mw, 30, 12);
  ctx.clip();
  ctx.fillStyle = `rgba(239,68,68,${0.25 * k})`;
  ctx.fillRect(mx, my, mw, 30);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(254,226,226,${0.9 * k})`;
  ctx.font = `700 ${Math.min(W * 0.024, 13)}px 'Courier New', monospace`;
  ctx.fillText('! CONFLICT DETECTED — gudalur.exe', mx + 16, my + 15);

  const lines = [
    'FATAL: coexistence not found',
    'elephant.js · tiger.js · human.js',
    '> all competing for the same space...',
    'reboot with dedicated lanes? [Y/N]',
  ];
  const budget = Math.floor((t - (start + 0.15)) * 36);
  ctx.font = `${Math.min(W * 0.023, 14)}px 'Courier New', monospace`;
  let used = 0;
  lines.forEach((ln, i) => {
    if (used >= budget) return;
    const take = Math.min(ln.length, budget - used);
    const ly = my + 46 + i * ((mh - 58) / 3.6);
    ctx.fillStyle = i === 0 ? `rgba(248,113,113,${k})` : `rgba(226,232,240,${0.9 * k})`;
    ctx.fillText(ln.slice(0, take), mx + 22, ly);
    used += ln.length + 2;
  });
}

/** The system reboots… */
function drawReboot(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, W, H);
  const k = clamp01((t - T.failureEnd) / 0.2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.min(W * 0.03, 20)}px 'Courier New', monospace`;
  ctx.fillStyle = `rgba(74,222,128,${0.9 * k})`;
  const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
  ctx.fillText(`> rebooting coexistence${dots}`, W / 2, H / 2 - 16);
  // progress bar
  const bw = Math.min(W * 0.5, 300);
  const bh = 8;
  const p = clamp01((t - T.failureEnd) / (T.rebootEnd - T.failureEnd));
  ctx.strokeStyle = 'rgba(74,222,128,0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(W / 2 - bw / 2, H / 2 + 14, bw, bh);
  ctx.fillStyle = 'rgba(74,222,128,0.9)';
  ctx.fillRect(W / 2 - bw / 2, H / 2 + 14, bw * p, bh);
  // white flash into the new world
  const f = clamp01((t - (T.rebootEnd - 0.12)) / 0.12);
  if (f > 0) {
    ctx.fillStyle = `rgba(255,255,255,${f})`;
    ctx.fillRect(0, 0, W, H);
  }
}

/** PHASE 2 — the redesigned landscape: three dedicated lanes, zero collisions. */
function drawLanes(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  clouds: Cloud[],
) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#022c22');
  g.addColorStop(1, '#064e3b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // soft mist drifting (same cloud field, calmer)
  for (const c of clouds) drawCloud(ctx, c, `rgba(255,255,255,${c.a * 0.10})`);

  const a = clamp01((t - T.rebootEnd) / 0.8);
  const bands: Array<[number, number, string]> = [
    [H * 0.16, H * 0.40, 'ELEPHANT CORRIDOR'],
    [H * 0.40, H * 0.63, 'TIGER PASSAGE'],
    [H * 0.63, H * 0.86, 'HUMAN SAFE PATH'],
  ];
  const scale = Math.min(W / 900, 1);

  bands.forEach(([y0, y1, label], idx) => {
    // lane surface + dashed separator
    ctx.fillStyle = `rgba(255,255,255,${0.05 * a})`;
    ctx.fillRect(0, y0, W, y1 - y0);
    ctx.strokeStyle = `rgba(167,243,208,${0.30 * a})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(0, y0);
    ctx.lineTo(W, y0);
    ctx.stroke();
    ctx.setLineDash([]);
    // label
    ctx.fillStyle = `rgba(167,243,208,${0.75 * a})`;
    ctx.font = `700 ${Math.min(W * 0.022, 14)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(label, 18, y0 + 10);
    // the actor traverses its own lane — smooth, no collision
    const q = easeInOutSine(clamp01((t - (T.rebootEnd + 0.2)) / 2.6));
    const x = lerp(-150, W + 150, q);
    const base = y1 - 8;
    const walk = t * 6 + idx * 2;
    if (idx === 0) drawElephant(ctx, x, base, scale * 0.95, walk);
    else if (idx === 1) drawTiger(ctx, x, base, scale * 0.85, walk);
    else drawHuman(ctx, x, base, scale * 0.85, walk);
  });

  // caption
  const capIn = clamp01((t - 5.9) / 0.5);
  const capOut = 1 - clamp01((t - 8.2) / 0.5);
  const capA = Math.min(capIn, capOut);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,255,255,${capA})`;
  ctx.font = `800 ${Math.min(W * 0.045, 34)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('The system, redesigned.', W / 2, H * 0.075);
  const subIn = clamp01((t - 6.5) / 0.5);
  ctx.fillStyle = `rgba(167,243,208,${Math.min(subIn, capOut) * 0.95})`;
  ctx.font = `600 ${Math.min(W * 0.026, 17)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('Dedicated lanes · Safe passage · Coexistence', W / 2, H * 0.075 + Math.min(W * 0.045, 34) * 0.85 + 10);
}

/** Thirukural phase — white clouds, green text, magic animation. */
function drawKural(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, clouds: Cloud[]) {
  // White cloud background
  ctx.fillStyle = 'rgba(255,255,255,0.98)';
  ctx.fillRect(0, 0, W, H);

  // Draw animated clouds
  for (const c of clouds) {
    drawCloud(ctx, c, `rgba(255,255,255,${c.a})`);
  }

  const kuralProgress = clamp01((t - T.kuralStart) / 1.5);
  const textFade = clamp01((t - T.kuralStart - 0.5) / 1.0);

  // Green gradient overlay at top and bottom
  const gradTop = ctx.createLinearGradient(0, 0, 0, H * 0.15);
  gradTop.addColorStop(0, 'rgba(240,248,240,0.9)');
  gradTop.addColorStop(1, 'rgba(240,248,240,0)');
  ctx.fillStyle = gradTop;
  ctx.fillRect(0, 0, W, H * 0.15);

  const gradBottom = ctx.createLinearGradient(0, H * 0.85, 0, H);
  gradBottom.addColorStop(0, 'rgba(240,248,240,0)');
  gradBottom.addColorStop(1, 'rgba(240,248,240,0.9)');
  ctx.fillStyle = gradBottom;
  ctx.fillRect(0, H * 0.85, W, H * 0.15);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Kural number badge
  const badgeA = clamp01((t - T.kuralStart) / 0.8);
  ctx.fillStyle = `rgba(27,94,32,${badgeA * 0.1})`;
  roundRectPath(ctx, W / 2 - 60, H * 0.08, 120, 36, 18);
  ctx.fill();
  ctx.fillStyle = `rgba(27,94,32,${badgeA})`;
  ctx.font = `700 ${Math.min(W * 0.022, 14)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('திருக்குறள் #228', W / 2, H * 0.08 + 18);

  // Chapter title
  const chapterA = clamp01((t - T.kuralStart - 0.3) / 0.8);
  ctx.fillStyle = `rgba(46,125,50,${chapterA})`;
  ctx.font = `700 ${Math.min(W * 0.032, 22)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('கைம்மாறு வேண்டா கடப்பாடு', W / 2, H * 0.18);

  // Main kural text with magic effect — draw word by word to preserve Indic script.
  // Spacing matches the printed order exactly: a single even word gap, lines are
  // word-wrapped and each one is centred so the kural never clips on small phones.
  const kuralText = 'கைம்மாறு வேண்டா கடப்பாடு மாரிமாட்டு என்னாற்றும் கொல்லோ உலகு.';
  const words = kuralText.split(' ');
  const wordDelay = 0.45;
  const startY = H * 0.28;
  const leading = Math.min(H * 0.06, 46);
  const fontSize = Math.min(W * 0.036, 28);
  ctx.font = `800 ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
  // Use the natural space glyph width so the spacing matches the original text exactly.
  const gap = ctx.measureText(' ').width;

  // Greedy word-wrap into centred lines (each word appears once, in order).
  const widths = words.map((word) => ctx.measureText(word).width);
  const maxW = W * 0.92;
  const lines: { start: number; count: number; total: number }[] = [];
  let curStart = 0;
  let curCount = 0;
  let curW = 0;
  words.forEach((word, i) => {
    const sep = curCount ? gap : 0;
    if (curCount && curW + sep + widths[i] > maxW) {
      lines.push({ start: curStart, count: curCount, total: curW });
      curStart = i;
      curCount = 1;
      curW = widths[i];
    } else {
      curCount += 1;
      curW += sep + widths[i];
    }
  });
  if (curCount) lines.push({ start: curStart, count: curCount, total: curW });

  // Draw each line, centred, with a slow word-by-word reveal.
  lines.forEach((line, li) => {
    const lineY = startY + li * leading;
    let x = (W - line.total) / 2;
    for (let k = 0; k < line.count; k++) {
      const wi = line.start + k;
      const wordA = clamp01((t - T.kuralStart - 0.8 - wi * wordDelay) / 0.4);
      if (wordA > 0) {
        const yOffset = (1 - wordA) * 20;
        ctx.fillStyle = `rgba(27,94,32,${wordA})`;
        ctx.shadowColor = `rgba(76,175,80,${wordA * 0.6})`;
        ctx.shadowBlur = 10 * wordA;
        ctx.fillText(words[wi], x, lineY + yOffset);
        ctx.shadowBlur = 0;
      }
      if (k < line.count - 1) x += widths[wi] + gap;
    }
  });

  // Meaning in multiple languages
  const meaningA = clamp01((t - T.kuralStart - 2.5) / 1.0);
  ctx.fillStyle = `rgba(46,125,50,${meaningA * 0.9})`;
  ctx.font = `500 ${Math.min(W * 0.022, 15)}px 'Segoe UI', system-ui, sans-serif`;

  const meanings = [
    'Like the rain cloud that asks for nothing in return,',
    'true service is done for society without expecting reward.',
    '',
    'பருவம் பெய்யும் மேகம் எந்த ஈடுமாற்றும் எதிபார்க்காமல் மழை பெய்கிறது;',
    'உண்மையான சமூக சேவை பரிகாரம் எதிபார்க்காமல் செய்ய வேண்டும்.',
  ];

  meanings.forEach((line, i) => {
    if (line) {
      ctx.fillText(line, W / 2, H * 0.50 + i * (Math.min(W * 0.03, 20)));
    }
  });

  // Footer quote
  const footerA = clamp01((t - T.kuralStart - 4.5) / 1.2);
  ctx.fillStyle = `rgba(27,94,32,${footerA})`;
  ctx.font = `700 ${Math.min(W * 0.026, 18)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('இந்த மண் எங்களுக்கு என்ன செய்தது என்று கேட்காதே...', W / 2, H * 0.72);
  ctx.fillText('இந்த மண்ணுக்காக நாம் என்ன செய்தோம் என்று கேள்.', W / 2, H * 0.72 + Math.min(W * 0.03, 22));

  // English translation of footer
  ctx.fillStyle = `rgba(46,125,50,${footerA * 0.8})`;
  ctx.font = `500 ${Math.min(W * 0.02, 13)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('"Don\'t ask what this land has done for us...', W / 2, H * 0.82);
  ctx.fillText('Ask what we have done for this land."', W / 2, H * 0.82 + Math.min(W * 0.025, 18));

  // Loading indicator
  const loadA = clamp01((t - T.kuralStart - 6.0) / 0.5);
  if (loadA > 0) {
    ctx.fillStyle = `rgba(27,94,32,${loadA * 0.6})`;
    ctx.font = `500 ${Math.min(W * 0.02, 13)}px 'Segoe UI', system-ui, sans-serif`;
    const dots = '.'.repeat(1 + (Math.floor(t * 2) % 3));
    ctx.fillText(`Loading Voice of Gudalur${dots}`, W / 2, H * 0.92);
  }
}

/** Brand reveal — deep green, flame mark, tagline, then fade into the site. */
function drawBrand(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  ctx.fillStyle = '#052e16';
  ctx.fillRect(0, 0, W, H);
  const a = clamp01((t - T.brandStart) / 0.8);

  // flame mark
  ctx.save();
  ctx.translate(W / 2, H * 0.33);
  ctx.fillStyle = `rgba(245,158,11,${a})`;
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.bezierCurveTo(26, -18, 30, 4, 0, 34);
  ctx.bezierCurveTo(-30, 4, -26, -18, 0, -46);
  ctx.fill();
  ctx.fillStyle = `rgba(254,240,138,${a})`;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.bezierCurveTo(12, 0, 13, 12, 0, 26);
  ctx.bezierCurveTo(-13, 12, -12, 0, 0, -14);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.font = `900 ${Math.min(W * 0.07, 58)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('VOICE OF GUDALUR', W / 2, H * 0.50);
  ctx.fillStyle = `rgba(167,243,208,${a})`;
  ctx.font = `600 ${Math.min(W * 0.028, 19)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText('One community · One voice · The Right to Life', W / 2, H * 0.585);
  const dots = '.'.repeat(1 + (Math.floor(t * 2.5) % 3));
  ctx.fillStyle = `rgba(255,255,255,${0.55 * a})`;
  ctx.font = `500 ${Math.min(W * 0.022, 14)}px 'Segoe UI', system-ui, sans-serif`;
  ctx.fillText(`entering the petition${dots}`, W / 2, H * 0.70);
}

export const OpeningAnimation: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // The animation now plays on EVERY visit — no "seen" flag is stored,
    // so nothing needs to be persisted here.
    setFading(true);
    window.setTimeout(() => onFinish(), 700);
  }, [onFinish]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
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

    const start = performance.now();
    let last = start;
    let raf = 0;

    // Safety timeout: force-finish if the animation ever hangs (e.g. tab
    // throttling in a background window stops rAF from firing).
    const safety = window.setTimeout(() => finishRef.current(), (T.end + 3) * 1000);

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > w + 260) c.x = -260;
      }

      // Guard: if any single phase throws (bad font, canvas edge case…), we
      // refuse to hang the screen — finish cleanly instead of freezing on a
      // drawn frame (e.g. the deep-green brand screen) forever.
      try {
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        // impact screen shake (decaying)
        if (t >= T.impact && t < T.impact + 0.5) {
          const k = 1 - (t - T.impact) / 0.5;
          ctx.translate((Math.random() - 0.5) * 22 * k, (Math.random() - 0.5) * 16 * k);
        }
        if (t < T.failureEnd) drawPhase1(ctx, w, h, t, clouds);
        else if (t < T.rebootEnd) drawReboot(ctx, w, h, t);
        else if (t < T.lanesEnd) drawLanes(ctx, w, h, t, clouds);
        else if (t < T.kuralStart) drawBrand(ctx, w, h, t);
        else drawKural(ctx, w, h, t, clouds);
        ctx.restore();
      } catch (err) {
        // Never let a drawing error block the site — skip straight to the end.
        console.warn('[OpeningAnimation] draw error, finishing:', err);
        clearTimeout(safety);
        finishRef.current();
        return;
      }

      if (t >= T.end) {
        clearTimeout(safety);
        finishRef.current();
        return; // stop the loop; the CSS fade hands over to the website
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-label="Voice of Gudalur opening animation"
      className={`fixed inset-0 z-[100] bg-white transition-opacity duration-700 ${
        fading ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      onClick={() => finishRef.current()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          finishRef.current();
        }}
        className="absolute right-4 top-4 rounded-full border border-white/30 bg-black/30 px-4 py-1.5 text-[11px] font-bold text-white/90 backdrop-blur transition hover:bg-black/60"
      >
        SKIP ▸
      </button>
    </div>
  );
};





