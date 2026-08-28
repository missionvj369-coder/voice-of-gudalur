// ============================================================================
// GOVERNMENT ACTION TRACKER — public questions & requests, tracked openly
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Send, Building2, CalendarDays } from 'lucide-react';
import { PageHeader, Section, Card, Btn, Loading, ErrorNote, DataUnavailable } from '../components/ui/Primitives';
import { api, GovAction } from '../lib/api';
import { ACTION_STATUS_LABELS } from '../data/lawAndEvidenceData';
import { LOCALITIES } from '../data/localities';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED: 'bg-amber-50 text-amber-800 border-amber-300',
  ACKNOWLEDGED: 'bg-sky-50 text-sky-800 border-sky-300',
  RESPONSE_RECEIVED: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  ACTION_REPORTED: 'bg-emerald-600 text-white border-emerald-700',
  FOLLOW_UP_REQUIRED: 'bg-rose-50 text-rose-700 border-rose-300',
};

const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200';
const labelCls = 'block text-sm font-semibold text-slate-700';

const GovernmentAction: React.FC = () => {
  const [actions, setActions] = useState<GovAction[] | null>(null);
  const [error, setError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locality, setLocality] = useState('');
  const [department, setDepartment] = useState('');
  const [requestedAction, setRequestedAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [latestRef, setLatestRef] = useState<string | null>(null);

  const load = () => {
    api.getGovActions().then(setActions).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error('Please give the question a short title'); return; }
    setSubmitting(true);
    try {
      const res = await api.submitGovAction({
        title: title.trim(), description: description.trim() || undefined,
        locality: locality || undefined, department: department.trim() || undefined,
        requested_action: requestedAction.trim() || undefined,
      });
      setLatestRef(res.ref);
      setShowForm(false);
      setTitle(''); setDescription(''); setDepartment(''); setRequestedAction('');
      load();
      toast.success('Action logged for public tracking');
    } catch (err: any) {
      toast.error(err?.message || 'Could not log the action. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Accountability"
        title="Government action tracker"
        subtitle="Public questions and requests logged openly, with a status that moves from SUBMITTED towards ACTION REPORTED — or FOLLOW-UP REQUIRED. Every entry is a documented, lawful request, never an accusation without evidence."
      >
        <Btn onClick={() => setShowForm((v) => !v)}><Send size={16} aria-hidden="true" /> {showForm ? 'Hide the form' : 'Ask a public question'}</Btn>
      </PageHeader>

      {showForm && (
        <Section title="" subtitle="" className="border-b border-slate-200">
          <form onSubmit={handleSubmit} className="grid max-w-3xl gap-4">
            <div>
              <label htmlFor="at-title" className={labelCls}>Question / request (public title)</label>
              <input id="at-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="e.g. What is the current status of elephant-proof trench maintenance in high-risk Gudalur areas?" />
            </div>
            <div>
              <label htmlFor="at-desc" className={labelCls}>Context (optional)</label>
              <textarea id="at-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Plain facts and observations. Do not name individuals you cannot evidence." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="at-locality" className={labelCls}>Locality (optional)</label>
                <select id="at-locality" value={locality} onChange={(e) => setLocality(e.target.value)} className={inputCls}>
                  <option value="">All / general</option>
                  {LOCALITIES.map((l) => <option key={l.slug} value={l.name}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="at-dept" className={labelCls}>Responsible department (optional)</label>
                <input id="at-dept" value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} placeholder="e.g. Tamil Nadu Forest Department" />
              </div>
            </div>
            <div>
              <label htmlFor="at-req" className={labelCls}>Requested action (optional)</label>
              <input id="at-req" value={requestedAction} onChange={(e) => setRequestedAction(e.target.value)} className={inputCls} placeholder="e.g. Publish inspection records and response-time data for the last 12 months" />
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <p className="max-w-sm text-[11px] text-slate-500">Submissions are logged as PUBLIC questions with a reference number and begin at SUBMITTED status.</p>
              <Btn type="submit" disabled={submitting}>{submitting ? 'Logging…' : 'Log for public tracking'}</Btn>
            </div>
          </form>
          {latestRef && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              <CheckCircle2 size={18} aria-hidden="true" /> Logged with reference <strong>{latestRef}</strong> — it will appear below at SUBMITTED status.
            </div>
          )}
        </Section>
      )}
<Section eyebrow="Public record" title="Tracked questions" subtitle="Each entry shows its status and any official response, with the date it was logged.">
        {error && <ErrorNote message="The tracker could not be loaded. It will reappear when the connection is restored." />}
        {!error && actions === null && <Loading label="Loading tracked actions…" />}
        {!error && actions && actions.length === 0 && (
          <div>
            <DataUnavailable what="No public questions have been logged yet." />
            <p className="mt-4 text-sm text-slate-600">Use the form above to log the first documented question for public tracking.</p>
          </div>
        )}
        {!error && actions && actions.length > 0 && (
          <ul className="space-y-3">
            {actions.map((a) => (
              <li key={a.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-700">{a.ref}</p>
                      <h3 className="mt-1 font-bold text-slate-900">{a.title}</h3>
                    </div>
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${STATUS_STYLES[a.status]}`}>
                      {ACTION_STATUS_LABELS[a.status]}
                    </span>
                  </div>
                  {a.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /> Submitted {a.submitted_date}</span>
                    {a.locality && <span>Locality: {a.locality}</span>}
                    {a.department && <span className="inline-flex items-center gap-1"><Building2 size={12} aria-hidden="true" /> {a.department}</span>}
                  </div>
                  {a.government_response && (
                    <div className="mt-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/60 p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Government response {a.response_date ? `· ${a.response_date}` : ''}</p>
                      <p className="mt-1 text-sm text-slate-700">{a.government_response}</p>
                    </div>
                  )}
                  {a.follow_up_notes && <p className="mt-2 text-xs text-slate-500">Follow-up: {a.follow_up_notes}</p>}
                </Card>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5 text-sm text-slate-600">
          Questions can also be pursued formally through{" "}
          <Link to="/law-and-evidence" className="font-bold text-emerald-800 underline-offset-4 hover:underline">RTI and grievance channels</Link>, and
          represented through the <Link to="/act" className="font-bold text-emerald-800 underline-offset-4 hover:underline">Act page</Link>.
        </p>
      </Section>
    </div>
  );
};

export default GovernmentAction;