// Voice of Gudalur — QR Decode Diagnostic Layer
// Separates QR detection from Aadhaar decoding for clear user feedback.

export type DiagnosticStage =
  | 'IMAGE_LOADED'
  | 'QR_NOT_DETECTED'
  | 'QR_DETECTED_NOT_DECODED'
  | 'QR_DECODED_INVALID'
  | 'QR_DECODED_VALID'
  | 'SIGNATURE_VERIFIED'
  | 'SIGNATURE_UNVERIFIED'
  | 'SIGNATURE_INVALID';

export interface DiagnosticResult {
  stage: DiagnosticStage;
  engine?: string;
  imageWidth?: number;
  imageHeight?: number;
  attempts: number;
  error?: string;
  // Safe technical metadata only — never personal data
  processingMs?: number;
}

export function getStageMessage(stage: DiagnosticStage, lang: string = 'en'): { title: string; hint: string } {
  const messages: Record<string, Record<DiagnosticStage, { title: string; hint: string }>> = {
    en: {
      IMAGE_LOADED: { title: 'Image loaded', hint: 'Searching for QR code...' },
      QR_NOT_DETECTED: { title: 'No QR code found', hint: 'Hold the card flat, avoid glare, get 10-15 cm closer — or use "Scan from Photo".' },
      QR_DETECTED_NOT_DECODED: { title: 'QR found but unreadable', hint: 'Try a clearer photo with better lighting.' },
      QR_DECODED_INVALID: { title: 'Not an Aadhaar QR', hint: 'Scan the QR printed on the Aadhaar card / e-Aadhaar.' },
      QR_DECODED_VALID: { title: 'Aadhaar QR read', hint: 'Verifying...' },
      SIGNATURE_VERIFIED: { title: 'Aadhaar Verified', hint: 'Cryptographically verified with a current UIDAI key.' },
      SIGNATURE_UNVERIFIED: { title: 'Details read — authenticity unverified', hint: 'UIDAI\'s current signing key is not available on this device yet, so the digital signature could not be confirmed. Your details are still read correctly.' },
      SIGNATURE_INVALID: { title: 'Signature did not match', hint: 'The QR was read but its digital signature could not be verified against a current UIDAI key. Treat the details with caution.' },
    },
    ta: {
      IMAGE_LOADED: { title: 'படம் ஏற்றப்பட்டது', hint: 'QR குறியீட்டைத் தேடுகிறேன்...' },
      QR_NOT_DETECTED: { title: 'QR குறியீடு கிடைக்கவில்லை', hint: 'அட்டையை சரியாகப் பிடிக்கவும், ஒளி வீச்சைத் தவிர்க்கவும்.' },
      QR_DETECTED_NOT_DECODED: { title: 'QR கிடைத்தது ஆனால் படிக்க முடியவில்லை', hint: 'சிறந்த ஒளியுடன் தெளிவான படம் எடுக்கவும்.' },
      QR_DECODED_INVALID: { title: 'ஆதார் QR அல்ல', hint: 'ஆதார் அட்டையில் உள்ள QR-ஐ ஸ்கேன் செய்யவும்.' },
      QR_DECODED_VALID: { title: 'ஆதார் QR படிக்கப்பட்டது', hint: 'சரிபார்க்கிறேன்...' },
      SIGNATURE_VERIFIED: { title: 'ஆதார் சரிபார்க்கப்பட்டது', hint: 'தற்போதைய UIDAI விசையுடன் கிரிப்டோகிராஃபிக்கலாக சரிபார்க்கப்பட்டது.' },
      SIGNATURE_UNVERIFIED: { title: 'விவரங்கள் படிக்கப்பட்டன — உண்மைத்தன்மை சரிபார்க்கப்படவில்லை', hint: 'தற்போதைய கையொப்ப விசை இந்த சாதனத்தில் இல்லாததால், ID கையொப்பம் உறுதிப்படுத்தப்படவில்லை. உங்கள் விவரங்கள் அப்படியே உள்ளன.' },
      SIGNATURE_INVALID: { title: 'கையொப்பம் பொருந்தவில்லை', hint: 'QR-ன் கையொப்பத்தை தற்போதைய UIDAI விசையுடன் சரிபார்க்க முடியவில்லை. விவரங்களை எச்சரிக்கையுடன் பயன்படுத்தவும்.' },
    },
  };
  return messages[lang]?.[stage] || messages.en[stage];
}
