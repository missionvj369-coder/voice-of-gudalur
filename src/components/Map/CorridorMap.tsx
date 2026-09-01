// @ts-nocheck — react-leaflet v5 typing mismatch; same suppression as all map components in this app.
import React, { useState } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { CORRIDORS, HOTSPOTS } from '../../data/corridorData';

/**
 * The 11 blocked migratory corridors + documented frontline conflict zones,
 * rendered over zero-cost CartoDB Dark Matter tiles. Corridors are drawn as
 * advocacy-approximation polylines between verified locality coordinates —
 * official demarcation remains with the Forest Survey of India shapefiles.
 */
export const CorridorMap: React.FC<{ height?: string }> = ({ height = '420px' }) => {
  const gudalurCenter: [number, number] = [11.505, 76.49];
  // Provider toggle — defaults to OpenStreetMap standard tiles (key-less,
  // the same free provider used by the app's other maps). If the network
  // supports CartoDB Dark Matter, the user can toggle via the overlay button.
  const [standardTiles, setStandardTiles] = useState(true);

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-white/[0.08] z-0"
      style={{ height }}
    >
      <MapContainer
        center={gudalurCenter}
        zoom={11}
        scrollWheelZoom={false}
        className="w-full h-full bg-[#0D1310]"
      >
        <TileLayer
          key={standardTiles ? 'osm-standard' : 'carto-dark'}
          attribution={
            standardTiles
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          }
          url={
            standardTiles
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          }
        />

        {/* The 11 migratory corridors — red solid = BLOCKED, amber dashed = FRAGMENTED */}
        {CORRIDORS.map((c) => (
          <Polyline
            key={c.id}
            positions={c.path}
            pathOptions={
              c.status === 'BLOCKED'
                ? { color: '#DC2626', weight: 3.5, opacity: 0.9 }
                : { color: '#F59E0B', weight: 2.5, opacity: 0.75, dashArray: '7, 7' }
            }
          >
            <Popup>
              <div className="min-w-[190px] text-slate-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <p className="font-black text-[13px] leading-tight border-b border-slate-200 pb-1 mb-1">{c.name}</p>
                <p className="text-[11px] mb-1">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded font-black text-[9px] text-white"
                    style={{ background: c.status === 'BLOCKED' ? '#DC2626' : '#F59E0B' }}
                  >
                    {c.status}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">
                  <strong>Blocked by:</strong> {c.blockedBy}
                </p>
              </div>
            </Popup>
          </Polyline>
        ))}

        {/* Frontline conflict hotspots — tap for the documented ground reality */}
        {HOTSPOTS.map((h) => (
          <CircleMarker
            key={h.id}
            center={[h.lat, h.lng]}
            radius={h.severity === 'CRITICAL' ? 8 : 6}
            pathOptions={{
              color: h.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B',
              fillColor: h.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B',
              fillOpacity: 0.55,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[190px] text-slate-900" style={{ fontFamily: 'system-ui, sans-serif' }}>
                <p className="font-black text-[13px] leading-tight border-b border-slate-200 pb-1 mb-1">{h.name}</p>
                <p className="text-[11px] mb-1">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded font-black text-[9px] text-white"
                    style={{ background: h.severity === 'CRITICAL' ? '#DC2626' : '#F59E0B' }}
                  >
                    {h.severity}
                  </span>
                </p>
                <p className="text-[11px] text-slate-600">{h.note}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Tile provider toggle — rescue switch when a network serves error tiles */}
      <button
        type="button"
        onClick={() => setStandardTiles((s) => !s)}
        title={
          standardTiles
            ? 'Switch back to the dark thematic map'
            : 'Map not loading? Switch to the standard map'
        }
        className="absolute top-3 right-3 z-[500] rounded-xl border border-white/[0.12] bg-[#12161A]/92 backdrop-blur-md px-3.5 py-2 min-h-[44px] text-[9px] font-black uppercase tracking-[0.18em] text-[#D4AF37] hover:text-[#F4F1EA] shadow-lg shadow-black/40 transition"
      >
        {standardTiles ? 'Dark map' : 'Standard map'}
      </button>

      {/* Legend overlay — earthy glass panel */}
      <div className="absolute bottom-3 left-3 z-[500] rounded-xl border border-white/[0.12] bg-[#12161A]/92 backdrop-blur-md px-3 py-2.5 space-y-1.5 shadow-lg shadow-black/40">
        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">
          11 Migratory Corridors · Conflict Zones
        </p>
        <p className="flex items-center gap-2 text-[10px] font-bold text-stone-300">
          <span className="inline-block h-0.5 w-6 bg-[#DC2626]" /> Blocked
        </p>
        <p className="flex items-center gap-2 text-[10px] font-bold text-stone-300">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-[#F59E0B]" /> Fragmented
        </p>
        <p className="flex items-center gap-2 text-[10px] font-bold text-stone-300">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#DC2626]/60 border border-[#DC2626]" />
          Critical zone
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F59E0B]/60 border border-[#F59E0B] ml-1" />
          High
        </p>
        <p className="text-[8px] text-stone-600 font-mono pt-0.5">Advocacy mapping · FSI/Forest Dept. shapefiles govern</p>
      </div>
    </div>
  );
};