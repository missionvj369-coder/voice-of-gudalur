// ============================================================================
// SAFETY MAP — Gudalur Wildlife Safety Map
// Public viewers see only locality-level references; precise animal
// coordinates are never exposed. If no tile provider is configured the page
// renders an honest empty state instead of a broken map.
// ============================================================================

import React from 'react';
import { MapPin, Layers, Lock } from 'lucide-react';
import { PageHeader, Section, Card } from '../components/ui/Primitives';
import { getMapConfig, MAP_LAYERS } from '../lib/mapProvider';

const MapPanel = React.lazy(() => import('../components/map/MapPanel'));

const SafetyMap: React.FC = () => {
  const [mapFailed, setMapFailed] = React.useState(false);
  const cfg = getMapConfig();
  const canRender = cfg.provider === 'LEAFLET_OSM' && !!cfg.tileUrl;

  return (
    <div>
      <PageHeader
        eyebrow="Safety map"
        title="Gudalur Wildlife Safety Map"
        subtitle="A map of safety nodes and verified activity built on an architecture that can grow: incidents, active danger zones, settlements, corridors, schools, hospitals and forest areas. Every layer is sourced; nothing geographic is invented."
      />

      <Section eyebrow="Map layers" title="Explore the layer architecture" subtitle="These are the layers the map is designed to support. Those that require official data are shown as planned but remain unconnected until their data source is verified.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {MAP_LAYERS.map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-center gap-2">
                {l.enabled ? <MapPin size={15} className="text-emerald-700" aria-hidden="true" /> : <Layers size={15} className="text-slate-400" aria-hidden="true" />}
                <p className="font-bold text-slate-900">{l.label}</p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {l.enabled ? 'Supported now' : l.note || 'Planned'}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Live view" title="Current safety nodes" subtitle="Settlements are shown at locality level. Precise animal locations are withheld for public safety — only authorised responders and administrators see exact positions.">
        {canRender ? (
          <React.Suspense fallback={<div className="h-[420px] rounded-2xl border border-slate-200 bg-slate-50" role="status"><p className="sr-only">Loading map…</p></div>}>
            <MapPanel cfg={cfg} />
          </React.Suspense>
        ) : (
          <Card className="bg-slate-50">
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900">Map not yet connected</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  No map provider is configured yet. Set <code>VITE_MAP_PROVIDER=LEAFLET_OSM</code> in your environment to activate
                  the OpenStreetMap basemap (see <code>.env.example</code>). When activated, this area renders the interactive map.
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  The map is deliberately data-honest: without a provider, we show this state instead of a broken map.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOCALITY_PREVIEW.map((p) => (
            <Card key={p.slug} className="p-4">
              <MapPin size={15} className="text-emerald-700" aria-hidden="true" />
              <p className="mt-1 font-bold text-slate-900">{p.name}</p>
              <p className="text-xs text-slate-500">{p.zone}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section eyebrow="Data integrity" title="Everything on this map has a source and a status" subtitle="Records are only plotted after verification.">
        <Card className="bg-slate-50">
          <p className="text-sm leading-relaxed text-slate-600">
            The map never invents geographic data. Public records carry a source and status, and precise wildlife positions are
            restricted to authorised responders.
          </p>
        </Card>
      </Section>
    </div>
  );
};

const LOCALITY_PREVIEW = [
  { slug: 'new-bazar', name: 'New Bazar (Town Centre)', zone: 'Central' },
  { slug: 'masinagudi', name: 'Masinagudi', zone: 'Mudumalai edge' },
  { slug: 'ovalley', name: "O'Valley", zone: 'Southern ridge' },
  { slug: 'devala', name: 'Devala', zone: 'Western edge' },
  { slug: 'pandalur', name: 'Pandalur', zone: 'Western edge' },
  { slug: 'naduvattam', name: 'Naduvattam', zone: 'Ooty road ridge' },
];

export default SafetyMap;