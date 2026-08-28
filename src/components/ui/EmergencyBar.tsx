import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Siren, ShieldAlert } from 'lucide-react';

/**
 * EMERGENCY BAR — verified national emergency numbers only.
 * Every number shown is a real, officially-published Indian emergency line.
 * Local forest RRT numbers are shown ONLY when entered by an admin in
 * Supabase (localities.coordinator_phone is private; the emergency_contact
 * field of a locality is admin-verified). No invented numbers.
 */
const NATIONAL: { label: string; number: string; note: string }[] = [
  { label: 'National Emergency', number: '112', note: 'Police · Fire · Medical (all India)' },
  { label: 'Ambulance', number: '108', note: 'Tamil Nadu free emergency response' },
  { label: 'Police Control Room', number: '100', note: 'Immediate police assistance' },
];

export const EmergencyBar: React.FC<{ className?: string }> = ({ className }) => (
  <div className={className}>
    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldAlert size={18} className="text-rose-700" aria-hidden="true" />
        <h3 className="text-sm font-bold uppercase tracking-wider text-rose-900">Emergency — life-threatening encounter</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {NATIONAL.map((c) => (
          <a
            key={c.number}
            href={`tel:${c.number}`}
            className="group flex items-center gap-3 rounded-xl border border-rose-200 bg-white p-4 transition-colors hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white" aria-hidden="true">
              <Phone size={20} />
            </span>
            <span>
              <span className="block text-lg font-bold leading-none text-slate-900">{c.number}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-600">{c.label}</span>
              <span className="block text-[11px] text-slate-500">{c.note}</span>
            </span>
          </a>
        ))}
      </div>
      <div className="mt-4 flex flex-col gap-2 text-xs text-rose-900 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          <strong>Do not approach, chase, surround or provoke the animal.</strong> Move to a safe building, keep distance, and call.
        </p>
        <Link to="/alerts" className="inline-flex items-center gap-1.5 font-bold underline decoration-rose-300 underline-offset-4 hover:decoration-rose-700">
          <Siren size={14} aria-hidden="true" /> Current safety alerts
        </Link>
      </div>
      <p className="mt-3 border-t border-rose-200 pt-3 text-[11px] leading-relaxed text-rose-800/80">
        Forest Department rapid-response numbers for your locality are published on each locality page as soon as they are
        officially verified for publication — we do not display unverified numbers.
      </p>
    </div>
  </div>
);
