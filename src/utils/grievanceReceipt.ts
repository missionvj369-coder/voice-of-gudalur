/**
 * Voice of Gudalur — ONE-PAGE Tamil signature receipt (shared by the signing
 * page and the verification page).
 *
 * The generated PDF is a single A4 page that contains:
 *   1. A compact official header (brand + grievance reference).
 *   2. The Tamil petition exactly as submitted to the Chief Minister —
 *      rendered through the browser canvas so Tamil shaping is real — with
 *      NO heading above it.
 *   3. The signer's certification block (name, supporter ID, address, phone,
 *      batch, date, signature hash, verification URL).
 *
 * Per product decision the receipt is Tamil-first: the English petition
 * translation and the English descriptive sections are intentionally omitted,
 * the section heading is removed, and no separator/footer lines are drawn.
 * All fixed labels are Tamil (canvas-shaped); values stay as recorded.
 *
 * NATIONAL movement: every field honours the signer's OWN registered details
 * (name, supporter ID, typed address) — no place is ever preset to "Gudalur".
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
/** Wrap + draw Tamil text on a canvas so the browser shapes the glyphs.
 *  The background is TRANSPARENT so text can sit on the green header band or
 *  the plain page; the text colour is configurable. */
async function renderTamilCanvas(
  text: string,
  widthPt: number,
  fontSizePt: number,
  opts?: { color?: string; padFactor?: number },
): Promise<HTMLCanvasElement> {
  const color = opts?.color || '#16271a';
  const padFactor = opts?.padFactor ?? 0.9;
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
  const pad = Math.round(fontSizePt * scale * padFactor);

  canvas.width = widthPx;
  canvas.height = Math.max(pad * 2 + lines.length * lineHeight, Math.round(fontSizePt * scale * 1.8));

  ctx!.font = font;
  ctx!.fillStyle = color;
  ctx!.textBaseline = 'alphabetic';
  lines.forEach((l, i) => {
    ctx!.fillText(l, pad, pad + i * lineHeight + lineHeight * 0.8);
  });
  return canvas;
}

/** Single-line Tamil label with a TIGHT bounding box (for field labels). */
async function tamilInline(
  text: string,
  fontSizePt: number,
  color: string,
): Promise<{ canvas: HTMLCanvasElement; wPt: number; hPt: number }> {
  const scale = 2;
  const probe = document.createElement('canvas');
  const pctx = probe.getContext('2d')!;
  const font = `${Math.round(fontSizePt * scale)}px NotoSansTamil, 'Noto Sans Tamil', sans-serif`;
  pctx.font = font;
  const wPx = Math.ceil(pctx.measureText(text).width) + Math.round(fontSizePt * scale * 0.2);
  const canvas = await renderTamilCanvas(text, wPx / scale, fontSizePt, { color, padFactor: 0.18 });
  return { canvas, wPt: canvas.width / scale, hPt: canvas.height / scale };
}

/** Draw one Tamil label so its visual baseline lands on `yBaseline`. Returns its width in pt. */
async function drawTamilLabel(
  doc: Doc,
  text: string,
  x: number,
  yBaseline: number,
  sizePt: number,
  color: string,
): Promise<number> {
  const { canvas, wPt, hPt } = await tamilInline(text, sizePt, color);
  const yTop = yBaseline - hPt + sizePt * 0.28;
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', x, yTop, wPt, hPt, undefined, 'FAST');
  return wPt;
}

/* ---------------------------------------------------------------- */
/* Layout helpers                                                    */
/* ---------------------------------------------------------------- */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const CW = PAGE_W - M * 2;

type Doc = import('jspdf').jsPDF;

/* Tamil labels (canvas-shaped). English fallbacks are used only when the
 * Tamil font cannot be fetched (e.g. offline first load). */
const TA = {
  subtitle: 'முதல்வரின் முகவரி — அதிகாரப்பூர்வ கையொப்ப ரசீது',
  grievanceNo: 'புகார் எண்',
  status: 'நிலை',
  created: 'தொடங்கிய நாள்',
  due: 'காலக்கெடு',
  district: 'மாவட்டம்',
  taluk: 'வட்டம்',
  revDivision: 'வருவாய் கோட்டம்',
  certTitle: 'ஆதரவாளர் கையொப்ப சான்றிதழ்',
  signedBy: 'கையொப்பமிட்டவர்',
  gdrId: 'ஆதரவாளர் எண்',
  address: 'முகவரி',
  phone: 'தொலைபேசி',
  batch: 'பேட்ச்',
  date: 'தேதி (UTC)',
  verified: 'சரிபார்ப்பு தேதி',
  hash: 'கையொப்பக் குறியீடு',
  verify: 'ஆன்லைன் சரிபார்ப்பு',
  seal: 'உண்மையான கையொப்பம் — பொதுப் பதிவேட்டில் எப்போதும் சரிபார்க்கலாம்',
  privacy: 'தனியுரிமை: கைபேசி மற்றும் ஆதார் எண்கள் மறைக்கப்பட்டே காட்டப்படும்.',
  viewPortal: 'அதிகாரப்பூர்வ இணையதளத்தில் காண்க:',
};
const EN = {
  subtitle: 'Mudhalvarin Mugavari — Official Signature Receipt',
  grievanceNo: 'GRIEVANCE NO.',
  status: 'Status', created: 'Created', due: 'Due', district: 'District',
  taluk: 'Taluk', revDivision: 'Revenue Division',
  certTitle: 'Supporter Signature Certification',
  signedBy: 'Signed by', gdrId: 'Supporter / GDR ID', address: 'Address',
  phone: 'Phone', batch: 'Batch', date: 'Date (UTC)', verified: 'Verified on',
  hash: 'Signature hash', verify: 'Verify online',
  seal: 'GENUINE — machine-verifiable on the public docket ledger',
  privacy: 'Privacy-first: phone/Aadhaar are shown masked only.',
  viewPortal: 'View on the official portal:',
};

/** Compact green header band — brand, Tamil subtitle, official references. */
async function header(doc: Doc, tamilReady: boolean): Promise<void> {
  doc.setFillColor(11, 62, 27);
  doc.rect(0, 0, PAGE_W, 64, 'F');
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 64, PAGE_W, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('VOICE OF GUDALUR', M, 26);
  if (tamilReady) {
    await drawTamilLabel(doc, TA.subtitle, M, 44, 9, '#FFFFFF');
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(EN.subtitle, M, 44);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(190, 227, 199);
  doc.text(GRIEVANCE_REFERENCE + '  ·  Portal ticket ' + GRIEVANCE.portalTicket, M, 57);
}

/** One label+value row (Tamil label, recorded value). Returns the y AFTER the row. */
async function metaRow(
  doc: Doc,
  labelTa: string,
  labelEn: string,
  value: string,
  x: number,
  y: number,
  tamilReady: boolean,
  valueOffset: number,
  valueWidth: number,
): Promise<number> {
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  if (tamilReady) {
    await drawTamilLabel(doc, labelTa, x, y, 8, '#64748B');
  } else {
    doc.text(labelEn + ':', x, y);
  }
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  const valLines = doc.splitTextToSize(value, valueWidth) as string[];
  valLines.forEach((l, li) => doc.text(l, x + valueOffset, y + li * 10.5));
  return y + 13 + (valLines.length - 1) * 10.5;
}
/**
 * Build + download the ONE-PAGE Tamil signature receipt.
 *   Compact header → grievance number → slim meta → the Tamil petition
 *   (no heading) → supporter certification → verification seal.
 * No separator lines, no footer, no second page, no English duplication.
 */
export async function buildVerifiedSignatureReceipt(opts: BuildReceiptOpts): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const tamilReady = await ensureTamilFont();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const L = tamilReady ? TA : EN;

  /* ── Compact header band ── */
  await header(doc, tamilReady);
  let y = 84;

  /* ── Grievance number (fill-only box — no drawn lines) ── */
  doc.setFillColor(236, 253, 243);
  doc.roundedRect(M, y, CW, 30, 5, 5, 'F');
  if (tamilReady) {
    await drawTamilLabel(doc, L.grievanceNo, M + 10, y + 12.5, 7.5, '#15803D');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text(L.grievanceNo + ':', M + 10, y + 12.5);
  }
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 62, 27);
  doc.text(GRIEVANCE.officialReference, M + 10, y + 25);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Portal ' + GRIEVANCE.portalTicket, PAGE_W - M - 10, y + 25, { align: 'right' });
  y += 42;

  /* ── Slim meta (2 columns × 3 rows, Tamil labels) ── */
  const colW = CW / 2;
  const meta: Array<[string, string, string]> = [
    [L.status, EN.status, GRIEVANCE.status],
    [L.created, EN.created, GRIEVANCE.createdOn],
    [L.due, EN.due, GRIEVANCE.dueOn],
    [L.district, EN.district, GRIEVANCE.district],
    [L.taluk, EN.taluk, GRIEVANCE.taluk],
    [L.revDivision, EN.revDivision, GRIEVANCE.revenueDivision],
  ];
  for (let r = 0; r < 3; r++) {
    const left = meta[r * 2];
    const right = meta[r * 2 + 1];
    const ends = await Promise.all([
      metaRow(doc, left[0], left[1], left[2], M, y, tamilReady, 92, colW - 100),
      metaRow(doc, right[0], right[1], right[2], M + colW, y, tamilReady, 92, colW - 100),
    ]);
    y = Math.max(ends[0], ends[1]);
  }

  /* ── The Tamil petition — straight into the text, NO heading ── */
  y += 6;
  if (tamilReady) {
    const canvas = await renderTamilCanvas(GRIEVANCE.petitionTa, CW - 24, 9);
    const aspect = canvas.width / canvas.height;
    let imgW = CW - 24;
    let imgH = imgW / aspect;
    const MAX_H = 385;
    if (imgH > MAX_H) {
      imgH = MAX_H;
      imgW = MAX_H * aspect;
    }
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', M + 12, y, imgW, imgH, undefined, 'FAST');
    y += imgH;
  } else {
    const lines = doc.splitTextToSize(GRIEVANCE.petitionTa, CW - 24) as string[];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    lines.forEach((l) => {
      doc.text(l, M + 12, y);
      y += 11;
    });
  }
  y += 10;

  /* ── Supporter certification block ── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 62, 27);
  if (tamilReady) {
    await drawTamilLabel(doc, L.certTitle, M, y, 10.5, '#0B3E1B');
  } else {
    doc.text(L.certTitle, M, y);
  }
  y += 16;

  const rows: Array<[string, string, string]> = [
    [L.signedBy, EN.signedBy, opts.signer.name || '—'],
    [L.gdrId, EN.gdrId, opts.signer.gdrId || '—'],
    [L.address, EN.address, opts.signer.address || '—'],
    [L.phone, EN.phone, opts.signer.phoneLast4 ? '····' + opts.signer.phoneLast4 : '—'],
    [L.batch, EN.batch, '#' + String(opts.batchNo || 1)],
    [L.date, EN.date, opts.signedAtUTC ? new Date(opts.signedAtUTC).toISOString() : '—'],
  ];
  if (opts.verifiedAtUTC) rows.push([L.verified, EN.verified, new Date(opts.verifiedAtUTC).toISOString()]);
  rows.push([L.hash, EN.hash, opts.signHash]);
  rows.push([L.verify, EN.verify, opts.verifyUrl]);

  doc.setFontSize(8.5);
  for (const row of rows) {
    y = await metaRow(doc, row[0], row[1], row[2], M, y, tamilReady, 132, CW - 140);
  }

  /* ── Verification seal (fill-only box — no lines) ── */
  y += 6;
  const sealH = 48;
  doc.setFillColor(236, 253, 243);
  doc.roundedRect(M, y, CW, sealH, 6, 6, 'F');
  if (tamilReady) {
    await drawTamilLabel(doc, L.seal, M + 12, y + 18, 9, '#0B3E1B');
    await drawTamilLabel(doc, L.privacy, M + 12, y + 31, 7.5, '#475569');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(11, 62, 27);
    doc.text(L.seal, M + 12, y + 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(L.privacy, M + 12, y + 31);
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(21, 128, 61);
  doc.text(L.viewPortal + ' ' + GRIEVANCE_URL, M + 12, y + 42);

  doc.save('vog-receipt-' + opts.signHash.slice(0, 12).replace(/[^a-zA-Z0-9_-]/g, '') + '.pdf');
}

export default buildVerifiedSignatureReceipt;
