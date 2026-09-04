import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { CLOSED_CORRIDORS } from '../data/closedCorridors';

/**
 * Closed / restricted wildlife corridor checkpoints around Gudalur on an
 * OpenStreetMap (Leaflet). CircleMarkers avoid bundler issues with the
 * default Leaflet marker image assets.
 */
export const ClosedCorridorsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-black text-slate-900">Closed Corridors — Gudalur &amp; Nilgiris</h1>
      <p className="text-sm text-slate-600 max-w-xl mx-auto">
        {CLOSED_CORRIDORS.length} closed / restricted wildlife corridor checkpoints around Gudalur —
        forest gates, night-closure sections and elephant-fringe buffers. Keep this list in sync
        with Gudalur Forest Division notifications.
      </p>
    </div>

    <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={[11.52, 76.55]} zoom={10} scrollWheelZoom className="h-[380px] w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {CLOSED_CORRIDORS.map((c) => (
          <CircleMarker
            key={c.id}
            center={[c.lat, c.lng]}
            radius={9}
            pathOptions={{ color: '#B91C1C', weight: 2, fillColor: '#EF4444', fillOpacity: 0.75 }}
          >
            <Popup>
              <div className="text-xs space-y-1" style={{ minWidth: 180 }}>
                <p className="font-bold text-slate-900">{c.name}</p>
                <p className="text-slate-400">{c.zone}</p>
                <p className="text-slate-600">{c.note}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      {CLOSED_CORRIDORS.map((c, i) => (
        <div key={c.id} className="rounded-2xl bg-white border border-slate-200 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-black shrink-0">
              {i + 1}
            </span>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin size={13} className="text-red-600 shrink-0" />
              {c.name}
            </p>
          </div>
          <p className="text-[11px] text-slate-400 pl-8">{c.zone}</p>
          <p className="text-xs text-slate-600 leading-relaxed pl-8">{c.note}</p>
        </div>
      ))}
    </div>
  </div>
);

export default ClosedCorridorsPage;
