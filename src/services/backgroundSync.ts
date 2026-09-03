// ============================================
// Voice of Gudalur — Background Sync Service
// Queues offline reports/sightings in IndexedDB and syncs them when online.
// All writes go through the CockroachDB-backed API (no Supabase). Repeated
// syncs are idempotent — the API dedupes via client idempotency keys.
// ============================================

import { getUnsyncedReports, markReportSynced, updateReportSyncError, getUnsyncedSightings, markSightingSynced } from '../lib/db';
import { wildlifeApi } from './api';

export interface SyncResult {
  success: boolean;
  syncedReports: number;
  syncedSightings: number;
  syncedRecordings: number;
  errors: string[];
}

// Register a sync event with the Service Worker
export async function registerBackgroundSync(tag: string = 'sync-reports'): Promise<void> {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('[BackgroundSync] Registered:', tag);
    }
  } catch (err) {
    console.warn('[BackgroundSync] Registration failed:', err);
  }
}

// Listen for sync events from Service Worker
export function setupBackgroundSyncListeners(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SYNC_COMPLETE') {
      console.log('[BackgroundSync] Sync completed:', event.data.result);
      window.dispatchEvent(new CustomEvent('vog-sync-complete', { detail: event.data.result }));
    }
    if (event.data?.type === 'SYNC_ERROR') {
      console.error('[BackgroundSync] Sync error:', event.data.error);
      window.dispatchEvent(new CustomEvent('vog-sync-error', { detail: event.data.error }));
    }
  });
}

// Main sync function — processes all unsynced data
export async function syncAllData(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    syncedReports: 0,
    syncedSightings: 0,
    syncedRecordings: 0,
    errors: [],
  };

  // Sync reports → wildlife incidents (idempotent)
  try {
    const unsyncedReports = await getUnsyncedReports();
    for (const report of unsyncedReports) {
      try {
        await syncSingleReport(report);
        if (report.id) await markReportSynced(report.id);
        result.syncedReports++;
      } catch (err: any) {
        if (report.id) await updateReportSyncError(report.id, err.message);
        result.errors.push(`Report ${report.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Reports sync: ${err.message}`);
  }

  // Sync sightings (idempotent)
  try {
    const unsyncedSightings = await getUnsyncedSightings();
    for (const sighting of unsyncedSightings) {
      try {
        await syncSingleSighting(sighting);
        if (sighting.id) await markSightingSynced(sighting.id);
        result.syncedSightings++;
      } catch (err: any) {
        result.errors.push(`Sighting ${sighting.id}: ${err.message}`);
      }
    }
  } catch (err: any) {
    result.errors.push(`Sightings sync: ${err.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

async function syncSingleReport(report: any): Promise<void> {
  await wildlifeApi.reportIncident({
    type: report.type || 'other',
    generalizedArea: report.localityName,
    lat: report.lat,
    lng: report.lng,
    behaviorNotes: report.description,
    reportedBy: report.userId ? 'citizen' : 'anonymous',
    idempotencyKey: `report-${report.id || `ts-${report.timestamp}`}`,
  });
}

async function syncSingleSighting(sighting: any): Promise<void> {
  // Map OfflineSighting → AnimalSightingRow schema (place_name/latitude/longitude/transcript)
  const transcriptParts = [String(sighting.animalType || 'animal').toUpperCase()];
  if (sighting.count && sighting.count > 1) transcriptParts.push(`count: ${sighting.count}`);
  if (sighting.behavior) transcriptParts.push(`behavior: ${sighting.behavior}`);
  if (sighting.habitat) transcriptParts.push(`habitat: ${sighting.habitat}`);
  await wildlifeApi.reportSighting({
    placeName: sighting.locationName || 'Gudalur',
    sightingTime: new Date(sighting.sightingTime || sighting.timestamp).toISOString(),
    lat: sighting.lat,
    lng: sighting.lng,
    transcript: transcriptParts.join(' | '),
    idempotencyKey: `sighting-${sighting.id || `ts-${sighting.timestamp}`}`,
  });
}

// Network status detection
export function setupNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

// Periodic sync trigger (fallback if Background Sync API unavailable)
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startPeriodicSync(intervalMs: number = 30000): void {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    if (isOnline()) {
      await syncAllData();
    }
  }, intervalMs);
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}