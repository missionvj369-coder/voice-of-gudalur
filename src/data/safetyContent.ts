// ============================================================================
// SAFETY CONTENT — Gudalur 365 model, citizen priorities, emergency contacts
// Data integrity rules:
//  * Emergency numbers below are national, officially published Indian
//    emergency numbers (ERSS 112, ambulance 108, police 100, fire 101,
//    women's helpline 181, child helpline 1098).
//  * Department-level numbers are listed only with a source note; when a
//    verified Gudalur division number is configured it comes from Supabase.
// ============================================================================

export interface EmergencyContact {
  name: string;
  number: string;
  scope: 'NATIONAL' | 'STATE' | 'DISTRICT';
  note?: string;
  verified: boolean;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'Emergency Response (ERSS 112)', number: '112', scope: 'NATIONAL', note: 'Police, fire, medical — single national number', verified: true },
  { name: 'Ambulance', number: '108', scope: 'NATIONAL', note: 'TN Emergency Medical Services', verified: true },
  { name: 'Police Control', number: '100', scope: 'NATIONAL', verified: true },
  { name: 'Fire & Rescue', number: '101', scope: 'NATIONAL', verified: true },
  { name: "Women's Helpline", number: '181', scope: 'NATIONAL', verified: true },
  { name: 'Child Helpline', number: '1098', scope: 'NATIONAL', verified: true },
  { name: 'Forest Dept Wildlife Rescue / RRT', number: 'Data not yet published', scope: 'DISTRICT', note: 'Gudalur Forest Division RRT number pending official verification — will be published once confirmed', verified: false },
];

// --------------------------------------------------------------------------
// GUDALUR 365 — the year-round safety model
// --------------------------------------------------------------------------
export interface Pillar {
  key: string;
  title: string;
  text: string;
}

export const GUDALUR_365: Pillar[] = [
  { key: 'monitor', title: 'Monitor', text: 'Keep watch on wildlife movement around settlements, roads and schools — through community reporting, verified sightings and, when available, official detection systems.' },
  { key: 'protect', title: 'Protect', text: 'Put people first: safe routes to school, lighting and visibility where appropriate, barriers that are actually maintained, and clear safety guidance for vulnerable settlements.' },
  { key: 'respond', title: 'Respond', text: 'Push for rapid, trained response to every incident — a working emergency chain from the first phone call to the arrival of the forest rapid response team.' },
  { key: 'record', title: 'Record', text: 'Document every sighting and incident with time, place and evidence. Reliable records are the foundation of safety, compensation claims and accountability.' },
  { key: 'analyse', title: 'Analyse', text: 'Study patterns — seasons, corridors, crossings, hotspots — so that prevention is based on evidence, not memory or luck.' },
  { key: 'prevent', title: 'Prevent', text: 'Act before conflict: early warning, corridor clarity, waste management that does not attract wildlife, and safety habits taught year-round.' },
  { key: 'restore', title: 'Restore', text: 'Support the long-term fix — protected corridors and landscape connectivity so wildlife can move without passing through human lives.' },
];

// --------------------------------------------------------------------------
// CITIZEN PRIORITIES — Gudalur's ten public safety demands
// These are policy recommendations by citizens, NOT government commitments.
// --------------------------------------------------------------------------
export interface Priority {
  n: number;
  title: string;
  text: string;
}

export const SAFETY_PRIORITIES: Priority[] = [
  { n: 1, title: '24/7 human–wildlife emergency response', text: 'A permanent, properly staffed rapid response capability for Gudalur region — reachable by phone at any hour, with published response-time standards.' },
  { n: 2, title: 'Scientific corridor mapping', text: 'An official, published map of elephant and wildlife movement corridors across Gudalur taluk, updated regularly and used in all planning decisions.' },
  { n: 3, title: 'Barrier and EPT maintenance', text: 'A schedule of inspection and maintenance for elephant-proof trenches and barriers where they are the appropriate measure — with public reporting of their condition.' },
  { n: 4, title: 'Early-warning and detection systems', text: 'Permanent wildlife detection and warning infrastructure in high-risk locations — and honest public alerts when such systems are (or are not) yet in place.' },
  { n: 5, title: 'Safety nodes for high-risk settlements', text: 'Local safety arrangements — trained coordinators, communication trees, assembly guidance — for the settlements closest to active wildlife movement.' },
  { n: 6, title: 'Annual conflict safety audit', text: 'A yearly, published human–wildlife conflict safety audit for Gudalur: incidents, response times, infrastructure condition and corrective actions.' },
  { n: 7, title: 'Transparent incident reporting', text: 'Public, timely reporting of incidents and official response times, so citizens and the administration work from the same facts.' },
  { n: 8, title: 'School and public-area protection', text: 'Special safety assessment and measures around schools, bus stops and other places where people gather in high-risk areas.' },
  { n: 9, title: 'Lawful tiger-conflict response', text: 'Tiger and leopard conflict handled strictly within the legal framework — NTCA guidance, trained capture teams, and calm, factual public communication.' },
  { n: 10, title: 'Long-term habitat and corridor management', text: 'Habitat improvement, invasive species control and corridor restoration so wildlife is not forced into human spaces in the first place.' },
];

export const SAFETY_DO: string[] = [
  'Move away calmly. Do not run suddenly or turn your back on the animal.',
  'If you see an elephant on a road, stay in your vehicle, keep distance, and wait — do not honk or flash to move it.',
  'Report the sighting with place, time and direction as soon as you are safe.',
  'At night, use torches on paths around homes in forest-edge areas.',
  'Warn neighbours — a safe locality is an informed locality.',
];

export const SAFETY_DONT: string[] = [
  'Do not approach, chase, surround or provoke any wild animal.',
  'Do not crowd an animal for photographs or video.',
  'Do not feed wildlife or leave waste that attracts animals near homes.',
  'Do not enter forest paths to \u201cshoo away\u201d animals.',
  'Do not spread unverified rumours — share verified alerts only.',
];
