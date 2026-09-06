/**
 * Voice of Gudalur — Wildlife routes (Phase 9).
 *
 * Offline-first: the PWA queues incident/sighting submissions in IndexedDB,
 * then POSTs them here with an idempotency key. Repeated syncs never create
 * duplicates.
 *
 * POST /api/wildlife/incident     — create incident (idempotent)
 * POST /api/wildlife/sighting     — create animal sighting (idempotent)
 * GET  /api/wildlife/incidents    — recent incidents (map/toast)
 * GET  /api/wildlife/sightings/nearby?lat=..&lng=..
 * POST /api/offline/sync          — bulk idempotent sync from the offline queue
 */
import { Router, Request, Response } from 'express';
import {
  upsertWildlifeIncident, upsertAnimalSighting, listIncidents, listNearbySightings,
} from '../db/repositories/wildlifeRepository';
import { requireAuth, requireRole, logAudit } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

/** POST /api/wildlife/incident */
router.post('/incident', async (req: Request, res: Response) => {
  try {
    const result = await upsertWildlifeIncident({
      type: req.body.type,
      localityId: req.body.localityId,
      generalizedArea: req.body.generalizedArea,
      lat: req.body.lat, lng: req.body.lng,
      urgency: req.body.urgency, reportedBy: req.body.reportedBy,
      behaviorNotes: req.body.behaviorNotes, herdSize: req.body.herdSize,
      reporterPhone: req.body.reporterPhone, mediaUrl: req.body.mediaUrl,
      transcript: req.body.transcript,
      idempotencyKey: req.body.idempotencyKey,
    });
    await logAudit({
      actorId: req.user?.uid, actorKind: req.user ? 'user' : 'system',
      action: 'RECORD_INCIDENT', target: 'wildlife_incidents',
      detail: { id: result.id, isNew: result.isNew, type: req.body.type },
      ip: req.ip,
    });
    res.status(result.isNew ? 201 : 200).json({ id: result.id, isNew: result.isNew });
  } catch (e: any) {
    logger.error('wildlife incident:', e.message);
    res.status(500).json({ error: 'Could not record incident' });
  }
});

/** POST /api/wildlife/sighting */
router.post('/sighting', async (req: Request, res: Response) => {
  try {
    const result = await upsertAnimalSighting({
      placeName: req.body.placeName,
      sightingTime: req.body.sightingTime,
      imageUrl: req.body.imageUrl, audioUrl: req.body.audioUrl,
      lat: req.body.lat, lng: req.body.lng,
      transcript: req.body.transcript,
      userUid: req.user?.uid,
      idempotencyKey: req.body.idempotencyKey,
    });
    res.status(result.isNew ? 201 : 200).json({ id: result.id, isNew: result.isNew });
  } catch (e: any) {
    logger.error('sighting:', e.message);
    res.status(500).json({ error: 'Could not record sighting' });
  }
});

/** GET /api/wildlife/incidents */
router.get('/incidents', async (_req: Request, res: Response) => {
  const rows = await listIncidents(100);
  res.json({ incidents: rows.rows });
});

/** GET /api/wildlife/sightings — recent sightings (GIS map). */
router.get('/sightings', async (_req: Request, res: Response) => {
  const { listAnimalSightings } = await import('../db/repositories/wildlifeRepository');
  const rows = await listAnimalSightings(100);
  res.json({ sightings: rows.rows });
});

/** GET /api/wildlife/voice — community voice petitions (soundboard + map). */
router.get('/voice', async (_req: Request, res: Response) => {
  const { listVoicePetitions } = await import('../db/repositories/wildlifeRepository');
  const rows = await listVoicePetitions(50);
  res.json({ petitions: rows.rows });
});

/** POST /api/wildlife/voice — publish a voice petition (auth; audio via Storj). */
router.post('/voice', requireAuth, async (req: Request, res: Response) => {
  try {
    const { addVoicePetition } = await import('../db/repositories/wildlifeRepository');
    const user = req.user!;
    const result = await addVoicePetition({
      // National movement: the place ALWAYS comes from the supporter's own
      // typed address / live GPS — never a hard-coded "Gudalur" default that
      // would mis-attribute a sign-up from any other district of India.
      placeName: req.body.placeName || user.localityName || '',
      language: req.body.language,
      audioUrl: req.body.audioUrl,
      transcript: req.body.transcript,
      speakerName: user.name,
      lat: req.body.lat,
      lng: req.body.lng,
      userUid: user.uid,
    });
    await logAudit({ actorId: user.uid, actorKind: 'user', action: 'ADD_VOICE_PETITION', target: `voice_petitions/${result.id}`, ip: req.ip });
    res.status(201).json(result);
  } catch (e: any) {
    logger.error('voice petition:', e.message);
    res.status(500).json({ error: 'Could not publish voice petition' });
  }
});

/** GET /api/wildlife/sightings/nearby?lat=..&lng=..&radiusKm=25 */
router.get('/sightings/nearby', async (req: Request, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return res.status(400).json({ error: 'lat and lng query params required' });
  }
  const radiusKm = Number(req.query.radiusKm ?? 25);
  const rows = await listNearbySightings(lat, lng, radiusKm);
  res.json({ sightings: rows });
});

/** POST /api/offline/sync — idempotent bulk sync from the offline queue. */
router.post('/offline/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const items: Array<{ type: 'incident' | 'sighting'; data: any }> = req.body?.items ?? [];
    const results: Array<{ id: string; isNew: boolean; type: string }> = [];
    for (const item of items) {
      if (item.type === 'incident') {
        const r = await upsertWildlifeIncident({ ...item.data, idempotencyKey: item.data.idempotencyKey });
        results.push({ id: r.id, isNew: r.isNew, type: 'incident' });
      } else if (item.type === 'sighting') {
        const r = await upsertAnimalSighting({ ...item.data, userUid: user.uid, idempotencyKey: item.data.idempotencyKey });
        results.push({ id: r.id, isNew: r.isNew, type: 'sighting' });
      }
    }
    res.json({ results });
  } catch (e: any) {
    logger.error('offline sync:', e.message);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
