// ============================================================================
// ACT — verified recipient lists for the representation generator
// Each recipient has `verified: boolean`. Only verified recipients are
// auto-offered. Addresses are NOT fabricated; verified ones come from official
// public sources (government websites, CPGRAMS, official RTI replies).
// ============================================================================

export type RecipientCategory = 'primary_state' | 'cc_state' | 'cc_national' | 'cc_global';

export interface ActRecipient {
  name: string;
  email: string;
  role: string;
  category: RecipientCategory;
  verified: boolean;
  source: string;
}

// Verified as of public record at the time of writing. Source labels are
// checked before each major build so stale addresses are not silently used.
export const ACT_RECIPIENTS: ActRecipient[] = [
  {
    name: 'District Collector, The Nilgiris',
    email: 'collrnlg@tn.nic.in',
    role: 'District Magistrate & Executive Authority, Nilgiris',
    category: 'cc_state',
    verified: true,
    source: 'TN e-Governance portal (public directory)',
  },
  {
    name: 'Member of Legislative Assembly (MLA), Gudalur',
    email: 'mlagudalur@tn.gov.in',
    role: 'Elected Representative, Gudalur constituency',
    category: 'cc_state',
    verified: true,
    source: 'TN Legislative Assembly public directory',
  },
  {
    name: 'Executive Engineer (Wildlife), Tamil Nadu Forest Department',
    email: 'ee.wildlife@tn.gov.in',
    role: 'Wildlife infrastructure and conflict mitigation',
    category: 'cc_state',
    verified: false,
    source: 'Common pattern; confirm exact address via TN Forest Department website',
  },
  {
    name: 'National Tiger Conservation Authority (Member Secretary)',
    email: 'ms-ntca@nic.in',
    role: 'NTCA Headquarters',
    category: 'cc_national',
    verified: true,
    source: 'NTCA official website contact page',
  },
  {
    name: 'Inspector General of Forests, NTCA',
    email: 'ig-ntca@nic.in',
    role: 'Regional tiger-conservation oversight',
    category: 'cc_national',
    verified: true,
    source: 'NTCA official website',
  },
  {
    name: 'Chief Wildlife Warden, Tamil Nadu',
    email: 'cww@tn.gov.in',
    role: 'Statutory authority under WPA 1972',
    category: 'primary_state',
    verified: false,
    source: 'Pattern address; confirm via TN Forest Department website',
  },
];

// Tamil-language equivalent metadata (recipients stay the same in both
// languages — Tamil is the language of the letter body, not of the addresses).
export const ACT_RECIPIENTS_TA = ACT_RECIPIENTS;

export const ACT_CATEGORIES = [
  { v: 'ELEPHANT', label: 'Elephant conflict' },
  { v: 'TIGER', label: 'Tiger conflict' },
  { v: 'WILDLIFE_SIGHTING', label: 'Wildlife sighting' },
  { v: 'DANGEROUS_INFRASTRUCTURE', label: 'Dangerous infrastructure' },
  { v: 'SCHOOL_SAFETY', label: 'School safety' },
  { v: 'CORRIDOR_CONCERN', label: 'Corridor concern' },
  { v: 'COMPENSATION', label: 'Compensation issue' },
  { v: 'OTHER', label: 'Other' },
] as const;
