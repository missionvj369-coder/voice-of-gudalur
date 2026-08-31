import { jsPDF } from 'jspdf';
import { Petition } from '../types';

/**
 * Generates an official, formatted Representation Letter PDF
 * ready to submit to District Collector, Forest Dept, or State Ministers.
 */
export const generatePetitionPDF = (petition: Petition) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Header Title
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VOICE OF GUDALUR CITIZEN ACTION FORUM', margin, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Official Verified Democratic Representation & Citizen Petition', margin, 18);
  doc.text(`Docket No: OG-REP-${petition.id.toUpperCase()}-${new Date().getFullYear()}`, margin, 23);

  // Date & Place
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  doc.text(`Date: ${today}`, margin, 38);
  doc.text('Place: Gudalur Taluk, The Nilgiris District, Tamil Nadu', margin, 43);

  // To Authority Section
  doc.setFont('helvetica', 'bold');
  doc.text('TO:', margin, 53);
  doc.setFont('helvetica', 'normal');
  const splitAuthority = doc.splitTextToSize(petition.targetAuthority, contentWidth - 10);
  doc.text(splitAuthority, margin, 58);

  let currentY = 58 + splitAuthority.length * 5 + 4;

  // Subject
  doc.setFont('helvetica', 'bold');
  doc.text('SUBJECT:', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(`Memorandum of Urgent Citizen Demands Regarding: ${petition.title}`, contentWidth);
  doc.text(splitTitle, margin, currentY);
  currentY += splitTitle.length * 5 + 6;

  // Horizontal divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Respected Sir/Madam
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Respected Authority,', margin, currentY);
  currentY += 6;

  // Body Paragraph 1
  const p1 = 'We, the verified residents, estate workers, small tea growers, and civic stakeholders of Gudalur and Pandalur taluks, submit this formal representation regarding an urgent matter affecting public health, safety, and civic welfare in our hill region.';
  const splitP1 = doc.splitTextToSize(p1, contentWidth);
  doc.text(splitP1, margin, currentY);
  currentY += splitP1.length * 5 + 4;

  // Ground Reality & Evidence Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('GROUND EVIDENCE & PROBLEM SUMMARY:', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const splitEvidence = doc.splitTextToSize(petition.evidenceSummary, contentWidth - 8);
  doc.text(splitEvidence, margin + 4, currentY + 12);
  currentY += 32;

  // Demands section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('FORMAL ACTION DEMANDS:', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  const splitDemand = doc.splitTextToSize(petition.demand || petition.problem, contentWidth);
  doc.text(splitDemand, margin, currentY);
  currentY += splitDemand.length * 5 + 8;

  // Verified Signatures Summary Box
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.setFontSize(10);
  doc.text(`VERIFIED CITIZEN SIGNATURES RECORD: ${petition.supportCount.toLocaleString()} RESIDENTS`, margin + 4, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text('All supporting signatures are verified against unique Gudalur Resident Digital IDs (GD-XXXX), Revenue Village listings, and OTP verification on the VoiceOfGudalur platform.', margin + 4, currentY + 13);
  doc.text(`Official Legislative Representation Status: ${petition.status.replace(/_/g, ' ')}`, margin + 4, currentY + 19);
  currentY += 34;

  // Signoff
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text('Submitted on behalf of:', margin, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`${petition.createdByName || 'Gudalur United Citizens Action Collective'}`, margin, currentY);
  doc.text('Gudalur & Pandalur Taluk Residents Council', margin, currentY + 5);

  // Footer Note
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via VoiceOfGudalur Platform • Independent Democratic Civic Record • https://voiceofgudalur.space', margin, 285);

  doc.save(`VoiceOfGudalur_Representation_${petition.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
};
