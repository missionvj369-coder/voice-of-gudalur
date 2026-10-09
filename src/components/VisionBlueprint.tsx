import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ACTIVISM, BLUEPRINT, VISION_PILLARS, pillarX, hotspotPos } from '../data/vision2035';

/**
 * VisionBlueprint — the "Gudalur 2035 Infographic Blueprint", drawn as an
 * inline SVG so it is infinitely scalable, translatable and screen-reader
 * legible (see the header of src/data/vision2035.ts for why it is not a
 * shipped raster).
 *
 * INTERACTION: the numbered dots are the hotspots. Hover, tap and keyboard
 * focus all raise the matching card; each hotspot is a real <button> with
 * aria-expanded so it is reachable without a mouse. The same markup is reused
 * inside the lightbox with `interactive={false}` — a zoomable, already-focused
 * context replaces hover.
 */
interface Props {
  /** Hotspots are switches off inside the lightbox (zoom replaces hover). */
  interactive?: boolean;
  className?: string;
}

/** Inner width available to a pillar title, in viewBox units. */
const TITLE_MAX_W = BLUEPRINT.card.w - 40;
const TITLE_FONT = 30;
const TITLE_TRACKING = 1;

/**
 * Pillar titles are translated, so their rendered width is not known at build
 * time and a long title silently overflows its card — the next card's <rect>
 * is painted later, so the overflow is not merely untidy, it looks truncated
 * ("Economy & Empowe…"). We therefore clamp the title to the card with SVG's
 * `textLength`, but only when the title is actually too wide: forcing
 * `textLength` unconditionally would stretch short titles to full width.
 *
 * Bebas Neue is a condensed face; these per-character widths are deliberately
 * generous so the estimate errs toward compressing rather than overflowing.
 * Non-Latin scripts (Tamil, Malayalam, Kannada) get a wide per-character width
 * so they always clamp instead of relying on Latin metrics.
 */
function titleOverflows(label: string): boolean {
  let em = 0;
  for (const ch of label) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x0e00) em += 1.05; // Indic — much wider per glyph
    else if (ch === ' ') em += 0.34;
    else if (ch >= 'A' && ch <= 'Z') em += 0.55;
    else em += 0.5;
  }
  return em * TITLE_FONT + label.length * TITLE_TRACKING > TITLE_MAX_W;
}

export const VisionBlueprint: React.FC<Props> = ({ interactive = true, className = '' }) => {
  const { t } = useLanguage();
  const [active, setActive] = React.useState<number | null>(null);
  const { card } = BLUEPRINT;

  return (
    <div className={`relative ${className}`} style={{ containerType: 'inline-size' }}>
      <svg
        viewBox={`0 0 ${BLUEPRINT.width} ${BLUEPRINT.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label={t('v2035.blueprint_alt')}
        style={{ background: ACTIVISM.ink, borderRadius: 18 }}
      >
        <defs>
          <pattern id="vog-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#24242E" strokeWidth="0.8" />
          </pattern>
          <linearGradient id="vog-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08080A" />
            <stop offset="55%" stopColor={ACTIVISM.ink} />
            <stop offset="100%" stopColor="#15151B" />
          </linearGradient>
        </defs>

        <rect width={BLUEPRINT.width} height={BLUEPRINT.height} fill="url(#vog-sky)" />
        <rect width={BLUEPRINT.width} height={BLUEPRINT.height} fill="url(#vog-grid)" opacity="0.55" />

        {/* Title block */}
        <text x="55" y="96" fill={ACTIVISM.text}
          fontFamily="'Bebas Neue', 'Syne', sans-serif" fontSize="62" letterSpacing="2">
          {t('v2035.blueprint_title')}
        </text>
        <text x="55" y="136" fill={ACTIVISM.vision}
          fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="21" fontWeight="700" letterSpacing="1">
          {t('v2035.blueprint_sub')}
        </text>
        <text x="55" y="180" fill={ACTIVISM.urgent}
          fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="17" fontWeight="800" letterSpacing="2">
          {t('v2035.blueprint_grievance')}
        </text>

        {/* Pillar cards */}
        {VISION_PILLARS.map((p, i) => {
          const x = pillarX(i);
          const isActive = active === i;
          const title = t(p.titleKey);
          return (
            <g
              key={p.id}
              onMouseEnter={interactive ? () => setActive(i) : undefined}
              onMouseLeave={interactive ? () => setActive(null) : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
            >
              <rect
                x={x} y={card.y} width={card.w} height={card.h} rx="16"
                fill={ACTIVISM.charcoal}
                stroke={isActive ? p.accent : '#2C2C36'}
                strokeWidth={isActive ? 3 : 1.5}
                style={{ transition: 'stroke 150ms ease-out' }}
              />
              <rect x={x} y={card.y} width={card.w} height="7" rx="3" fill={p.accent} />
              <text
                x={x + 20} y={card.y + 48} fill={p.accent}
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontSize="14" fontWeight="800" letterSpacing="2"
              >
                {t('v2035.pillar_index').replace('{n}', String(i + 1))}
              </text>
              <text
                x={x + 20} y={card.y + 90} fill={ACTIVISM.text}
                fontFamily="'Bebas Neue', 'Syne', sans-serif" fontSize={TITLE_FONT} letterSpacing={TITLE_TRACKING}
                {...(titleOverflows(title) ? { textLength: TITLE_MAX_W, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
              >
                {title}
              </text>
              <line
                x1={x + 20} y1={card.y + 108} x2={x + card.w - 20} y2={card.y + 108}
                stroke="#2A2A34" strokeWidth="1"
              />
              {p.items.map((item, j) => (
                <g key={item.labelKey}>
                  <circle cx={x + 26} cy={card.y + 148 + j * 62} r="5" fill={p.accent} />
                  <text
                    x={x + 42} y={card.y + 146 + j * 62} fill={ACTIVISM.text}
                    fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="15" fontWeight="700"
                  >
                    {t(item.labelKey)}
                  </text>
                  <text
                    x={x + 42} y={card.y + 166 + j * 62} fill={ACTIVISM.muted}
                    fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="12.5"
                  >
                    {t(item.detailKey)}
                  </text>
                </g>
              ))}
              {/* Metric footer */}
              <rect
                x={x + 16} y={card.y + 352} width={card.w - 32} height="58" rx="8"
                fill="#121217" stroke={p.accent} strokeOpacity="0.5" strokeWidth="1"
              />
              <text
                x={x + 28} y={card.y + 374} fill={p.accent}
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontSize="11" fontWeight="800" letterSpacing="1.5"
              >
                {t(p.metricKey)}
              </text>
              <text
                x={x + 28} y={card.y + 396} fill={ACTIVISM.text}
                fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600"
              >
                {t(p.metricValueKey)}
              </text>
            </g>
          );
        })}

        {/* Two-step roadmap band */}
        <g>
          <rect
            x={BLUEPRINT.roadmap.x} y={BLUEPRINT.roadmap.y}
            width={BLUEPRINT.roadmap.w} height={BLUEPRINT.roadmap.h}
            rx="16" fill="#101015" stroke="#2A2A35" strokeWidth="1.5"
          />
          <text
            x={BLUEPRINT.roadmap.x + 30} y={BLUEPRINT.roadmap.y + 44} fill={ACTIVISM.text}
            fontFamily="'Bebas Neue', 'Syne', sans-serif" fontSize="30" letterSpacing="1.5"
          >
            {t('v2035.roadmap_title')}
          </text>
          <text
            x={BLUEPRINT.roadmap.x + 30} y={BLUEPRINT.roadmap.y + 78} fill={ACTIVISM.urgent}
            fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="15" fontWeight="800"
          >
            {t('v2035.phase1.label')} · {t('v2035.phase1.title')}
          </text>
          <text
            x={BLUEPRINT.roadmap.x + 30} y={BLUEPRINT.roadmap.y + 106} fill={ACTIVISM.vision}
            fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="15" fontWeight="800"
          >
            {t('v2035.phase2.label')} · {t('v2035.phase2.title')}
          </text>
          <text
            x={BLUEPRINT.roadmap.x + 30} y={BLUEPRINT.roadmap.y + 150} fill={ACTIVISM.muted}
            fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="13" fontWeight="600"
          >
            {t('v2035.roadmap_note')}
          </text>
        </g>
      </svg>

      {/* Keyboard/tap hotspots — real <button>s layered over the SVG, so the
          graphic stays one role="img" for assistive tech while pointer and
          keyboard users get focus rings and aria-expanded.

          SIZING IS IN CONTAINER UNITS, ON PURPOSE. A fixed 26px dot is a
          sensible affordance next to a 112px-wide pillar card on a laptop and
          a disaster on a 360px phone, where the same card is 56px wide — the
          dots then overlap each other and bury the text they point at. 1.7cqw
          is 27 blueprint units (1.7% of the 1600-unit viewBox), so a dot is
          always the same size RELATIVE to the artwork it annotates.

          Below `sm` the dots are hidden entirely: at that width a dot is
          smaller than a fingertip target and the blueprint is unreadable
          anyway. On a phone the readable path is the lightbox and the pillar
          cards below it, not 8px dots. */}
      {interactive &&
        VISION_PILLARS.map((p, i) => {
          const pos = hotspotPos(i);
          return (
            <button
              key={p.id}
              type="button"
              data-v2035-hotspot={p.id}
              onClick={() => setActive(active === i ? null : i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-expanded={active === i}
              aria-label={t(p.titleKey)}
              className="absolute hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-black text-white transition-transform hover:scale-110 focus:scale-110 sm:inline-flex"
              style={{
                left: pos.left + '%',
                top: pos.top + '%',
                width: '1.7cqw',
                height: '1.7cqw',
                minWidth: 14,
                minHeight: 14,
                fontSize: '0.95cqw',
                background: p.accent,
                borderColor: 'rgba(0,0,0,0.4)',
                boxShadow: '0 0 0 0.4cqw rgba(0,0,0,0.35)',
              }}
            >
              {i + 1}
            </button>
          );
        })}
    </div>
  );
};

export default VisionBlueprint;

