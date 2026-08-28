// ============================================================================
// EVIDENCE ROOM — organised, source-linked documents
// Every record is saved in Supabase (`evidence_documents`) and shown with
// source, authority and date. No documents are fabricated; where none are
// published yet, the page is honest about it. Verified national portals are
// always listed as a starting registry.
// ============================================================================

import React, { useEffect, useState } from 'react';
import { FileText, ExternalLink, CalendarDays, Building2 } from 'lucide-react';
import { PageHeader, Section, Card, Loading, ErrorNote, DataUnavailable } from '../components/ui/Primitives';
import { api, EvidenceDoc } from '../lib/api';
import { OFFICIAL_PORTALS } from '../data/lawAndEvidenceData';

const DOC_TYPE_LABELS: Record<string, string> = {
  GOVERNMENT: 'Government Document', FOREST_DEPT: 'Forest Department', NTCA: 'NTCA',
  COURT_ORDER: 'Court Order', ESZ_NOTIFICATION: 'ESZ Notification', RESEARCH: 'Research',
  INCIDENT_REPORT: 'Incident Report', RTI: 'RTI Document', OFFICIAL_RESPONSE: 'Official Response',
  MAP: 'Map', OFFICIAL_PORTAL: 'Official Portal', DOCUMENT: 'Document',
};

const Evidence: React.FC = () => {
  const [docs, setDocs] = useState<EvidenceDoc[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api.getEvidenceDocs()
      .then((d) => alive && setDocs(d))
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Evidence room"
        title="Organised evidence, openly published"
        subtitle="Government documents, forest department records, NTCA advisories, court orders, ESZ notifications, research, RTI replies and incident records — every item with a source, authority and date. No fabricated documents, no invented statistics."
      />

      <Section eyebrow="Platform records" title="Documents in the room" subtitle="These are verified records published by the platform. Public incident reports appear here only after verification.">
        {error && <ErrorNote message="Document records could not be loaded. They will reappear when the connection is restored." />}
        {!error && docs === null && <Loading label="Loading documents…" />}
        {!error && docs && docs.length === 0 && (
          <div>
            <DataUnavailable what="No platform documents are published yet. Verified records will appear here as they are gathered and checked." />
            <p className="mt-4 text-sm text-slate-600">
              Until then, the authoritative starting points are the official portals listed below.
            </p>
          </div>
        )}
        {!error && docs && docs.length > 0 && (
          <ul className="space-y-3">
            {docs.map((d) => (
              <li key={d.id}>
                <a href={d.url} target="_blank" rel="noopener noreferrer"
                  className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <FileText size={20} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                      <div>
                        <p className="font-bold text-slate-900">{d.title}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{DOC_TYPE_LABELS[d.doc_type] || d.doc_type}</p>
                      </div>
                    </div>
                    <ExternalLink size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Building2 size={12} aria-hidden="true" /> {d.authority}</span>
                    {d.doc_date && <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden="true" /> {d.doc_date}</span>}
                  </div>
                  {d.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{d.description}</p>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section eyebrow="Authoritative source portals" title="Official starting points" subtitle="Primary sources to verify orders, notifications and statutes directly from the government.">
        <ul className="grid gap-3 md:grid-cols-2">
          {OFFICIAL_PORTALS.map((p) => (
            <li key={p.name}>
              <a href={p.url} target="_blank" rel="noopener noreferrer"
                className="flex h-full items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50">
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{p.note}</p>
                </div>
                <ExternalLink size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <Card className="mt-6 bg-slate-50">
          <p className="text-sm leading-relaxed text-slate-600">
            Have an official document — a forest department notice, an RTI reply, a court order — relevant to Gudalur safety? The
            platform can record and publish it after verification. Route it through the platform team; unverified uploads are not published.
          </p>
        </Card>
      </Section>
    </div>
  );
};

export default Evidence;