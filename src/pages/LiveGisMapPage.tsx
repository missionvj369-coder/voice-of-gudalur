/**
 * LiveGisMapPage.tsx
 * Full-page view for the GIS conflict map.
 */
import React, { useState } from 'react';
import { LiveGisMap } from '../components/LiveGisMap';
import { OfflineAlertMap } from '../components/OfflineAlertMap';
import { useAuth } from '../context/AuthContext';
import { useProximityAlerts } from '../context/ProximityAlertProvider';
import { X, AlertTriangle } from 'lucide-react';

export const LiveGisMapPage: React.FC = () => {
  const { userCoords } = useAuth();
  const { alerts, acknowledgeAlert } = useProximityAlerts();
  const [showAlertBanner, setShowAlertBanner] = useState(true);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Active Proximity Alerts Banner */}
      {alerts.length > 0 && showAlertBanner && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border-2 border-red-200 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-bold text-red-800 text-sm">Active Proximity Alerts ({alerts.length})</h3>
            <ul className="mt-2 space-y-1">
              {alerts.slice(0, 3).map(a => (
                <li key={a.id} className="flex items-center justify-between text-xs text-red-700">
                  <span><strong>{a.species}</strong> — {a.distanceKm.toFixed(1)} km away ({a.location})</span>
                  <button onClick={() => acknowledgeAlert(a.id)} className="text-red-500 hover:text-red-700 underline">Dismiss</button>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => setShowAlertBanner(false)} className="text-red-400 hover:text-red-600"><X size={18} /></button>
        </div>
      )}
      <LiveGisMap userCoords={userCoords} />

      {/* Offline-capable alert map — only lives on this page, not globally */}
      <div className="mt-6">
        <OfflineAlertMap height="360px" showControls={true} />
      </div>
    </div>
  );
};