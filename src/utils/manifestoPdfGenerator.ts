import jsPDF from 'jspdf';
import { ManifestoContent } from '../data/manifestoData';
import { EMAIL_RECIPIENTS, EMAIL_PETITION_DATA } from '../data/emailPetitionData';

export interface ManifestoPdfResident {
  name: string;
  locality: string;
  phone: string;
  gudalurId: string;
  pincode?: string;
  email?: string;
}

export interface ManifestoPdfOptions {
  manifesto: ManifestoContent;
  lang: string;
  signaturesCount: number;
  resident: ManifestoPdfResident;
  /** Docket ref of the recorded email submission (PDF is generated from the recorded dispatch). */
  submissionRef?: string;
  /** The REAL dispatch timestamp from the ledger (when the email was recorded as sent) — not the PDF download time. */
  dispatchedAt?: string;
}

export function generateManifestoPdf(options: ManifestoPdfOptions) {
  const { manifesto, lang, signaturesCount, resident, submissionRef, dispatchedAt: dispatchedAtParam } = options;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const content = EMAIL_PETITION_DATA[(lang as keyof typeof EMAIL_PETITION_DATA)] || EMAIL_PETITION_DATA.en;
  const allRecipients = [
    ...EMAIL_RECIPIENTS.to.map(r => ({ name: r.name, email: r.email, tag: 'TO' })),
    ...EMAIL_RECIPIENTS.cc.map(r => ({ name: r.name, email: r.email, tag: 'CC' })),
  ];
  const dispatchedAt = dispatchedAtParam || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  let currentY = 20;

  const ensureSpace = (h: number) => {
    if (currentY + h > pageHeight - 16) { doc.addPage(); currentY = 20; }
  };

  /* ============ LETTERHEAD header ============ */
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('VOICE OF GUDALUR — OFFICIAL CITIZEN PETITION', margin, 13);
  doc.setFontSize(8.5);
  doc.setTextColor(167, 243, 208);
  doc.text('EMAIL DISPATCH RECORD', margin, 20);
  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.text(`Docket Ref: ${submissionRef || 'PENDING'}   |   Dispatched: ${dispatchedAt}`, margin, 26);
  currentY = 42;

  /* ============ FROM — resident signatory ============ */
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('FROM — RESIDENT SIGNATORY (SENDER)', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Name: ${resident.name}    |    Resident ID: ${resident.gudalurId}`, margin + 4, currentY + 12);
  doc.text(`Locality: ${resident.locality}, Gudalur Taluk, The Nilgiris, Tamil Nadu${resident.pincode ? ` — PIN ${resident.pincode}` : ''}`, margin + 4, currentY + 17);
  doc.text(`Mobile: ${resident.phone}${resident.email ? `    |    E-mail: ${resident.email}` : ''}`, margin + 4, currentY + 22);
  currentY += 38;

  /* ============ SUBJECT ============ */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const subjectLines = doc.splitTextToSize(`SUBJECT: ${content.subject}`, contentWidth) as string[];
  doc.text(subjectLines, margin, currentY);
  currentY += subjectLines.length * 4.6 + 3;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`SENT ON ${dispatchedAt}  |  Addressed simultaneously to ${allRecipients.length} authorities (full list overleaf).`, margin, currentY);
  currentY += 7;

  /* ============ SIGNATURE — always on the FIRST page ============ */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('Respectfully submitted,', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(resident.name, margin, currentY);
  currentY += 4.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Gudalur Resident ID: ${resident.gudalurId}   |   Mobile: ${resident.phone}`, margin, currentY);
  currentY += 4.4;
  if (resident.email) {
    doc.text(`Email: ${resident.email}`, margin, currentY);
    currentY += 4.4;
  }
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, margin + contentWidth, currentY);
  currentY += 7;

  /* ============ EMAIL BODY — exactly what was dispatched ============ */
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const bodyText = `${content.salutation}\n\n${content.body}\n\n${content.signoff}`;
  const bodyLines = doc.splitTextToSize(bodyText, contentWidth) as string[];
  bodyLines.forEach((line: string) => {
    ensureSpace(4.8);
    doc.text(line, margin, currentY);
    currentY += 4.6;
  });

  /* ============ PAGE 2 — official recipients ============ */
  doc.addPage();
  currentY = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('OFFICIAL RECIPIENTS OF THIS PETITION', margin, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(120, 113, 108);
  doc.text(`All ${allRecipients.length} authorities below were emailed this petition on ${dispatchedAt} from the signatory's email app.`, margin, currentY);
  currentY += 5;

  const rowH = 5.4;
  const tableH = allRecipients.length * rowH + 8;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, tableH, 2, 2, 'FD');
  let ty = currentY + 7;
  allRecipients.forEach((r, idx) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. [${r.tag}]`, margin + 4, ty);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`${r.name} — ${r.email}`, margin + 22, ty);
    ty += rowH;
  });
  currentY += tableH + 6;

  /* ============ SIGNATURE & SEAL ============ */
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, currentY, contentWidth, 32, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text('RESIDENT SIGNATURE & SEAL', margin + 4, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(4, 120, 87);
  const sealLines = [
    `Name: ${resident.name}`,
    `Gudalur Resident ID: ${resident.gudalurId}`,
    `Mobile: ${resident.phone}${resident.pincode ? `   |   PIN: ${resident.pincode}` : ''}${resident.email ? `   |   E-mail: ${resident.email}` : ''}`,
    `Locality: ${resident.locality}, Gudalur Taluk, The Nilgiris, Tamil Nadu`,
    `Signatures on record: ${signaturesCount.toLocaleString()}   |   Signed on: ${dispatchedAt}`,
  ];
  let sy = currentY + 13;
  sealLines.forEach(l => { doc.text(l, margin + 4, sy); sy += 4.8; });

  // Official circular seal — drawn to the right of the signature details.
  const sealCx = margin + contentWidth - 21;
  const sealCy = currentY + 16;
  doc.setDrawColor(153, 27, 27);
  doc.setLineWidth(0.9);
  doc.circle(sealCx, sealCy, 13.5, 'S');
  doc.setLineWidth(0.4);
  doc.circle(sealCx, sealCy, 10.8, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(153, 27, 27);
  doc.text('VOICE OF', sealCx, sealCy - 2.4, { align: 'center' });
  doc.text('GUDALUR', sealCx, sealCy + 2.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(3.6);
  doc.text('CITIZEN PETITION - OFFICIAL', sealCx, sealCy + 5.4, { align: 'center' });

  currentY += 36;

  /* ============ OFFICIAL SUBMISSION PROOF ============ */
  if (submissionRef) {
    doc.setFillColor(255, 247, 237);
    doc.setDrawColor(253, 186, 116);
    doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(154, 52, 18);
    doc.text('OFFICIAL SUBMISSION RECORDED (PROOF OF EMAIL DISPATCH)', margin + 4, currentY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(194, 65, 12);
    doc.text(`Docket Ref: ${submissionRef}   |   Sent on ${dispatchedAt} by ${resident.name} (Resident ID: ${resident.gudalurId})`, margin + 4, currentY + 12);
    currentY += 25;
  }

  /* ============ Closing ============ */
  ensureSpace(12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(manifesto.callToAction.closing, margin, currentY);

  /* ============ Footers on every page ============ */
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated via the Voice of Gudalur Civic Action Engine. Valid legal petition draft for administrative submission.', margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
  }

  doc.save(`Voice_of_Gudalur_Right_To_Life_Petition_${(lang || 'en').toUpperCase()}.pdf`);
  return doc;
}