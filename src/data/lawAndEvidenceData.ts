// ============================================================================
// LAW & EVIDENCE — legal framework reference
// Every entry links to an official or primary source. We do not assert that a
// specific notification imposes a specific obligation unless the document
// itself is in the Evidence Room. Explanations of core/buffer, relocation and
// rights are framed as how the law works — not as legal advice.
// ============================================================================

export interface LawEntry {
  id: string;
  title: string;
  authority: string;
  summary: string;
  gudalurNote: string;
  sources: { label: string; url: string }[];
}

export const LAW_ENTRIES: LawEntry[] = [
  {
    id: 'article-21',
    title: 'Article 21 — Right to Life',
    authority: 'Constitution of India',
    summary: 'Guarantees life and personal liberty. Courts have read into it the right to a safe and healthy environment, placing a duty on the state to protect people from preventable harm.',
    gudalurNote: 'This is the constitutional foundation of our platform: protection of human life in Gudalur is an obligation of governance — and it coexists with the duty to protect wildlife under the same constitutional order.',
    sources: [{ label: 'India Code — Constitution of India', url: 'https://www.indiacode.nic.in' }],
  },
  {
    id: 'wpa-1972',
    title: 'Wildlife (Protection) Act, 1972',
    authority: 'Government of India',
    summary: 'India\u2019s principal wildlife statute. It schedules species for protection, regulates hunting (with narrow, lawful exceptions for dangerous animals under Section 11 on the Chief Wildlife Warden\u2019s order), protects habitats, and empowers seizure and prosecution.',
    gudalurNote: 'Elephants, tigers and leopards are highly protected scheduled species. Any response to a dangerous animal must flow through the Act\u2019s procedures — never through private action. Killing or attempting to kill these animals is a serious offence.',
    sources: [{ label: 'India Code — Wildlife (Protection) Act, 1972', url: 'https://www.indiacode.nic.in' }],
  },
  {
    id: 'tiger-framework',
    title: 'Tiger Reserve framework & NTCA',
    authority: 'Wildlife (Protection) Act, 1972 · NTCA',
    summary: 'Tiger reserves are notified with core and buffer zones carrying different legal functions. The National Tiger Conservation Authority issues advisories on tiger conflict management, including capture and, in extreme verified cases, removal of specific problem animals through due process.',
    gudalurNote: 'Mudumalai Tiger Reserve lies beside Gudalur. The core/buffer distinction matters: a buffer is not a core, and living outside a core does not by itself create any obligation to move. Conflict response near the reserve must follow NTCA guidance and TN Forest Department procedure.',
    sources: [
      { label: 'National Tiger Conservation Authority', url: 'https://ntca.gov.in' },
      { label: 'TN Forest Department — Mudumalai Tiger Reserve', url: 'https://www.forests.tn.gov.in' },
    ],
  },
  {
    id: 'fra-2006',
    title: 'Forest Rights Act, 2006',
    authority: 'Ministry of Tribal Affairs',
    summary: 'Recognizes individual and community rights of Scheduled Tribes and other traditional forest dwellers over forest land they have traditionally used. Relocation from protected areas, where it occurs, requires free and informed consent and due process under the Act.',
    gudalurNote: 'Gudalur\u2019s land-tenure history — janmam estates, settlements and later conversions — is among the most complicated in Tamil Nadu. Any talk of relocation or rights must start from official records, not from rumours or distance rules.',
    sources: [{ label: 'Ministry of Tribal Affairs — FRA', url: 'https://tribal.nic.in' }],
  },
  {
    id: 'esz',
    title: 'Eco-Sensitive Zone notifications',
    authority: 'Ministry of Environment, Forest and Climate Change',
    summary: 'ESZ notifications, issued under the Environment (Protection) Act, 1986, regulate activities around protected areas. Each notification is area-specific and published in the Gazette.',
    gudalurNote: 'What is permitted or prohibited around Mudumalai depends on the exact notification text. This platform will publish and link the relevant notification only when the document itself is verified in the Evidence Room — until then we make no claim about its contents.',
    sources: [{ label: 'MoEFCC', url: 'https://moef.gov.in' }],
  },
  {
    id: 'citizen-tools',
    title: 'RTI, CPGRAMS & grievance channels',
    authority: 'Government of India / Government of Tamil Nadu',
    summary: 'The Right to Information Act, 2005 lets citizens request records from public authorities. CPGRAMS and the Tamil Nadu CM\u2019s Special Cell provide formal grievance channels that create documented trails.',
    gudalurNote: 'These are the platform\u2019s primary lawful tools: every question in our Government Action Tracker can be pursued through them, and every reply becomes evidence.',
    sources: [
      { label: 'CPGRAMS', url: 'https://pgportal.gov.in' },
      { label: 'TN CM Special Cell', url: 'https://cmcell.tn.gov.in' },
    ],
  },
];

// Official portals usable as a starter evidence registry (links only —
// no invented documents). Platform-hosted records come from Supabase.
export const OFFICIAL_PORTALS: { name: string; url: string; note: string }[] = [
  { name: 'India Code — central Acts', url: 'https://www.indiacode.nic.in', note: 'Full text of the Wildlife (Protection) Act, 1972 and other statutes' },
  { name: 'National Tiger Conservation Authority', url: 'https://ntca.gov.in', note: 'Tiger conservation frameworks and advisories' },
  { name: 'Tamil Nadu Forest Department', url: 'https://www.forests.tn.gov.in', note: 'State forest administration, Mudumalai Tiger Reserve' },
  { name: 'Ministry of Tribal Affairs — FRA', url: 'https://tribal.nic.in', note: 'Forest Rights Act rules, forms and notifications' },
  { name: 'CPGRAMS', url: 'https://pgportal.gov.in', note: 'Central public grievance redress and monitoring system' },
  { name: 'TN CM Special Cell', url: 'https://cmcell.tn.gov.in', note: 'Tamil Nadu Chief Minister\u2019s grievance cell' },
];

export const ACTION_STATUSES = ['SUBMITTED', 'ACKNOWLEDGED', 'RESPONSE_RECEIVED', 'ACTION_REPORTED', 'FOLLOW_UP_REQUIRED'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  SUBMITTED: 'SUBMITTED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESPONSE_RECEIVED: 'RESPONSE RECEIVED',
  ACTION_REPORTED: 'ACTION REPORTED',
  FOLLOW_UP_REQUIRED: 'FOLLOW-UP REQUIRED',
};
