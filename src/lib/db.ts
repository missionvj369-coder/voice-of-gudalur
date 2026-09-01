import Dexie, { type Table } from 'dexie';

// Voice of Gudalur — Offline-First Database
export interface OfflineReport {
  id?: number;
  type: 'wildlife_sighting' | 'voice_petition' | 'general_report';
  title: string;
  description: string;
  lat?: number;
  lng?: number;
  localityName?: string;
  images?: string[];
  audioBlob?: Blob;
  timestamp: number;
  synced: boolean;
  syncError?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface OfflineSighting {
  id?: number;
  animalType: string;
  count: number;
  lat: number;
  lng: number;
  locationName: string;
  sightingTime: string;
  behavior?: string;
  habitat?: string;
  images?: string[];
  audioNote?: Blob;
  verified: boolean;
  synced: boolean;
  userId?: string;
  timestamp: number;
}

export interface UserDraft {
  id?: number;
  formType: 'registration' | 'report' | 'petition';
  data: Record<string, any>;
  lastModified: number;
}

export interface OfflineVoiceRecording {
  id?: number;
  blob: Blob;
  duration: number;
  transcript?: string;
  language?: string;
  timestamp: number;
  synced: boolean;
  reportId?: number;
}

export class GudalurDB extends Dexie {
  offlineReports!: Table<OfflineReport, number>;
  offlineSightings!: Table<OfflineSighting, number>;
  userDrafts!: Table<UserDraft, number>;
  offlineVoiceRecordings!: Table<OfflineVoiceRecording, number>;

  constructor() {
    super('VoiceOfGudalurDB');
    this.version(1).stores({
      offlineReports: '++id, type, synced, timestamp, userId',
      offlineSightings: '++id, animalType, synced, timestamp, userId',
      userDrafts: '++id, formType, lastModified',
      offlineVoiceRecordings: '++id, synced, timestamp, reportId',
    });
  }
}

export const gudalurDB = new GudalurDB();

// Report Operations
export async function saveOfflineReport(report: Omit<OfflineReport, 'id' | 'synced' | 'timestamp'>): Promise<number> {
  return await gudalurDB.offlineReports.add({ ...report, synced: false, timestamp: Date.now() });
}

export async function getUnsyncedReports(): Promise<OfflineReport[]> {
  return await gudalurDB.offlineReports.where('synced').equals(0).toArray();
}

export async function markReportSynced(id: number): Promise<void> {
  await gudalurDB.offlineReports.update(id, { synced: true, syncError: undefined });
}

export async function updateReportSyncError(id: number, error: string): Promise<void> {
  await gudalurDB.offlineReports.update(id, { syncError: error });
}

// Sighting Operations
export async function saveOfflineSighting(sighting: Omit<OfflineSighting, 'id' | 'synced' | 'timestamp'>): Promise<number> {
  return await gudalurDB.offlineSightings.add({ ...sighting, synced: false, timestamp: Date.now() });
}

export async function getUnsyncedSightings(): Promise<OfflineSighting[]> {
  return await gudalurDB.offlineSightings.where('synced').equals(0).toArray();
}

export async function markSightingSynced(id: number): Promise<void> {
  await gudalurDB.offlineSightings.update(id, { synced: true });
}

// Draft Operations
export async function saveDraft(formType: UserDraft['formType'], data: Record<string, any>): Promise<void> {
  const existing = await gudalurDB.userDrafts.where('formType').equals(formType).first();
  if (existing?.id) {
    await gudalurDB.userDrafts.update(existing.id, { data, lastModified: Date.now() });
  } else {
    await gudalurDB.userDrafts.add({ formType, data, lastModified: Date.now() });
  }
}

export async function getDraft(formType: UserDraft['formType']): Promise<UserDraft | undefined> {
  return await gudalurDB.userDrafts.where('formType').equals(formType).first();
}

export async function clearDraft(formType: UserDraft['formType']): Promise<void> {
  await gudalurDB.userDrafts.where('formType').equals(formType).delete();
}

// Voice Recording Operations
export async function saveOfflineRecording(recording: Omit<OfflineVoiceRecording, 'id' | 'synced' | 'timestamp'>): Promise<number> {
  return await gudalurDB.offlineVoiceRecordings.add({ ...recording, synced: false, timestamp: Date.now() });
}

export async function getUnsyncedRecordings(): Promise<OfflineVoiceRecording[]> {
  return await gudalurDB.offlineVoiceRecordings.where('synced').equals(0).toArray();
}

// Stats
export async function getOfflineStats(): Promise<{ unsyncedReports: number; unsyncedSightings: number; unsyncedRecordings: number; totalDrafts: number }> {
  const [unsyncedReports, unsyncedSightings, unsyncedRecordings, totalDrafts] = await Promise.all([
    gudalurDB.offlineReports.where('synced').equals(0).count(),
    gudalurDB.offlineSightings.where('synced').equals(0).count(),
    gudalurDB.offlineVoiceRecordings.where('synced').equals(0).count(),
    gudalurDB.userDrafts.count(),
  ]);
  return { unsyncedReports, unsyncedSightings, unsyncedRecordings, totalDrafts };
}

export async function clearAllSyncedData(): Promise<void> {
  await gudalurDB.offlineReports.where('synced').equals(1).delete();
  await gudalurDB.offlineSightings.where('synced').equals(1).delete();
  await gudalurDB.offlineVoiceRecordings.where('synced').equals(1).delete();
}
