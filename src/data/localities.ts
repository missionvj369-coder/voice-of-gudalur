// ============================================================================
// GUDALUR LOCALITIES — safety node directory
// Real locality names of Gudalur taluk (The Nilgiris). Administrative fields
// (revenue village, pincode) reflect publicly known postal facts.
// NO coordinator names, NO phone numbers, NO WhatsApp links, NO member counts:
// those are added only from Supabase `localities` after real verification.
// Coordinates are approximate TOWN-CENTRE references for map orientation only
// — never wildlife positions. Hamlets without verified coordinates have none.
// ============================================================================

export type BorderZone =
  | 'CENTRAL_TOWN'
  | 'NORTH_BANDIPUR'
  | 'EAST_MUDUMALAI'
  | 'WEST_WAYANAD_NILAMBUR'
  | 'SOUTH_OVALLEY_RIDGE';

export interface Locality {
  slug: string;
  name: string;
  revenueVillage: string;
  pincode: string;
  zone: BorderZone;
  /** Approximate town-centre reference. Null = not verified, do not plot. */
  refLat?: number;
  refLng?: number;
    /** Admin-configured in Supabase — never hard-coded here. */
  coordinatorName?: string;
  coordinatorPhone?: string;
  /** Admin-configured (Supabase) nearest medical facilities for the safety node. */
  hospitals?: string[];
}

export const ZONE_LABELS: Record<BorderZone, string> = {
  CENTRAL_TOWN: 'Gudalur Central',
  NORTH_BANDIPUR: 'Northern Bandipur Edge',
  EAST_MUDUMALAI: 'Eastern Mudumalai Edge',
  WEST_WAYANAD_NILAMBUR: 'Western Wayanad / Nilambur Edge',
  SOUTH_OVALLEY_RIDGE: 'Southern O\u2019Valley Ridge',
};

export const LOCALITIES: Locality[] = [
  // ---- Gudalur Central -----------------------------------------------------
  { slug: 'new-bazar', name: 'New Bazar (Town Centre)', revenueVillage: 'Gudalur', pincode: '643212', zone: 'CENTRAL_TOWN', refLat: 11.5094, refLng: 76.4924 },
  { slug: 'kasimvayal', name: 'Kasimvayal', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'ss-nagar', name: 'SS Nagar', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'first-mile', name: 'First Mile', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'second-mile', name: 'Second Mile', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'chembala', name: 'Chembala', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'vedanvayal', name: 'Vedanvayal', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'mankuzhy', name: 'Mankuzhy', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'marthoma-nagar', name: 'Marthoma Nagar', revenueVillage: 'Gudalur', pincode: '643211', zone: 'CENTRAL_TOWN' },
  { slug: 'nandatti', name: 'Nandatti', revenueVillage: 'Gudalur', pincode: '643212', zone: 'CENTRAL_TOWN' },
  // ---- Northern Bandipur edge ---------------------------------------------
  { slug: 'thorapalli', name: 'Thorapalli & Mudumalai Forest Gate', revenueVillage: 'Thorapalli', pincode: '643211', zone: 'NORTH_BANDIPUR' },
  { slug: 'kakkanallah', name: 'Kakkanallah (Karnataka Border)', revenueVillage: 'Mudumalai', pincode: '643223', zone: 'NORTH_BANDIPUR' },
  { slug: 'theppakadu', name: 'Theppakadu (Mudumalai)', revenueVillage: 'Mudumalai', pincode: '643223', zone: 'NORTH_BANDIPUR' },
  // ---- Eastern Mudumalai edge ---------------------------------------------
  { slug: 'masinagudi', name: 'Masinagudi', revenueVillage: 'Masinagudi', pincode: '643223', zone: 'EAST_MUDUMALAI', refLat: 11.5669, refLng: 76.5921 },
  { slug: 'moyar', name: 'Moyar Gorge & Valley', revenueVillage: 'Moyar', pincode: '643223', zone: 'EAST_MUDUMALAI' },
  // ---- Western Wayanad / Nilambur edge ------------------------------------
  { slug: 'pattavayal', name: 'Pattavayal (Wayanad Border)', revenueVillage: 'Cherangode', pincode: '643240', zone: 'WEST_WAYANAD_NILAMBUR' },
  { slug: 'nadugani', name: 'Nadugani Ghat (Nilambur Border)', revenueVillage: 'Gudalur', pincode: '643211', zone: 'WEST_WAYANAD_NILAMBUR' },
  { slug: 'devala', name: 'Devala', revenueVillage: 'Devala', pincode: '643270', zone: 'WEST_WAYANAD_NILAMBUR', refLat: 11.5271, refLng: 76.2623 },
  { slug: 'cherambadi', name: 'Cherambadi', revenueVillage: 'Cherangode', pincode: '643205', zone: 'WEST_WAYANAD_NILAMBUR' },
  { slug: 'pandalur', name: 'Pandalur & Nelliyalam', revenueVillage: 'Pandalur', pincode: '643233', zone: 'WEST_WAYANAD_NILAMBUR', refLat: 11.5075, refLng: 76.3322 },
  // ---- Southern O'Valley ridge --------------------------------------------
  { slug: 'ovalley', name: 'O\u2019Valley (New Hope & Glenrock)', revenueVillage: 'O\u2019Valley', pincode: '643226', zone: 'SOUTH_OVALLEY_RIDGE', refLat: 11.4549, refLng: 76.4624 },
  { slug: 'seaforth', name: 'Seaforth Estate & Valley', revenueVillage: 'O\u2019Valley', pincode: '643226', zone: 'SOUTH_OVALLEY_RIDGE' },
  { slug: 'naduvattam', name: 'Naduvattam (Ooty Road Ridge)', revenueVillage: 'Naduvattam', pincode: '643224', zone: 'SOUTH_OVALLEY_RIDGE', refLat: 11.4771, refLng: 76.5541 },
];

export const getLocality = (slug?: string) =>
  LOCALITIES.find((l) => l.slug === slug);

export const localityName = (slug?: string) =>
  getLocality(slug)?.name ?? 'Gudalur';
