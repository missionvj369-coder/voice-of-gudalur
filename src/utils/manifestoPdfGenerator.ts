import jsPDF from 'jspdf';
import { ManifestoContent } from '../data/manifestoData';

export function generateManifestoPdf(
  manifesto: ManifestoContent,
  lang: string,
  endorsementsCount: number,
  signatoryName?: string,
  locality?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let currentY = 20;

  // Header background banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Top Title Banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ONE GUDALUR CITIZEN MOVEMENT', margin, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(167, 243, 208); // emerald-200
  doc.text('OFFICIAL MEMORANDUM & CITIZEN PROCLAMATION FOR RIGHT TO LIFE', margin, 22);

  doc.setTextColor(203, 213, 225); // slate-300
  doc.setFontSize(8);
  doc.text(`Docket Ref: OG-PROCLAMATION-${Date.now().toString().slice(-6)} | Date: ${new Date().toLocaleDateString('en-IN')}`, margin, 29);

  currentY = 48;

  // Target Authority Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('SUBMITTED TO:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('1. The District Collector & District Magistrate, The Nilgiris, Udhagamandalam', margin + 4, currentY + 11);
  doc.text('2. The Principal Chief Conservator of Forests & Chief Wildlife Warden, Tamil Nadu', margin + 4, currentY + 16);
  doc.text('3. The District Forest Officer (DFO), Gudalur Forest Division, Gudalur', margin + 4, currentY + 21);

  currentY += 30;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const splitTitle = doc.splitTextToSize(manifesto.title, contentWidth);
  doc.text(splitTitle, margin, currentY);
  currentY += splitTitle.length * 5 + 4;

  // Subtitle / Opening
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const splitSub = doc.splitTextToSize(`"${manifesto.openingQuote}"`, contentWidth);
  doc.text(splitSub, margin, currentY);
  currentY += splitSub.length * 4.5 + 6;

  // Solid Facts summary box
  doc.setFillColor(254, 242, 242); // rose-50
  doc.setDrawColor(254, 205, 211); // rose-200
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(159, 18, 57);
  doc.text('CORE GROUND REALITIES & LEGAL MANDATES:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(190, 18, 60);
  doc.text('• 11 Traditional Migratory Corridors illegally obstructed by fencing & encroachments.', margin + 4, currentY + 11);
  doc.text('• Fatal tiger & elephant attacks in Lauriston (O\'Valley), Cherambadi, and residential tea lines.', margin + 4, currentY + 15);
  doc.text('• Supreme Court of India rulings prohibit corridor blockades; urgent field enforcement demanded.', margin + 4, currentY + 19);

  currentY += 28;

  // Demands list
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('IMMEDIATE 4-POINT ACTION MANDATE:', margin, currentY);
  currentY += 6;

  const points = [
    '1. Unconditional Removal of illegal walls, fences, and encroachments on 11 historical migratory corridors.',
    '2. Installation of AI-driven thermal sensors, acoustic detection, and automated early-warning SMS/sirens.',
    '3. Decentralized 24/7 Rapid Response Teams (RRTs) stationed directly in O\'Valley, Cherambadi & Pandalur.',
    '4. Immediate clearance of dense Lantana camara bushes and predator ambush hideouts near settlements.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  points.forEach(pt => {
    const splitPt = doc.splitTextToSize(pt, contentWidth - 4);
    doc.text(splitPt, margin + 2, currentY);
    currentY += splitPt.length * 4.5 + 2;
  });

  currentY += 4;

  // Verified Endorsement Seal
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('COLLECTIVE CITIZEN ENDORSEMENT SEAL', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  doc.text(`Total Verified Resident Signatures: ${endorsementsCount.toLocaleString()} Citizens of Gudalur`, margin + 4, currentY + 11);
  if (signatoryName) {
    doc.text(`Signatory Endorser: ${signatoryName} (${locality || 'Gudalur Taluk'})`, margin + 4, currentY + 16);
  } else {
    doc.text('Endorsed on behalf of the united families, estate workers, farmers and traders of Gudalur.', margin + 4, currentY + 16);
  }
  doc.text('Platform: OneGudalur Verified Community Network (https://onegudalur.org)', margin + 4, currentY + 21);

  currentY += 30;

  // Closing footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(manifesto.callToAction.closing, margin, currentY);

  // Footer line
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via OneGudalur Civic Action Engine. Valid legal petition draft for administrative submission.', margin, pageHeight - 8);
  doc.text('Page 1 of 1', pageWidth - margin - 15, pageHeight - 8);

  doc.save(`OneGudalur_Right_To_Life_Manifesto_${lang.toUpperCase()}.pdf`);
}
