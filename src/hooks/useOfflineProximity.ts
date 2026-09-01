// ============================================
// Voice of Gudalur — Offline Proximity Watch
// Background GPS monitoring for cached danger zones
// Works completely offline using cached sightings
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { gudalurDB, OfflineSighting } from '../lib/db';

export type AlertSeverity = 'safe' | 'caution' | 'danger' | 'critical';

export interface ProximityAlert {
  sighting: OfflineSighting;
  distanceKm: number;
  severity: AlertSeverity;
  direction: string;
  bearing: number;
  isStale: boolean;
  ageHours: number;
}

export interface ProximityWatchOptions {
  enabled?: boolean;
  dangerRadiusKm?: number;
  staleThresholdHours?: number;
  highDangerAnimals?: string[];
  checkIntervalMs?: number;
}

export interface ProximityWatchState {
  isWatching: boolean;
  currentPosition: { lat: number; lng: number } | null;
  alerts: ProximityAlert[];
  nearestDanger: ProximityAlert | null;
  lastCheckTime: number | null;
  error: string | null;
  startWatching: () => void;
  stopWatching: () => void;
  refreshAlerts: () => Promise<void>;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function bearingToDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(bearing / 45) % 8];
}

function getAlertSeverity(distanceKm: number, animalType: string, isStale: boolean, highDangerAnimals: string[], dangerRadiusKm: number): AlertSeverity {
  const isHighDanger = highDangerAnimals.includes(animalType.toLowerCase());
  if (distanceKm < 1 && isHighDanger) return 'critical';
  if (distanceKm < 2 && isHighDanger) return 'danger';
  if (distanceKm < dangerRadiusKm && isHighDanger) return 'caution';
  if (distanceKm < 1) return 'danger';
  if (distanceKm < dangerRadiusKm / 2) return 'caution';
  return 'safe';
}

export function useOfflineProximity(options: ProximityWatchOptions = {}): ProximityWatchState {
  const {
    enabled = true,
    dangerRadiusKm = 5,
    staleThresholdHours = 24,
    highDangerAnimals = ['tiger', 'leopard', 'bear', 'elephant'],
    checkIntervalMs = 30000,
  } = options;

  const [isWatching, setIsWatching] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [alerts, setAlerts] = useState<ProximityAlert[]>([]);
  const [nearestDanger, setNearestDanger] = useState<ProximityAlert | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkProximity = useCallback(async (lat: number, lng: number) => {
    try {
      const sightings = await gudalurDB.offlineSightings.toArray();
      const proximityAlerts: ProximityAlert[] = [];
      
      for (const sighting of sightings) {
        if (!sighting.lat || !sighting.lng) continue;
        const distanceKm = haversineDistance(lat, lng, sighting.lat, sighting.lng);
        if (distanceKm <= dangerRadiusKm) {
          const ageHours = (Date.now() - sighting.timestamp) / (1000 * 60 * 60);
          const isStale = ageHours > staleThresholdHours;
          const bearing = calculateBearing(lat, lng, sighting.lat, sighting.lng);
          const severity = getAlertSeverity(distanceKm, sighting.animalType, isStale, highDangerAnimals, dangerRadiusKm);
          proximityAlerts.push({
            sighting,
            distanceKm: Math.round(distanceKm * 100) / 100,
            severity,
            direction: bearingToDirection(bearing),
            bearing,
            isStale,
            ageHours: Math.round(ageHours * 10) / 10,
          });
        }
      }

      proximityAlerts.sort((a, b) => a.distanceKm - b.distanceKm);
      setAlerts(proximityAlerts);
      setLastCheckTime(Date.now());
      
      const danger = proximityAlerts.find(a => a.severity === 'danger' || a.severity === 'critical');
      setNearestDanger(danger || null);

      if (danger) {
        window.dispatchEvent(new CustomEvent('vog-proximity-alert', { detail: danger }));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [dangerRadiusKm, staleThresholdHours, highDangerAnimals]);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return; }
    setIsWatching(true);
    setError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentPosition(p);
        checkProximity(p.lat, p.lng);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: checkIntervalMs, timeout: 10000 }
    );
    intervalRef.current = setInterval(async () => {
      if (currentPosition) await checkProximity(currentPosition.lat, currentPosition.lng);
    }, checkIntervalMs);
  }, [checkProximity, checkIntervalMs, currentPosition]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsWatching(false);
  }, []);

  const refreshAlerts = useCallback(async () => {
    if (currentPosition) await checkProximity(currentPosition.lat, currentPosition.lng);
  }, [currentPosition, checkProximity]);

  useEffect(() => {
    if (enabled && !isWatching) startWatching();
    return () => { stopWatching(); };
  }, [enabled, isWatching, startWatching, stopWatching]);

  return { isWatching, currentPosition, alerts, nearestDanger, lastCheckTime, error, startWatching, stopWatching, refreshAlerts };
}

export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = { critical: '#dc2626', danger: '#f97316', caution: '#eab308', safe: '#22c55e' };
  return colors[severity];
}

export function getSeverityEmoji(severity: AlertSeverity): string {
  const emojis: Record<AlertSeverity, string> = { critical: '🚨', danger: '⚠️', caution: '⚡', safe: '✅' };
  return emojis[severity];
}

