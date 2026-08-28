// ============================================================================
// ADMIN — verification & moderation console (role-gated)
// ============================================================================
import React, { useEffect, useState } from 'react';
import { PageHeader, Section, Card, Loading, ErrorNote, DataUnavailable } from '../components/ui/Primitives';
import { VerificationBadge, STATUS_STYLES } from '../components/ui/StatusBadges';
import { useAuth } from '../context/AuthContext';
import { api, AdminIncident, VerificationStatus } from '../lib/api';
import toast from 'react-hot-toast';

const ADMIN_ROLES = ['PLATFORM_ADMIN', 'CORE_ADMIN', 'LOCAL_ADMIN', 'VERIFIER'];

const Admin: React.FC = () => {
  const { profile, user } = useAuth();
  const isAdmin = !!(profile?.role && ADMIN_ROLES.includes(profile.role));
  const [incidents, setIncidents] = useState<AdminIncident[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const identity = profile ? { uid: profile.uid, phone: profile.phone, gid: profile.gudalurId || '' } : null;

  const loadIncidents = () => {
    if (!identity) return;
    setLoading(true);
    api.adminListIncidents(identity).then(setIncidents).catch(() => setError(true)).finally(() => setLoading(false));
  };

  useEffect(() => { if (isAdmin) loadIncidents(); }, [isAdmin]);

  const handleStatus = (id: string, status: VerificationStatus) => {
    if (!identity) return;
    api.adminUpdateIncident(identity, id, status, 'Moderated via console')
      .then(() => {
        toast.success(`Incident → ${status}`);
        setIncidents((prev) => prev ? prev.map((i) => i.id === id ? { ...i, verification_status: status } : i) : prev);
      })
      .catch(() => toast.error('Could not update'));
  };

  if (!user) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Console" subtitle="Restricted to platform administrators." />
        <Section title="" subtitle="">
          <Card><p className="text-slate-700">You must sign in with an administrator Resident ID to access the moderation console.</p></Card>
        </Section>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader eyebrow="Admin" title="Console" subtitle="Restricted access." />
        <Section title="" subtitle="">
          <Card><p className="text-slate-700">Your Resident ID does not have administrator privileges.</p></Card>
        </Section>
      </div>
    );
  }

  const statuses: VerificationStatus[] = ['UNDER_REVIEW', 'VERIFIED', 'OFFICIAL', 'RESOLVED', 'REJECTED'];

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Moderation" subtitle="Verify reports, reject false reports, create alerts and manage evidence. Precise coordinates and reporter identities are visible only here.">
        <button onClick={loading ? undefined : loadIncidents} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </PageHeader>

      <Section title="" subtitle="">
        {loading && <Loading label="Loading reports…" />}
        {error && <ErrorNote />}
        {!loading && !error && incidents !== null && incidents.length === 0 && <DataUnavailable what="No incident reports yet." />}
        {!loading && !error && incidents && incidents.length > 0 && (
          <div className="space-y-3">
            {incidents.map((i) => (
              <Card key={i.id} className="border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <VerificationBadge status={i.verification_status} />
                      <span className="font-bold">{i.species}</span> · <span className="text-slate-600">{i.incident_type.replace('_', ' ')}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 line-clamp-2">{i.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {i.locality_name} · {i.event_date} · source: {i.source}
                      {i.latitude != null && i.longitude != null && <span className="ml-2 font-mono">(precise: {i.latitude}, {i.longitude})</span>}
                      {i.reporter_contact && <span className="ml-2 font-mono">(contact: {i.reporter_contact})</span>}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {statuses.map((s) => (
                      <button key={s} onClick={() => handleStatus(i.id, s)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold hover:bg-slate-50">{STATUS_STYLES[s].label}</button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default Admin;
