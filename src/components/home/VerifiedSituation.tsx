// ============================================================================
// HOME — the first screen must immediately communicate purpose.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Siren } from 'lucide-react';
import { Section, DataUnavailable, Loading, ErrorNote } from '../ui/Primitives';
import { api, PublicIncident } from '../../lib/api';

export const VerifiedSituation: React.FC = () => {
  const [incidents, setIncidents] = useState<PublicIncident[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getPublicIncidents(20)
      .then((d) => alive && setIncidents(d))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  const recent = (incidents || []).slice(0, 5);
  return (
    <Section
      eyebrow="Verified situation"
      title="Current verified situation"
      subtitle="Every record below has been verified by the platform team and is shown with its status. Unverified community reports are never presented as official records."
    >
      {error && <ErrorNote message="Live incident data could not be loaded. Nothing is hidden — it will reappear when the connection is restored." />}
      {!error && incidents === null && <Loading label="Loading verified incident records…" />}
      {!error && incidents && incidents.length === 0 && (
        <DataUnavailable what="No public incident records are published yet." />
      )}
      {!error && incidents && incidents.length > 0 && (
        <>
          <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {recent.map((inc) => (
              <li key={inc.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {inc.species} — {inc.locality_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {inc.event_date}{inc.event_time ? ` · ${inc.event_time}` : ''}
                    {inc.landmark ? ` · ${inc.landmark}` : ''}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  {inc.verification_status}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-sm">
            <Link to="/safety-map" className="inline-flex items-center gap-1.5 font-bold text-emerald-800 underline-offset-4 hover:underline">
              <MapPin size={15} aria-hidden="true" /> Open the wildlife safety map <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </>
      )}
    </Section>
  );
};