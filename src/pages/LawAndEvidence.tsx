// ============================================================================
// LAW & EVIDENCE — credible legal framework reference
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Scale } from 'lucide-react';
import { PageHeader, Section, Card, Btn, DataUnavailable } from '../components/ui/Primitives';
import { LAW_ENTRIES, OFFICIAL_PORTALS } from '../data/lawAndEvidenceData';

const LawAndEvidence: React.FC = () => {
  return (
    <div>
      <PageHeader
        eyebrow="Law & evidence"
        title="The legal framework for safety and conservation"
        subtitle="A careful, source-linked account of the law that governs human–wildlife coexistence in Gudalur. We make no legal claim without a reference, and we are plain about what the law does — and does not — say."
      >
        <Btn href="/act"><Scale size={16} aria-hidden="true" /> Act lawfully for Gudalur</Btn>
      </PageHeader>

      <Section eyebrow="Statutes & frameworks" title="What the law provides" subtitle="Each entry summarises a body of law, explains how it operates, and notes what it means for Gudalur.">
        <div className="space-y-5">
          {LAW_ENTRIES.map((law) => (
            <Card key={law.id}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-lg font-bold text-slate-900">{law.title}</h2>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">{law.authority}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{law.summary}</p>
              <div className="mt-3 rounded-xl border-l-4 border-emerald-600 bg-emerald-50/50 p-3">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">What it means for Gudalur</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{law.gudalurNote}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {law.sources.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-400 hover:text-emerald-800">
                    {s.label} <ExternalLink size={12} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Official portals" title="Where to verify primary sources" subtitle="These official sites are the authoritative place to read notifications, orders and full statutes. Platform-hosted documents, when available, appear in the Evidence Room.">
        <ul className="grid gap-3 md:grid-cols-2">
          {OFFICIAL_PORTALS.map((p) => (
            <li key={p.name}>
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <ExternalLink size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                </div>
                <p className="mt-1 text-sm text-slate-600">{p.note}</p>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Honesty about what is unknown" title="What we do not claim" subtitle="Integrity is the platform's first duty. These boundaries are deliberate.">
        <DataUnavailable what="A specific, verified notification or order that would impose a distance-based relocation rule on Gudalur is not yet in our Evidence Room, so we make no such claim." />
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          We will publish the exact text of any relevant Eco-Sensitive Zone notification, tiger reserve order or court judgment only
          when the document itself is verified and stored in the{" "}
          <Link to="/evidence" className="font-bold text-emerald-800 underline-offset-4 hover:underline">Evidence Room</Link>.
        </p>
      </Section>
    </div>
  );
};

export default LawAndEvidence;