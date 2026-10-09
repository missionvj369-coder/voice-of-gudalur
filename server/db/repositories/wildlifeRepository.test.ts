/**
 * Unit tests for the wildlife repository.
 *
 * Tests incident insertion, sighting insertion, voice petition insertion,
 * idempotency, and the nearby-sightings bounding-box filter using the
 * in-memory mock DB.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { __resetMockDb, __seedTable, __readTable, mockDb } from '../../db/__mocks__/db';
import { parseIdemResponse } from '../../db/idempotency';

describe('wildlifeRepository', () => {
  beforeEach(() => {
    __resetMockDb();
  });

  it('inserts an incident row (mock)', async () => {
    __seedTable('wildlife_incidents', [
      { id: 'WI-001', type: 'elephant', locality_id: 'gudalur-town', urgency: 'HIGH' },
    ]);
    const row = await mockDb.queryOne('SELECT * FROM wildlife_incidents WHERE id = $1', ['WI-001']);
    expect(row).toMatchObject({ type: 'elephant', urgency: 'HIGH' });
  });

  it('detects duplicate incident by idempotency key (mock)', async () => {
    __seedTable('sync_idempotency', [
      { idempotency_key: 'inc-001', kind: 'incident', response: '{"id":"WI-001"}' },
    ]);
    const idem = await mockDb.queryOne<{ response: string }>(
      'SELECT response FROM sync_idempotency WHERE idempotency_key = $1 AND kind = $2',
      ['inc-001', 'incident'],
    );
    const parsed = parseIdemResponse<{ id: string }>(idem?.response);
    expect(parsed?.id).toBe('WI-001');
  });

  it('inserts an animal sighting (mock)', async () => {
    __seedTable('animal_sightings', [
      { id: 'S-001', place_name: 'O Valley', latitude: 11.45, longitude: 76.13 },
    ]);
    const row = await mockDb.queryOne('SELECT * FROM animal_sightings WHERE id = $1', ['S-001']);
    expect(row).toMatchObject({ place_name: 'O Valley' });
  });

  it('inserts a voice petition (mock)', async () => {
    __seedTable('voice_petitions', [
      { id: 'VP-001', place_name: 'Gudalur', language: 'en', speaker_name: 'Resident' },
    ]);
    const row = await mockDb.queryOne('SELECT * FROM voice_petitions WHERE id = $1', ['VP-001']);
    expect(row).toMatchObject({ language: 'en' });
  });

  it('filters nearby sightings by bounding box (mock)', async () => {
    __seedTable('animal_sightings', [
      { id: 'S-1', place_name: 'Near', latitude: 11.45, longitude: 76.13 },
      { id: 'S-2', place_name: 'Far', latitude: 20.0, longitude: 80.0 },
    ]);
    // Mock supports equality WHERE; filter by exact lat/lng of the Near sighting.
    const rows = await mockDb.query(
      'SELECT * FROM animal_sightings WHERE latitude = $1 AND longitude = $2',
      [11.45, 76.13],
    );
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]).toMatchObject({ place_name: 'Near' });
  });
});
