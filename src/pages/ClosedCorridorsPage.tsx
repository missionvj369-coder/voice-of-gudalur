import React from 'react';
import { MapPin } from 'lucide-react';
import { CLOSED_CORRIDORS } from '../data/closedCorridors';
import { CorridorMap } from '../components/CorridorMap';

/**
 * Closed / restricted wildlife corridor checkpoints around Gudalur on an
 * OpenStreetMap (Leaflet) — uses the shared CorridorMap.
 */
export const ClosedCorridorsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
    <div className="text-center space-y-2">
      <h1 className="text-3xl font-black text-white">Closed Corridors — Gudalur &amp; Nilgiris</h1>
      <p className="text-sm text-emerald-50/90 max-w-xl mx-auto">
        {CLOSED_CORRIDORS.length} closed / restricted wildlife corridor checkpoints around Gudalur —
        forest gates, night-closure sections and elephant-fringe buffers. Keep this list in sync
        with Gudalur Forest Division notifications.
      </p>
    </div>

    <CorridorMap />

    <div className="grid gap-3 sm:grid-cols-2">
      {CLOSED_CORRIDORS.map((c, i) => (
        <div key={c.id} className="rounded-2xl border border-white/20 bg-white/5 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-[10px] font-black shrink-0">
              {i + 1}
            </span>
            <p className="text-sm font-bold text-white flex items-center gap-1.5">
              <MapPin size={13} className="text-red-400 shrink-0" />
              {c.name}
            </p>
          </div>
          <p className="text-[11px] text-[#AED581]/70 pl-8">{c.zone}</p>
          <p className="text-xs text-[#E6F7E6] leading-relaxed pl-8">{c.note}</p>
        </div>
      ))}
    </div>
  </div>
);

export default ClosedCorridorsPage;