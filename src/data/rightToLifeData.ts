// ============================================================================
// THE GUDALUR RIGHT TO LIFE — manifesto structure
// Integrity rules applied throughout:
//  * No unverified statistics — the text points to the Evidence Room instead.
//  * Legal claims are limited to well-established statutes, listed in SOURCES.
//  * Failures are framed as citizen concerns pending verification.
// ============================================================================

export interface RtlSection {
  n: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export const RTL_SECTIONS: RtlSection[] = [
  {
    n: '01',
    title: 'What is happening?',
    paragraphs: [
      'Gudalur taluk, on the western slopes of the Nilgiris, is a living landscape shared by people, plantations and wildlife. Elephants move through it year-round. Tigers and leopards live in and around the forests that touch our settlements.',
      'In recent years, residents across O\u2019Valley, Cherambadi, Pandalur, Devala and the Gudalur town area have reported elephants entering settlements and estates, big cats close to homes, and — tragically — fatal encounters. Every incident documented on this platform is published in the Evidence Room with its verification status.',
      'We state plainly what is verified and withhold what is not. Where a number cannot yet be substantiated, we write \u201cdata not yet available\u201d rather than guess.',
    ],
  },
  {
    n: '02',
    title: 'Why does human\u2013wildlife conflict occur?',
    paragraphs: ['Conflict builds where the landscape stops working for both people and animals. The best-documented drivers in fragmented landscapes like Gudalur are:'],
    bullets: [
      'Habitat fragmentation — estates, roads and settlements interrupt paths wildlife has used for generations.',
      'Corridor obstruction — when a traditional movement route is blocked, animals seek alternatives that often pass close to homes.',
      'Food attractants — crops and improperly managed waste draw animals toward human spaces.',
      'Invasive species — plants such as lantana degrade native forage inside forests, pushing animals to seek food outside.',
      'Night-time risk — reduced visibility on roads and paths raises the chance of sudden encounters.',
      'Seasonal pressure — dry seasons concentrate movement near human water sources.',
    ],
  },
  {
    n: '03',
    title: 'What does the law provide?',
    paragraphs: [
      'The right to life and personal liberty under Article 21 of the Constitution of India has been interpreted by the courts to include the right to a safe environment. Protecting citizens from preventable harm is a constitutional obligation, not a favour.',
      'The Wildlife (Protection) Act, 1972 regulates the protection of wild animals and the powers of the state\u2019s Chief Wildlife Warden — including lawful handling of animals that endanger human life, through the procedures the Act prescribes.',
      'The Forest Rights Act, 2006 recognizes the rights of forest-dwelling communities. In Gudalur — where land-tenure history is unusually complicated — rights and procedures under this Act matter to any discussion of land, relocation or conservation.',
      'Tiger reserves operate within the framework of the Act and National Tiger Conservation Authority guidance. Core and buffer areas carry different legal functions; there is no blanket rule that people must leave land simply because it lies within a stated distance of a reserve. Exact legal status must always be read from official records.',
    ],
  },
  {
    n: '04',
    title: 'What has failed?',
    paragraphs: [
      'We distinguish carefully between what residents report, what documents can prove, and what remains unverified. Citizens repeatedly raise the following concerns; each stays on this page only while it is backed by material in the Evidence Room — and will be corrected if the record shows otherwise.',
    ],
    bullets: [
      'Residents report barriers and trenches that are not maintained, allowing animals into unexpected places.',
      'Residents report emergency response that is delayed or unavailable at night, when risk is highest.',
      'Residents report movement routes never scientifically mapped in public, so planning happens blind.',
      'Residents report incidents recorded verbally but never published, so patterns cannot be studied or prevented.',
    ],
  },
  {
    n: '05',
    title: 'What Gudalur needs now',
    paragraphs: [
      'Gudalur does not need slogans. It needs a permanent, science-based safety system. Our ten citizen priorities — from a 24/7 emergency chain to corridor restoration — are listed under Safety Priorities, each as a specific, measurable demand that can be audited year after year.',
      'None of these is presented as a government commitment. They are recommendations, made publicly and documented, for the administration to adopt and the public to inspect.',
    ],
  },
  {
    n: '06',
    title: 'What citizens can do',
    paragraphs: ['Responsible participation is the platform\u2019s core method:'],
    bullets: [
      'Report what you personally observe — never approach wildlife for a photograph.',
      'Subscribe to locality safety alerts and help neighbours verify information.',
      'Contribute documents — orders, replies, notices — to the Evidence Room.',
      'Use lawful tools: RTI applications, CPGRAMS and the representation generator on the Act page.',
      'Refuse to share rumours; a false alarm can endanger both people and animals.',
    ],
  },
  {
    n: '07',
    title: 'Our commitments',
    paragraphs: ['This platform commits to:'],
    bullets: [
      'Put human safety first — without ever encouraging harm to wildlife.',
      'Publish evidence with sources, and correct errors openly.',
      'Never present an unverified community report as an official record.',
      'Act within the law, and demand that all parties act within the law.',
      'Protect the privacy of every person who reports through this platform.',
    ],
  },
];

export const RTL_SOURCES: { title: string; authority: string; url: string; note?: string }[] = [
  { title: 'The Constitution of India — Article 21', authority: 'Government of India', url: 'https://www.indiacode.nic.in', note: 'Right to life and personal liberty' },
  { title: 'Wildlife (Protection) Act, 1972', authority: 'Government of India', url: 'https://www.indiacode.nic.in', note: 'Statutory protection of wildlife; powers of the Chief Wildlife Warden' },
  { title: 'Forest Rights Act, 2006', authority: 'Ministry of Tribal Affairs', url: 'https://tribal.nic.in', note: 'Recognition of forest-dweller rights' },
  { title: 'National Tiger Conservation Authority', authority: 'NTCA', url: 'https://ntca.gov.in', note: 'Tiger conservation framework and advisories' },
  { title: 'Tamil Nadu Forest Department', authority: 'Government of Tamil Nadu', url: 'https://www.forests.tn.gov.in', note: 'State forest administration and conflict handling' },
  { title: 'Documented incidents & replies', authority: 'Voice of Gudalur', url: '/evidence', note: 'Verified records maintained in the Evidence Room' },
];
