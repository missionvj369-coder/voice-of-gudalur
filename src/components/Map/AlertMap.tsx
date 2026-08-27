// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Alert, ElephantSighting } from '../../types';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface AlertMapProps {
  alerts: (Alert & { lat?: number; lng?: number })[];
  elephantSightings?: ElephantSighting[];
}

const AlertMap: React.FC<AlertMapProps> = ({ alerts, elephantSightings = [] }) => {
  const gudalurCenter: [number, number] = [11.5340, 76.4925];

  // Custom icon for elephants
  const elephantIcon = new L.DivIcon({
    html: '<div style="font-size: 24px;">🐘</div>',
    className: 'custom-elephant-icon',
    iconSize: [30, 30],
  });

  return (
    <div className="h-[500px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm animate-in fade-in">
      <MapContainer center={gudalurCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {alerts.map((alert) => (
          alert.lat && alert.lng && (
            <Marker key={alert.id} position={[alert.lat, alert.lng]}>
              <Popup className="custom-popup">
                <div className="p-2 max-w-[200px]">
                  <div className="flex items-center gap-1 mb-1">
                    <span className={`h-2 w-2 rounded-full ${alert.level === 1 ? 'bg-red-500' : 'bg-orange-500'}`}></span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{alert.type}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1">{alert.area}</h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-tight">{alert.message}</p>
                  <div className="mt-2 text-[10px] text-slate-400">
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {elephantSightings.map((sighting) => (
          <React.Fragment key={sighting.id}>
            <Marker 
              position={[sighting.lat, sighting.lng]}
              icon={elephantIcon}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-slate-900 italic flex items-center gap-2">
                    🐘 Elephant Tracker 
                    {sighting.behavior?.toLowerCase().includes('aggressive') && (
                       <span className="rounded bg-red-100 px-1 py-0.5 text-[8px] font-black text-red-600 uppercase">Warning</span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Herd Size: <span className="font-bold text-slate-900">{sighting.herdSize}</span></p>
                  <p className="text-xs text-slate-500">Behavior: <span className="font-bold text-slate-900">{sighting.behavior || 'Searching for food'}</span></p>
                  <p className="text-xs text-slate-500">Area: <span className="font-bold text-slate-900">{sighting.area}</span></p>
                  <p className="text-xs font-bold text-red-600 mt-1 border-t pt-1">
                    {new Date(sighting.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </Popup>
            </Marker>
            <Circle 
              center={[sighting.lat, sighting.lng]}
              radius={800} // 800 meters safety zone
              pathOptions={{ 
                color: sighting.behavior?.toLowerCase().includes('aggressive') ? '#ef4444' : '#10b981', 
                fillColor: sighting.behavior?.toLowerCase().includes('aggressive') ? '#ef4444' : '#10b981',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '5, 5'
              }}
            />
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};

export default AlertMap;
