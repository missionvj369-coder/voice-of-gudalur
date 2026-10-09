import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, PenLine, Share2, ZoomIn, ExternalLink, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { VisionBlueprint } from './VisionBlueprint';
import { BlueprintLightbox } from './BlueprintLightbox';
import {
  ACTIVISM, VISION_ANCHOR, VISION_GRIEVANCE, VISION_PHASES, VISION_PILLARS,
  instagramShareUrl, visionShareText, whatsappShareUrl,
} from '../data/vision2035';

/**
 * Vision2035Section — "GUDALUR VISION 2035: A Future Where People & Wildlife
 * Thrive Together".
 *
 * The narrative order is the whole point of this section, so it is fixed:
 *
 *   1. TITLE + the badge that ties the plan to a real, filed grievance
 *      (#18982473 — so nobody can read the vision as wishful thinking).
 *   2. THE PRIORITY CALLOUT. Human-wildlife conflict mitigation is PHASE 1,
 *      the prerequisite for everything else. It sits directly above the
 *      showcase on purpose: nobody scrolls past the demand for a safe street.
 *   3. THE BLUEPRINT — inline SVG, hover/tap hotspots, and a zoom lightbox
 *      because pillar titles are unreadable at phone width otherwise.
 *   4. THE FIVE PILLARS as selectable cards (the same content, sized for a
 *      thumb — the SVG is the poster, the cards are the readable version).
 *   5. THE TWO-STEP ROADMAP, Phase 1 above Phase 2, with the arrow between
 *      them: NOW unlocks THEN.
 *   6. THE ACTION HUB — sign, share on WhatsApp / Instagram.
 */
export const Vision2035Section: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [lightbox, setLightbox] = useState(false);
  const [picked, setPicked] = useState(0);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = visionShareText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: t('v2035.title'), text });
        return;
      } catch { /* user cancelled or share failed → fall through to WhatsApp */ }
    }
    window.open(whatsappShareUrl(text), '_blank', 'noopener');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + '/#' + VISION_ANCHOR);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked (private mode / http) — the WhatsApp button still works */ }
  };

  return (
    <section
      id={VISION_ANCHOR}
      aria-labelledby="v2035-heading"
      className="scroll-mt-20 overflow-hidden rounded-3xl border p-5 sm:p-8"
      style={{ background: ACTIVISM.ink, borderColor: ACTIVISM.line }}
    >
      {/* ── 1. Header + grievance badge ── */}
      <header className="space-y-3">
        <span
          className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
          style={{ borderColor: ACTIVISM.vision, color: ACTIVISM.vision }}
        >
          <Check size={12} aria-hidden="true" />
          {t('v2035.badge')}
        </span>
        <h2
          id="v2035-heading"
          className="text-balance text-3xl font-black uppercase leading-[0.95] sm:text-4xl md:text-5xl"
          style={{ fontFamily: "'Bebas Neue', 'Syne', sans-serif", color: ACTIVISM.text }}
        >
          {t('v2035.title')}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed" style={{ color: ACTIVISM.muted }}>
          {t('v2035.subtitle')}
        </p>
      </header>

      {/* ── 2. IMMEDIATE PRIORITY callout — Phase 1 gates the vision ── */}
      <div
        role="note"
        className="mt-6 flex flex-col gap-3 rounded-2xl border-l-4 p-4 sm:flex-row sm:items-center"
        style={{ background: 'rgba(255,59,48,0.10)', borderLeftColor: ACTIVISM.urgent }}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,59,48,0.20)', color: ACTIVISM.urgent }}
          aria-hidden="true"
        >
          <AlertTriangle size={20} />
        </span>
        <p className="flex-1 text-sm font-semibold leading-relaxed" style={{ color: ACTIVISM.text }}>
          <strong className="font-black" style={{ color: ACTIVISM.urgent }}>
            {t('v2035.priority_label')}
          </strong>{' '}
          {t('v2035.priority_body')}
        </p>
        <button
          type="button"
          onClick={() => navigate('/sign-petition')}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
          style={{ background: ACTIVISM.urgent }}
        >
          <PenLine size={14} aria-hidden="true" />
          {t('v2035.priority_cta')}
        </button>
      </div>

      {/* ── 3. The blueprint, with the zoom lightbox ── */}
      <div className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {/* Desktop-only: below `sm` the hotspot dots are hidden, so
              advertising them would be a promise the phone never keeps. */}
          <p
            className="hidden text-[10px] font-black uppercase tracking-widest sm:block"
            style={{ color: ACTIVISM.muted }}
          >
            {t('v2035.blueprint_hint')}
          </p>
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition hover:opacity-90"
            style={{ borderColor: ACTIVISM.vision, color: ACTIVISM.vision }}
          >
            <ZoomIn size={14} aria-hidden="true" />
            {t('v2035.zoom_cta')}
          </button>
        </div>
        <VisionBlueprint interactive />
      </div>

      <BlueprintLightbox
        open={lightbox}
        onClose={() => setLightbox(false)}
        title={t('v2035.blueprint_title')}
      >
        <VisionBlueprint interactive={false} />
      </BlueprintLightbox>

      {/* ── 4. The five pillars as readable cards ── */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VISION_PILLARS.map((p, i) => {
          const on = picked === i;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPicked(on ? -1 : i)}
              aria-expanded={on}
              className="rounded-2xl border p-4 text-left transition"
              style={{
                background: on ? 'rgba(255,255,255,0.06)' : ACTIVISM.charcoal,
                borderColor: on ? p.accent : ACTIVISM.line,
              }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: p.accent }}
              >
                {t('v2035.pillar_index').replace('{n}', String(i + 1))}
              </p>
              <h3
                className="mt-1 text-lg font-black uppercase leading-tight"
                style={{ fontFamily: "'Bebas Neue', 'Syne', sans-serif", color: ACTIVISM.text }}
              >
                {t(p.titleKey)}
              </h3>
              <ul className="mt-3 space-y-2">
                {p.items.map((item) => (
                  <li key={item.labelKey} className="flex gap-2 text-xs leading-snug">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.accent }} aria-hidden="true" />
                    <span style={{ color: ACTIVISM.muted }}>
                      <strong className="font-bold" style={{ color: ACTIVISM.text }}>
                        {t(item.labelKey)}
                      </strong>
                      {' — '}
                      {t(item.detailKey)}
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className="mt-3 border-t pt-2 text-[10px] font-bold uppercase tracking-wide"
                style={{ borderColor: ACTIVISM.line, color: ACTIVISM.muted }}
              >
                {t(p.metricKey)}: {t(p.metricValueKey)}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── 5. Two-step roadmap: Phase 1 unlocks Phase 2 ── */}
      <h3
        className="mt-8 text-2xl font-black uppercase"
        style={{ fontFamily: "'Bebas Neue', 'Syne', sans-serif", color: ACTIVISM.text }}
      >
        {t('v2035.roadmap_title')}
      </h3>
      <ol className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
        {VISION_PHASES.map((phase, i) => (
          <React.Fragment key={phase.id}>
            {i === 1 && (
              <div
                className="hidden items-center justify-center px-1 text-2xl md:flex"
                style={{ color: ACTIVISM.vision }}
                aria-hidden="true"
              >
                →
              </div>
            )}
            <li
              className="flex flex-col rounded-2xl border p-4"
              style={{ background: ACTIVISM.charcoal, borderColor: phase.accent }}
            >
              <span
                className="inline-flex w-fit items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
                style={{ background: phase.accent, color: phase.id === 'phase-1' ? '#fff' : ACTIVISM.ink }}
              >
                {t(phase.labelKey)}
              </span>
              <h4 className="mt-2 text-lg font-black uppercase leading-tight" style={{ color: ACTIVISM.text }}>
                {t(phase.titleKey)}
              </h4>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: ACTIVISM.muted }}>
                {t(phase.bodyKey)}
              </p>
              <ul className="mt-3 space-y-1.5">
                {phase.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-xs leading-snug" style={{ color: ACTIVISM.muted }}>
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: phase.accent }} aria-hidden="true" />
                    {t(b)}
                  </li>
                ))}
              </ul>
              {phase.actionKey && (
                <a
                  href={phase.actionHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
                  style={{ background: phase.accent }}
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {t(phase.actionKey)}
                </a>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>

      {/* ── 6. Action hub ── */}
      <div
        className="mt-8 flex flex-col items-center gap-4 rounded-2xl border p-6 text-center"
        style={{ background: 'rgba(0,230,118,0.06)', borderColor: ACTIVISM.line }}
      >
        <h3 className="text-balance text-xl font-black uppercase" style={{ color: ACTIVISM.text }}>
          {t('v2035.hub_title')}
        </h3>
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: ACTIVISM.muted }}>
          {t('v2035.hub_sub')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/sign-petition')}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
            style={{ background: ACTIVISM.urgent }}
          >
            <PenLine size={14} aria-hidden="true" />
            {t('v2035.hub_sign')}
          </button>
          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-wide transition hover:opacity-90"
            style={{ borderColor: ACTIVISM.vision, color: ACTIVISM.vision }}
          >
            <Share2 size={14} aria-hidden="true" />
            {t('v2035.hub_share')}
          </button>
          <a
            href={instagramShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-wide transition hover:opacity-90"
            style={{ borderColor: ACTIVISM.line, color: ACTIVISM.text }}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Instagram
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wide transition hover:opacity-90"
            style={{ borderColor: ACTIVISM.line, color: copied ? ACTIVISM.vision : ACTIVISM.text }}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Share2 size={14} aria-hidden="true" />}
            {copied ? t('v2035.hub_copied') : t('v2035.hub_copy')}
          </button>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: ACTIVISM.muted }}>
          {t('v2035.grievance_line')
            .replace('{id}', VISION_GRIEVANCE.id)
            .replace('{ref}', VISION_GRIEVANCE.reference)}
        </p>
      </div>
    </section>
  );
};

export default Vision2035Section;
