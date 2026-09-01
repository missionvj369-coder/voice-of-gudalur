// Voice of Gudalur — Offline Alert Map
// Shows cached danger zones with stale-data warnings; works fully offline.
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, MapPin, Wifi, WifiOff, RefreshCw, Navigation } from 'lucide-react';
import { gudalurDB, OfflineSighting } from '../lib/db';
import { useOfflineProximity, ProximityAlert, getSeverityColor, getSeverityEmoji } from '../hooks/useOfflineProximity';
import { useLanguage } from '../context/LanguageContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface Props {
  height?: string;
  showControls?: boolean;
  onAlertClick?: (alert: ProximityAlert) => void;
}

export const OfflineAlertMap: React.FC<Props> = ({ height = '400px', showControls = true, onAlertClick }) => {
  const { lang } = useLanguage();
  const { isOnline } = useNetworkStatus();
  const [sightings, setSightings] = useState<OfflineSighting[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { isWatching, currentPosition, alerts, nearestDanger, startWatching, stopWatching, refreshAlerts } =
    useOfflineProximity({ enabled: true, dangerRadiusKm: 5, staleThresholdHours: 24, checkIntervalMs: 30000 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gudalurDB.offlineSightings.toArray();
      setSightings(data);
      if (data.length > 0) setLastSync(data.reduce((a, b) => (a.timestamp > b.timestamp ? a : b)).timestamp);
    } catch { /* db not ready */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const h = () => loadData();
    window.addEventListener('vog-peer-sync', h);
    window.addEventListener('vog-peer-alert', h);
    return () => {
      window.removeEventListener('vog-peer-sync', h);
      window.removeEventListener('vog-peer-alert', h);
    };
  }, [loadData]);

  const ago = (ts: number) => {
    const hrs = Math.floor((Date.now() - ts) / 3600000);
    if (hrs < 1) return lang === 'ta' ? 'சற்று முன்' : 'Just now';
    if (hrs < 24) return hrs + 'h ' + (lang === 'ta' ? 'முன்' : 'ago');
    return Math.floor(hrs / 24) + 'd ' + (lang === 'ta' ? 'முன்' : 'ago');
  };

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white" style={{ height }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi size={16} className="text-emerald-600" /> : <WifiOff size={16} className="text-red-600" />}
            <span className="text-xs font-bold text-slate-800">
              {isOnline ? (lang === 'ta' ? 'நேரடி வரைபடம்' : 'Live Alert Map') : (lang === 'ta' ? 'ஆஃப்லைன் வரைபடம்' : 'Offline Alert Map')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastSync && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock size={10} />
                {ago(lastSync)}
              </span>
            )}
            <button onClick={refreshAlerts} aria-label="Refresh alerts" className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Stale data warning */}
      {!isOnline && (
        <div className="absolute top-12 left-0 right-0 z-10 bg-amber-50 border-b border-amber-200 px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={12} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-800">
              {lang === 'ta' ? '⚠️ தரவு காலாவதியானது' : '⚠️ Data may be outdated'}
            </span>
          </div>
        </div>
      )}

      {/* Cached sightings summary */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center">
        {loading ? (
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="text-center p-4">
            <MapPin size={48} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-sm font-bold text-slate-800">
              {sightings.length} {lang === 'ta' ? 'பதிவுகள்' : 'cached sightings'}
            </p>
            {currentPosition && (
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Navigation size={10} />
                {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Nearest danger banner */}
      {nearestDanger && (
        <div className="absolute top-20 left-2 right-2 z-20">
          <div className={'rounded-xl p-3 shadow-lg text-white ' + (nearestDanger.severity === 'critical' ? 'bg-red-600' : 'bg-orange-600')}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} />
              <div>
                <p className="text-sm font-bold">
                  {nearestDanger.severity === 'critical' ? '🚨 CRITICAL' : '⚠️ DANGER'}: {nearestDanger.sighting.animalType.toUpperCase()}
                </p>
                <p className="text-xs opacity-90">
                  {nearestDanger.distanceKm}km {nearestDanger.direction} • {ago(nearestDanger.sighting.timestamp)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerts list */}
      {alerts.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-t border-slate-200 max-h-48 overflow-y-auto">
          <div className="p-2 space-y-1">
            {alerts.slice(0, 5).map((a, i) => (
              <button key={i} onClick={() => onAlertClick?.(a)} className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 transition text-left">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getSeverityColor(a.severity) }}>
                  {getSeverityEmoji(a.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {a.sighting.animalType.toUpperCase()} — {a.distanceKm}km {a.direction}
                  </p>
                  <p className="text-xs text-slate-500">
                    {a.isStale ? '⚠️ ' + Math.round(a.ageHours) + 'h old' : ago(a.sighting.timestamp)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* GPS watch toggle */}
      {showControls && (
        <div className="absolute top-12 right-2 z-10 flex flex-col gap-1">
          <button
            onClick={isWatching ? stopWatching : startWatching}
            aria-label={isWatching ? 'Stop location watch' : 'Start location watch'}
            className={'p-2 rounded-xl shadow-lg ' + (isWatching ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700')}
          >
            <Navigation size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default OfflineAlertMap;