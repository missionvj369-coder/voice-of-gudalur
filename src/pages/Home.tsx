// ============================================================================
// HOME — the first screen must immediately communicate purpose.
// Hierarchy: Hero → Safety Now → Verified situation → Report/Alerts/Emergency
// → Map preview → Gudalur 365 → Right to Life → Priorities → Local nodes
// → Evidence → Action tracker → Join/Resident ID.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Siren, PhoneCall, MapPin, ArrowRight, Radio, AlertTriangle, ScrollText, FileText, Users } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Section, Card, Btn, DataUnavailable, Loading, ErrorNote } from '../components/ui/Primitives';
import { EmergencyBar } from '../components/ui/EmergencyBar';
import { VerifiedSituation } from '../components/home/VerifiedSituation';
import { api } from '../lib/api';
import { GUDALUR_365, SAFETY_PRIORITIES, EMERGENCY_CONTACTS } from '../data/safetyContent';
import { LOCALITIES } from '../data/localities';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.getPlatformStats>>>(null);

  useEffect(() => {
    let alive = true;
    api.getPlatformStats().then((s) => alive && setStats(s)).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  return (
    <div>
      {/* ============================== HERO ============================== */}
      <section className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">{t('hero.eyebrow')}</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl sm:leading-tight">
            {t('hero.headline')}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            {t('hero.sub')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Btn href="/report" className="bg-emerald-600 text-white hover:bg-emerald-500">
              <AlertTriangle size={16} aria-hidden="true" /> {t('hero.cta.report')}
            </Btn>
            <Btn href="/alerts" variant="secondary" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700">
              <Siren size={16} aria-hidden="true" /> {t('hero.cta.alerts')}
            </Btn>
            <Btn href="/right-to-life" variant="ghost" className="text-slate-200 hover:bg-slate-800 hover:text-white">
              <ScrollText size={16} aria-hidden="true" /> {t('hero.cta.rtl')}
            </Btn>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3 border-t border-slate-800 pt-6 text-center">
            <div>
              <p className="text-xl font-bold text-emerald-400">{stats ? stats.localities : '—'}</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Safety nodes</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{stats ? stats.active_alerts : '—'}</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Active alerts</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-400">{stats ? stats.verified_incidents_30d : '—'}</p>
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Verified · 30 days</p>
            </div>
            <p className="col-span-3 text-[10px] text-slate-500">
              {stats ? `Source: platform records · Last updated ${new Date(stats.last_updated).toLocaleString()}` : 'Source: platform records · Data not yet available'}
            </p>
          </div>
        </div>
      </section>

      {/* ============================ SAFETY NOW ========================== */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{t('safety.title')}</p>
          <p className="mt-3 max-w-3xl text-lg font-semibold leading-relaxed text-slate-900">
            {t('safety.message')}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link to="/report" className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
              <Radio size={20} className="text-emerald-700" aria-hidden="true" />
              <p className="mt-3 font-bold text-slate-900">{t('safety.report')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Report elephant, tiger or wildlife movement you personally observe.</p>
            </Link>
            <Link to="/alerts" className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
              <Siren size={20} className="text-rose-700" aria-hidden="true" />
              <p className="mt-3 font-bold text-slate-900">{t('safety.alerts')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">See verified, current safety warnings — never rumours, never fake urgency.</p>
            </Link>
            <a href="/alerts#emergency" className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
              <PhoneCall size={20} className="text-rose-700" aria-hidden="true" />
              <p className="mt-3 font-bold text-slate-900">{t('safety.emergency')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Official national emergency numbers and verified local resources.</p>
            </a>
          </div>
          <div className="mt-6"><EmergencyBar /></div>
        </div>
      </section>

      <VerifiedSituation />

      {/* =================== REPORT / ALERTS / EMERGENCY ==================== */}
      <Section eyebrow="Take action" title="Report, alert, or get help" subtitle="Three tools, one rule: only share information you have personally observed — never approach wildlife to obtain photographs or video.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col">
            <Radio size={20} className="text-emerald-700" aria-hidden="true" />
            <h3 className="mt-3 font-bold text-slate-900">Report a wildlife incident</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">Sightings, animals near home or on roads, property damage, livestock attacks — with locality, time and direction.</p>
            <p className="mt-3 inline-flex w-fit text-[10px] font-bold uppercase tracking-wider text-amber-700">Community report · under review until verified</p>
            <Btn href="/report" className="mt-4 w-full">Report now</Btn>
          </Card>
          <Card className="flex flex-col">
            <Siren size={20} className="text-rose-700" aria-hidden="true" />
            <h3 className="mt-3 font-bold text-slate-900">Choose your safety alerts</h3>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">Select your locality and topics — elephant, tiger, emergency, civic. Labels say RECENT or VERIFIED; nothing is labelled LIVE unless a real source is connected.</p>
            <Btn href="/alerts" variant="secondary" className="mt-4 w-full">Manage alerts</Btn>
          </Card>
          <Card className="flex flex-col">
            <PhoneCall size={20} className="text-rose-700" aria-hidden="true" />
            <h3 className="mt-3 font-bold text-slate-900">Emergency help</h3>
            <ul className="mt-1 flex-1 space-y-1 text-sm text-slate-600">
              {EMERGENCY_CONTACTS.slice(0, 3).map((c) => (
                <li key={c.number} className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{c.number}</span>
                  <span className="text-slate-600">{c.name}</span>
                </li>
              ))}
            </ul>
            <Btn href="/alerts#emergency" variant="secondary" className="mt-4 w-full">All emergency numbers</Btn>
          </Card>
        </div>
      </Section>


      {/* ======================== SAFETY MAP PREVIEW ======================= */}
      <Section eyebrow="Safety map" title="Understanding where risk is" subtitle="The map shows localities and verified activity at the level of place names and zones. Precise animal locations are never published to the public.">
        <Link to="/safety-map" className="block rounded-2xl border border-slate-200 bg-white p-6 transition-colors hover:border-emerald-300">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold text-slate-900">Gudalur Wildlife Safety Map</p>
              <p className="mt-1 text-sm text-slate-600">Layers for incidents, active danger zones and safety nodes — with more layers for corridors, schools and hospitals as official data is verified.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
              Open the map <ArrowRight size={15} aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LOCALITIES.filter((l) => l.refLat).slice(0, 8).map((l) => (
              <span key={l.slug} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">{l.name}</span>
            ))}
          </div>
        </Link>
      </Section>

      {/* ============================ GUDALUR 365 ========================== */}
      <section className="border-y border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">Gudalur 365</p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Wildlife safety cannot begin after someone dies.</h2>
          <p className="mt-3 max-w-3xl text-slate-300">A year-round model for a permanent, science-based safety system across Gudalur.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {GUDALUR_365.map((p) => (
              <div key={p.key} className="rounded-xl border border-slate-800 bg-slate-800/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">{p.key}</p>
                <p className="mt-1 text-sm font-bold">{p.title}</p>
              </div>
            ))}
          </div>
          <Btn href="/gudalur-365" variant="ghost" className="mt-6 text-slate-200 hover:bg-slate-800 hover:text-white">
            The year-round model <ArrowRight size={15} aria-hidden="true" />
          </Btn>
        </div>
      </section>

      {/* =========================== RIGHT TO LIFE ========================= */}
      <Section eyebrow="The manifesto" title="The Gudalur Right to Life" subtitle="Seven sections — what is happening, why conflict occurs, what the law provides, what has failed, what is needed, what citizens can do, and our commitments.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['What is happening?', 'Why conflict occurs', 'What the law provides', 'What has failed'].map((s, i) => (
            <Card key={s} className="bg-slate-50">
              <p className="text-xs font-bold text-emerald-700">0{i + 1}</p>
              <p className="mt-1 font-semibold text-slate-900">{s}</p>
            </Card>
          ))}
        </div>
        <Btn href="/right-to-life" variant="secondary" className="mt-5"><ScrollText size={16} aria-hidden="true" /> Read the full manifesto</Btn>
      </Section>


      {/* ======================== SAFETY PRIORITIES ======================== */}
      <Section
        eyebrow="Citizen priorities / policy recommendations"
        title="Gudalur's safety priorities"
        subtitle="Ten specific, measurable demands proposed by citizens. None are presented as existing government commitments — they are recommendations for the administration to adopt and the public to audit."
      >
        <ol className="grid gap-3 md:grid-cols-2">
          {SAFETY_PRIORITIES.map((p) => (
            <li key={p.n} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-sm font-bold text-white" aria-hidden="true">{p.n}</span>
              <div>
                <p className="font-bold text-slate-900">{p.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* ========================= LOCAL SAFETY NODES ======================= */}
      <Section eyebrow="Safety nodes" title="Local safety nodes" subtitle="Real Gudalur taluk localities. Local coordinators and contacts appear only when verified — never invented.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {LOCALITIES.map((l) => (
            <Link key={l.slug} to={`/localities/${l.slug}`} className="group rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
              <MapPin size={16} className="text-emerald-700" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-emerald-900">{l.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{l.revenueVillage} · {l.pincode}</p>
            </Link>
          ))}
        </div>
        <Btn href="/localities" variant="secondary" className="mt-5">All localities</Btn>
      </Section>

      {/* ============================= EVIDENCE ============================= */}
      <Section eyebrow="Evidence room" title="Documents & verified records" subtitle="Government documents, forest department circulars, court orders, ESZ notifications, research, RTI replies and incident records — every item linked and dated.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <FileText size={22} className="shrink-0 text-emerald-700" aria-hidden="true" />
            <p className="text-sm text-slate-600">Browse the organised evidence behind every claim on this platform. No documents are fabricated; gaps are shown honestly.</p>
          </div>
          <Btn href="/evidence" variant="secondary">Open the Evidence Room</Btn>
        </div>
      </Section>

      {/* ======================= GOVERNMENT ACTION TRACKER ==================== */}
      <Section eyebrow="Accountability" title="Government action tracker" subtitle="Public questions and requests — with status, department and any official response — tracked openly from submission onwards.">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <ShieldAlert size={16} className="text-emerald-700" aria-hidden="true" />
            Tracked records: {stats ? stats.tracked_actions : '—'}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Example: "What is the current status of elephant-proof trench maintenance in high-risk Gudalur areas?"
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
            {['Submitted', 'Acknowledged', 'Response received', 'Action reported', 'Follow-up required'].map((s) => (
              <span key={s} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-slate-600">{s}</span>
            ))}
          </div>
          <Btn href="/government-action" variant="secondary" className="mt-5">Open the tracker</Btn>
        </div>
      </Section>

      {/* ====================== JOIN / RESIDENT ID ========================== */}
      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <Users size={26} className="mx-auto text-emerald-400" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Join as a Gudalur resident</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
            A Gudalur Resident ID connects your locality, your safety alerts and your citizen submissions.
            {profile
              ? <span className="mt-2 block font-bold text-emerald-400">You are registered — {profile.name} · {profile.gudalurId}</span>
              : <span className="mt-2 block text-slate-400">It is a community platform ID — it is not a government identity document.</span>}
          </p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('vg-open-id'))}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-emerald-500"
          >
            {profile ? 'View your Resident ID' : 'Get your Gudalur Resident ID'}
          </button>
        </div>
      </section>

      {/* =========================== EMERGENCY FOOT ========================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <EmergencyBar />
        </div>
      </section>
    </div>
  );
};

export default Home;
