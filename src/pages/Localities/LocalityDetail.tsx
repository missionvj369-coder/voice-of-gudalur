import React, { useEffect, useState, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Phone, ShieldCheck } from 'lucide-react';
import { PageHeader, Section, Card, DataUnavailable } from '../../components/ui/Primitives';
import { VerificationBadge } from '../../components/ui/StatusBadges';
import { LOCALITIES, Locality } from '../../data/localities';
import { api, PublicIncident } from '../../lib/api';
const LocalityDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const locality = (LOCALITIES as Locality[]).find((l) => l.slug === slug);
  const [incidents, setIncidents] = useState<PublicIncident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicIncidents(200).then((all) => {
      const match = (locality?.name || '').toLowerCase();
      setIncidents(all.filter((i) => i.locality_name.toLowerCase() === match));
      setLoading(false);
    }).catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!locality) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <h1 className="font-serif text-3xl font-bold text-slate-900 mb-4">Locality not found</h1>
        <p className="text-slate-600 mb-6">We could not find a safety node for that locality.</p>
        <Link to="/localities" className="text-emerald-700 font-medium underline">View all localities →</Link>
      </div>
    );
  }

  const verified = incidents.filter((i) => ['VERIFIED','OFFICIAL','RESOLVED'].includes(i.verification_status));

  return (
    <>
      <PageHeader
        title={locality.name}
        subtitle="Gudalur locality safety node"
        back="/localities"
      />
      <Section title="" subtitle="">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Current Safety Status</h3>
              {verified.length > 0 ? (
                <p className="text-slate-700">
                  {verified.length} verified wildlife incidents recorded in this locality.
                </p>
              ) : (
                <p className="text-slate-600">No verified incidents currently recorded in this locality.</p>
              )}
            </Card>
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Active Alerts</h3>
              <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
                {verified.slice(0, 3).length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {verified.slice(0, 3).map((i) => (
                      <li key={i.id} className="border-l-2 border-amber-400 pl-3">
                        <span className="font-medium">{i.species} — {i.incident_type.replace('_', ' ')}</span>
                        <span className="text-slate-500 block text-xs">
                          {i.event_date} • {new Date(i.created_at).toLocaleDateString('en-GB')}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No current active alerts for this locality.</p>
                )}
              </Suspense>
            </Card>
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Recent Verified Wildlife Incidents</h3>
              {loading ? (
                <p className="text-slate-500">Loading incidents…</p>
              ) : verified.length > 0 ? (
                <div className="space-y-3">
                  {verified.map((i) => (
                    <div key={i.id} className="border-b border-slate-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <VerificationBadge status={i.verification_status} />
                        <span className="font-medium">{i.species}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1 line-clamp-2">{i.description}</p>
                      <p className="text-xs text-slate-500">
                        {i.event_date} · {i.landmark ?? 'Near ' + i.locality_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <DataUnavailable what="District records or verified incident data are not yet published for this locality." />
              )}
            </Card>
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Local Information</h3>
              <p className="text-slate-700">
                {locality.name} is part of {locality.zone} in Gudalur taluk.
              </p>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Emergency Contacts</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2"><Phone size={16} /> <b>112</b> — All emergencies (India)</li>
                <li className="flex items-center gap-2"><Phone size={16} /> <b>108</b> — Ambulance</li>
                <li className="flex items-center gap-2"><Phone size={16} /> <b>100</b> — Police</li>
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                TN Forest Department local response: contact the nearest range office. Numbers vary by range — confirm from{' '}
                <Link to="/evidence" className="text-emerald-700 underline">official sources</Link>.
              </p>
            </Card>
            {locality.coordinatorName ? (
              <Card>
                <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-1">
                  <ShieldCheck size={16} /> Local Safety Coordinator</h3>
                <p className="text-sm"><b>{locality.coordinatorName}</b></p>
              </Card>
            ) : (
              <Card>
                <h3 className="font-bold text-slate-900 mb-2">Local Safety Coordinator</h3>
                <p className="text-sm text-slate-600">Not yet configured for this locality.</p>
              </Card>
            )}
            <Card>
              <h3 className="font-bold text-slate-900 mb-2">Nearest Medical Help</h3>
              {locality.hospitals && locality.hospitals.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {locality.hospitals.map((h) => <li key={h}>{h}</li>)}
                </ul>
              ) : (
                <DataUnavailable what="Medical facilities are not yet listed for this locality." />
              )}
            </Card>
            <Card className="space-y-2">
              <Link to="/report" className="w-full block">
                <button className="btn-primary w-full">Report incident in {locality.name}</button>
              </Link>
              <Link to="/alerts" className="w-full block">
                <button className="btn-outline w-full">Join safety alerts</button>
              </Link>
            </Card>
          </div>
        </div>
      </Section>
    </>
  );
};

export default LocalityDetail;


