// GIS data for the 11 documented elephant migratory corridors in Gudalur Taluk.
// Coordinates are advocacy-mapping approximations derived from the locality registry
// (gudalurMasterData.ts) and documented conflict-zone reporting. For official
// demarcation, the Forest Survey of India / Tamil Nadu Forest Dept. shapefiles govern.

export interface CorridorDef {
  id: string;
  name: string;
  status: 'BLOCKED' | 'FRAGMENTED';
  blockedBy: string;
  /** Polylines drawn between verified locality coordinates. */
  path: [number, number][];
}

export interface HotspotDef {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 'CRITICAL' | 'HIGH';
  note: string;
}

/** The 11 traditional migratory corridors cited in the manifesto (Section: The Hard Truth). */
export const CORRIDORS: CorridorDef[] = [
  {
    id: 'c1',
    name: 'Mudumalai–Bandipur Northern Link',
    status: 'BLOCKED',
    blockedBy: 'NH-181 fencing & resort walls',
    path: [[11.662, 76.621], [11.583, 76.584], [11.5421, 76.5145]],
  },
  {
    id: 'c2',
    name: 'Segur Plateau Corridor',
    status: 'BLOCKED',
    blockedBy: 'Night-traffic zone encroachment',
    path: [[11.5421, 76.5145], [11.521, 76.4715], [11.5034, 76.4912]],
  },
  {
    id: 'c3',
    name: 'Cherambadi–Wayanad Western Corridor',
    status: 'BLOCKED',
    blockedBy: 'Tea estate boundary walls & Kerala border fencing',
    path: [[11.512, 76.321], [11.489, 76.342]],
  },
  {
    id: 'c4',
    name: 'Pandalur–Nilambur Slopes',
    status: 'FRAGMENTED',
    blockedBy: 'Janmam land cultivation pressure',
    path: [[11.489, 76.342], [11.4921, 76.4789], [11.5034, 76.4912]],
  },
  {
    id: 'c5',
    name: "O'Valley–Mukurthi Southern Ridge",
    status: 'BLOCKED',
    blockedBy: 'Estate expansion & Lantana overgrowth',
    path: [[11.451, 76.541], [11.428, 76.519]],
  },
  {
    id: 'c6',
    name: 'Glenrock–New Hope Estate Passage',
    status: 'BLOCKED',
    blockedBy: 'Ditched estate bunds',
    path: [[11.451, 76.541], [11.438, 76.528], [11.428, 76.519]],
  },
  {
    id: 'c7',
    name: 'Devala Gold-Mines Corridor',
    status: 'FRAGMENTED',
    blockedBy: 'Abandoned mine pits & settlement spread',
    path: [[11.489, 76.342], [11.4921, 76.4789]],
  },
  {
    id: 'c8',
    name: 'Nelliyalam–Kerala Border Passage',
    status: 'BLOCKED',
    blockedBy: 'Boundary wall chain across valley floor',
    path: [[11.489, 76.342], [11.512, 76.321]],
  },
  {
    id: 'c9',
    name: 'Thorapalli–Mudumalai Gate NH-81 Corridor',
    status: 'BLOCKED',
    blockedBy: 'Highway night-closure funnel walls',
    path: [[11.5034, 76.4912], [11.5122, 76.5015], [11.5421, 76.5145]],
  },
  {
    id: 'c10',
    name: 'Kakkanallah–Bandipur Eastern Corridor',
    status: 'BLOCKED',
    blockedBy: 'Karnataka border checkpoint fencing',
    path: [[11.662, 76.621], [11.583, 76.584]],
  },
  {
    id: 'c11',
    name: 'Chembakati–Vedanvayal Interior Link',
    status: 'FRAGMENTED',
    blockedBy: 'Fenced smallholdings splitting the pocket',
    path: [[11.4921, 76.4789], [11.4965, 76.4812], [11.5034, 76.4912]],
  },
];

/** Documented frontline conflict zones (manifesto Section I footnote). */
export const HOTSPOTS: HotspotDef[] = [
  {
    id: 'h1',
    name: "Lauriston (O'Valley)",
    lat: 11.451, lng: 76.541,
    severity: 'CRITICAL',
    note: 'Repeated herd incursions into worker line quarters.',
  },
  {
    id: 'h2',
    name: 'Cherambadi',
    lat: 11.512, lng: 76.321,
    severity: 'CRITICAL',
    note: 'Tiger & elephant movement along Wayanad border estates.',
  },
  {
    id: 'h3',
    name: 'Seaforth',
    lat: 11.428, lng: 76.519,
    severity: 'HIGH',
    note: 'Remote estate bordering Mukurthi National Park wilderness.',
  },
  {
    id: 'h4',
    name: 'Glenrock',
    lat: 11.438, lng: 76.528,
    severity: 'HIGH',
    note: 'Estate bunds funnelling elephants into inhabited pockets.',
  },
  {
    id: 'h5',
    name: 'Mayfield',
    lat: 11.466, lng: 76.534,
    severity: 'HIGH',
    note: 'Diversionary raid routes through tea plucking lines.',
  },
  {
    id: 'h6',
    name: 'Pandalur Fringe Estates',
    lat: 11.489, lng: 76.342,
    severity: 'CRITICAL',
    note: 'Janmam land conflict zone adjoining elephant paths.',
  },
  {
    id: 'h7',
    name: 'Mudumalai Gate (NH-181)',
    lat: 11.5421, lng: 76.5145,
    severity: 'CRITICAL',
    note: 'Night traffic closure checkpoint — frequent crossings.',
  },
];
