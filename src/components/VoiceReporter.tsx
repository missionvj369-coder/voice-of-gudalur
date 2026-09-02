/** VoiceReporter.tsx
 * Modal-based voice incident reporter — record → review → send.
 */
import React, { useState, useEffect } from 'react';
import { Mic, X, MapPin, Shield, Upload, Send, Trash2 } from 'lucide-react';
import { submitVoiceIncident, IncidentType, Urgency } from '../services/voiceReportService';
import { VoiceRecorder } from './VoiceRecorder';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface VoiceReporterProps {
  open: boolean;
  onClose: () => void;
  defaultType?: IncidentType;
}

const INCIDENT_TYPES: { value: IncidentType; labelKey: string }[] = [
  { value: 'human-wildlife', labelKey: 'wildlifeEncounter' },
  { value: 'fire', labelKey: 'forestFire' },
  { value: 'traffic', labelKey: 'roadHazard' },
  { value: 'medical', labelKey: 'medicalEmergency' },
  { value: 'other', labelKey: 'generalConcern' },
];

const URGENCIES: Urgency[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const VoiceReporter: React.FC<VoiceReporterProps> = ({
  open, onClose, defaultType = 'human-wildlife',
}) => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'select' | 'record' | 'confirm'>('select');
  const [incidentType, setIncidentType] = useState<IncidentType>(defaultType);
  const [urgency, setUrgency] = useState<Urgency>('MEDIUM');
  const [recording, setRecording] = useState(false);
  const [audio, setAudio] = useState<{ blob: Blob; durationMs: number } | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    profile ? { lat: profile.lat || 0, lng: profile.lng || 0 } : null,
  );

  useEffect(() => {
    if (open) {
      setStep('select'); setIncidentType(defaultType);
      setUrgency('MEDIUM'); setAudio(null);
    }
  }, [open, defaultType]);

  const acquireLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => console.warn('[VoiceReporter] Geo denied:', e),
      { enableHighAccuracy: true, timeout: 5000 },
    );
  };

    const handleRecord = async () => {
    setAudio(null);
    setShowRecorder(true);
  };

  const handleSend = async () => {
    if (!audio) return;
    setSubmitting(true);
    const result = await submitVoiceIncident({
      type: incidentType, urgency,
      locality: profile?.localityId || 'gudalur',
      lat: location?.lat, lng: location?.lng,
      description: `Voice incident — Type: ${incidentType}, Urgency: ${urgency}`,
      recording: { blob: audio.blob, durationMs: audio.durationMs },
    });
    setSubmitting(false);
    onClose();
    if (result.error) toast.error(`${t('submitFailed') || 'Failed'}: ${result.error}`);
    else toast.success(`${t('incidentReported') || 'Reported'} ✅ (${result.pushSent} sent)`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl shadow-2xl m-0 sm:m-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="font-black text-sm text-white uppercase tracking-wider">
            {t('voiceReport') || 'Voice Report'}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 transition">
            <X size={16} className="text-slate-400" />
          </button>
        </div>
        <div className="p-4 space-y-4">

          {/* === Step: incident type selection === */}
          {step === 'select' && (
            <>
              <div className="grid grid-cols-5 gap-1 mb-4">
                {INCIDENT_TYPES.map((it) => (
                  <button
                    key={it.value}
                    onClick={() => { setIncidentType(it.value); setStep('record'); }}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-black transition-all ${
                      incidentType === it.value ? 'ring-2 ring-amber-500 bg-slate-800' : 'bg-slate-800/50 hover:bg-slate-700'
                    }`}
                    title={t(it.labelKey) || it.labelKey}
                  >
                    <Shield size={14} />
                    <span className="truncate">{t(it.labelKey) || it.value}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-stone-500">
                  {t('urgency') || 'Urgency'}
                </label>
                <div className="flex gap-1">
                  {URGENCIES.map((u) => (
                    <button
                      key={u}
                      onClick={() => setUrgency(u)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-black transition-all ${
                        urgency === u ? 'bg-amber-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {t(u.toLowerCase()) || u}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={acquireLocation}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 transition"
              >
                <MapPin size={14} className="text-slate-400" />
                {location ? (t('locationSet') || 'Location set ✓') : (t('setLocation') || 'Set location')}
              </button>

              <button
                onClick={() => setStep('record')}
                className="flex items-center justify-center gap-2 w-full py-3 text-xs font-black rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white hover:opacity-90 transition"
              >
                <Mic size={16} />
                {t('recordVoiceNote') || 'Record voice note'}
                                                        </button>
          </>)}

                    {/* === Step: record === */}
          {step === 'record' && (
            <div className="space-y-4">
              {showRecorder ? (
                <VoiceRecorder
                  maxSeconds={30}
                  onSave={(blob) => {
                    setAudio({ blob, durationMs: 0 });
                    setShowRecorder(false);
                    setStep('confirm');
                  }}
                  onCancel={() => setShowRecorder(false)}
                />
              ) : recording ? (
                <div className="py-6">
                  <div className="flex justify-center mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  </div>
                  <p className="text-sm text-red-400 font-black">
                    {t('recording') || 'Recording…'} (max 30s)
                  </p>
                </div>
              ) : audio ? (
                <div className="py-4">
                  <p className="text-xs text-slate-300 mb-2">
                    🎙 {Math.round(audio?.durationMs / 1000)}s audio recorded
                  </p>
                  <button
                    onClick={() => setStep('confirm')}
                    className="px-4 py-1.5 text-xs font-black rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
                  >
                    <Upload size={14} className="inline mr-1" />
                    {t('reviewAndSend') || 'Review & Send'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowRecorder(true)}
                  className="flex items-center justify-center gap-2 w-full py-4 text-xs font-black rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                >
                  <Mic size={16} className="text-amber-500" />
                  {t('tapToRecord') || 'Tap to record'}
                </button>
              )}
            </div>
          )}

          {/* === Step: confirm === */}
          {step === 'confirm' && audio && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">{t('type') || 'Type'}</span>
                <span className="text-xs font-black text-white">
                  {t(incidentType) || incidentType}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-800 rounded-lg">
                <span className="text-xs text-slate-400">{t('urgency') || 'Urgency'}</span>
                <span className="text-xs font-black text-white">{urgency}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 transition"
                >
                  <X size={14} className="inline mr-1" />
                  {t('cancel') || 'Back'}
                </button>
                <button
                  onClick={handleSend}
                  disabled={submitting}
                  className="flex-1 px-3 py-1.5 text-xs font-black rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white disabled:opacity-50 hover:opacity-90 transition"
                >
                  {submitting ? '⏳' : (<><Send size={14} className="inline mr-1" /> {t('send') || 'Send'}</>)}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


