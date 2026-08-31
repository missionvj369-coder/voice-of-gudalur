// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Locality } from '../../types';
import { MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';

// Custom icons using standard SVG DivIcons to avoid leaflet asset path issues
const createLocalityIcon = (status: string) => {
  const bg = status === 'ALERT' ? '#e11d48' : status === 'CAUTION' ? '#d97706' : '#059669';
  return L.divIcon({
    className: 'custom-locality-marker',
    html: `
      <div style="
        background-color: ${bg};
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
      ">
        📍
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

interface LocalityMapProps {
  localities: Locality[];
  selectedLocalityId?: string;
  onSelectLocality?: (loc: Locality) => void;
  height?: string;
}

export const LocalityMap: React.FC<LocalityMapProps> = ({
  localities,
  selectedLocalityId,
  onSelectLocality,
  height = '420px'
}) => {
  const gudalurCenter: [number, number] = [11.5034, 76.4925];

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-lg border border-slate-200 relative z-0" style={{ height }}>
      <MapContainer
        center={gudalurCenter}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Mudumalai Buffer Ring indicator */}
        <Circle
          center={[11.5450, 76.5120]}
          radius={3000}
          pathOptions={{ color: '#d97706', fillColor: '#f59e0b', fillOpacity: 0.15, dashArray: '6, 6' }}
        />

        {localities.map((loc) => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createLocalityIcon(loc.alertStatus)}
            eventHandlers={{
              click: () => onSelectLocality && onSelectLocality(loc)
            }}
          >
            <Popup className="custom-locality-popup">
              <div className="p-1 space-y-1 text-slate-900">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1">
                  <h4 className="font-bold text-sm text-slate-900">{loc.name}</h4>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    loc.alertStatus === 'ALERT' ? 'bg-amber-100 text-amber-800' :
                    loc.alertStatus === 'CAUTION' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {loc.alertStatus}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{loc.description}</p>
                <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>{loc.revenueVillage}</span>
                  <span className="font-mono font-semibold">PIN: {loc.pincode}</span>
                </div>
                {onSelectLocality && (
                  <button
                    onClick={() => onSelectLocality(loc)}
                    className="w-full mt-2 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs"
                  >
                    View Locality Hub
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
