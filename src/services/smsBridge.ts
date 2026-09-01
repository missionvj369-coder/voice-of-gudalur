// ============================================
// Voice of Gudalur — SMS Emergency Bridge
// Open-source SMS fallback for zero-connectivity areas
// Uses: SMS URI scheme (works on ALL phones) + SMS Gateway API
// ============================================

import { gudalurDB, OfflineSighting } from '../lib/db';

// Emergency contact types
export interface EmergencyContact {
  name: string;
  role: 'forest_dept' | 'police' | 'panchayat' | 'custom';
  phone: string;
}

// SMS payload structure
export interface SMSPayload {
  animalType: string;
  lat: number;
  lng: number;
  locationName: string;
  timestamp: number;
  danger: boolean;
  reporterName?: string;
  message?: string;
}

// Default emergency contacts for Gudalur
const DEFAULT_EMERGENCY_CONTACTS: EmergencyContact[] = [
  { name: 'Gudalur Forest Range', role: 'forest_dept', phone: '+914232222222' },
  { name: 'Gudalur Police Station', role: 'police', phone: '+914232222333' },
  { name: 'Gudalur Panchayat', role: 'panchayat', phone: '+914232222444' },
];

// Animal danger levels
const DANGER_ANIMALS = ['tiger', 'leopard', 'elephant', 'bear', 'wild_bison', 'snake', 'crocodile'];
const HIGH_DANGER_ANIMALS = ['tiger', 'leopard', 'bear'];

// Format SMS message
function formatSMSMessage(payload: SMSPayload): string {
  const time = new Date(payload.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(payload.timestamp).toLocaleDateString('en-IN');
  
  const animalEmoji: Record<string, string> = {
    tiger: '🐅', leopard: '🐆', elephant: '🐘', bear: '🐻',
    wild_bison: '🐃', snake: '🐍', crocodile: '🐊', deer: '🦌',
    boar: '🐗', peacock: '🦚', other: '🐾',
  };
  
  const emoji = animalEmoji[payload.animalType] || '🐾';
  const dangerText = payload.danger ? '⚠️ DANGER — AVOID AREA' : 'Sighting Reported';
  
  const lines = [
    `${emoji} VOG ${dangerText}`,
    `Animal: ${payload.animalType.toUpperCase()}`,
    `Location: ${payload.locationName}`,
    `GPS: ${payload.lat.toFixed(4)}, ${payload.lng.toFixed(4)}`,
    `Time: ${time}, ${date}`,
  ];
  
  if (payload.reporterName) lines.push(`Reporter: ${payload.reporterName}`);
  if (payload.message) lines.push(`Note: ${payload.message}`);
  
  lines.push('— Voice of Gudalur App');
  
  return lines.join('\n');
}

// Check if animal is dangerous
export function isDangerousAnimal(animalType: string): boolean {
  return DANGER_ANIMALS.includes(animalType.toLowerCase());
}

// Check if animal is high danger (tiger/leopard/bear)
export function isHighDangerAnimal(animalType: string): boolean {
  return HIGH_DANGER_ANIMALS.includes(animalType.toLowerCase());
}

// Send SMS via native SMS app (works on ALL phones including feature phones)
export async function sendSMSViaNativeApp(
  payload: SMSPayload,
  contacts: EmergencyContact[] = DEFAULT_EMERGENCY_CONTACTS
): Promise<{ success: boolean; smsUri: string }> {
  const message = formatSMSMessage(payload);
  const phone = contacts[0]?.phone || DEFAULT_EMERGENCY_CONTACTS[0].phone;
  
  // SMS URI scheme — works on Android, iOS, and most feature phones
  const smsUri = `sms:${phone}?body=${encodeURIComponent(message)}`;
  
  try {
    // Open native SMS app
    window.location.href = smsUri;
    return { success: true, smsUri };
  } catch (err) {
    // Fallback: show SMS details for manual sending
    return { success: false, smsUri };
  }
}

// Send SMS via SMS Gateway API (when admin has connectivity)
export async function sendSMSViaGateway(
  payload: SMSPayload,
  recipients: string[] = []
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const message = formatSMSMessage(payload);
  
  try {
    const res = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        recipients: recipients.length > 0 ? recipients : DEFAULT_EMERGENCY_CONTACTS.map(c => c.phone),
        priority: payload.danger ? 'high' : 'normal',
      }),
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'SMS gateway error');
    
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Auto-detect best SMS method and send
export async function sendEmergencyAlert(
  payload: SMSPayload
): Promise<{ method: 'native' | 'gateway' | 'manual'; success: boolean; details: string }> {
  // Try gateway first (admin mode)
  if (navigator.onLine) {
    const gatewayResult = await sendSMSViaGateway(payload);
    if (gatewayResult.success) {
      return { method: 'gateway', success: true, details: 'Sent via SMS gateway' };
    }
  }
  
  // Fallback to native SMS app
  const nativeResult = await sendSMSViaNativeApp(payload);
  if (nativeResult.success) {
    return { method: 'native', success: true, details: 'Opened native SMS app' };
  }
  
  // Last resort: show manual instructions
  return {
    method: 'manual',
    success: false,
    details: `Copy this message and send to ${DEFAULT_EMERGENCY_CONTACTS[0].phone}:\n\n${formatSMSMessage(payload)}`,
  };
}

// Get emergency contacts
export function getEmergencyContacts(): EmergencyContact[] {
  return DEFAULT_EMERGENCY_CONTACTS;
}

// Add custom emergency contact
export function addCustomContact(contact: EmergencyContact): void {
  const existing = localStorage.getItem('vog_emergency_contacts');
  const contacts: EmergencyContact[] = existing ? JSON.parse(existing) : [];
  contacts.push(contact);
  localStorage.setItem('vog_emergency_contacts', JSON.stringify(contacts));
}

// Get all custom contacts
export function getCustomContacts(): EmergencyContact[] {
  const existing = localStorage.getItem('vog_emergency_contacts');
  return existing ? JSON.parse(existing) : [];
}

