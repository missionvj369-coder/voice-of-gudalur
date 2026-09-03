-- =====================================================================
-- Migration 004 — Wildlife system (incidents + sightings + voice petitions)
-- Reconciles schema.sql (enum) vs whatsapp_intake.sql (text) → unified
-- STRING + CHECK. Preserves offline-first ingestion; incidents created
-- server-side, media via Storj presign.
-- =====================================================================

-- Idempotency helper for sync: insert incident OR return existing by ref.
CREATE OR REPLACE FUNCTION upsert_wildlife_incident(
    p_source_ref     STRING,
    p_type           STRING,
    p_locality_id    STRING DEFAULT 'gudalur-town',
    p_generalized_area STRING DEFAULT 'Gudalur',
    p_lat            FLOAT8 DEFAULT NULL,
    p_lng            FLOAT8 DEFAULT NULL,
    p_urgency        STRING DEFAULT 'MEDIUM',
    p_reported_by    STRING DEFAULT 'citizen',
    p_behavior_notes STRING DEFAULT NULL,
    p_herd_size      INT DEFAULT NULL,
    p_reporter_phone STRING DEFAULT NULL,
    p_media_url      STRING DEFAULT NULL,
    p_transcript     STRING DEFAULT NULL
) RETURNS TABLE (id STRING, is_new BOOL) AS $$
DECLARE
    existing TEXT;
BEGIN
    -- Idempotent: if a source_ref was supplied, reuse it.
    IF p_source_ref IS NOT NULL THEN
        SELECT i.id INTO existing FROM wildlife_incidents i WHERE i.source_ref = p_source_ref;
        IF existing IS NOT NULL THEN
            RETURN QUERY SELECT existing, FALSE;
            RETURN;
        END IF;
    END IF;

    INSERT INTO wildlife_incidents (
        type, locality_id, generalized_area, lat, lng, urgency,
        reported_by, behavior_notes, herd_size, reporter_phone,
        media_url, transcript, source_ref
    ) VALUES (
        p_type, p_locality_id, p_generalized_area, p_lat, p_lng, p_urgency,
        p_reported_by, p_behavior_notes, p_herd_size, p_reporter_phone,
        p_media_url, p_transcript,
        CASE WHEN p_source_ref IS NOT NULL THEN p_source_ref
             ELSE 'WI-' || encode(gen_random_bytes(8), 'hex') END
    ) RETURNING id INTO existing;

    RETURN QUERY SELECT existing, TRUE;
END;
$$ LANGUAGE plpgsql;

-- Sighting insert (offline queue sync path).
CREATE OR REPLACE FUNCTION add_animal_sighting(
    p_place_name STRING,
    p_image_url STRING DEFAULT NULL,
    p_audio_url  STRING DEFAULT NULL,
    p_lat FLOAT8 DEFAULT NULL,
    p_lng FLOAT8 DEFAULT NULL,
    p_transcript STRING DEFAULT NULL,
    p_user_uid STRING DEFAULT NULL
) RETURNS STRING AS $$
DECLARE
    sid STRING;
BEGIN
    INSERT INTO animal_sightings (place_name, image_url, audio_url, latitude, longitude, transcript, user_uid)
    VALUES (p_place_name, p_image_url, p_audio_url, p_lat, p_lng, p_transcript, p_user_uid)
    RETURNING id INTO sid;
    RETURN sid;
END;
$$ LANGUAGE plpgsql;
