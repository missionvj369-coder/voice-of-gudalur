/**
 * ProximityAlertProvider.tsx
 * Monitors user location against wildlife sightings and triggers alerts.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { calculateDistanceKm, formatProximityWarning, playEmergencyAlertSound, sendBrowserWildlifeNotification } from '../utils/geoUtils';
import { wildlifeApi } from '../services/api';
import { useLanguage } from './LanguageContext';
import { useAuth } from './AuthContext';

export interface ProximityAlert {
  id: string;
  species: string;
  location: string;
  distanceKm: number;
  severity: 'CRITICAL' | 'WARNING' | 'CAUTION' | 'SAFE';
  label: string;
  color: string;
  reportedAt: number;
}

interface ProximityAlertContextType {
  alerts: ProximityAlert[];
  nearestAlert: ProximityAlert | null;
  isMonitoring: boolean;
  lastChecked: number | null;
  acknowledgeAlert: (id: string) => void;
}

const ProximityAlertContext = createContext<ProximityAlertContextType>({
  alerts: [],
  nearestAlert: null,
  isMonitoring: false,
  lastChecked: null,
  acknowledgeAlert: () => {},
});

export const ProximityAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userCoords } = useAuth();
  const { lang } = useLanguage();
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const acknowledgedRef = useRef<Set<string>>(new Set());

  const fetchAndCheckProximity = useCallback(async () => {
    if (!userCoords) return;
    try {
      // Server-side bounding-box + haversine filter (CockroachDB) — the browser
      // never queries the database directly.
      const { sightings } = await wildlifeApi.nearbySightings(userCoords.lat, userCoords.lng, 10);
      if (!sightings?.length) {
        setLastChecked(Date.now());
        return;
      }
      const newAlerts: ProximityAlert[] = [];
      sightings.forEach((s: any) => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
        if (dist <= 10) {
          const warning = formatProximityWarning(dist, lang === 'ta' ? 'ta' : 'en');
          const species = (s.transcript || '').slice(0, 24) || 'Wildlife';
          const alert: ProximityAlert = {
            id: s.id,
            species,
            location: s.place_name || `${dist.toFixed(1)} km away`,
            distanceKm: dist,
            severity: warning.severity,
            label: warning.label,
            color: warning.color,
            reportedAt: s.sighting_time ? new Date(s.sighting_time).getTime() : Date.now(),
          };
          if (!acknowledgedRef.current.has(s.id)) {
            newAlerts.push(alert);
            // Trigger sound and notification for critical/warning alerts
            if (dist <= 3 && warning.severity !== 'SAFE') {
              playEmergencyAlertSound();
              sendBrowserWildlifeNotification(
                `🚨 ${species} Sighting Nearby`,
                `${dist.toFixed(1)} km from your location — ${warning.label}`,
                `wildlife-${s.id}`
              );
            }
          }
        }
      });
      setAlerts(prev => {
        const merged = [...prev, ...newAlerts.filter(a => !prev.find(p => p.id === a.id))];
        return merged.sort((a, b) => a.distanceKm - b.distanceKm);
      });
      setLastChecked(Date.now());
    } catch (e) { console.error('[ProximityAlert] Error:', e); }
  }, [userCoords, lang]);

  useEffect(() => {
    if (!userCoords) return;
    setIsMonitoring(true);
    fetchAndCheckProximity();
        // Polling replaces the removed realtime channel — sightings change rarely and the
    // provider already refreshed on a timer; no WebSocket complexity needed.
    const interval = setInterval(fetchAndCheckProximity, 30000); // Check every 30s
    return () => { clearInterval(interval); setIsMonitoring(false); };
  }, [userCoords, fetchAndCheckProximity]);

  const acknowledgeAlert = useCallback((id: string) => {
    acknowledgedRef.current.add(id);
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const nearestAlert = alerts.length > 0 ? alerts[0] : null;

  return (
    <ProximityAlertContext.Provider value={{ alerts, nearestAlert, isMonitoring, lastChecked, acknowledgeAlert }}>
      {children}
    </ProximityAlertContext.Provider>
  );
};

export const useProximityAlerts = () => useContext(ProximityAlertContext);