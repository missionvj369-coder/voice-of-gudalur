// ============================================================================
// REPORT — citizen wildlife incident reporting
// Every submission is stored as REPORTED / CITIZEN and enters moderation.
// Precise coordinates, if provided, are never shown to the public. Only
// information personally observed should be reported.
// ============================================================================

import React, { useState } from 'react';
import { Camera, CheckCircle2, AlertTriangle, MapPin, Upload } from 'lucide-react';
import { PageHeader, Section, Card, Btn, ErrorNote } from '../components/ui/Primitives';
import { api, SPECIES_LABELS, INCIDENT_TYPE_LABELS, Species, IncidentType } from '../lib/api';
import { LOCALITIES, localityName } from '../data/localities';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import toast from 'react-hot-toast';

const SPECIES_LIST = (Object.keys(SPECIES_LABELS) as Species[]);
const TYPE_LIST = (Object.keys(INCIDENT_TYPE_LABELS) as IncidentType[]);

const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-slate-50';
const labelCls = 'block text-sm font-semibold text-slate-700';

const Report: React.FC = () => {
  const { profile } = useAuth();
  const [species, setSpecies] = useState<Species>('ELEPHANT');
  const [incidentType, setIncidentType] = useState<IncidentType>('SIGHTING');
  const [localitySlug, setLocalitySlug] = useState<string>(profile?.localityId || '');
  const [customLocality, setCustomLocality] = useState('');
  const [landmark, setLandmark] = useState('');
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [eventTime, setEventTime] = useState('');
  const [direction, setDirection] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState(profile?.phone || '');
  const [uploading, setUploading] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string; status: string; locality: string } | null>(null);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Only image files are accepted'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Image must be under 8 MB'); return; }
    setUploading(true);
    try {
      const { supabase } = await import('../lib/supabase');
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `reports/${profile?.uid || 'anonymous'}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('wildlife-media').upload(path, file, { cacheControl: '3600' });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('wildlife-media').getPublicUrl(path);
      setEvidenceUrl(urlData.publicUrl);
      toast.success('Photo uploaded');
    } catch {
      setError('Photo upload failed. You can still submit the report without a photo.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const locName = customLocality.trim() || localityName(localitySlug) || 'Gudalur';
    if (!description.trim() && !evidenceUrl) {
      setError('Please describe what you observed, or attach a photo.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createIncidentReport({
        incident_type: incidentType,
        species,
        locality_id: localitySlug || undefined,
        locality_name: locName,
        landmark: landmark.trim() || undefined,
        event_date: eventDate || new Date().toISOString().slice(0, 10),
        event_time: eventTime || undefined,
        direction: direction.trim() || undefined,
        description: description.trim(),
        evidence_url: evidenceUrl,
        reporter_contact: contact.trim() || undefined,
        reporter_uid: profile?.uid,
      });
      setDone({ id: created.id, status: created.verification_status, locality: created.locality_name });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err?.message || 'Your report could not be submitted. Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Report"
        title="Report a wildlife incident"
        subtitle="Report sightings, animals near homes or roads, property damage, livestock attacks or injury. Every report is reviewed and appears publicly only after verification."
      >
        <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p><strong>Only report information you have personally observed.</strong> Do not approach wildlife to obtain photographs or video — your safety comes first.</p>
        </div>
      </PageHeader>

      <Section title="" subtitle="" className="py-10">
        {done ? (
          <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-700" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Report received</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Your report ({done.id.slice(0, 8)}…) from <strong>{done.locality}</strong> has been recorded as a{" "}
              <strong>COMMUNITY REPORT</strong>. It will be reviewed and, once verified, published with a VERIFIED status.
              It is never presented as an official record.
            </p>
            <p className="mt-3 text-xs text-slate-500">Your phone number, if you shared it, is private and is not published.</p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Btn onClick={() => { setDone(null); setDescription(''); setEvidenceUrl(undefined); }}>Report another</Btn>
              <Btn href="/safety" variant="secondary">View safety records</Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto grid max-w-3xl gap-5">
            {error && <ErrorNote message={error} />}
            {!isSupabaseConfigured() && (
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                The reporting database is not connected yet (environment variables not set). Your report cannot be saved until a Supabase
                project is configured. Setup instructions are in <code>.env.example</code>.
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="species" className={labelCls}>Animal</label>
                <select id="species" value={species} onChange={(e) => setSpecies(e.target.value as Species)} className={inputCls}>
                  {SPECIES_LIST.map((s) => <option key={s} value={s}>{SPECIES_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="incidentType" className={labelCls}>Incident type</label>
                <select id="incidentType" value={incidentType} onChange={(e) => setIncidentType(e.target.value as IncidentType)} className={inputCls}>
                  {TYPE_LIST.map((ty) => <option key={ty} value={ty}>{INCIDENT_TYPE_LABELS[ty]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="locality" className={labelCls}>Locality</label>
                <select id="locality" value={localitySlug} onChange={(e) => setLocalitySlug(e.target.value)} className={inputCls}>
                  <option value="">Select locality…</option>
                  {LOCALITIES.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                  <option value="__other">Other / not listed</option>
                </select>
              </div>
              {localitySlug === '__other' && (
                <div>
                  <label htmlFor="customLocality" className={labelCls}>Locality name</label>
                  <input id="customLocality" value={customLocality} onChange={(e) => setCustomLocality(e.target.value)} className={inputCls} placeholder="e.g. a specific estate or hamlet" />
                </div>
              )}
              <div className={localitySlug !== '__other' ? 'sm:col-span-1' : ''}>
                <label htmlFor="landmark" className={labelCls}>Landmark (optional)</label>
                <input id="landmark" value={landmark} onChange={(e) => setLandmark(e.target.value)} className={inputCls} placeholder="Near the school, behind the bus stand…" />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="eventDate" className={labelCls}>Date</label>
                <input id="eventDate" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputCls} required />
              </div>
              <div>
                <label htmlFor="eventTime" className={labelCls}>Time (optional)</label>
                <input id="eventTime" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label htmlFor="direction" className={labelCls}>Direction of movement (optional)</label>
              <input id="direction" value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls} placeholder="e.g. moving south toward the road, entering the estate from the east…" />
            </div>

            <div>
              <label htmlFor="description" className={labelCls}>Description</label>
              <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="What you personally observed: the animal, behaviour, how many, surroundings, what happened…" />
            </div>

            <div>
              <span className={labelCls}>Photo / video (optional)</span>
              <label htmlFor="evidence" className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 hover:border-emerald-400 hover:bg-emerald-50">
                <Upload size={20} aria-hidden="true" />
                <span>{uploading ? 'Uploading…' : evidenceUrl ? 'Photo attached ✓ (tap to change)' : 'Choose an image file (max 8 MB)'}</span>
                <input id="evidence" type="file" accept="image/*" onChange={handleFile} className="sr-only" disabled={uploading} />
              </label>
              {evidenceUrl && (
                <img src={evidenceUrl} alt="Your uploaded evidence preview" className="mt-3 max-h-56 rounded-xl border border-slate-200 object-cover" />
              )}
            </div>

            <div>
              <label htmlFor="contact" className={labelCls}>Reporter contact (optional)</label>
              <input id="contact" type="tel" inputMode="tel" value={contact} onChange={(e) => setContact(e.target.value)} className={inputCls} placeholder="10-digit mobile — kept strictly private" maxLength={10} />
              <p className="mt-1 text-xs text-slate-500">Used only by the verification team if we need to confirm this report. Never published.</p>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
              <p className="max-w-xs text-[11px] leading-relaxed text-slate-500">
                Submitting records a <strong>COMMUNITY REPORT</strong> (status: under review). It is shared only after verification.
              </p>
              <Btn type="submit" disabled={submitting || uploading}>
                {submitting ? 'Submitting…' : 'Submit report'}
              </Btn>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
};

export default Report;