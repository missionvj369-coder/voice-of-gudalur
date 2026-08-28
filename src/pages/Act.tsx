// ============================================================================
// ACT — professional government representation generator (no auto-send)
// ============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, FileText, AlertTriangle } from 'lucide-react';
import { PageHeader, Section, Card } from '../components/ui/Primitives';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LOCALITIES } from '../data/localities';
import { ACT_RECIPIENTS, ActRecipient } from '../data/actData';
import { IncidentType, Species, INCIDENT_TYPE_LABELS, SPECIES_LABELS } from '../lib/api';
import toast from 'react-hot-toast';

const recipientNames = (arr: ActRecipient[]) => arr.map((r) => `${r.name} <${r.email}>`).join(', ');

const Act: React.FC = () => {
  const { profile } = useAuth();
  const { lang } = useLanguage();
  const [category, setCategory] = useState('ELEPHANT');
  const [species, setSpecies] = useState<Species>('ELEPHANT');
  const [incidentType, setIncidentType] = useState<IncidentType>('SIGHTING');
  const [locality, setLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [summary, setSummary] = useState('');
  const [evidence, setEvidence] = useState('');
  const [requestedAction, setRequestedAction] = useState('');
  const [to, setTo] = useState<ActRecipient[]>([]);
  const [cc, setCc] = useState<ActRecipient[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const toggle = (list: ActRecipient[], set: (v: ActRecipient[]) => void, item: ActRecipient) =>
    set(list.some((r: ActRecipient) => r.email === item.email) ? list.filter((r: ActRecipient) => r.email !== item.email) : [...list, item]);
  const handleAdd = (item: ActRecipient, role: 'to' | 'cc') =>
    toggle(role === 'to' ? to : cc, role === 'to' ? setTo : setCc, item);

  const verified = ACT_RECIPIENTS.filter((r) => r.verified);
  const unverified = ACT_RECIPIENTS.filter((r) => !r.verified);
  const senderName = profile?.name?.trim() || '';
  const localityName = profile?.localityName || locality || '';
  const subject = `${category === 'ELEPHANT' ? 'Elephant' : category === 'TIGER' ? 'Tiger' : 'Wildlife'} safety concern — ${localityName || 'Gudalur'}`;

  const bodyLines: string[] = [
    'Dear Sir/Madam,', '',
    `I write as a resident of ${localityName || 'Gudalur'} to report a concern:`, '',
    `Category: ${category}`,
    `Species: ${SPECIES_LABELS[species]}`,
    `Incident type: ${INCIDENT_TYPE_LABELS[incidentType]}`,
    `Locality: ${localityName || 'Gudalur'}`,
    ...(landmark ? [`Landmark: ${landmark}`] : []),
    ...(summary ? ['', `Description: ${summary}`] : []),
    ...(evidence ? ['', `Evidence / reference: ${evidence}`] : []),
    ...(requestedAction ? ['', `Requested action: ${requestedAction}`] : []),
    '',
    'I confirm this is based on my own observations and reported to the best of my knowledge.',
    '',
    ...(senderName
      ? [`Name: ${senderName}`, `Locality: ${localityName}`, ...(profile?.gudalurId ? [`Gudalur Resident ID: ${profile.gudalurId}`] : []), 'Contact: (kept private, shared with authorities only if necessary)']
      : ['Reported via Voice of Gudalur (no account identity attached).']),
    '', 'Respectfully,', ...(senderName ? [senderName] : []), 'Voice of Gudalur',
  ];
  const bodyText = bodyLines.join('\n');
  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim() && !locality) { toast.error('Please describe the concern and/or the locality involved'); return; }
    if (to.length === 0) { toast('Add at least one recipient, or copy the body manually.', { duration: 4000 }); }
    setShowPreview(true);
  };
  const copyBody = () => {
    navigator.clipboard.writeText(bodyText).then(() => toast.success('Representation copied to clipboard'));
  };
  void lang; void evidence; void requestedAction;
  return (
    <div>
      <PageHeader eyebrow="Act for Gudalur" title="Send a professional representation" subtitle="Generate a lawful, evidence-based letter. Nothing is sent automatically — you preview and send from your own email.">
        <Link to="/report" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold uppercase text-slate-900 border border-slate-300 hover:bg-slate-50">
          <FileText size={16} aria-hidden="true" /> Report incident instead
        </Link>
      </PageHeader>
      <Section eyebrow="Recipients" title="Your recipients" subtitle="Verified recipients are listed. Unverified addresses are flagged before use.">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-medium text-slate-500">Selected To: {to.map((r) => r.name).join(', ') || 'none'}</p>
          <p className="text-xs font-medium text-slate-500">Selected CC: {cc.map((r) => r.name).join(', ') || 'none'}</p>
          <p className="text-xs text-slate-500">No email is sent automatically. You send from your own mail app.</p>
        </div>
        <div className="mt-4 space-y-3">
          {verified.map((r) => (
            <div key={r.email} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <div><p className="font-medium">{r.name}</p><p className="text-sm text-slate-600">{r.email} · {r.role}</p></div>
              <div className="flex gap-1">
                <button type="button" onClick={() => handleAdd(r, 'to')} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">To</button>
                <button type="button" onClick={() => handleAdd(r, 'cc')} className="rounded-lg border border-slate-300 px-2 py-1 text-xs">CC</button>
              </div>
            </div>
          ))}
        </div>
        {unverified.length > 0 && (
          <div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle size={14} /> The following addresses are <strong>not verified</strong>. Confirm them before adding.
            </div>
            <div className="mt-2 space-y-2">
              {unverified.map((r) => (
                <div key={r.email} className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-3">
                  <div><p className="font-medium">{r.name}</p><p className="text-sm text-slate-600">{r.email} · {r.role}</p></div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleAdd(r, 'to')} className="rounded-lg border border-amber-300 px-2 py-1 text-xs">To</button>
                    <button type="button" onClick={() => handleAdd(r, 'cc')} className="rounded-lg border border-amber-300 px-2 py-1 text-xs">CC</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>
      <Section eyebrow="Your letter" title="Preview — send from your own email">
        <form onSubmit={handlePreview} className="max-w-3xl">
          <Card>
            <p className="text-xs font-medium text-slate-500">Subject</p>
            <p className="font-medium">{subject}</p>
            <p className="mt-3 text-xs font-medium text-slate-500">Body</p>
            <pre className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">{bodyText}</pre>
          </Card>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="max-w-sm text-[11px] text-slate-500">Copy the letter into your own email. Recipients were added by you.</p>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-emerald-800">
              <Send size={16} aria-hidden="true" /> Confirm &amp; prepare
            </button>
          </div>
        </form>
        {to.length > 0 && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-900">To: {recipientNames(to)}</p>
            <p className="mt-1 font-medium text-emerald-900">CC: {recipientNames(cc)}</p>
          </div>
        )}
      </Section>
    </div>
  );
};

export default Act;
