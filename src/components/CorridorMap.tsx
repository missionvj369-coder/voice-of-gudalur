import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CLOSED_CORRIDORS } from '../data/closedCorridors';

/**
 * Shared Leaflet map of the 11 closed / restricted wildlife corridor
 * checkpoints around Gudalur — used by the corridors page and the About page.
 * CircleMarkers avoid bundler issues with Leaflet's default marker images.
 */
export const CorridorMap: React.FC<{ heightClass?: string }> = ({ heightClass = 'h-[380px]' }) => (
  <div className={`overflow-hidden rounded-3xl border border-white/20 shadow-xl ${heightClass}`}>
    <MapContainer center={[11.52, 76.55]} zoom={10} scrollWheelZoom className="h-full w-full">
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
);

export default CorridorMap;
