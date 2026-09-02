import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause, Save, Trash2, RotateCcw, AlertCircle, Upload } from 'lucide-react';
import { createVoiceRecorder } from '../services/voiceRecordService';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface Props {
  onSave?: (blob: Blob, durationMs: number) => void;
  onCancel?: () => void;
  maxSeconds?: number;
}

export const VoiceRecorder: React.FC<Props> = ({ onSave, onCancel, maxSeconds = 30 }) => {
  const { lang } = useLanguage();
  const recRef = useRef<ReturnType<typeof createVoiceRecorder> | null>(null);
  const [recording, setRecording] = useState(false);
  const [dur, setDur] = useState(0);
  const [level, setLevel] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobDurMs, setBlobDurMs] = useState(0);
  const [isUpload, setIsUpload] = useState(false);
  const [autoCut, setAutoCut] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const r = createVoiceRecorder(maxSeconds);
    recRef.current = r;
    const u = r.subscribe(() => {
      setRecording(r.isRecording); setDur(r.durationSec); setLevel(r.level);
      setBlob(r.blob); setErr(r.error);
      if (!r.isRecording && r.blob) setBlobDurMs(r.durationSec * 1000);
    });
    return () => { u(); r.reset(); };
  }, [maxSeconds]);

  // Fresh object URL per blob — always revoked; a new URL kills the stale <audio>
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  useEffect(() => { audioRef.current = null; setPlaying(false); }, [url]);

  const start = useCallback(() => {
    setErr(null); setBlob(null); setBlobDurMs(0); setAutoCut(false); setIsUpload(false);
    recRef.current?.start();
  }, []);
  const stop = useCallback(() => { recRef.current?.stop(); }, []);
  const del = useCallback(() => {
    recRef.current?.reset();
    setBlob(null); setBlobDurMs(0); setAutoCut(false); setIsUpload(false); setPlaying(false);
  }, []);
  const play = useCallback(() => {
    if (!url) return;
    if (!audioRef.current) {
      const a = new Audio(url);
      a.onended = () => setPlaying(false);
      a.onpause = () => setPlaying(false);
      audioRef.current = a;
    }
    audioRef.current.play().catch(() => setPlaying(false));
    setPlaying(true);
  }, [url]);
  const pause = useCallback(() => { audioRef.current?.pause(); setPlaying(false); }, []);
  const save = useCallback(() => {
    if (blob && onSave) {
      onSave(blob, blobDurMs);
      toast.success(lang === 'ta' ? 'குரல் குறிப்பு இணைக்கப்பட்டது!' : 'Voice note attached!');
    }
  }, [blob, blobDurMs, onSave, lang]);
  const cancel = useCallback(() => { recRef.current?.reset(); onCancel?.(); }, [onCancel]);
  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr(null); setAutoCut(false); setIsUpload(true); setBlob(f); setBlobDurMs(0);
    e.target.value = '';
  }, []);

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  const pct = Math.min((dur / maxSeconds) * 100, 100);

  const bars = [0.4, 0.7, 1, 0.7, 0.4];

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3" data-testid="voice-recorder">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${recording ? 'bg-red-100 text-red-600' : blob ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
            {recording ? <Mic size={18} className="animate-pulse" /> : blob ? <Mic size={18} /> : <MicOff size={18} />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{lang === 'ta' ? 'குரல் பதிவு' : 'Voice Recorder'}</p>
            <p className="text-[11px] text-slate-500">Auto-stops at {maxSeconds}s</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-mono font-bold ${recording ? 'text-red-600' : 'text-slate-700'}`}>{fmt(dur)}</p>
          <p className="text-[10px] text-slate-400">/ {fmt(maxSeconds)}</p>
        </div>
      </div>

      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${recording ? 'bg-red-500' : blob ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-end justify-center gap-1 h-5" aria-hidden="true">
        {bars.map((b, i) => (
          <span key={i} className={`w-1.5 rounded-full transition-all duration-100 ${recording ? 'bg-red-500' : 'bg-slate-300'}`}
            style={{ height: `${recording ? Math.max(12, level * b * 100) : 12}%` }} />
        ))}
      </div>

      {err && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200"><AlertCircle size={16} className="text-red-600 shrink-0" /><p className="text-xs text-red-700">{err}</p></div>}
      {autoCut && !recording && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ⏱ Auto-stopped at the {maxSeconds}s limit — your full note is saved below.
        </p>
      )}

      {blob && !recording && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200" data-testid="voice-preview">
          <button onClick={playing ? pause : play} className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200" aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <p className="text-xs text-slate-600">
            {isUpload ? 'Uploaded audio ready' : `Recorded — ${fmt(Math.round(blobDurMs / 1000) || dur)}`}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {!recording && !blob && (
          <>
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Mic size={16} /><span>Record</span></button>
            <button onClick={() => fileRef.current?.click()} className="px-4 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2" title="Upload an audio file"><Upload size={16} /><span>Upload</span></button>
            {onCancel && <button onClick={cancel} className="px-4 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">Cancel</button>}
          </>
        )}
        {recording && (
          <button onClick={stop} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2"><Square size={16} fill="white" /><span>Stop</span></button>
        )}
        {!recording && blob && (
          <>
            <button onClick={save} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Save size={16} /><span>Attach</span></button>
            <button onClick={start} className="px-3 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2" title="Record a new one"><RotateCcw size={16} /></button>
            <button onClick={del} className="p-3 rounded-xl bg-red-100 text-red-600 hover:bg-red-200" title="Delete recording" data-testid="voice-delete"><Trash2 size={16} /></button>
            {onCancel && <button onClick={cancel} className="px-3 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">Cancel</button>}
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} data-testid="voice-upload-input" />
    </div>
  );
};

export default VoiceRecorder;