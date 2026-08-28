// ============================================================================
// STATIC, VERIFIABLE CONTENT — verified national numbers only.
// Locality-specific and department-specific numbers are deliberately absent
// until verified by an administrator in Supabase (localities + safety_resources
// paths). We never invent a phone number.
// ============================================================================

export interface EmergencyContact {
  name: string;
  number: string;
  note: string;
  scope: 'NATIONAL' | 'STATE';
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'National Emergency Helpline', number: '112', note: 'Police, fire, medical — all India', scope: 'NATIONAL' },
  { name: 'Ambulance', number: '108', note: 'Emergency medical response', scope: 'NATIONAL' },
  { name: 'Police Control Room', number: '100', note: '24×7', scope: 'NATIONAL' },
  { name: 'Fire & Rescue', number: '101', note: '24×7', scope: 'NATIONAL' },
  { name: 'Forest Department — Tamil Nadu', number: '1800-425-9010', note: 'Toll-free wildlife information line (state forest HQ)', scope: 'STATE' },
];

export const EMERGENCY_DISCLAIMER =
  'In a life-threatening emergency always call 112 first. Locality-specific forest and rapid-response numbers will be published here only after they are verified by the platform team.';

export interface SafetyInstruction {
  title: string;
  points: string[];
}

export const SAFETY_INSTRUCTIONS: Record<'ELEPHANT' | 'TIGER' | 'SNAKE', SafetyInstruction> = {
  ELEPHANT: {
    title: 'If you see an elephant',
    points: [
      'Do not approach, chase, surround or provoke the animal.',
      'Keep maximum distance and leave quietly the way you came.',
      'Never position yourself between an elephant and its calf or escape route.',
      'Move indoors or uphill if possible; avoid running along the road ahead of it.',
      'Report the sighting with location, time and direction of movement.',
    ],
  },
  TIGER: {
    title: 'If you see a tiger or leopard',
    points: [
      'Do not run. Back away slowly while facing the animal.',
      'Do not crouch, turn your back, or attempt photographs.',
      'Keep children close and move to a vehicle or building immediately.',
      'Inform the Forest Department and stay indoors until the area is declared safe.',
      'Report the sighting with location, time and direction of movement.',
    ],
  },
  SNAKE: {
    title: 'If you see a snake',
    points: [
      'Freeze, then back away slowly. Most bites happen during interference.',
      'Never try to catch, kill or photograph the snake.',
      'In case of a bite: keep the victim calm and still, immobilise the limb, and call 108 immediately.',
      'Do not cut, suck or tie the wound; do not wait for symptoms to go to hospital.',
    ],
  },
};

export const SITE_IDENTITY = {
  name: 'Voice of Gudalur',
  tagline: 'Protect People. Protect Wildlife. Protect Gudalur.',
  movement: 'ONE GUDALUR',
};
