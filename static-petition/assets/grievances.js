/* ===========================================================================
   GRIEVANCE FACTS - the registry of what may be claimed about these two
   grievances, and of the two follow-up letters.

   ============================================================================
   HOUSE RULES - read before editing
   ============================================================================
   1. ONLY put a fact here if you can point at the record it came from. Nothing
      re-fetches this file, and neither the Cloudflare Worker nor D1 knows it
      exists. A wrong figure here is a wrong claim about a government record,
      which is the one mistake this site cannot make.
   2. Every grievance carries a `source` string: the sentence its page prints
      under the fact. A fact with no source line is not finished.
   3. Unknown is a legal value. An empty `dateFiled` or `status` means the page
      renders "Not shown in the record." Do not fill a gap with a plausible
      guess; an empty field is a to-do, a guess is a lie.
   4. The petitioner's personal identifiers (name, door number, phone) are
      deliberately absent and must stay absent.
   5. `recordText` holds the record's own wording, unedited. If the record is
      in another language, keep that text as it stands and let the page label
      it - do not paraphrase a government record and present that as the record.

   ---------------------------------------------------------------------------
   HOW THE PAGES USE THIS FILE - they do not read it
   ---------------------------------------------------------------------------
   The three pages are static HTML, so they keep working with JavaScript
   disabled and can be read by anything, including the in-app browsers most
   people in Gudalur arrive through. That means every figure and every letter
   is written out in the pages as well as here.

   The duplication is deliberate and policed rather than hidden:
   tests-static/static-site.contract.test.ts loads this file and fails if the
   two copies drift - if a figure here stops appearing on the pages that should
   carry it, if it appears on a page that must not carry it (#19177921 must
   never show #18982473's numbers), or if a letter printed on a page stops
   matching the one the email button would send. Be aware of what it does NOT
   check: it does not police new numbers typed into prose, so a hand-written
   statistic in a paragraph is still on the author's conscience.

   So: fix a fact here AND in the page. The test will name both.
   ---------------------------------------------------------------------------

   STATUS OF THIS FILE AT HAND-OVER  (29 Sep 2026)
   ---------------------------------------------------------------------------
   Carried over from the brief, and nothing else: both grievance IDs, their two
   subjects, the two loss figures for #18982473 (85 human deaths, 53 elephant
   deaths), and the two follow-up letters. Filing dates, statuses and the
   records' own lists of demands are deliberately blank.
   ------------------------------------------------------------------------- */

var SRC_GR1 = 'Source: grievance record #18982473, as held by the petitioner.';
var SRC_GR2 = 'Source: grievance record #19177921, as held by the petitioner.';

/* --- #18982473 - Safety: human-wildlife conflict ------------------------- */
window.VOG_GR1 = {
  id: '18982473',
  kind: 'Safety',
  subject: 'Human-wildlife conflict in Gudalur',
  dateFiled: '',            /* fill from the record */
  location: 'Gudalur, The Nilgiris, Tamil Nadu',
  status: '',               /* fill from the record, verbatim. Never a guess. */
  recordText: '',
  source: SRC_GR1,
  /* the two loss figures the brief carries, kept as separate entries so each
     one gets its own visible source line */
  facts: [
    { value: '85', unit: 'human deaths', note: 'recorded in the grievance' },
    { value: '53', unit: 'elephant deaths', note: 'recorded in the grievance' }
  ],
  asks: []
};

/* --- #19177921 - Transformation: the long-term plan ---------------------- */
window.VOG_GR2 = {
  id: '19177921',
  kind: 'Transformation',
  subject: 'A long-term plan for Gudalur',
  dateFiled: '',            /* fill from the record */
  location: 'Gudalur, The Nilgiris, Tamil Nadu',
  status: '',               /* fill from the record, verbatim. Never a guess. */
  recordText: '',
  source: SRC_GR2,
  facts: [],
  asks: []
};

/* --- the two follow-up letters, keyed by grievance ------------------------
   These are written to be sent TO the government, so they are plain text held
   here rather than copy that lives in the page body - the page prints the
   same string its email button sends (the Gmail web-compose link), which keeps
   the two from drifting apart. No status is asserted in either one. */
window.VOG_LETTERS = {
  '18982473': {
    subject: 'Follow-up: grievance ID 18982473 (Gudalur, Nilgiris)',
    body: 'Respected Sir or Madam,\n\n' +
      'I am following up on grievance ID 18982473 concerning human-wildlife ' +
      'conflict in Gudalur, Nilgiris district.\n\n' +
      'I would like to know the latest action taken on this grievance and the ' +
      'stage it has reached. Please treat this as a request for a status ' +
      'update on an existing grievance, not as a new complaint.\n\n' +
      'Thank you.'
  },
  '19177921': {
    subject: 'Follow-up: grievance ID 19177921 (Gudalur, Nilgiris)',
    body: 'Respected Sir or Madam,\n\n' +
      'I am following up on grievance ID 19177921 concerning a long-term ' +
      'development plan for the Gudalur area.\n\n' +
      'I would like to know the latest action taken on this grievance and the ' +
      'stage it has reached. Please treat this as a request for a status ' +
      'update on an existing grievance, not as a new complaint.\n\n' +
      'Thank you.'
  }
};

