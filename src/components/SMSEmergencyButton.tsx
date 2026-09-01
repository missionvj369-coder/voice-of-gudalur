// ============================================
// Voice of Gudalur — SMS Emergency Button
// One-tap SMS alert for critical animal sightings
// Works on ALL phones (smartphones + feature phones)
// ============================================

import React, { useState } from 'react';
import { MessageSquare, AlertTriangle, Check, Loader2, Phone } from 'lucide-react';
import { sendEmergencyAlert, isDangerousAnimal, getEmergencyContacts, SMSPayload } from '../services/smsBridge';
import { useLanguage } from '../context/LanguageContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface SMSEmergencyButtonProps {
  animalType: string;
  lat: number;
  lng: number;
  locationName: string;
  reporterName?: string;
  message?: string;
  compact?: boolean;
}

export const SMSEmergencyButton: React.FC<SMSEmergencyButtonProps> = ({
  animalType,
  lat,
  lng,
  locationName,
  reporterName,
  message,
  compact = false,
}) => {
  const { lang } = useLanguage();
  const { isOnline } = useNetworkStatus();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dangerous = isDangerousAnimal(animalType);
  const contacts = getEmergencyContacts();

  const handleSendSMS = async () => {
    setSending(true);
    setError(null);

    const payload: SMSPayload = {
      animalType,
      lat,
      lng,
      locationName,
      timestamp: Date.now(),
      danger: dangerous,
      reporterName,
      message,
    };

    const result = await sendEmergencyAlert(payload);
    
    if (result.success) {
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } else {
      setError(result.details);
    }
    
    setSending(false);
  };

  if (compact) {
    return (
      <button
        onClick={handleSendSMS}
        disabled={sending}
        className={`p-2 rounded-xl transition ${
          sent ? 'bg-emerald-100 text-emerald-700' :
          dangerous ? 'bg-red-100 text-red-700 hover:bg-red-200' :
          'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`}
        title={lang === 'ta' ? 'அவசர SMS அனுப்பு' : 'Send Emergency SMS'}
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> :
         sent ? <Check size={16} /> :
         <MessageSquare size={16} />}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleSendSMS}
        disabled={sending}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition ${
          sent ? 'bg-emerald-600 text-white' :
          dangerous ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse' :
          'bg-slate-600 hover:bg-slate-700 text-white'
        }`}
      >
        {sending ? (
          <><Loader2 size={18} className="animate-spin" /><span>{lang === 'ta' ? 'அனுப்புகிறது...' : 'Sending...'}</span></>
        ) : sent ? (
          <><Check size={18} /><span>{lang === 'ta' ? 'SMS அனுப்பப்பட்டது!' : 'SMS Sent!'}</span></>
        ) : (
          <>
            {dangerous ? <AlertTriangle size={18} /> : <MessageSquare size={18} />}
            <span>{lang === 'ta' ? 'அவசர SMS அனுப்பு' : 'Send Emergency SMS'}</span>
          </>
        )}
      </button>

      {dangerous && !sent && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle size={12} />
          {lang === 'ta' ? 'ஆபத்து விலங்கு — உடனடி எச்சரிக்கை' : 'Dangerous animal — Immediate alert'}
        </p>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-800">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Phone size={12} />
        <span>{lang === 'ta' ? 'இலக்குகள்:' : 'To:'} {contacts.map(c => c.name).join(', ')}</span>
      </div>
    </div>
  );
};

export default SMSEmergencyButton;

