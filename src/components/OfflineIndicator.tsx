// Voice of Gudalur — Offline Status Indicator
import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { syncAllData } from '../services/backgroundSync';
import { useLanguage } from '../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, unsyncedReports, unsyncedSightings, refreshStats } = useNetworkStatus();
  const { lang } = useLanguage();
  const [syncing, setSyncing] = React.useState(false);
  const totalUnsynced = unsyncedReports + unsyncedSightings;

  const handleManualSync = async () => {
    setSyncing(true);
    try { await syncAllData(); await refreshStats(); } finally { setSyncing(false); }
  };

  if (isOnline && totalUnsynced === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50">
      <div className={`rounded-2xl shadow-lg border p-3 ${isOnline ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isOnline ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold ${isOnline ? 'text-amber-800' : 'text-red-800'}`}>
              {isOnline ? 'Pending Sync' : (lang === 'ta' ? 'ஆஃப்லைன் பயன்முறை' : 'Offline Mode')}
            </p>
            <p className={`text-xs ${isOnline ? 'text-amber-600' : 'text-red-600'}`}>
              {isOnline ? `${totalUnsynced} unsaved` : 'Local storage active'}
            </p>
          </div>
          {isOnline && totalUnsynced > 0 && (
            <button onClick={handleManualSync} disabled={syncing} className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700">
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const OfflineBadge: React.FC = () => {
  const { isOnline, unsyncedReports, unsyncedSightings } = useNetworkStatus();
  const totalUnsynced = unsyncedReports + unsyncedSightings;
  if (isOnline && totalUnsynced === 0) return null;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
      {isOnline ? <><Wifi size={10} /><span>{totalUnsynced}</span></> : <><WifiOff size={10} /><span>OFFLINE</span></>}
    </div>
  );
};

