import { jsPDF } from 'jspdf';
import { CORRIDORS, HOTSPOTS } from '../data/corridorData';

/**
 * "Voice of Gudalur — Human-Wildlife Conflict Situation Report" generator.
 * A client-side, zero-server official briefing document that compiles the live
 * movement ledger (signatures, dockets), the 11 blockaded migratory corridors,
 * and the documented frontline conflict zones into a printable government-grade
 * PDF. Built entirely in-browser with jsPDF vector text (no html2canvas).
 */

interface PolicyBriefInput {
  signaturesCount: number;
  docketCount?: number | null;
  generatedBy?: string;
}

const NAVY: [number, number, number] = [26, 42, 58];
const GOLD: [number, number, number] = [146, 111, 20];
const INK: [number, number, number] = [35, 40, 45];
const MUTED: [number, number, number] = [110, 118, 125];
const RED: [number, number, number] = [178, 34, 34];

export function generatePolicyBriefPdf(input: PolicyBriefInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 18; // margin
  const W = pageW - M * 2;
  let y = 0;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 22;
    }
  };

  const sectionHeader = (label: string) => {
    ensureSpace(16);
    y += 8;
    doc.setFillColor(...NAVY);
    doc.rect(M, y - 4, W, 7.2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(label.toUpperCase(), M + 3, y + 0.6);
    y += 10;
  };

  const body = (text: string, size = 9, color = INK, lead = 4.6, x = M) => {
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, W - (x - M));
    for (const line of lines) {
      ensureSpace(lead + 1);
      doc.text(line, x, y);
      y += lead;
    }
  };

  // ---------- Masthead ----------
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 34, 'F');
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 34, pageW, 1.2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('VOICE OF GUDALUR', M, 15);
  doc.setFontSize(11.5);
  doc.text('Human-Wildlife Conflict — Official Situation Report', M, 23);
  doc.setFontSize(8);
  doc.setTextColor(200, 205, 212);
  doc.text('Gudalur Taluk, The Nilgiris District, Tamil Nadu · Voice of Gudalur (Universal Guard Trust)', M, 30);

  y = 44;
  const now = new Date();
  doc.setTextColor(...MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Report reference: VOG-SR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`,
    M,
    y
  );
  y += 4.6;
  doc.text(
    `Generated: ${now.toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}${input.generatedBy ? ` · by ${input.generatedBy}` : ''}`,
    M,
    y
  );
  y += 4.6;
  doc.text('Data source: live public movement ledger (Supabase) + verified locality registry.', M, y);
  y += 6;

  // ---------- Executive snapshot ----------
  sectionHeader('1. Executive Snapshot');
  const snapshot: [string, string][] = [
    ['Verified citizen signatures', input.signaturesCount.toLocaleString('en-IN')],
    ['Official email dockets recorded', (input.docketCount ?? 0).toLocaleString('en-IN')],
    ['Migratory corridors documented', `${CORRIDORS.length} (${CORRIDORS.filter((c) => c.status === 'BLOCKED').length} BLOCKED / ${CORRIDORS.filter((c) => c.status === 'FRAGMENTED').length} FRAGMENTED)`],
    ['Frontline conflict zones', `${HOTSPOTS.length} mapped (${HOTSPOTS.filter((h) => h.severity === 'CRITICAL').length} CRITICAL)`],
  ];
  for (const [label, value] of snapshot) {
    ensureSpace(9);
    doc.setFillColor(246, 244, 238);
    doc.rect(M, y - 3.6, W, 7, 'F');
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(label.toUpperCase(), M + 3, y + 0.8);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(value, pageW - M - 3, y + 0.8, { align: 'right' });
    y += 8.4;
  }

  // ---------- Corridors ----------
  sectionHeader('2. Blockaded Migratory Corridors (11)');
  for (const c of CORRIDORS) {
    ensureSpace(10);
    const blocked = c.status === 'BLOCKED';
    doc.setFillColor(...(blocked ? RED : GOLD));
    doc.circle(M + 1.4, y - 1.2, 1.1, 'F');
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(c.name, M + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...(blocked ? RED : GOLD));
    doc.text(`[${c.status}]`, pageW - M, y, { align: 'right' });
    y += 4.2;
    body(`Barrier: ${c.blockedBy}`, 8, MUTED, 4);
    y += 1.6;
  }

  // ---------- Conflict zones ----------
  sectionHeader('3. Documented Frontline Conflict Zones');
  for (const h of HOTSPOTS) {
    ensureSpace(10);
    doc.setFillColor(...(h.severity === 'CRITICAL' ? RED : GOLD));
    doc.circle(M + 1.4, y - 1.2, 1.1, 'F');
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(h.name, M + 5, y);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`[${h.severity}]`, pageW - M, y, { align: 'right' });
    y += 4.2;
    body(h.note, 8, MUTED, 4);
    y += 1.6;
  }

  // ---------- Non-negotiable demands ----------
  sectionHeader('4. Non-Negotiable Community Demands');
  const demands = [
    'Unconditional removal of all blockades on the 11 traditional migratory corridors.',
    'AI-driven thermal & acoustic early-warning networks across settlement fringes.',
    'Rapid Response Teams (RRTs) stationed at O\u2019Valley, Cherambadi and Pandalur.',
    'Immediate eradication of Lantana camara ambush overgrowth on forest fringes.',
  ];
  demands.forEach((d, i) => {
    ensureSpace(9);
    doc.setTextColor(...GOLD);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${i + 1}.`, M, y);
    body(d, 9, INK, 4.6, M + 7);
    y += 1.4;
  });

  // ---------- Closing ----------
  ensureSpace(24);
  y += 4;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(M, y, pageW - M, y);
  y += 5;
  body(
    'This report is an advocacy compilation generated from the live public ledger of the Voice of Gudalur movement. Corridor paths are advocacy-mapping approximations between verified locality coordinates; official demarcation remains with the Forest Survey of India and the Tamil Nadu Forest Department. Article 21 of the Constitution of India guarantees the Right to Life — of citizens and of wildlife.',
    7.5,
    MUTED,
    3.8
  );

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Voice of Gudalur · Human-Wildlife Conflict Situation Report · ${now.toISOString().slice(0, 10)}`,
      M,
      pageH - 8
    );
    doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 8, { align: 'right' });
  }

  return doc;
}

