// ============================================================================
// MAP PANEL — Leaflet renderer (lazy-loaded only when a provider is active)
// Public view: locality-level points only (fuzzed), never precise wildlife
// coordinates. Attribution comes from the active map config.
// ============================================================================

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { DivIcon } from 'leaflet';
import { fuzzPublicCoords, MapConfig } from '../../lib/mapProvider';
import { LOCALITIES } from '../../data/localities';

const icon = (color: string) =>
  new DivIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const MapPanel: React.FC<{ cfg: MapConfig }> = ({ cfg }) => {
  const points = LOCALITIES.filter((l) => l.refLat && l.refLng).map((l) => ({
    ...l,
    pos: fuzzPublicCoords(l.refLat!, l.refLng),
  }));
  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200" aria-label="Map showing Gudalur safety nodes at locality level">
      <MapContainer center={[11.51, 76.49]} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer attribution={cfg.attribution} url={cfg.tileUrl!} />
        {points.map((p) => (
          <Marker key={p.slug} position={[p.pos.lat, p.pos.lng]} icon={icon('#047857')}>
            <Popup>
              <p className="text-sm font-bold">{p.name}</p>
              <p className="text-xs text-slate-500">{p.revenueVillage} · {p.pincode}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                Area shown at locality level only — precise wildlife locations are never published.
              </p>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapPanel;