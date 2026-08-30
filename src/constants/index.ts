
export const AREAS = [
  'Gudalur Town',
  'O’Valley',
  'Nelliyalam',
  'Devarshola',
  'Padanthurai',
  'Thorapalli',
  'Masinagudi',
  'Cherambadi',
  'Pandalur',
  'Other'
];

export const CATEGORIES = [
  'Elephant Alert',
  'Accident',
  'Water Issue',
  'Civic Problem',
  'Emergency'
] as const;

export const ALERT_LEVELS = {
  1: { label: 'Emergency', color: 'text-red-600 bg-red-50 border-red-200' },
  2: { label: 'Important', color: 'text-orange-600 bg-orange-50 border-orange-200' },
  3: { label: 'General', color: 'text-blue-600 bg-blue-50 border-blue-200' }
};
