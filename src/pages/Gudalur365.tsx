// ============================================================================
// GUDALUR 365 — the year-round safety model
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, ShieldCheck, Siren, FileText, BarChart3, Ban, Trees, ArrowRight } from 'lucide-react';
import { PageHeader, Section, Card, Btn } from '../components/ui/Primitives';
import { GUDALUR_365 } from '../data/safetyContent';

const ICONS: Record<string, React.ReactNode> = {
  monitor: <Eye size={22} aria-hidden="true" />,
  protect: <ShieldCheck size={22} aria-hidden="true" />,
  respond: <Siren size={22} aria-hidden="true" />,
  record: <FileText size={22} aria-hidden="true" />,
  analyse: <BarChart3 size={22} aria-hidden="true" />,
  prevent: <Ban size={22} aria-hidden="true" />,
  restore: <Trees size={22} aria-hidden="true" />,
};

const Gudalur365: React.FC = () => {
  return (
    <div>
      <PageHeader
        eyebrow="Gudalur 365"
        title="Wildlife safety cannot begin after someone dies."
        subtitle="A year-round, science-based safety model for Gudalur — not a campaign that reacts only after tragedy. Seven ongoing responsibilities, shared by citizens, institutions and the administration."
      />

      <Section eyebrow="The year-round model" title="Seven pillars, every day" subtitle="Each pillar forms part of a permanent system. Every one of them is documented and measurable — none depends on memory or luck.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUDALUR_365.map((p) => (
            <Card key={p.key} className="flex flex-col">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-700 text-white">
                {ICONS[p.key] || <ShieldCheck size={22} aria-hidden="true" />}
              </span>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">{p.key}</p>
              <h3 className="mt-0.5 text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.text}</p>
            </Card>
          ))}
        </div>
      </Section>

      <section className="border-y border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="text-xl font-bold sm:text-2xl">From reaction to prevention</h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-slate-300">
            Gudalur does not need another memorial. It needs a system in which every sighting is recorded, every corridor is understood,
            every risk is mapped, and every response is trained — so that the next conflict is prevented instead of mourned.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Btn href="/report" className="bg-emerald-600 hover:bg-emerald-500">Report a sighting</Btn>
            <Btn href="/right-to-life" variant="ghost" className="text-slate-200 hover:bg-slate-800 hover:text-white">Read the Right to Life <ArrowRight size={15} aria-hidden="true" /></Btn>
          </div>
        </div>
      </section>

      <Section eyebrow="How the platform helps" title="Turning every pillar into practice" subtitle="The platform exists to make each pillar real and auditable.">
        <ul className="space-y-3">
          {[
            ['Monitor & Record', 'Every report feeds a verified incident record with locality, time and direction.'],
            ['Analyse', 'Verified records are the raw material for spotting corridors, seasons and hotspots.'],
            ['Respond & Prevent', 'Safety alerts and local safety nodes turn analysis into warnings and habit.'],
            ['Restore', 'Corridor and habitat priorities push for the long-term, evidence-led restoration the landscape needs.'],
          ].map(([title, text]) => (
            <li key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <ArrowRight size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-slate-600">
          Learn the legal and policy framework behind conflict and conservation on the{" "}
          <Link to="/law-and-evidence" className="font-bold text-emerald-800 underline-offset-4 hover:underline">Law &amp; Evidence</Link> page.
        </p>
      </Section>
    </div>
  );
};

export default Gudalur365;