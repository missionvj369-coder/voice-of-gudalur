// ============================================
// Voice of Gudalur — Network Status Hook
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { isOnline, setupNetworkListeners } from '../services/backgroundSync';
import { getOfflineStats } from '../lib/db';

export interface NetworkStatus {
  isOnline: boolean;
  unsyncedReports: number;
  unsyncedSightings: number;
  unsyncedRecordings: number;
  totalDrafts: number;
  lastSyncTime: number | null;
}

export function useNetworkStatus(): NetworkStatus & { refreshStats: () => Promise<void> } {
  const [online, setOnline] = useState<boolean>(isOnline());
  const [stats, setStats] = useState({ unsyncedReports: 0, unsyncedSightings: 0, unsyncedRecordings: 0, totalDrafts: 0 });
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  const refreshStats = useCallback(async () => {
    try {
      const s = await getOfflineStats();
      setStats(s);
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  useEffect(() => {
    const cleanup = setupNetworkListeners(
      () => {
        setOnline(true);
        refreshStats();
      },
      () => setOnline(false)
    );
    refreshStats();
    return cleanup;
  }, [refreshStats]);

  // Listen for sync completion events
  useEffect(() => {
    const handleSyncComplete = () => {
      setLastSyncTime(Date.now());
      refreshStats();
    };
    window.addEventListener('vog-sync-complete', handleSyncComplete);
    return () => window.removeEventListener('vog-sync-complete', handleSyncComplete);
  }, [refreshStats]);

  return {
    isOnline: online,
    ...stats,
    lastSyncTime,
    refreshStats,
  };
}
