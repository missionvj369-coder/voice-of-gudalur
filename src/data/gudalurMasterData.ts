// ============================================================================
// GUDALUR_LOCALITIES (compatibility adapter)
// Existing resident-registration flows (AuthContext, RegisterResidentModal,
// GudalurIdModal) expect a GUDALUR_LOCALITIES array indexed by `id`. This
// module provides that shape from the privacy-safe `localities.ts` directory,
// deriving `id` from each locality's `slug`.
//
// DATA INTEGRITY: the old hard-coded file carried invented coordinator names,
// telephones, WhatsApp links and member counts. Those are deliberately NOT
// reproduced. Only real locality names, revenue villages and pincodes are
// shown; coordinators/contacts come later from Supabase after verification.
// ============================================================================

import { LOCALITIES, ZONE_LABELS } from './localities';

export interface GudalurLocalityCompat {
  id: string;
  name: string;
  nameTa: string;
  slug: string;
  administrativeParent: string;
  revenueVillage: string;
  pincode: string;
  lat?: number;
  lng?: number;
  borderZone: string;
}

// Tamil place names are published per-locality only after they are verified;
// until then we keep the English/official name to avoid inventing translations.
export const GUDALUR_LOCALITIES: GudalurLocalityCompat[] = LOCALITIES.map((l) => ({
  id: l.slug,
  name: l.name,
  nameTa: l.name,
  slug: l.slug,
  administrativeParent: ZONE_LABELS[l.zone] || 'Gudalur Taluk, The Nilgiris',
  revenueVillage: l.revenueVillage,
  pincode: l.pincode,
  lat: l.refLat,
  lng: l.refLng,
  borderZone: l.zone,
}));

export const getLocalityCompat = (slug?: string) => GUDALUR_LOCALITIES.find((l) => l.id === slug);
