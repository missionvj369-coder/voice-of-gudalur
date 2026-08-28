// ============================================================================
// LOCALITIES — safety node directory (extendable from Supabase)
// ============================================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin } from 'lucide-react';
import { PageHeader, Section, Card, DataUnavailable } from '../components/ui/Primitives';
import { LOCALITIES, Locality } from '../data/localities';

const Localities: React.FC = () => {
  const [query, setQuery] = useState('');
  const filtered = (LOCALITIES as Locality[]).filter((l) => {
    const q = query.toLowerCase();
    return l.name.toLowerCase().includes(q)
      || l.revenueVillage.toLowerCase().includes(q)
      || l.zone.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Localities"
        title="Local safety nodes"
        subtitle="Every Gudalur taluk locality is a community safety node. Coordinators and contacts are added only after verification — they are never invented."
      >
        <form className="mt-4 flex max-w-xl gap-2">
          <label htmlFor="loc-search" className="sr-only">Search localities</label>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input id="loc-search" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="Search locality, village or zone…" />
        </form>
      </PageHeader>

      <Section eyebrow="Directory" title="Gudalur localities" subtitle="Select a locality to see its current safety status, recent verified incidents, active alerts and emergency contacts.">
        {filtered.length === 0 ? (
          <DataUnavailable what="No localities match that search term." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((l) => (
              <li key={l.slug}>
                <Link to={`/localities/${l.slug}`} className="group block h-full rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-emerald-900">{l.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{l.revenueVillage} · {l.pincode}</p>
                      <p className="mt-1.5 text-xs uppercase tracking-wider text-slate-500">
                        {l.zone.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export default Localities;
