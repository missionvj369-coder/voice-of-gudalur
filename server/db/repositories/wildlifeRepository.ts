/**
 * Voice of Gudalur — Wildlife data repository (Phase 9).
 *
 * Preserves the offline-first behavior:
 *   IndexedDB → sync queue → API → CockroachDB transaction.
 *
 * Sync is idempotent: repeated attempts do not create duplicate incidents.
 * Deduplication via client idempotencyKey OR server source_ref.
 */
import { db } from '../client';
import { parseIdemResponse } from '../idempotency';

export interface WildlifeIncidentInput {
  type: string;
  localityId?: string;
  generalizedArea?: string;
  lat?: number; lng?: number;
  urgency?: string; reportedBy?: string;
  behaviorNotes?: string; herdSize?: number;
  reporterPhone?: string; mediaUrl?: string; transcript?: string;
  idempotencyKey?: string;
}

export type SyncedIncident = { id: string; isNew: boolean };

/** Upsert an incident with idempotency. Safe to call repeatedly. */
export async function upsertWildlifeIncident(input: WildlifeIncidentInput): Promise<SyncedIncident> {
  return db.withTransaction<SyncedIncident>(async (tx) => {
    if (input.idempotencyKey) {
      const resp = await tx.queryOne<{ response: string | Record<string, unknown> | null }>(
        `SELECT response FROM sync_idempotency WHERE idempotency_key = $1 AND kind = 'incident'`,
        [input.idempotencyKey],
      );
      const parsed = parseIdemResponse<{ id: string }>(resp?.response);
      if (parsed?.id) return { id: String(parsed.id), isNew: false };
    }

    const result = await tx.query<{ id: string }>(
      `INSERT INTO wildlife_incidents
         (type, locality_id, generalized_area, lat, lng, urgency, reported_by,
          behavior_notes, herd_size, reporter_phone, media_url, transcript, source_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
               'WI-' || encode(gen_random_bytes(8), 'hex'))
       RETURNING id`,
      [input.type,
       input.localityId ?? 'gudalur-town',
       input.generalizedArea ?? 'Gudalur',
       input.lat ?? null, input.lng ?? null,
       input.urgency ?? 'MEDIUM',
       input.reportedBy ?? 'citizen',
       input.behaviorNotes ?? null, input.herdSize ?? null,
       input.reporterPhone ?? null, input.mediaUrl ?? null,
       input.transcript ?? null],
    );
    const id = result.rows[0]?.id;

    if (input.idempotencyKey) {
      const response = JSON.stringify({ id });
      await tx.query(
        'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1,$2,$3) ON CONFLICT(idempotency_key) DO NOTHING',
        [input.idempotencyKey, 'incident', response],
      );
    }
        return { id, isNew: true };
  });
}

export interface AnimalSightingInput {
  placeName: string; imageUrl?: string; audioUrl?: string;
  lat?: number; lng?: number; transcript?: string; userUid?: string;
  sightingTime?: string;          // ISO timestamp reported by the citizen
  idempotencyKey?: string;
}

/** Idempotent sighting creation. */
export async function upsertAnimalSighting(input: AnimalSightingInput): Promise<{ id: string; isNew: boolean }> {
  return db.withTransaction<{ id: string; isNew: boolean }>(async (tx) => {
    if (input.idempotencyKey) {
      const resp = await tx.queryOne<{ response: string | Record<string, unknown> | null }>(
        `SELECT response FROM sync_idempotency WHERE idempotency_key = $1 AND kind = 'sighting'`,
        [input.idempotencyKey],
      );
      const parsed = parseIdemResponse<{ id: string }>(resp?.response);
      if (parsed?.id) return { id: String(parsed.id), isNew: false };
    }

    const result = await tx.query<{ id: string }>(
      `INSERT INTO animal_sightings
         (place_name, sighting_time, image_url, audio_url, latitude, longitude, transcript, user_uid, source_ref)
       VALUES ($1, COALESCE($2::timestamptz, now()), $3, $4, $5, $6, $7, $8,
               'ST-' || encode(gen_random_bytes(8), 'hex'))
       RETURNING id`,
      [input.placeName, input.sightingTime ?? null, input.imageUrl ?? null, input.audioUrl ?? null,
       input.lat ?? null, input.lng ?? null, input.transcript ?? null,
       input.userUid ?? null],
    );
    const id = result.rows[0]?.id;

    if (input.idempotencyKey) {
      const response = JSON.stringify({ id });
      await tx.query(
        'INSERT INTO sync_idempotency(idempotency_key, kind, response) VALUES ($1,$2,$3) ON CONFLICT(idempotency_key) DO NOTHING',
        [input.idempotencyKey, 'sighting', response],
      );
    }
    return { id, isNew: true };
  });
}

/** List recent incidents (map + toast surfaces). */
export async function listIncidents(limit = 100) {
  return db.query(
    `SELECT id, type, locality_id, generalized_area, lat, lng, urgency,
            reported_by, verified_by_forest_dept, timestamp, media_url,
            behavior_notes, herd_size, transcript
     FROM wildlife_incidents ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

/** List recent animal sightings (GIS map + proximity surfaces). */
export async function listAnimalSightings(limit = 100) {
  return db.query(
    `SELECT id, place_name, sighting_time, image_url, audio_url, latitude,
            longitude, transcript, is_verified, user_uid
     FROM animal_sightings ORDER BY sighting_time DESC LIMIT $1`,
    [limit],
  );
}

/** List recent community voice petitions (soundboard + GIS map). */
export async function listVoicePetitions(limit = 50) {
  return db.query(
    `SELECT id, place_name, language, transcript, audio_url, speaker_name,
            latitude, longitude, created_at
     FROM voice_petitions ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

/** Create a community voice petition (server-side; audio lives in Storj). */
export async function addVoicePetition(input: {
  placeName: string; language?: string; audioUrl?: string;
  transcript?: string; speakerName?: string; lat?: number; lng?: number;
  userUid?: string;
}): Promise<{ id: string }> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO voice_petitions (place_name, language, audio_url, transcript, speaker_name, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [input.placeName, input.language ?? 'en', input.audioUrl ?? null, input.transcript ?? null,
     input.speakerName ?? 'Resident', input.lat ?? null, input.lng ?? null],
  );
  return { id: result.rows[0]?.id };
}

/** Nearby sightings for LiveGisMap (bounding box + haversine refinement). */
export async function listNearbySightings(lat: number, lng: number, radiusKm = 25) {
  const latDeg = radiusKm / 111.32;
  const lngDeg = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const sql = `
    SELECT id, place_name, sighting_time, image_url, audio_url, latitude, longitude,
           transcript, is_verified
    FROM animal_sightings
    WHERE latitude  BETWEEN $1 AND $2
      AND longitude BETWEEN $3 AND $4
    ORDER BY sighting_time DESC LIMIT 200`;
  const res = await db.query(sql, [lat - latDeg, lat + latDeg, lng - lngDeg, lng + lngDeg]);
  const R = 6371;
  return res.rows.filter((r: any) => {
    const a = Math.sin(((r.latitude - lat) * Math.PI) / 360) ** 2
      + Math.cos((lat * Math.PI) / 180) * Math.cos((r.latitude * Math.PI) / 180)
      * Math.sin(((r.longitude - lng) * Math.PI) / 360) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c <= radiusKm;
  });
}

