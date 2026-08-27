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

export const generateGudalurId = (): string => {
  const year = new Date().getFullYear();
  // 6 random digits -> 1 in a million collision chance per attempt; callers re-check DB uniqueness.
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `GD-${year}-${randomNum}`;
};

/** Generates a short immutable docket reference for an official email submission (real proof of record). */
export const generateEmailRef = (): string => {
  const d = new Date();
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `OG-${yyyymmdd}-${seq}`;
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

  /** Check whether a phone number is already registered. */
  async getResidentByPhone(phone: string) {
    const p = normalizePhone(phone);
    try {
      const { data, error } = await supabase.rpc('get_resident_by_phone', { p_phone: p });
      if (!error) {
        const rows = (data as any[]) || [];
        return { data: rows[0] || null, error: null };
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
   * Login with phone number + Gudalur ID (no password).
   * Prefers the secure `login_resident` RPC; falls back to a direct filtered select.
   */
  async findResidentByLogin(phone: string, gudalurId: string) {
    const p = normalizePhone(phone);
    const gid = (gudalurId || '').trim().toUpperCase();
    try {
      const { data, error } = await supabase.rpc('login_resident', {
        p_phone: p,
        p_gudalur_id: gid,
      });
      if (!error && data && (data as any[]).length > 0) {
        return { data: (data as any[])[0], error: null };
      }
      if (!error) {
        // RPC exists but no match, or RPC missing (PGRST202) -> try direct select
        const { data: direct, error: directError } = await supabase
          .from('users')
          .select('*')
          .eq('phone', p)
          .ilike('gudalur_id', gid)
          .limit(1);
        if (directError) return { data: null, error: directError };
        return { data: direct?.[0] || null, error: null };
      }
      // RPC failed (likely missing) -> direct filtered select
      const { data: direct, error: directError } = await supabase
        .from('users')
        .select('*')
        .eq('phone', p)
        .ilike('gudalur_id', gid)
        .limit(1);
      return { data: direct?.[0] || null, error: directError };
    } catch (e: any) {
      return { data: null, error: e };
    }
  },

  /** Insert a brand new resident row (fails on duplicate phone / gudalur_id, unlike upsert). */
  async insertResident(profile: Partial<UserRow> & { uid: string }) {
    try {
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

  /** Records one endorsement: the exact global counter + signature row for a REAL, identified resident. */
  async addManifestoSignature(sig: { name: string; locality: string; contact: string; gudalur_id?: string }) {
    try {
      const { error: rpcError } = await supabase.rpc('bump_manifesto_count');
      const insertError = rpcError ? rpcError : (
        await supabase.from('manifesto_signatures').insert({
          name: sig.name,
          locality: sig.locality,
          contact: sig.contact,
          gudalur_id: sig.gudalur_id || null,
        })
      ).error;
      return { error: insertError || null };
    } catch (e: any) {
      return { error: e };
    }
  },

  /**
   * Registers a REAL official email submission in the proof ledger.
   * Returns an immutable docket reference used on the signed PDF as proof of record.
   * No row is written unless the user actually confirms they have emailed the authorities.
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
        })
        .select('docket_ref, created_at')
        .single();
      if (error) return { ref: null as string | null, createdAt: null as string | null, error };
      return { ref: data?.docket_ref ?? docketRef, createdAt: data?.created_at ?? null, error: null };
    } catch (e: any) {
      return { ref: null as string | null, createdAt: null as string | null, error: e };
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