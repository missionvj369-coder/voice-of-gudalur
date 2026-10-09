import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PenLine, Compass, Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { ACTIVISM, VISION_GRIEVANCE, scrollToVision } from '../data/vision2035';

/**
 * ActivismHero — the frontpage's opening statement.
 *
 * WHY IT IS SEPARATE FROM THE DASHBOARD: the live-counter hero that used to
 * sit here was a number. This campaign needs a sentence first — the demand,
 * then the counter is right underneath it. Two CTAs, deliberately split:
 *   • red  → sign grievance #18982473 (Phase 1, the thing that is urgent),
 *   • green→ jump to the Vision 2035 blueprint (the thing being unlocked).
 * A visitor who wants to act and a visitor who wants to understand are both
 * one tap away, and neither has to hunt for the other.
 */
export const ActivismHero: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header
      className="relative overflow-hidden rounded-3xl border p-6 sm:p-10"
      style={{
        background: `linear-gradient(160deg, ${ACTIVISM.ink} 0%, ${ACTIVISM.charcoal} 100%)`,
        borderColor: ACTIVISM.line,
      }}
    >
      {/* Ambient glow — CSS only, so it costs no image request and cannot
          shift layout. Purely decorative, hence aria-hidden. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl"
          style={{ background: 'rgba(255,59,48,0.18)' }}
        />
        <div
          className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'rgba(0,230,118,0.16)' }}
        />
      </div>

      <div className="relative space-y-5">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
          style={{ borderColor: ACTIVISM.urgent, color: ACTIVISM.urgent }}
        >
          <Flame size={12} aria-hidden="true" />
          {t('v2035.hero_badge').replace('{id}', VISION_GRIEVANCE.id)}
        </span>

        <h1
          className="text-balance text-4xl font-black uppercase leading-[0.92] sm:text-5xl md:text-6xl lg:text-7xl"
          style={{ fontFamily: "'Bebas Neue', 'Syne', sans-serif", color: ACTIVISM.text }}
        >
          {t('v2035.hero_h1')}
          <span className="block" style={{ color: ACTIVISM.urgent }}>
            {t('v2035.hero_h2')}
          </span>
          <span className="block" style={{ color: ACTIVISM.vision }}>
            {t('v2035.hero_h3')}
          </span>
        </h1>

        <p className="max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: ACTIVISM.muted }}>
          {t('v2035.hero_sub')}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => navigate('/sign-petition')}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
            style={{ background: ACTIVISM.urgent }}
          >
            <PenLine size={16} aria-hidden="true" />
            {t('v2035.hero_cta_sign').replace('{id}', VISION_GRIEVANCE.id)}
          </button>
          <button
            type="button"
            onClick={scrollToVision}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 text-sm font-black uppercase tracking-wide transition hover:opacity-90"
            style={{ borderColor: ACTIVISM.vision, color: ACTIVISM.vision }}
          >
            <Compass size={16} aria-hidden="true" />
            {t('v2035.hero_cta_vision')}
          </button>
        </div>

        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: ACTIVISM.muted }}
        >
          {t('v2035.hero_phase_note')}
        </p>
      </div>
    </header>
  );
};

export default ActivismHero;
