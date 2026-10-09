/**
 * GUDALUR VISION 2035 — the blueprint data model.
 *
 * ONE source of truth for the whole "Gudalur Vision 2035" section: the copy
 * keys, the accent colours, AND the blueprint geometry. The inline SVG
 * blueprint and the interactive hover hotspots both read their coordinates
 * from here, so a pillar can never drift away from its own dot.
 *
 * WHY the blueprint is drawn in React rather than shipped as a raster:
 *   • it stays razor sharp at any zoom level (the lightbox zooms to 4x on a
 *     phone — a 1600px JPEG turns to mush exactly where the visitor is
 *     looking hardest),
 *   • it costs zero network bytes on the critical path (the whole section
 *     renders with the first paint, which matters on a 3G phone in Gudalur),
 *   • every word in it is real, selectable, translatable text for screen
 *     readers — an <img> of a poster is none of those things.
 *
 * Grievance #18982473 is NOT restated here: GRIEVANCE / GRIEVANCE_URL are
 * imported from ../components/GrievanceTicket so the number lives in one
 * place only (it is also what the PDF receipts use).
 */
import { GRIEVANCE, GRIEVANCE_URL } from '../components/GrievanceTicket';

/** The activism palette. Dark base, red = act now, green = the 2035 build. */
export const ACTIVISM = {
  ink: '#0D0D0E',
  charcoal: '#18181C',
  line: 'rgba(255,255,255,0.10)',
  urgent: '#FF3B30',
  urgentDeep: '#FF4500',
  vision: '#00E676',
  visionLime: '#CCFF00',
  text: '#F5F5F5',
  muted: '#9A9AA8',
} as const;

/**
 * Blueprint geometry, in the SVG's own user units (viewBox 1600x1000).
 * Everything positional derives from this block.
 */
export const BLUEPRINT = {
  width: 1600,
  height: 1000,
  card: { y: 300, w: 280, h: 430, gap: 25, x0: 55 },
  roadmap: { x: 55, y: 760, w: 1490, h: 190 },
} as const;

/** Left edge of pillar `index` (0-based). */
export const pillarX = (index: number): number =>
  BLUEPRINT.card.x0 + index * (BLUEPRINT.card.w + BLUEPRINT.card.gap);

/**
 * Where a pillar's hotspot dot sits, as a % of the rendered box — so the dot
 * stays glued to the card at any container size (the SVG scales, the overlay
 * percentages with it).
 */
export const hotspotPos = (index: number) => ({
  left: ((pillarX(index) + BLUEPRINT.card.w - 34) / BLUEPRINT.width) * 100,
  top: ((BLUEPRINT.card.y + 34) / BLUEPRINT.height) * 100,
});

export interface VisionPillar {
  id: string;
  /** 'urgent' pillars are the safety work carried by grievance #18982473. */
  tone: 'vision' | 'urgent' | 'lime';
  accent: string;
  titleKey: string;
  metricKey: string;
  metricValueKey: string;
  items: { labelKey: string; detailKey: string }[];
}

/** The five pillars of the blueprint, in the order the brief specifies them. */
export const VISION_PILLARS: VisionPillar[] = [
  {
    id: 'education-tech',
    tone: 'vision',
    accent: ACTIVISM.vision,
    titleKey: 'v2035.p1.title',
    metricKey: 'v2035.p1.metric',
    metricValueKey: 'v2035.p1.metric_value',
    items: [
      { labelKey: 'v2035.p1.i1', detailKey: 'v2035.p1.i1d' },
      { labelKey: 'v2035.p1.i2', detailKey: 'v2035.p1.i2d' },
      { labelKey: 'v2035.p1.i3', detailKey: 'v2035.p1.i3d' },
    ],
  },
  {
    id: 'health-safety',
    tone: 'urgent',
    accent: ACTIVISM.urgent,
    titleKey: 'v2035.p2.title',
    metricKey: 'v2035.p2.metric',
    metricValueKey: 'v2035.p2.metric_value',
    items: [
      { labelKey: 'v2035.p2.i1', detailKey: 'v2035.p2.i1d' },
      { labelKey: 'v2035.p2.i2', detailKey: 'v2035.p2.i2d' },
      { labelKey: 'v2035.p2.i3', detailKey: 'v2035.p2.i3d' },
    ],
  },
  {
    id: 'economy',
    tone: 'lime',
    accent: ACTIVISM.visionLime,
    titleKey: 'v2035.p3.title',
    metricKey: 'v2035.p3.metric',
    metricValueKey: 'v2035.p3.metric_value',
    items: [
      { labelKey: 'v2035.p3.i1', detailKey: 'v2035.p3.i1d' },
      { labelKey: 'v2035.p3.i2', detailKey: 'v2035.p3.i2d' },
      { labelKey: 'v2035.p3.i3', detailKey: 'v2035.p3.i3d' },
    ],
  },
  {
    id: 'transit-tourism',
    tone: 'vision',
    accent: ACTIVISM.vision,
    titleKey: 'v2035.p4.title',
    metricKey: 'v2035.p4.metric',
    metricValueKey: 'v2035.p4.metric_value',
    items: [
      { labelKey: 'v2035.p4.i1', detailKey: 'v2035.p4.i1d' },
      { labelKey: 'v2035.p4.i2', detailKey: 'v2035.p4.i2d' },
      { labelKey: 'v2035.p4.i3', detailKey: 'v2035.p4.i3d' },
    ],
  },
  {
    id: 'coexistence',
    tone: 'vision',
    accent: ACTIVISM.vision,
    titleKey: 'v2035.p5.title',
    metricKey: 'v2035.p5.metric',
    metricValueKey: 'v2035.p5.metric_value',
    items: [
      { labelKey: 'v2035.p5.i1', detailKey: 'v2035.p5.i1d' },
      { labelKey: 'v2035.p5.i2', detailKey: 'v2035.p5.i2d' },
      { labelKey: 'v2035.p5.i3', detailKey: 'v2035.p5.i3d' },
    ],
  },
];

/** Phase 1 is Phase 2's prerequisite — the roadmap says so in that order. */
export interface VisionPhase {
  id: 'phase-1' | 'phase-2';
  labelKey: string;
  titleKey: string;
  accent: string;
  bodyKey: string;
  bullets: string[];
  actionKey?: string;
  actionHref?: string;
}

/** Phase 1 is Phase 2's prerequisite — the roadmap says so in that order. */
export const VISION_PHASES: VisionPhase[] = [
  {
    id: 'phase-1',
    labelKey: 'v2035.phase1.label',
    titleKey: 'v2035.phase1.title',
    accent: ACTIVISM.urgent,
    bodyKey: 'v2035.phase1.body',
    bullets: ['v2035.phase1.b1', 'v2035.phase1.b2', 'v2035.phase1.b3'],
    actionKey: 'v2035.phase1.action',
    actionHref: GRIEVANCE_URL,
  },
  {
    id: 'phase-2',
    labelKey: 'v2035.phase2.label',
    titleKey: 'v2035.phase2.title',
    accent: ACTIVISM.vision,
    bodyKey: 'v2035.phase2.body',
    bullets: ['v2035.phase2.b1', 'v2035.phase2.b2', 'v2035.phase2.b3'],
  },
];

/** The grievance this campaign is filed under, for the badge + schema link. */
export const VISION_GRIEVANCE = {
  id: GRIEVANCE.id,
  reference: GRIEVANCE.officialReference,
  url: GRIEVANCE_URL,
} as const;

/** Deep-link target so the hero CTA can smooth-scroll straight to the plan. */
export const VISION_ANCHOR = 'gudalur-vision-2035';

/** Scroll behaviour is a no-op for reduced-motion users (see index.css). */
export function scrollToVision(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(VISION_ANCHOR);
  if (!el) return;
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

/** The share line used by every "Share Vision 2035" button. */
export function visionShareText(origin?: string): string {
  const base = (
    origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/+$/, '');
  return [
    'WE REFUSE TO STAY SILENT. SAFETY TODAY, VISION 2035 TOMORROW.',
    '',
    'Gudalur Vision 2035 — a global eco-town where people and wildlife thrive together.',
    'Phase 1 is human-wildlife conflict mitigation: grievance #' + GRIEVANCE.id + '.',
    base + '/#' + VISION_ANCHOR,
  ].join('\n');
}

/** WhatsApp deep link (the channel this movement actually spreads through). */
export const whatsappShareUrl = (text: string): string =>
  'https://wa.me/?text=' + encodeURIComponent(text);

/** Instagram has no web share intent — the app is opened for the visitor to post. */
export const instagramShareUrl = 'https://www.instagram.com/voiceofgudalur';
