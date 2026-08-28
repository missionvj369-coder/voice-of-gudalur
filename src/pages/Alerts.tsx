// ============================================================================
// ALERTS — subscription + active verified alerts + emergency contacts
// ============================================================================

import React, { useEffect, useState } from 'react';
import { Siren, PhoneCall, BellRing, ShieldCheck } from 'lucide-react';
import { PageHeader, Section, Card, Btn, Loading, ErrorNote, DataUnavailable } from '../components/ui/Primitives';
import { SeverityBadge, VerificationBadge } from '../components/ui/StatusBadges';
import { EmergencyBar } from '../components/ui/EmergencyBar';
import { api, PlatformAlert } from '../lib/api';
import { EMERGENCY_CONTACTS } from '../data/safetyContent';
import { LOCALITIES } from '../data/localities';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200';
const labelCls = 'block text-sm font-semibold text-slate-700';

const TOPICS = [
  { id: 'ELEPHANT', label: 'Elephant alerts' },
  { id: 'TIGER', label: 'Tiger alerts' },
  { id: 'EMERGENCY', label: 'Emergency notices' },
  { id: 'CIVIC', label: 'Civic notices' },
] as const;

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<PlatformAlert[] | null>(null);
  const [error, setError] = useState(false);
  const [phone, setPhone] = useState('');
  const [localitySlugs, setLocalitySlugs] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>(['ELEPHANT', 'EMERGENCY']);
  const { lang, setLang } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getActiveAlerts().then((d) => alive && setAlerts(d)).catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => {
    set(list.includes(v) ? list.filter((i) => i !== v) : [...list, v]);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.replace(/\D/g, '').length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return; }
    setSubmitting(true);
    try {
      const res = await api.subscribeAlerts({
        phone: phone.replace(/\D/g, ''),
        localities: localitySlugs,
        topics,
        lang: lang === 'kn' ? 'en' : lang,
      });
      toast.success(`Subscribed (${res.phone_masked}). Alerts will come to this number.`);
      setPhone('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not save your subscription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Safety alerts"
        title="Get alerts, see verified warnings"
        subtitle="Choose your localities and topics. Alerts published here are VERIFIED or classified honestly — a community report is never labelled as an official alert, and nothing is called LIVE until a real detection source is connected."
      >
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-600">
          <ShieldCheck size={15} className="text-emerald-700" aria-hidden="true" />
          Alerts are labelled <strong>RECENT</strong> or <strong>VERIFIED</strong> — never fake urgency.
        </div>
      </PageHeader>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Section eyebrow="Subscribe" title="Set up your safety alerts" subtitle="A quiet, targeted subscription — only the alerts you choose, in the language you choose. Your number is stored privately and never shown publicly.">
          <form onSubmit={handleSubscribe} className="grid max-w-3xl gap-5">
            <div>
              <label htmlFor="al-phone" className={labelCls}>Mobile number</label>
              <input id="al-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="10-digit mobile number" maxLength={10} />
              <p className="mt-1 text-xs text-slate-500">Used only for safety alerts. Never displayed on the platform.</p>
            </div>
            <fieldset>
              <legend className={labelCls}>Localities (choose any)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {LOCALITIES.map((l) => (
                  <button type="button" key={l.slug} onClick={() => toggle(localitySlugs, setLocalitySlugs, l.slug)} aria-pressed={localitySlugs.includes(l.slug)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${localitySlugs.includes(l.slug) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'}`}>
                    {l.name}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">None selected = alerts for all Gudalur localities.</p>
            </fieldset>
            <fieldset>
              <legend className={labelCls}>Alert topics</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {TOPICS.map((tp) => (
                  <button type="button" key={tp.id} onClick={() => toggle(topics, setTopics, tp.id)} aria-pressed={topics.includes(tp.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${topics.includes(tp.id) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-400'}`}>
                    {tp.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div>
              <span className={labelCls}>Language</span>
              <div className="mt-2 flex gap-2">
                {(['en', 'ta', 'ml'] as const).map((l) => (
                  <button type="button" key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                    className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase ${lang === l ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                    {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : 'മലയാളം'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <p className="max-w-xs text-[11px] text-slate-500">No automated real-time warning is promised until an approved detection source is connected.</p>
              <Btn type="submit" disabled={submitting}><BellRing size={16} aria-hidden="true" /> {submitting ? 'Saving…' : 'Subscribe'}</Btn>
            </div>
          </form>
        </Section>
{/* Active alerts */}
        <Section eyebrow="Now" title="Active verified alerts" subtitle="Current warnings issued by the platform team after verification.">
          {error && <ErrorNote message="Active alerts could not be loaded. Nothing is hidden — they will reappear when the connection is restored." />}
          {!error && alerts === null && <Loading label="Loading alerts…" />}
          {!error && alerts && alerts.length === 0 && <DataUnavailable what="There are no active verified alerts right now." />}
          {!error && alerts && alerts.length > 0 && (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Siren size={18} className={a.severity === 'CRITICAL' || a.severity === 'HIGH' ? 'text-rose-600' : 'text-amber-600'} aria-hidden="true" />
                      <h3 className="font-bold text-slate-900">{a.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <VerificationBadge status={a.verification_status} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.description}</p>
                  {(a.locality_names?.length || 0) > 0 && (
                    <p className="mt-2 text-xs text-slate-500">Affected: {a.locality_names.join(', ')}</p>
                  )}
                  {a.instruction && (
                    <div className="mt-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50/60 p-3 text-sm text-slate-700">
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">What to do</p>
                      <p className="mt-1">{a.instruction}</p>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-slate-400">Issued {new Date(a.created_at).toLocaleString()} · {a.verification_status === 'OFFICIAL' ? 'official record' : 'platform-verified'}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <section id="emergency" className="scroll-mt-24">
          <Section eyebrow="Emergency" title="Emergency contacts" subtitle="Official, verified national numbers. Locality-specific forest rapid-response numbers are added only after official verification.">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EMERGENCY_CONTACTS.filter((c) => c.verified).map((c) => (
                <a key={c.number} href={`tel:${c.number.replace(/-/g, '')}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white" aria-hidden="true"><PhoneCall size={19} /></span>
                  <span>
                    <span className="block text-lg font-bold text-slate-900">{c.number}</span>
                    <span className="block text-xs font-semibold text-slate-600">{c.name}</span>
                    {c.note && <span className="block text-[11px] text-slate-500">{c.note}</span>}
                  </span>
                </a>
              ))}
            </div>
            {EMERGENCY_CONTACTS.filter((c) => !c.verified).map((c) => (
              <Card key={c.number} className="mt-3 bg-slate-50">
                <p className="text-sm text-slate-600"><strong className="text-slate-900">{c.name}:</strong> {c.number} — {c.note}</p>
              </Card>
            ))}
            <div className="mt-5"><EmergencyBar /></div>
          </Section>
        </section>
      </div>
    </div>
  );
};

export default Alerts;