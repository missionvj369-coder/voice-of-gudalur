import React, { useState } from 'react';
import { Mic, Send, X } from 'lucide-react';
import { submitVoiceIncident } from '../services/voiceReportService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { VoiceRecorder } from './VoiceRecorder';
import toast from 'react-hot-toast';

interface VoiceReportButtonProps {
  localityId?: string;
}

const MAX_SECONDS = 30;

export const VoiceReportButton: React.FC<VoiceReportButtonProps> = ({ localityId }) => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [blob, setBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);

  const handleSave = (savedBlob: Blob) => {
    setBlob(savedBlob);
  };

  const handleSubmit = async () => {
    if (!blob) return;
    setSubmitting(true);

    // Create a VoiceRecording from the blob
    const recording = { blob, durationMs: 0 };

    const result = await submitVoiceIncident({
      type: 'human-wildlife',
      urgency: 'MEDIUM',
      locality: localityId || profile?.localityId || 'gudalur',
      lat: profile?.lat,
      lng: profile?.lng,
      description: `${t('voiceIncident') || 'Wildlife incident'} — reported by ${profile?.name || 'anonymous'}`,
      recording: recording as any,
    });

    setSubmitting(false);
    setShowRecorder(false);
    setBlob(null);

    if (result.error) {
      toast.error(`${t('submitFailed') || 'Send failed'}: ${result.error}`);
    } else {
      toast.success(`${t('incidentReported') || 'Incident reported'} ✅ (${result.pushSent} ${t('notificationsSent') || 'notifications sent'})`);
    }
  };

  const handleCancel = () => {
    setBlob(null);
    setShowRecorder(false);
  };

  if (!showRecorder && !blob) {
    return (
      <button
        onClick={() => setShowRecorder(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-amber-400/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
        title={t('voiceReport') || 'Report via voice'}
      >
        <Mic size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-3">
      {!blob ? (
        <VoiceRecorder
          maxSeconds={MAX_SECONDS}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Voice note ready</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              <X size={14} className="inline mr-1" />{t('cancel') || 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition"
            >
              {submitting ? (
                <>⏳</>
              ) : (
                <>
                  <Send size={14} className="inline mr-1" />
                  {t('send') || 'Send'}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
