// ============================================================================
// RIGHT TO LIFE — the Gudalur manifesto (7 sections + sources)
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ScrollText } from 'lucide-react';
import { PageHeader, Section, Card, Btn } from '../components/ui/Primitives';
import { RTL_SECTIONS, RTL_SOURCES } from '../data/rightToLifeData';

const RightToLife: React.FC = () => {
  return (
    <div>
      <PageHeader
        eyebrow="The manifesto"
        title="The Gudalur Right to Life"
        subtitle="Human life must be protected. Wildlife must be protected. Gudalur needs a permanent, science-based human–wildlife safety system — and the law, rightly applied, supports this."
      >
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Btn href="/act"><ScrollText size={16} aria-hidden="true" /> Act for Gudalur</Btn>
          <Btn href="/law-and-evidence" variant="secondary">Law &amp; evidence</Btn>
        </div>
      </PageHeader>

      <Section eyebrow="Seven sections" title="The full manifesto" subtitle="Evidence-based, citizen-focused and legally responsible. Where a fact is not yet verified, this page says so rather than guess.">
        <ol className="space-y-8">
          {RTL_SECTIONS.map((s) => (
            <li key={s.n}>
              <div className="flex items-baseline gap-3 border-b border-slate-200 pb-2">
                <span className="font-mono text-sm font-bold text-emerald-700">{s.n}</span>
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{s.title}</h2>
              </div>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 leading-relaxed text-slate-700">{p}</p>
              ))}
              {s.bullets && (
                <ul className="mt-3 space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Sources & evidence" title="Where our claims come from" subtitle="Every important legal claim on this page rests on a verifiable source. Nothing here is an invented fact.">
        <ul className="grid gap-3 md:grid-cols-2">
          {RTL_SOURCES.map((src) => (
            <li key={src.title}>
              <a
                href={src.url}
                target={src.url.startsWith('/') ? undefined : '_blank'}
                rel={src.url.startsWith('/') ? undefined : 'noopener noreferrer'}
                className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{src.title}</p>
                  {src.url.startsWith('/') ? null : <ExternalLink size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />}
                </div>
                <p className="mt-1 text-sm text-slate-600">{src.authority}</p>
                {src.note && <p className="mt-1 text-xs text-slate-500">{src.note}</p>}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>
            <strong className="text-slate-900">A note on relocation and legal status:</strong> this platform does not claim that
            anyone must leave within any distance of a tiger reserve. Tiger reserve core and buffer areas have different legal
            functions, and relocation is a rights-based, procedure-bound process. Gudalur's land-tenure history is unusually
            complex, so exact legal status must be mapped from official records — which the{" "}
            <Link to="/evidence" className="font-bold text-emerald-800 underline-offset-4 hover:underline">Evidence Room</Link> documents.
          </p>
        </div>
      </Section>

      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
          <Card className="mx-auto max-w-2xl border-0 bg-emerald-900/40 p-6">
            <h2 className="text-lg font-bold">One Gudalur — Protect People. Protect Wildlife. Protect Gudalur.</h2>
            <p className="mt-2 text-sm text-slate-300">A serious civic intelligence and human–wildlife safety platform, built on evidence and law.</p>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default RightToLife;