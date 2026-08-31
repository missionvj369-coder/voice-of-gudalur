import React, { useState } from 'react';
import { Mic, Send, X, AlertCircle } from 'lucide-react';
import { recordVoiceNote, submitVoiceIncident, VoiceRecording } from '../services/voiceReportService';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface VoiceReportButtonProps {
  localityId?: string;
}

const MAX_SECONDS = 60;

export const VoiceReportButton: React.FC<VoiceReportButtonProps> = ({ localityId }) => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [preview, setPreview] = useState<VoiceRecording | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showInline, setShowInline] = useState(false);

  const startRecording = async () => {
    setRecording(true);
    const blob = await recordVoiceNote(MAX_SECONDS);
    if (blob) setPreview(blob);
    setRecording(false);
  };

  const handleSubmit = async () => {
    if (!preview) return;
    setSubmitting(true);

    const result = await submitVoiceIncident({
      type: 'human-wildlife',
      urgency: 'MEDIUM',
      locality: localityId || profile?.localityId || 'gudalur',
      lat: profile?.lat,
      lng: profile?.lng,
      description: `${t('voiceIncident') || 'Wildlife incident'} — reported by ${profile?.name || 'anonymous'}`,
      recording: preview,
    });

    setSubmitting(false);
    setShowInline(false);
    setPreview(null);

    if (result.error) {
      toast.error(`${t('submitFailed') || 'Send failed'}: ${result.error}`);
    } else {
      toast.success(`${t('incidentReported') || 'Incident reported'} ✅ (${result.pushSent} ${t('notificationsSent') || 'notifications sent'})`);
    }
  };

  const cancel = () => {
    setPreview(null);
    setShowInline(false);
  };

  if (!showInline) {
    return (
      <button
        onClick={async () => {
          setShowInline(true);
          await startRecording();
        }}
        className="fixed bottom-20 right-4 z-40 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg hover:shadow-amber-400/40 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
        title={t('voiceReport') || 'Report via voice'}
      >
        <Mic size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl p-3">
      {recording && (
        <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>{t('recording') || 'Recording…'} (max {MAX_SECONDS}s)</span>
        </div>
      )}

      {preview ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <AudioIcon seconds={preview.durationMs / 1000} />
            <span>{Math.round(preview.durationMs / 1000)}s audio ready</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancel}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 transition"
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
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ClockIcon /> <span>{t('tapToRecord') || 'Tap to record a voice note…'}</span>
        </div>
      )}
    </div>
  );
};

// Helpers
const AudioIcon: React.FC<{ seconds: number }> = ({ seconds }) => {
  const filled = Math.max(1, Math.min(10, Math.ceil((seconds / MAX_SECONDS) * 10)));
  return <span>{'●'.repeat(filled).padEnd(10, '○')}</span>;
};

const ClockIcon = () => <AlertCircle size={14} />;
