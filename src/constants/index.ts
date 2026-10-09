
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

/** Petition signature milestone shown on the campaign momentum bar. */
export const CAMPAIGN_GOAL = 185460;

/**
 * The movement's WhatsApp Business desk number for citizen voice reports.
 * International format, no "+" prefix (e.g. 919442555XXX).
 * PLACEHOLDER until the official WhatsApp Business Platform number is
 * provisioned — the voice-report UI stays locked while this is not a
 * plausible Indian mobile number (91 + [6-9] + 8 digits).
 */
export const VOG_WHATSAPP_NUMBER = '910000000000';
