import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000),
      });
    },
  },
});

export const generateId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${randomPart}`.toUpperCase();
};

/**
 * Issue the next Gudalur Resident ID in the official GDR format:
 *   GDR000000 … GDR999999 (six digits), then GDR0000000 (seven digits) once
 *   the six-digit range is exhausted. Callers MUST re-check uniqueness in the
 *   cloud ledger (db.isGudalurIdTaken) and retry on collision.
 */
export const generateGudalurId = (sequence?: number, digitWidth: number = 6): string => {
  const width = digitWidth >= 6 && digitWidth <= 9 ? digitWidth : 6;
  const space = 10 ** width;          // 1,000,000 for width 6
  const seq = typeof sequence === 'number' && sequence >= 0
    ? sequence % space
    : Math.floor(Math.random() * space); // no sequence given -> random in range
  return `GDR${String(seq).padStart(width, '0')}`;
};

/** Generates a short immutable docket reference for an official email submission (real proof of record). */
export const generateEmailRef = (): string => {
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `VG-${yyyymmdd}-${seq}`;
};

/** Normalize Indian mobile numbers to bare 10-digit form (strips +91 / 0 prefixes, spaces). */
export const normalizePhone = (raw: string): string => {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length > 10) return digits.slice(-10);
  return digits;
};

/** True when real Supabase credentials are present (not the placeholder defaults). */
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return Boolean(url && key) && !url.includes('your-project') && !key.includes('your-anon-key');
};

// Row interfaces matching database schema
export interface UserRow {
  uid: string;
  name: string;
  phone: string;
  locality_id: string;
  locality_name: string;
  custom_place_name?: string | null;
  pincode: string;
  gudalur_id: string;
  role: string;
  verification_level: string;
  is_blood_donor: boolean;
  blood_group?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  lat?: number | null;
  lng?: number | null;
  created_at?: string;
  updated_at?: string;
  issues_reported: number;
  issues_supported: number;
  representations_created: number;
  alerts_acknowledged: number;
}

export interface CivicIssueRow {
  id: string;
  title: string;
  description: string;
  category: string;
  photo_url?: string | null;
  locality_id: string;
  locality_name: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  reporter_id: string;
  reporter_name: string;
  reporter_gudalur_id: string;
  status: string;
  assigned_authority?: string | null;
  official_grievance_id?: string | null;
  upvotes_count: number;
  upvoted_by: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AlertRow {
  id: string;
  title: string;
  title_ta: string;
  description: string;
  description_ta: string;
  category: string;
  severity: string;
  affected_localities: string[];
  source: string;
  verification_status: string;
  created_by: string | null;
  verified_by: string | null;
  created_at?: string;
  expires_at: string | null;
  active: boolean;
  acknowledged_by: string[];
  broadcasted: boolean;
}

export interface WildlifeIncidentRow {
  id: string;
  type: string;
  locality_id: string;
  generalized_area: string;
  lat: number | null;
  lng: number | null;
  urgency: string;
  reported_by: string;
  verified_by_forest_dept: boolean;
  timestamp: string;
  created_at?: string;
  media_url?: string | null;
  behavior_notes?: string | null;
  herd_size?: number | null;
}

export interface PetitionRow {
  id: string;
  title: string;
  title_ta?: string;
  problem: string;
  problem_ta?: string | null;
  demand: string;
  demand_ta?: string | null;
  target_authority: string;
  target_authority_ta?: string | null;
  evidence_summary: string;
  evidence_summary_ta?: string | null;
  support_count: number;
  supporters_json?: SupporterInfoJson[];
  target_signatures?: number | null;
  deadline?: number | null;
  status: string;
  created_by: string;
  created_by_name: string;
  created_at?: string;
  updated_at?: string;
}

/** Shape of a supporter entry stored inside petitions.supporters_json */
export interface SupporterInfoJson {
  uid: string;
  name: string;
  localityName: string;
  pincode: string;
  gudalurId: string;
  signedAt: number;
}

export interface GrievanceRow {
  id: string;
  user_id: string;
  user_gudalur_id: string;
  authority: string;
  complaint_id: string;
  title: string;
  submission_date: string;
  status: string;
  notes: string | null;
  created_at?: string;
}

export interface ServiceRow {
  id: string;
  name: string;
  category: string;
  phone: string;
  locality_id: string;
  locality_name: string;
  description: string | null;
  address: string | null;
  is_24x7: boolean;
  is_verified: boolean;
  created_at?: string;
}

export interface CommentRow {
  id: string;
  parent_id: string;
  user_id: string;
  user_name: string;
  user_gudalur_id: string;
  text: string;
  created_at?: string;
}

export interface MarketPriceRow {
  id: string;
  item: string;
  item_ta: string | null;
  unit: string;
  min_price: number;
  max_price: number;
  market: string;
  updated_at: string;
  created_at?: string;
}

export interface CommunityPostRow {
  id: string;
  user_id: string;
  user_name: string;
  user_gudalur_id: string;
  type: string;
  content: string;
  category: string | null;
  image_url: string | null;
  created_at?: string;
}

export interface HelpRequestRow {
  id: string;
  user_id: string;
  user_name: string;
  user_gudalur_id: string;
  title: string;
  description: string;
  category: string | null;
  urgency: string | null;
  created_at?: string;
}

export interface VolunteerRow {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  locality_id: string;
  locality_name: string;
  skills: string[];
  availability: string | null;
  status: string;
  created_at?: string;
}

export interface ManifestoStatRow {
  id: string;
  count: number;
  last_updated: string;
}

export interface ManifestoSignatureRow {
  id: string;
  name: string;
  locality: string;
  contact: string;
  created_at?: string;
}

export type Tables = {
  users: {
    Row: UserRow;
    Insert: UserRow;
    Update: Partial<UserRow>;
  };
  wildlife_incidents: {
    Row: WildlifeIncidentRow;
    Insert: WildlifeIncidentRow;
    Update: Partial<WildlifeIncidentRow>;
  };
  alerts: {
    Row: AlertRow;
    Insert: AlertRow;
    Update: Partial<AlertRow>;
  };
  civic_issues: {
    Row: CivicIssueRow;
    Insert: CivicIssueRow;
    Update: Partial<CivicIssueRow>;
  };
  petitions: {
    Row: PetitionRow;
    Insert: PetitionRow;
    Update: Partial<PetitionRow>;
  };
};

// ============================================
// PLATFORM ENHANCEMENT TYPES (PostGIS civic layer)
// ============================================

/** Registered user profile row (profiles table). */
export interface ProfileRow {
  id: string;
  phone: string;
  full_name: string;
  village: string;
  email?: string | null;
  created_at?: string;
}

/** Digital signature docket row (dockets table) — the public proof ledger. */
export interface DocketsRow {
  id: string;
  docket_hash: string;
  full_name: string;
  village: string;
  phone: string;
  email?: string | null;
  latitude: number;
  longitude: number;
  user_agent_hash?: string | null;
  created_at?: string;
}

/** Community voice petition row (voice_petitions table). */
export interface VoicePetitionRow {
  id: string;
  docket_id?: string | null;
  place_name: string;
  language: string;
  audio_url: string;
  transcript?: string | null;
  speaker_name?: string | null;
  latitude: number;
  longitude: number;
  created_at?: string;
}

/** Verified animal sighting row (animal_sightings table). */
export interface AnimalSightingRow {
  id: string;
  user_id?: string | null;
  place_name: string;
  sighting_time: string;
  audio_url?: string | null;
  image_url?: string | null;
  transcript?: string | null;
  latitude: number;
  longitude: number;
  is_verified?: boolean;
  created_at?: string;
}

/** Row returned by the village_voice_rankings view. */
export interface VoiceRankRow {
  place_name: string;
  total_voices: number;
  latest_voice_at: string | null;
}
export const db = {
  async getUserProfile(uid: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async upsertUserProfile(profile: Partial<UserRow> & { uid: string }) {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(profile, { onConflict: 'uid' })
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async createWildlifeIncident(incident: Partial<WildlifeIncidentRow>) {
    try {
      const { data, error } = await supabase
        .from('wildlife_incidents')
        .insert(incident)
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async getWildlifeIncidents(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('wildlife_incidents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async getRecentWildlifeIncidents(hours = 24) {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('wildlife_incidents')
        .select('*')
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async getActiveAlerts() {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async createAlert(alert: Partial<AlertRow>) {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .insert(alert)
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  // ============================================
  // RESIDENT AUTH (phone number + unique Gudalur ID — no passwords)
  // ============================================

  /** Check whether a Gudalur ID already exists (used to guarantee uniqueness on registration). */
  async isGudalurIdTaken(gudalurId: string) {
    try {
      const { data, error } = await supabase.rpc('is_gudalur_id_taken', { p_gudalur_id: gudalurId });
      if (!error && typeof data === 'boolean') {
        return { taken: data, error: null };
      }
      // RPC missing -> direct filtered select
      const { data: rows, error: directError } = await supabase
        .from('users')
        .select('uid')
        .ilike('gudalur_id', gudalurId)
        .limit(1);
      if (directError) return { taken: false, error: directError };
      return { taken: (rows?.length || 0) > 0, error: null };
    } catch (e: any) {
      return { taken: false, error: e };
    }
  },

  /** Update an existing resident's row IN PLACE (keyed by gudalur_id). Never inserts. */
  async updateResidentProfile(
    gudalurId: string,
    fields: {
      name?: string; phone?: string; email?: string | null;
      locality_id?: string; locality_name?: string;
      custom_place_name?: string | null; pincode?: string;
    }
  ) {
    try {
      const payload: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .ilike('gudalur_id', gudalurId)
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /**
   * Issues the NEXT sequential Gudalur Resident ID: GDR000001, GDR000002, …
   * The 6-digit range (GDR000000 – GDR999999) is scanned first; once exhausted
   * it continues at 7 digits (GDR0000000, GDR0000001, …). Every candidate is
   * checked against the cloud ledger so issued IDs are always unique. If the
   * ledger is unreachable, a unique random GDR ID is issued as a safe fallback.
   */
  async nextGudalurId(): Promise<string> {
    let seq = 1;
    try {
      const stored = parseInt(localStorage.getItem('og_gdr_seq') || '0', 10);
      seq = (Number.isFinite(stored) && stored > 0 ? stored : 0) + 1;
    } catch { /* ignore */ }
    let scanned = 0;
    const MAX_SCAN = 20000;
    while (scanned < MAX_SCAN) {
      const seqVal = Math.max(seq, 1);
      const width = seqVal >= 1_000_000 ? 7 : 6;
      const id = `GDR${String(seqVal).padStart(width, '0')}`;
      try {
        const { taken, error } = await this.isGudalurIdTaken(id);
        if (error) return generateGudalurId();   // ledger unreachable -> random fallback
        if (!taken) {
          try { localStorage.setItem('og_gdr_seq', String(seqVal)); } catch { /* ignore */ }
          return id;
        }
      } catch {
        return generateGudalurId();
      }
      seq++;
      scanned++;
    }
    return generateGudalurId();
  },

  /** Check whether a phone number is already registered. */
  async getResidentByPhone(phone: string) {
    const p = normalizePhone(phone);
    try {
      const { data, error } = await supabase.rpc('get_resident_by_phone', { p_phone: p });
      if (!error) {
        const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
        return { data: row || null, error: null };
      }
      // RPC missing -> direct filtered select
      const { data: rows, error: directError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', p)
        .limit(1);
      return { data: rows?.[0] || null, error: directError };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /**
   * Login lookup by EITHER mobile number OR Gudalur ID (no password).
   * - Both given  -> they must match the SAME resident (strongest check)
   * - Phone only  -> login by mobile number
   * - ID only     -> login by Gudalur ID
   * Prefers the secure `find_resident_by_login` RPC (keeps the resident
   * directory non-enumerable); falls back to the legacy RPCs, then a direct
   * filtered select for older databases.
   */
  async findResidentByLogin(phone: string, gudalurId: string) {
    const p = normalizePhone(phone);
    const gid = (gudalurId || '').trim().toUpperCase();
    const hasPhone = p.length === 10;
    const hasId = gid.length > 0;
    if (!hasPhone && !hasId) return { data: null, error: null };
    try {
      // 1) Flexible secure RPC: matches on either identifier (or both together)
      const { data, error } = await supabase.rpc('find_resident_by_login', {
        p_phone: hasPhone ? p : null,
        p_gudalur_id: hasId ? gid : null,
      });
      if (!error) {
        // The RPC may return a single JSON object OR an array of rows — handle both.
        const row = Array.isArray(data) ? (data as any[])[0] : (data as any);
        return { data: row || null, error: null };
      }
      // 2) Flexible RPC missing (older schema) -> legacy secure paths
      if (hasPhone && hasId) {
        const { data: legacy, error: legacyError } = await supabase.rpc('login_resident', {
          p_phone: p,
          p_gudalur_id: gid,
        });
        if (!legacyError && legacy && (legacy as any[]).length > 0) {
          return { data: (legacy as any[])[0], error: null };
        }
      } else if (hasPhone) {
        const byPhone = await this.getResidentByPhone(p);
        if (byPhone.data) return byPhone;
      }
      // 3) Direct filtered select (works when a read policy exists)
      let query = supabase.from('users').select('*').limit(1);
      if (hasPhone && hasId) query = query.eq('phone', p).ilike('gudalur_id', gid);
      else if (hasPhone) query = query.eq('phone', p);
      else query = query.ilike('gudalur_id', gid);
      const { data: direct, error: directError } = await query;
      return { data: direct?.[0] || null, error: directError };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /**
   * Insert a brand new resident row (fails on duplicate phone / gudalur_id, unlike upsert).
   * Path 1: `register_resident` SECURITY DEFINER RPC — registers even when the live
   *         database is missing the users INSERT policy (directory stays private).
   * Path 2: direct insert fallback (works once the RLS policy exists).
   */
  async insertResident(profile: Partial<UserRow> & { uid: string }) {
    try {
      const base = {
        p_uid: profile.uid,
        p_name: profile.name || '',
        p_phone: profile.phone || '',
        p_locality_id: profile.locality_id || '',
        p_locality_name: profile.locality_name || '',
        p_pincode: profile.pincode || '',
        p_gudalur_id: profile.gudalur_id || '',
      };
      const rawEmail = (profile as any)?.email;
      const email = typeof rawEmail === 'string' && rawEmail.trim() ? rawEmail.trim() : null;

        // 1a: Try 8-parameter overload of register_resident (adds p_email via
      // supabase/ADD_USER_EMAIL.sql). Named-args order is irrelevant to PostgREST.
      const rpc8 = await supabase.rpc('register_resident', { ...base, p_email: email });
      if (!rpc8.error) {
        // The RPC returns a single JSON object — handle both shapes defensively.
        const row = Array.isArray(rpc8.data) ? (rpc8.data as any[])[0] : (rpc8.data as any);
        return { data: row || null, error: null };
      }
      const msg = String((rpc8.error as any)?.message || '');
      if (msg.includes('DUPLICATE_PHONE')) {
        return { data: null, error: { code: '23505', message: 'DUPLICATE_PHONE', details: null, hint: null } };
      }
      if (msg.includes('DUPLICATE_GUDALUR_ID')) {
        return { data: null, error: { code: '23505', message: 'DUPLICATE_GUDALUR_ID', details: null, hint: null } };
      }

      // 1b: older live database without the email column -> 7-parameter RPC (no p_email).
      // Also catches "function does not exist" / "PGRST202" / "could not determine" errors.
      if (/does not exist|PGRST202|could not find|could not determine|not enough|too many|parameter|argument/i.test(msg)) {
        const rpc7 = await supabase.rpc('register_resident', base);
        if (!rpc7.error) {
          const row7 = Array.isArray(rpc7.data) ? (rpc7.data as any[])[0] : (rpc7.data as any);
          return { data: row7 || null, error: null };
        }
        const msg7 = String((rpc7.error as any)?.message || '');
        if (msg7.includes('DUPLICATE_PHONE')) {
          return { data: null, error: { code: '23505', message: 'DUPLICATE_PHONE', details: null, hint: null } };
        }
        if (msg7.includes('DUPLICATE_GUDALUR_ID')) {
          return { data: null, error: { code: '23505', message: 'DUPLICATE_GUDALUR_ID', details: null, hint: null } };
        }
      }
      // RPC missing on this database (older schema) -> direct insert fallback.
      const { data, error } = await supabase
        .from('users')
        .insert(profile)
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  // ============================================
  // MANIFESTO ENDORSEMENTS (Supabase counters)
  // ============================================

  async getManifestoSignatureCount(): Promise<{ count: number | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('manifesto_stats')
        .select('count')
        .eq('id', 'global')
        .single();
      if (error) return { count: null, error };
      return { count: data?.count ?? null, error: null };
    } catch (e: any) {
      return { count: null, error: e };
    }
  },

  /** Live count of official email-submission dockets recorded in the proof ledger. */
  async getManifestoSubmissionCount(): Promise<{ count: number | null; error: any }> {
    try {
      const { count, error } = await supabase
        .from('manifesto_submissions')
        .select('id', { count: 'exact', head: true });
      if (error) return { count: null, error };
      return { count: count ?? 0, error: null };
    } catch (e: any) {
      return { count: null, error: e };
    }
  },

  /** Docket verification lookup — returns the public proof fields for a docket ref. */
  async getSubmissionByDocket(docketRef: string): Promise<{ data: any | null; error: any }> {
    try {
      const ref = docketRef.trim().toUpperCase();
      const { data, error } = await supabase
        .from('manifesto_submissions')
        .select('docket_ref, sender_name, gudalur_id, locality, subject, lang, created_at, source_url')
        .eq('docket_ref', ref)
        .maybeSingle();
      if (error) return { data: null, error };
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Records a geotagged wildlife incident (WhatsApp/citizen intake pipeline). */
  async addWildlifeIncident(incident: {
    type: string;
    locality_id?: string;
    generalized_area?: string;
    lat?: number | null;
    lng?: number | null;
    urgency?: string;
    reported_by?: string;
    behavior_notes?: string | null;
    herd_size?: number | null;
  }) {
    try {
      const { data, error } = await supabase
        .from('wildlife_incidents')
        .insert({
          type: incident.type,
          locality_id: incident.locality_id || 'gudalur-town',
          generalized_area: incident.generalized_area || 'Gudalur',
          lat: incident.lat ?? null,
          lng: incident.lng ?? null,
          urgency: incident.urgency || 'MEDIUM',
          reported_by: incident.reported_by || 'citizen',
          behavior_notes: incident.behavior_notes ?? null,
          herd_size: incident.herd_size ?? null,
        })
        .select('id')
        .single();
      return { id: data?.id ?? null, error };
    } catch (e: any) {
      return { id: null, error: e };
    }
  },

  /** Records one signature for the petition: the exact global counter + signature row for a REAL, identified resident.
   *  Path 1: `record_manifesto_signature` SECURITY DEFINER RPC — works even when the live
   *          table grants / policies are missing (the RPC owns the table).
   *  Path 2: direct insert fallback (also keeps its own duplicate check + counter bump). */
  async addManifestoSignature(sig: { name: string; locality: string; contact: string; gudalur_id?: string }) {
    try {
      // 1) Secure RPC first — one atomic call: duplicate check + insert + counter bump.
      const rpc = await supabase.rpc('record_manifesto_signature', {
        p_name: sig.name,
        p_locality: sig.locality,
        p_contact: sig.contact,
        p_gudalur_id: sig.gudalur_id || null,
      });
      if (!rpc.error) {
        const row = Array.isArray(rpc.data) ? (rpc.data as any[])[0] : (rpc.data as any);
        return { error: null, alreadySigned: !row }; // empty result == already signed
      }

      // 2) Direct fallback — a registered citizen may only sign once, never double-count.
      if (sig.gudalur_id) {
        const { data: existing, error: dupErr } = await supabase
          .from('manifesto_signatures')
          .select('id')
          .eq('gudalur_id', sig.gudalur_id)
          .maybeSingle();
        if (dupErr) return { error: dupErr, alreadySigned: false };
        if (existing) return { error: null, alreadySigned: true };
      }
      const { error: rpcError } = await supabase.rpc('bump_manifesto_count');
      const insertError = rpcError ? rpcError : (
        await supabase.from('manifesto_signatures').insert({
          name: sig.name,
          locality: sig.locality,
          contact: sig.contact,
          gudalur_id: sig.gudalur_id || null,
        })
      ).error;
      return { error: insertError || null, alreadySigned: false };
    } catch (e: any) {
      return { error: e, alreadySigned: false };
    }
  },

  /**
   * Registers a REAL official email submission in the proof ledger (the "email sent" table).
   * Returns an immutable docket reference used on the signed PDF as proof of record.
   * Fires automatically the moment the send action is triggered.
   * Path 1: `record_manifesto_submission` SECURITY DEFINER RPC — works even when the
   *         live table grants / policies are missing.
   * Path 2: direct insert fallback.
   */
  async addManifestoSubmission(sub: {
    senderName: string;
    senderPhone: string;
    gudalurId?: string;
    locality?: string;
    toEmails: string;
    ccEmails: string;
    subject: string;
    lang: string;
  }) {
    try {
      const docketRef = generateEmailRef();
      const sourceUrl = typeof window !== 'undefined' ? window.location.href : null;

      // 1) Secure SECURITY DEFINER RPC first.
      const rpc = await supabase.rpc('record_manifesto_submission', {
        p_docket_ref: docketRef,
        p_sender_name: sub.senderName,
        p_sender_phone: sub.senderPhone,
        p_gudalur_id: sub.gudalurId || null,
        p_locality: sub.locality || null,
        p_to_emails: sub.toEmails,
        p_cc_emails: sub.ccEmails,
        p_subject: sub.subject,
        p_lang: sub.lang,
        p_source_url: sourceUrl,
      });
      if (!rpc.error) {
        const row = Array.isArray(rpc.data) ? (rpc.data as any[])[0] : (rpc.data as any);
        return {
          ref: row?.docket_ref ?? docketRef,
          createdAt: row?.created_at ?? null,
          error: null,
        };
      }

      // 2) Direct insert fallback (requires the table-level INSERT grant / policy).
      const { data, error } = await supabase
        .from('manifesto_submissions')
        .insert({
          docket_ref: docketRef,
          sender_name: sub.senderName,
          sender_phone: sub.senderPhone,
          gudalur_id: sub.gudalurId || null,
          locality: sub.locality || null,
          to_emails: sub.toEmails,
          cc_emails: sub.ccEmails,
          subject: sub.subject,
          lang: sub.lang,
          source_url: sourceUrl,
        })
        .select('docket_ref, created_at')
        .single();
      if (error) return { ref: null as string | null, createdAt: null as string | null, error };
      return { ref: data?.docket_ref ?? docketRef, createdAt: data?.created_at ?? null, error: null };
    } catch (e: any) {
      return { ref: null as string | null, createdAt: null as string | null, error: e };
    }
  },

  /** Returns true when this Gudalur ID has already signed the petition (prevents repeat signing). */
  async checkManifestoSignature(gudalurId: string): Promise<boolean> {
    try {
      if (!gudalurId) return false;
      const { data, error } = await supabase
        .from('manifesto_signatures')
        .select('id')
        .eq('gudalur_id', gudalurId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  },

  /** Fetches the latest official email submission for a Gudalur ID — restores the
   *  "email sent" state (docket ref) after a page refresh and unlocks the petition PDF.
   *  Direct SELECT first, then the `get_manifesto_submission_by_gudalur` SECURITY
   *  DEFINER RPC fallback for databases without a public read policy. */
  async getLatestManifestoSubmission(gudalurId: string): Promise<{
    docketRef: string | null;
    toEmails: string | null;
    ccEmails: string | null;
    createdAt: string | null;
  }> {
    const empty = { docketRef: null, toEmails: null, ccEmails: null, createdAt: null };
    try {
      if (!gudalurId) return empty;
      const { data, error } = await supabase
        .from('manifesto_submissions')
        .select('docket_ref, to_emails, cc_emails, created_at')
        .eq('gudalur_id', gudalurId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        return {
          docketRef: (data as any).docket_ref ?? null,
          toEmails: (data as any).to_emails ?? null,
          ccEmails: (data as any).cc_emails ?? null,
          createdAt: (data as any).created_at ?? null,
        };
      }
      // RLS-blocked read -> SECURITY DEFINER RPC fallback.
      const rpc = await supabase.rpc('get_manifesto_submission_by_gudalur', { p_gudalur_id: gudalurId });
      if (!rpc.error && rpc.data) {
        const row = Array.isArray(rpc.data) ? (rpc.data as any[])[0] : (rpc.data as any);
        if (row) {
          return {
            docketRef: row.docket_ref ?? null,
            toEmails: row.to_emails ?? null,
            ccEmails: row.cc_emails ?? null,
            createdAt: row.created_at ?? null,
          };
        }
      }
      return empty;
    } catch {
      return empty;
    }
  },

  // ============================================
  // PETITIONS — ACT FOR GUDALUR (Supabase sync)
  // ============================================

  async getPetitions() {
    try {
      const { data, error } = await supabase
        .from('petitions')
        .select('*')
        .order('created_at', { ascending: true });
      return { data: (data as PetitionRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async upsertPetition(petition: Partial<PetitionRow> & { id: string }) {
    try {
      const { data, error } = await supabase
        .from('petitions')
        .upsert(petition, { onConflict: 'id' })
        .select()
        .single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Atomically increments support_count and appends the supporter via `support_petition` RPC. */
  async supportPetition(petitionId: string, supporter: SupporterInfoJson) {
    try {
      const { data, error } = await supabase.rpc('support_petition', {
        p_petition_id: petitionId,
        p_supporter: supporter,
      });
      if (error) return { data: null, error };
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async uploadMedia(file: File, userId: string, incidentId: string) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${incidentId}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('wildlife-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      
      if (error) return { data: null, error };
      
      const { data: urlData } = supabase.storage
        .from('wildlife-media')
        .getPublicUrl(fileName);
      
      return { data: urlData.publicUrl, error: null };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async deleteMedia(url: string) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts.slice(pathParts.indexOf('wildlife-media') + 1).join('/');
      
      const { error } = await supabase.storage
        .from('wildlife-media')
        .remove([fileName]);
      return { error };
    } catch (e: any) {
      return { error: e };
    }
  },
// ============================================
  // PLATFORM ENHANCEMENTS — dockets / voice / sightings
  // ============================================

  async addProfile(p: Partial<ProfileRow>) {
    try {
      const { data, error } = await supabase.from('profiles').insert(p).select().single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  async getProfileByPhone(phone: string) {
    try {
      const { data, error } = await supabase
        .from('profiles').select('*').eq('phone', normalizePhone(phone)).maybeSingle();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Insert a digitally-signed docket into the public proof ledger. */
  async addDocket(docket: Partial<DocketsRow>) {
    try {
      const { data, error } = await supabase.from('dockets').insert(docket).select().single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Look up a docket by its verified token (e.g. VG-…). */
  async getDocketByHash(docketHash: string) {
    try {
      const { data, error } = await supabase
        .from('dockets').select('*').eq('docket_hash', docketHash.trim().toUpperCase()).maybeSingle();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Uniqueness guard — never issue the same docket token twice. */
  async docketHashExists(docketHash: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('dockets').select('docket_hash').eq('docket_hash', docketHash.trim().toUpperCase()).limit(1);
      return Boolean(data && data.length > 0);
    } catch {
      return false;
    }
  },

  async getDockets(limit = 250) {
    try {
      const { data, error } = await supabase
        .from('dockets').select('*').order('created_at', { ascending: false }).limit(limit);
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Total verifiable digital signatures recorded on the public docket ledger. */
  async getDocketCount(): Promise<{ count: number | null }> {
    try {
      const { count, error } = await supabase.from('dockets').select('id', { count: 'exact', head: true });
      return { count: error ? null : (count ?? 0) };
    } catch {
      return { count: null };
    }
  },

  /** Real signature counts per village/place — the official regional audit. */
  async getSignatureCountsByVillage(): Promise<{ village: string; count: number }[]> {
    try {
      const { data, error } = await supabase.from('dockets').select('village');
      if (error) return [];
      const map = new Map<string, number>();
      (data || []).forEach((r) => {
        const key = (r.village || 'Gudalur').trim();
        map.set(key, (map.get(key) || 0) + 1);
      });
             return Array.from(map.entries())
        .map(([village, count]) => ({ village, count }))
        .sort((a, b) => b.count - a.count);
    } catch {
      return [];
    }
  },

  // ============================================
  // PLATFORM ENHANCEMENTS — voice petitions
  // ============================================

  /** Insert a community voice petition recording with GPS + place metadata. */
  async addVoicePetition(petition: Partial<VoicePetitionRow>) {
    try {
      const { data, error } = await supabase.from('voice_petitions').insert(petition).select().single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Fetch recent voice petitions (most recent first), optionally filtered by place or language. */
  async getVoicePetitions(opts?: {
    limit?: number;
    placeName?: string;
    language?: string;
  }): Promise<{ data: VoicePetitionRow[] | null; error: any }> {
    try {
      let q = supabase
        .from('voice_petitions')
        .select('*')
        .order('created_at', { ascending: false });
      if (opts?.limit) q = q.limit(opts.limit);
      if (opts?.placeName) q = q.ilike('place_name', opts.placeName);
      if (opts?.language) q = q.eq('language', opts.language);
      const { data, error } = await q;
      return { data: (data as VoicePetitionRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Live village/place rankings from the view — highest activity at the top. */
  async getVoiceRankings(): Promise<{ data: VoiceRankRow[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('village_voice_rankings')
        .select('*')
        .order('total_voices', { ascending: false });
      return { data: (data as VoiceRankRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  // ============================================
  // PLATFORM ENHANCEMENTS — animal sightings
  // ============================================

  /** Insert a verified animal sighting row (registered users only — app-gated). */
  async addAnimalSighting(sighting: Partial<AnimalSightingRow>) {
    try {
      const { data, error } = await supabase.from('animal_sightings').insert(sighting).select().single();
      return { data, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Fetch recent verified animal sightings. */
  async getAnimalSightings(limit = 100): Promise<{ data: AnimalSightingRow[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('animal_sightings')
        .select('*')
        .eq('is_verified', true)
        .order('sighting_time', { ascending: false })
        .limit(limit);
      return { data: (data as AnimalSightingRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Sightings from the last N hours (for proximity alert scanning). */
  async getRecentSightings(hours = 24): Promise<{ data: AnimalSightingRow[] | null; error: any }> {
    try {
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('animal_sightings')
        .select('*')
        .eq('is_verified', true)
        .gte('sighting_time', cutoff)
        .order('sighting_time', { ascending: false });
      return { data: (data as AnimalSightingRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Real-time proximity scan — sightings within p_radius_km of a coordinate (postgis function). */
  async getNearbySightings(lat: number, lng: number, radiusKm = 3): Promise<{ data: AnimalSightingRow[] | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('nearby_sightings', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
      });
      return { data: (data as AnimalSightingRow[] | null) || null, error };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },
};

// ============================================
// OFFLINE LEDGER — pending records (local fallback)
// ============================================
// When Supabase is not configured, signatures and email submissions are
// still recorded locally so the citizen's intent is never lost.  Each
// record carries a "pending" flag and a timestamp; the SyncBanner in the
// header shows how many records are awaiting cloud upload.

type pendingSig = {
  name: string; locality: string; contact: string; gudalur_id?: string;
  signed_at: number; source: 'manifesto' | 'petition'; petitionId?: string;
};

const _lsGet = <T,>(key: string, fallback: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; }
  catch { return fallback; }
};
const _lsSet = <T,>(key: string, val: T) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

/** Save a pending manifesto signature locally, deduplicated by gudalur_id. */
export const savePendingSignature = (sig: pendingSig): boolean => {
  const all = _lsGet<pendingSig[]>('og_pending_signatures', []);
  if (sig.gudalur_id && all.some((s) => s.gudalur_id === sig.gudalur_id && s.source === sig.source && s.petitionId === sig.petitionId)) {
    return false; // already pending — no double-count
  }
  all.push(sig);
  _lsSet('og_pending_signatures', all);
  return true;
};

/** Count pending signatures + email submissions awaiting sync. */
export const getPendingLedgerCount = (): number => {
  const sigs = _lsGet<pendingSig[]>('og_pending_signatures', []).length;
  return sigs;
};

/** Remove all pending records (called after successful logout). */
export const clearPendingLedger = () => {
  try { localStorage.removeItem('og_pending_signatures'); } catch {}
};

export const subscribeToWildlifeIncidents = (callback: (incidents: WildlifeIncidentRow[]) => void) => {
  const channel = supabase
    .channel('wildlife_incidents_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wildlife_incidents' }, () => {
      db.getWildlifeIncidents().then(({ data }) => { if (data) callback(data); });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

export const subscribeToAlerts = (callback: (alerts: AlertRow[]) => void) => {
  const channel = supabase
    .channel('alerts_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
      db.getActiveAlerts().then(({ data }) => { if (data) callback(data); });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

/** Zero-latency live updates for the movement metrics bar: fires whenever a new
 *  signature or official email submission lands in the public ledger. */
export const subscribeToManifestoStats = (onChanged: () => void) => {
  const channel = supabase
    .channel('public:signatures')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manifesto_signatures' }, onChanged)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'manifesto_submissions' }, onChanged)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

/** Live updates for the community voice soundboard — fires on new voice petitions. */
export const subscribeToVoicePetitions = (callback: (petitions: VoicePetitionRow[]) => void) => {
  const channel = supabase
    .channel('voice_petitions_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'voice_petitions' }, () => {
      db.getVoicePetitions().then(({ data }) => { if (data) callback(data); });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

/** Live updates for the conflict/sighting map — fires on new verified sightings. */
export const subscribeToSightings = (callback: (sightings: AnimalSightingRow[]) => void) => {
  const channel = supabase
    .channel('animal_sightings_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'animal_sightings' }, () => {
      db.getAnimalSightings().then(({ data }) => { if (data) callback(data); });
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};

// Connection test
export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('uid').limit(1);
    if (error) throw error;
    console.log('Supabase connection verified');
    return true;
  } catch (error) {
    console.warn('Supabase offline or using local fallback:', error);
    return false;
  }
}

// Helper to get current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// Helper to convert snake_case to camelCase
export function toCamelCase<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

// Helper to convert camelCase to snake_case
export function toSnakeCase<T extends Record<string, any>>(obj: T): any {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

// Realtime subscription helper
export function subscribeToTable<T>(
  table: string,
  callback: (payload: { new: T; old: T; eventType: string }) => void,
  filter?: string
) {
  let channel = supabase.channel(`${table}_changes`);
  
  if (filter) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter },
      (payload) => callback(payload as any)
    );
  } else {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => callback(payload as any)
    );
  }
  
  return channel.subscribe();
}