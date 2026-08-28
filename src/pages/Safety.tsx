// ============================================================================
// SAFETY — safety-first hub: situation, report, alerts, emergency, guidance
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, Siren, PhoneCall, ChevronRight, ShieldCheck } from 'lucide-react';
import { PageHeader, Section, Card, Btn, Loading, DataUnavailable, ErrorNote } from '../components/ui/Primitives';
import { EmergencyBar } from '../components/ui/EmergencyBar';
import { VerificationBadge } from '../components/ui/StatusBadges';
import { api, PublicIncident } from '../lib/api';
import { SAFETY_DO, SAFETY_DONT } from '../data/safetyContent';

const Safety: React.FC = () => {
  const [incidents, setIncidents] = useState<PublicIncident[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPublicIncidents(30)
      .then((d) => alive && setIncidents(d))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Safety first"
        title="Gudalur Safety Now"
        subtitle="Human life must be protected. Wildlife must be protected. If you see an elephant, tiger or other dangerous wildlife, do not approach, chase, surround or provoke the animal — move to safety and report it."
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Btn href="/report"><Radio size={16} aria-hidden="true" /> Report a Sighting</Btn>
          <Btn href="/alerts" variant="secondary"><Siren size={16} aria-hidden="true" /> Active Alerts</Btn>
          <Btn href="/alerts#emergency" variant="secondary"><PhoneCall size={16} aria-hidden="true" /> Emergency Help</Btn>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">

        {/* Verified situation */}
        <Section eyebrow="Verified records" title="Verified wildlife incident records" subtitle="Community reports are shown with an exact status. A report is never presented as an official record until verified.">
          {error && <ErrorNote message="Live incident records could not be loaded. They will reappear when the connection is restored." />}
          {!error && incidents === null && <Loading label="Loading verified records…" />}
          {!error && incidents && incidents.length === 0 && <DataUnavailable what="No public incident records are published yet in Gudalur." />}
          {!error && incidents && incidents.length > 0 && (
            <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
              {incidents.map((inc) => (
                <li key={inc.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-slate-900">{inc.species} — {inc.locality_name}</p>
                    <VerificationBadge status={inc.verification_status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {inc.event_date}{inc.event_time ? ` · ${inc.event_time}` : ''}
                    {inc.incident_type ? ` · Type: ${inc.incident_type.replace(/_/g, ' ').toLowerCase()}` : ''}
                  </p>
                  {inc.direction && <p className="mt-1 text-xs text-slate-500">Direction: {inc.direction}</p>}
                  {inc.description && <p className="mt-2 text-sm leading-relaxed text-slate-700">{inc.description}</p>}
                  {inc.landmark && <p className="mt-1 text-xs text-slate-500">Landmark: {inc.landmark}</p>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-500">Precise animal locations are withheld from public records for safety. Published entries show locality and zone only.</p>
        </Section>

{/* Do / Don't */}
        <Section eyebrow="Guidance" title="What to do near wildlife" subtitle="Clear, life-saving guidance for a landscape shared with elephants, tigers and leopards.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-emerald-200 bg-emerald-50/40">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-800"><ShieldCheck size={16} aria-hidden="true" /> Do</p>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
                {SAFETY_DO.map((d) => <li key={d} className="flex gap-2"><span className="mt-0.5 text-emerald-700" aria-hidden="true">•</span><span>{d}</span></li>)}
              </ul>
            </Card>
            <Card className="border-rose-200 bg-rose-50/40">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-rose-800"><Siren size={16} aria-hidden="true" /> Do not</p>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-700">
                {SAFETY_DONT.map((d) => <li key={d} className="flex gap-2"><span className="mt-0.5 text-rose-700" aria-hidden="true">•</span><span>{d}</span></li>)}
              </ul>
            </Card>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Btn href="/safety-map" variant="secondary">Open the wildlife safety map <ChevronRight size={15} aria-hidden="true" /></Btn>
            <Btn href="/gudalur-365" variant="secondary">The year-round safety model <ChevronRight size={15} aria-hidden="true" /></Btn>
            <Link to="/localities" className="inline-flex items-center gap-1.5 self-center text-sm font-bold text-emerald-800 underline-offset-4 hover:underline">Local safety nodes <ChevronRight size={14} aria-hidden="true" /></Link>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default Safety;
        <EmergencyBar />
