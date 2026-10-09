/**
 * Voice of Gudalur — closed / restricted wildlife corridor checkpoints.
 *
 * Coordinates and notes come from the app's own master data
 * (GUDALUR_LOCALITIES — Gudalur/Nilgiris localities with border-zone
 * classification). Keep this list in sync with Gudalur Forest Division
 * night-closure and section-144 notifications.
 */
export interface ClosedCorridor {
  id: string;
  name: string;
  lat: number;
  lng: number;
  zone: string;
  note: string;
}

export const CLOSED_CORRIDORS: ClosedCorridor[] = [
  {
    id: 'thorapalli',
    name: 'Thorapalli — Mudumalai Forest Gate (NH-181)',
    lat: 11.5421,
    lng: 76.5145,
    zone: 'Northern Border (Mudumalai)',
    note: 'Northern border checkpoint and wildlife corridor where NH-181 enters Mudumalai Tiger Reserve. Night traffic closure 9PM–6AM.',
  },
  {
    id: 'kakkanallah',
    name: 'Kakkanallah — Karnataka / Bandipur Border',
    lat: 11.662,
    lng: 76.621,
    zone: 'Northern Border (Bandipur)',
    note: 'State border checkpost connecting Tamil Nadu with Karnataka (Bandipur Tiger Reserve). Wildlife transit hub.',
  },
  {
    id: 'theppakadu',
    name: 'Theppakadu — Mudumalai Tiger Reserve HQ',
    lat: 11.583,
    lng: 76.584,
    zone: 'Northern Border (Mudumalai)',
    note: 'Historic elephant camp (est. 1927) and field headquarters of Mudumalai Tiger Reserve; core elephant movement zone.',
  },
  {
    id: 'masinagudi',
    name: 'Masinagudi — Kalhatti Ghat Entry',
    lat: 11.572,
    lng: 76.643,
    zone: 'Eastern Border (Mudumalai)',
    note: 'Eastern foothills between Mudumalai and the 36-hairpin Kalhatti ghat. High tiger and elephant density.',
  },
  {
    id: 'moyar',
    name: 'Moyar Gorge & Valley',
    lat: 11.591,
    lng: 76.715,
    zone: 'Eastern Border (Mudumalai)',
    note: 'Easternmost canyon boundary of the Nilgiris and ancient wildlife migration gorge.',
  },
  {
    id: 'first-mile',
    name: 'First Mile — Gudalur–Ooty Ghat Ascent',
    lat: 11.5122,
    lng: 76.5015,
    zone: 'Central Town Fringe',
    note: 'Gateway sector along the Gudalur–Ooty ghat ascent; forest-fringe transport junction.',
  },
  {
    id: 'naduvattam',
    name: 'Naduvattam — Gudalur–Ooty Border Ridge',
    lat: 11.482,
    lng: 76.561,
    zone: 'Southern Ridge',
    note: 'High-elevation mountain crest (~2,000m) with the historic Government Cinchona factory; gate to Ooty.',
  },
  {
    id: 'ovalley',
    name: "O'Valley — Glenrock / New Hope Ridge",
    lat: 11.451,
    lng: 76.541,
    zone: 'Southern Ridge',
    note: 'Sprawling high-elevation tea basin and rainforest ridge; critical tiger–elephant encounter hotspot.',
  },
  {
    id: 'seaforth',
    name: 'Seaforth — Mukurthi National Park Border',
    lat: 11.428,
    lng: 76.519,
    zone: 'Southern Ridge',
    note: 'Remote high-altitude tea plantation bordering the Mukurthi National Park evergreen wilderness.',
  },
  {
    id: 'ss-nagar',
    name: 'SS Nagar — Elephant Fringe Buffer',
    lat: 11.5065,
    lng: 76.4952,
    zone: 'Central Town Fringe',
    note: 'Residential locality bordered by tea estates and Shola buffers; frequent elephant fringe movement zone.',
  },
  {
    id: 'nandatti',
    name: 'Nandatti — Cardamom Hill Forest Edge',
    lat: 11.521,
    lng: 76.4715,
    zone: 'Central Town Fringe',
    note: 'Hill plantation locality with spice gardens, cardamom plantations and tribal settlements at the forest edge.',
  },
];
