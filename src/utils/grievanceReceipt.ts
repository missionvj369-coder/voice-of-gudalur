/**
 * Voice of Gudalur — Professional Official Receipt (shared by the signing page
 * and the verification page).
 *
 * The generated PDF contains BOTH:
 *   1. The Mudhalvarin Mugavari grievance page that was actually submitted to
 *      the Chief Minister (grievance grant number), reproduced faithfully with
 *      the official reference, department routing, dates and the Tamil
 *      petition (rendered through the browser canvas so Tamil shaping is real).
 *   2. The signer's certification block — name, supporter ID, their own typed
 *      address, signature hash, batch and the public verification URL — so the
 *      receipt is a single professional document tying the citizen's signature
 *      to the official grievance.
 *
 * NATIONAL movement: every field below honours the signer's OWN registered
 * details (name, supporter ID, typed address, GPS coords) — no place is ever
 * preset or defaulted to "Gudalur"; supporters from any district of India sign
 * with their own address and it is reflected verbatim on the receipt.
 */
import { GRIEVANCE, GRIEVANCE_REFERENCE, GRIEVANCE_URL } from '../components/GrievanceTicket';

export interface ReceiptSigner {
  name: string;
  gdrId: string;
  address: string;
  phoneLast4?: string;
  aadhaarLast4?: string;
}

export interface BuildReceiptOpts {
  signer: ReceiptSigner;
  batchNo: number;
  signHash: string;
  signedAtUTC: string;
  verifyUrl: string;
  verifiedAtUTC?: string;
}

const FONT_URL = '/fonts/NotoSansTamil-Regular.ttf';

/* ---------------------------------------------------------------- */
/* Tamil font helper — the browser performs proper complex-text      */
/* shaping on a canvas, then the receipt embeds that canvas as an    */
/* image (jsPDF cannot shape Tamil itself).                          */
/* ---------------------------------------------------------------- */

let tamilFontPromise: Promise<boolean> | null = null;

async function ensureTamilFont(): Promise<boolean> {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return false;
  if (document.fonts?.check ? document.fonts.check('12px NotoSansTamil') : false) return true;
  if (tamilFontPromise) return tamilFontPromise;
  tamilFontPromise = (async () => {
    try {
      const res = await fetch(FONT_URL);
      if (!res.ok) return false;
      const buffer = await res.arrayBuffer();
      const face = new FontFace('NotoSansTamil', buffer);
      const loaded = await face.load();
      document.fonts.add(loaded);
      return true;
    } catch {
      return false;
    }
  })();
  return tamilFontPromise;
}
/** Wrap + draw Tamil text on a canvas so the browser shapes the glyphs. */
async function renderTamilCanvas(text: string, widthPt: number, fontSizePt: number): Promise<HTMLCanvasElement> {
  const scale = 2;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${Math.round(fontSizePt * scale)}px NotoSansTamil, 'Noto Sans Tamil', sans-serif`;
  const widthPx = Math.round(widthPt * scale);

  const wrap = (raw: string): string[] => {
    const lines: string[] = [];
    for (const paragraph of raw.split('\n')) {
      const words = paragraph.split(/(\s+)/);
      let line = '';
      for (const w of words) {
        const attempt = line + w;
        if (ctx && ctx.measureText(attempt).width > widthPx - 16 && line) {
          lines.push(line);
          line = w.trim();
        } else {
          line = attempt;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  };

  ctx!.font = font;
  const lines = wrap(text);
  const lineHeight = Math.round(fontSizePt * scale * 1.6);
  const pad = Math.round(fontSizePt * scale * 0.9);

  canvas.width = widthPx;
  canvas.height = pad * 2 + lines.length * lineHeight;

  ctx!.fillStyle = '#ffffff';
  ctx!.fillRect(0, 0, canvas.width, canvas.height);
  ctx!.font = font;
  ctx!.fillStyle = '#16271a';
  ctx!.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    ctx!.fillText(l, pad, pad + i * lineHeight + lineHeight * 0.8);
  });
  return canvas;
}

/* ---------------------------------------------------------------- */
/* Layout helpers                                                    */
/* ---------------------------------------------------------------- */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const CW = PAGE_W - M * 2;

type Doc = import('jspdf').jsPDF;

function header(doc: Doc) {
  // Official green band
  doc.setFillColor(11, 62, 27);
  doc.rect(0, 0, PAGE_W, 88, 'F');
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 88, PAGE_W, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('VOICE OF GUDALUR', M, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Mudhalvarin Mugavari (CM Helpline 1100) — Official Grievance & Digital Signature Receipt', M, 56);
  doc.setFontSize(8);
  doc.setTextColor(190, 227, 199);
  doc.text('Grievance grant No. ' + GRIEVANCE_REFERENCE + '  ·  Portal ticket ' + GRIEVANCE.portalTicket, M, 74);
}

function metaGrid(doc: Doc, rows: Array<[string, string]>, y: number): number {
  const colW = CW / 2;
  doc.setFontSize(9);
  rows.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = M + col * colW;
    const yy = y + row * 20;
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(label + ':', x, yy);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const maxWidth = colW - 8;
    doc.text(doc.splitTextToSize(value, maxWidth), x + 84, yy, { maxWidth });
  });
  return y + Math.ceil(rows.length / 2) * 20;
}

function sectionTitle(doc: Doc, text: string, y: number): number {
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(1);
  doc.line(M, y - 4, PAGE_W - M, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 62, 27);
  doc.text(text, M, y);
  return y + 4;
}

function pageFoot(doc: Doc) {
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(M, PAGE_H - 44, PAGE_W - M, PAGE_H - 44);
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');
  doc.text('Page ' + doc.getNumberOfPages() + ' · Voice of Gudalur · machine-verifiable official receipt', M, PAGE_H - 30);
}
/**
 * Build + download the combined official receipt.
 *   Page 1 — the Mudhalvarin Mugavari grievance (official page, grievance No.)
 *   Page 2 — the supporter's digital signature certification.
 */
export async function buildVerifiedSignatureReceipt(opts: BuildReceiptOpts): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const tamilReady = await ensureTamilFont();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  /* ───────────────────────── PAGE 1 : GRIEVANCE ───────────────────────── */
  header(doc);
  let y = 118;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Official Grievance — submitted to the Chief Minister of Tamil Nadu', M, y);
  y += 18;

  // Grievance number — very prominent.
  doc.setFillColor(239, 246, 244);
  doc.setDrawColor(167, 213, 178);
  doc.roundedRect(M, y, CW, 34, 5, 5, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text('GRIEVANCE NUMBER', M + 10, y + 12);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 62, 27);
  doc.text(GRIEVANCE.officialReference, M + 10, y + 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Portal ticket: ' + GRIEVANCE.portalTicket, PAGE_W - M - 10, y + 27, { align: 'right' });
  y += 46;

  y = metaGrid(doc, [
    ['Status', GRIEVANCE.status],
    ['Created', GRIEVANCE.createdOn],
    ['Due', GRIEVANCE.dueOn],
    ['Channel', GRIEVANCE.channel],
    ['Department', GRIEVANCE.department],
    ['Sub-department', GRIEVANCE.subDepartment],
    ['Assigned to', GRIEVANCE.assignedTo],
    ['Officer', GRIEVANCE.responsibleOfficer],
    ['District', GRIEVANCE.district],
    ['Taluk', GRIEVANCE.taluk],
    ['Revenue Division', GRIEVANCE.revenueDivision],
    ['Attachment', GRIEVANCE.attachment],
  ], y);
  y += 12;

  y = sectionTitle(doc, 'Petition (Tamil — original)', y + 6);

  if (tamilReady) {
    const canvas = await renderTamilCanvas(GRIEVANCE.petitionTa, CW - 24, 10.5);
    const aspect = canvas.width / canvas.height;
    const imgW = Math.min(CW - 24, 470);
    const imgH = imgW / aspect;
    if (y + imgH + 30 > PAGE_H - 50) {
      doc.addPage();
      header(doc);
      y = 118;
    }
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', M + 12, y, imgW, imgH, undefined, 'FAST');
    y += imgH;
  } else {
    const lines = doc.splitTextToSize(GRIEVANCE.petitionTa, CW - 24) as string[];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    lines.forEach((l) => {
      if (y > PAGE_H - 60) { doc.addPage(); header(doc); y = 118; }
      doc.text(l, M + 12, y);
      y += 13;
    });
  }
  y += 8;

  // English translation of the petition — reproduced on the same professional
  // receipt so any supporter (from any state) can read the grievance in English.
  y = sectionTitle(doc, 'Petition (English translation)', y + 4);
  const enLines = doc.splitTextToSize(GRIEVANCE.petitionEn, CW - 24) as string[];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  enLines.forEach((l) => {
    if (y > PAGE_H - 60) { doc.addPage(); header(doc); y = 118; }
    doc.text(l, M + 12, y);
    y += 12;
  });

  y += 6;
  if (y > PAGE_H - 84) { doc.addPage(); header(doc); y = 118; }
  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('View on the official portal: ' + GRIEVANCE_URL, M, y);
  pageFoot(doc);
  /* ──────────────────── PAGE 2 : DIGITAL SIGNATURE ──────────────────── */
  doc.addPage();
  header(doc);
  y = 118;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('Digital Signature & Certification', M, y);
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This certifies that the supporter signed the Right to Life petition, which was submitted to the Chief ',
    M, y + 2,
  );
  doc.text(
    'Minister of Tamil Nadu through Mudhalvarin Mugavari as grievance No. ' + GRIEVANCE.officialReference + '.',
    M, y + 14,
  );
  y += 30;

  // Signature block
  const certRows: Array<[string, string]> = [
    ['Signed by', opts.signer.name || '—'],
    ['Supporter / GDR ID', opts.signer.gdrId || '—'],
    ['Address (as registered)', opts.signer.address || '—'],
    ['Phone (masked)', opts.signer.phoneLast4 ? '····' + opts.signer.phoneLast4 : '—'],
    ['Aadhaar (masked)', opts.signer.aadhaarLast4 ? '····' + opts.signer.aadhaarLast4 : '—'],
    ['Batch', '#' + String(opts.batchNo || 1)],
    ['Signed on (UTC)', opts.signedAtUTC ? new Date(opts.signedAtUTC).toISOString() : '—'],
    ['Verified on', opts.verifiedAtUTC ? new Date(opts.verifiedAtUTC).toISOString() : new Date().toISOString()],
  ];

  doc.setFontSize(9.5);
  certRows.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(label + ':', M, y);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    const valLines = doc.splitTextToSize(value, CW - 130) as string[];
    valLines.forEach((l, li) => {
      doc.text(l, M + 130, y + li * 12);
    });
    y += 14 + (valLines.length - 1) * 12;
  });
  y += 8;

  // Signature hash
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature hash:', M, y);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  const hashLines = doc.splitTextToSize(opts.signHash, CW - 10) as string[];
  hashLines.forEach((l) => { doc.text(l, M + 130, y); y += 12; });
  y += 6;

  // Verify URL
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Verify online:', M, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61);
  const urlLines = doc.splitTextToSize(opts.verifyUrl, CW - 130) as string[];
  urlLines.forEach((l) => { doc.text(l, M + 130, y); y += 12; });
  y += 12;

  // Certification seal
  doc.setDrawColor(21, 128, 61);
  doc.setLineWidth(1.2);
  doc.roundedRect(M, y, CW, 58, 6, 6, 'S');
  doc.setFontSize(9);
  doc.setTextColor(11, 62, 27);
  doc.setFont('helvetica', 'bold');
  doc.text('GENUINE — machine-verifiable on the public docket ledger', PAGE_W - M - 12, y + 18, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Privacy-first: only masked phone/Aadhaar are shown publicly. Officials can confirm this signature hash',
    PAGE_W - M - 12, y + 32, { align: 'right' },
  );
  doc.text('at the verification URL above at any time.', PAGE_W - M - 12, y + 44, { align: 'right' });
  pageFoot(doc);

  doc.save('vog-official-receipt-' + opts.signHash.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '') + '.pdf');
}

export default buildVerifiedSignatureReceipt;
