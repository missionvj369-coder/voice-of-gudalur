/**
 * ProximityAlertProvider.tsx
 * Monitors user location against wildlife sightings and triggers alerts.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { calculateDistanceKm, formatProximityWarning, playEmergencyAlertSound, sendBrowserWildlifeNotification } from '../utils/geoUtils';
import { supabase } from '../lib/supabase';
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
      const { data } = await supabase.from('animal_sightings').select('*').order('reported_at', { ascending: false }).limit(50);
      if (!data) return;
      const newAlerts: ProximityAlert[] = [];
      data.forEach(s => {
        const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng);
        if (dist <= 10) {
          const warning = formatProximityWarning(dist, lang === 'ta' ? 'ta' : 'en');
          const alert: ProximityAlert = {
            id: s.id,
            species: s.species,
            location: s.location_name || `${dist.toFixed(1)} km away`,
            distanceKm: dist,
            severity: warning.severity,
            label: warning.label,
            color: warning.color,
            reportedAt: s.reported_at,
          };
          if (!acknowledgedRef.current.has(s.id)) {
            newAlerts.push(alert);
            // Trigger sound and notification for critical/warning alerts
            if (dist <= 3 && warning.severity !== 'SAFE') {
              playEmergencyAlertSound();
              sendBrowserWildlifeNotification(
                `🚨 ${s.species} Sighting Nearby`,
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
    const interval = setInterval(fetchAndCheckProximity, 30000); // Check every 30s
    const ch = supabase.channel('proximity_alerts').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animal_sightings' }, fetchAndCheckProximity).subscribe();
    return () => { supabase.removeChannel(ch); clearInterval(interval); setIsMonitoring(false); };
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