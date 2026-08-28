// ============================================================================
// PLATFORM API — typed wrappers around Supabase RPCs (schema v2)
// The public can ONLY touch the platform through these functions. Precise
// animal coordinates and reporter identities never leave the database on the
// public path — the RPCs themselves strip them.
// ============================================================================

import { supabase } from './supabase';

export type Species = 'ELEPHANT' | 'TIGER' | 'LEOPARD' | 'GAUR' | 'OTHER' | 'UNKNOWN';
export type IncidentType =
  | 'SIGHTING' | 'NEAR_HOME' | 'ROAD_CROSSING' | 'CROP_DAMAGE'
  | 'LIVESTOCK_ATTACK' | 'HUMAN_INJURY' | 'HUMAN_DEATH' | 'OTHER';
export type VerificationStatus =
  | 'REPORTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'OFFICIAL' | 'RESOLVED' | 'REJECTED' | 'UNVERIFIED_REPORT';

export interface PublicIncident {
  id: string;
  incident_type: IncidentType;
  species: Species;
  locality_name: string;
  landmark: string | null;
  event_date: string;
  event_time: string | null;
  direction: string | null;
  description: string;
  verification_status: VerificationStatus;
  source: string;
  created_at: string;
}

export interface IncidentReportInput {
  incident_type: IncidentType;
  species: Species;
  locality_id?: string;
  locality_name: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  event_date: string;
  event_time?: string;
  direction?: string;
  description: string;
  evidence_url?: string;
  reporter_uid?: string;
  reporter_contact?: string;
}

export interface PlatformAlert {
  id: string;
  title: string;
  title_ta: string | null;
  description: string;
  description_ta: string | null;
  category: 'ELEPHANT' | 'TIGER' | 'EMERGENCY' | 'CIVIC' | 'GENERAL';
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  locality_names: string[];
  instruction: string | null;
  verification_status: 'VERIFIED' | 'OFFICIAL' | 'UNVERIFIED_REPORT';
  created_at: string;
  expires_at: string | null;
}

export interface PlatformStats {
  verified_incidents_30d: number;
  active_alerts: number;
  localities: number;
  tracked_actions: number;
  evidence_docs: number;
  last_updated: string;
}

export interface EvidenceDoc {
  id: string;
  title: string;
  authority: string;
  doc_type: string;
  doc_date: string | null;
  description: string | null;
  url: string;
  created_at: string;
}

export interface GovAction {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  locality: string | null;
  department: string | null;
  submitted_date: string;
  submitted_by: string | null;
  requested_action: string | null;
  status: 'SUBMITTED' | 'ACKNOWLEDGED' | 'RESPONSE_RECEIVED' | 'ACTION_REPORTED' | 'FOLLOW_UP_REQUIRED';
  government_response: string | null;
  response_date: string | null;
  follow_up_notes: string | null;
}

export const SPECIES_LABELS: Record<Species, string> = {
  ELEPHANT: 'Elephant', TIGER: 'Tiger', LEOPARD: 'Leopard',
  GAUR: 'Gaur', OTHER: 'Other', UNKNOWN: 'Unknown',
};

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  SIGHTING: 'Sighting', NEAR_HOME: 'Animal near home', ROAD_CROSSING: 'Animal crossing road',
  CROP_DAMAGE: 'Crop/property damage', LIVESTOCK_ATTACK: 'Livestock attack',
  HUMAN_INJURY: 'Human injury', HUMAN_DEATH: 'Human death', OTHER: 'Other',
};

export const api = {
  /** Public verified incidents — NO coordinates, NO reporter identity. */
  async getPublicIncidents(limit = 60): Promise<PublicIncident[]> {
    const { data, error } = await supabase.rpc('get_public_incidents', { p_limit: limit });
    if (error) throw error;
    return (data as PublicIncident[]) || [];
  },

  /** Citizen incident report — always stored as REPORTED / CITIZEN. */
  async createIncidentReport(input: IncidentReportInput): Promise<PublicIncident> {
    const { data, error } = await supabase.rpc('create_incident_report', {
      p_incident: input as unknown as Record<string, unknown>,
    });
    if (error) throw error;
    return data as unknown as PublicIncident;
  },

  /** Active, verified alerts. */
  async getActiveAlerts(): Promise<PlatformAlert[]> {
    const { data, error } = await supabase.rpc('get_public_alerts');
    if (error) throw error;
    return (data as PlatformAlert[]) || [];
  },

  /** Honest platform statistics (real counts only). */
  async getPlatformStats(): Promise<PlatformStats | null> {
    const { data, error } = await supabase.rpc('get_platform_stats');
    if (error) return null;
    return (data as unknown as PlatformStats) || null;
  },

  /** Submit a tracked government action. */
  async submitGovAction(input: {
    title: string; description?: string; locality?: string;
    department?: string; requested_action?: string; evidence_url?: string;
  }): Promise<{ id: string; ref: string; status: string }> {
    const { data, error } = await supabase.rpc('submit_gov_action', {
      p_title: input.title,
      p_description: input.description ?? null,
      p_locality: input.locality ?? null,
      p_department: input.department ?? null,
      p_requested_action: input.requested_action ?? null,
      p_evidence_url: input.evidence_url ?? null,
    });
    if (error) throw error;
    return data as unknown as { id: string; ref: string; status: string };
  },

  /** Alert subscription — idempotent, phone stored once, never displayed. */
  async subscribeAlerts(input: {
    phone: string; localities: string[]; topics: string[]; lang: 'en' | 'ta' | 'ml';
  }): Promise<{ ok: boolean; phone_masked: string }> {
    const { data, error } = await supabase.rpc('subscribe_alerts', {
      p_phone: input.phone,
      p_localities: input.localities,
      p_topics: input.topics,
      p_lang: input.lang,
    });
    if (error) throw error;
    return data as unknown as { ok: boolean; phone_masked: string };
  },

  /** Public evidence documents. */
  async getEvidenceDocs(): Promise<EvidenceDoc[]> {
    const { data, error } = await supabase
      .from('evidence_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as EvidenceDoc[]) || [];
  },

  /** Public action tracker. */
  async getGovActions(): Promise<GovAction[]> {
    const { data, error } = await supabase
      .from('government_actions')
      .select('*')
      .order('submitted_date', { ascending: false });
    if (error) throw error;
    return (data as GovAction[]) || [];
  },

  // ---------------------------- ADMIN (self-gated) -------------------------

  async adminListIncidents(identity: AdminIdentity) {
    const { data, error } = await supabase.rpc('admin_list_incidents', {
      p_uid: identity.uid, p_phone: identity.phone, p_gid: identity.gid, p_limit: 300,
    });
    if (error) throw error;
    return (data as unknown as AdminIncident[]) || [];
  },

  async adminUpdateIncident(identity: AdminIdentity, id: string, status: VerificationStatus, notes?: string) {
    const { data, error } = await supabase.rpc('admin_update_incident', {
      p_uid: identity.uid, p_phone: identity.phone, p_gid: identity.gid,
      p_id: id, p_status: status, p_notes: notes ?? null,
    });
    if (error) throw error;
    return data;
  },

  async adminUpsertAlert(identity: AdminIdentity, alert: Partial<PlatformAlert> & { title: string; description: string }) {
    const { data, error } = await supabase.rpc('admin_upsert_alert', {
      p_uid: identity.uid, p_phone: identity.phone, p_gid: identity.gid,
      p_alert: alert as unknown as Record<string, unknown>,
    });
    if (error) throw error;
    return data;
  },

  async adminAddEvidence(identity: AdminIdentity,
    doc: { title: string; authority: string; doc_type: string; url: string; description?: string; doc_date?: string }) {
    const { data, error } = await supabase.rpc('admin_add_evidence', {
      p_uid: identity.uid, p_phone: identity.phone, p_gid: identity.gid,
      p_title: doc.title, p_authority: doc.authority, p_doc_type: doc.doc_type,
      p_url: doc.url, p_description: doc.description ?? null, p_doc_date: doc.doc_date ?? null,
    });
    if (error) throw error;
    return data;
  },

  async adminUpdateAction(identity: AdminIdentity, id: string, status: GovAction['status'], response?: string, followUp?: string) {
    const { data, error } = await supabase.rpc('admin_update_action', {
      p_uid: identity.uid, p_phone: identity.phone, p_gid: identity.gid,
      p_id: id, p_status: status, p_response: response ?? null, p_follow_up: followUp ?? null,
    });
    if (error) throw error;
    return data;
  },
};

export interface AdminIdentity { uid: string; phone: string; gid: string; }

export interface AdminIncident extends PublicIncident {
  latitude: string | number | null;
  longitude: string | number | null;
  reporter_contact: string | null;
  review_notes: string | null;
}
