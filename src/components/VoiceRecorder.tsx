import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { createVoiceRecorder } from '../services/voiceRecordService';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface Props {
  onSave?: (blob: Blob) => void;
  onCancel?: () => void;
  maxSeconds?: number;
}

export const VoiceRecorder: React.FC<Props> = ({ onSave, onCancel, maxSeconds = 30 }) => {
  const { lang } = useLanguage();
  const recRef = useRef<ReturnType<typeof createVoiceRecorder> | null>(null);
  const [recording, setRecording] = useState(false);
  const [dur, setDur] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const r = createVoiceRecorder(maxSeconds);
    recRef.current = r;
    const u = r.subscribe(() => {
      setRecording(r.isRecording); setDur(r.durationSec);
      setBlob(r.blob); setErr(r.error);
    });
    return () => { u(); r.reset(); };
  }, [maxSeconds]);

  useEffect(() => { if (blob) setUrl(URL.createObjectURL(blob)); }, [blob]);

  const start = useCallback(() => { setErr(null); setBlob(null); setUrl(null); recRef.current?.start(); }, []);
  const stop = useCallback(() => { recRef.current?.stop(); }, []);
  const again = useCallback(() => { setBlob(null); setUrl(null); recRef.current?.start(); }, []);
  const reset = useCallback(() => { recRef.current?.reset(); setBlob(null); setUrl(null); setPlaying(false); }, []);
  const play = useCallback(() => {
    if (!url) return;
    if (!audioRef.current) { audioRef.current = new Audio(url); audioRef.current.onended = () => setPlaying(false); }
    audioRef.current.play(); setPlaying(true);
  }, [url]);
  const pause = useCallback(() => { audioRef.current?.pause(); setPlaying(false); }, []);
  const save = useCallback(() => { if (blob && onSave) { onSave(blob); toast.success('Voice saved!'); } }, [blob, onSave]);
  const cancel = useCallback(() => { recRef.current?.reset(); onCancel?.(); }, [onCancel]);

  const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const pct = Math.min((dur / maxSeconds) * 100, 100);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${recording ? 'bg-red-100 text-red-600' : blob ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-600'}`}>
            {recording ? <Mic size={18} className="animate-pulse" /> : blob ? <Mic size={18} /> : <MicOff size={18} />}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{lang === 'ta' ? 'Voice' : 'Voice Recorder'}</p>
            <p className="text-[11px] text-slate-500">Max {maxSeconds}s</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-mono font-bold ${recording ? 'text-red-600' : 'text-slate-700'}`}>{fmt(dur)}</p>
          <p className="text-[10px] text-slate-400">/ {fmt(maxSeconds)}</p>
        </div>
      </div>
      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${recording ? 'bg-red-500' : blob ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
      </div>
      {err && <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200"><AlertCircle size={16} className="text-red-600 shrink-0" /><p className="text-xs text-red-700">{err}</p></div>}
      {blob && !recording && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-200">
          <button onClick={playing ? pause : play} className="p-2 rounded-lg bg-emerald-100 text-emerald-700"><Play size={16} /></button>
          <p className="text-xs text-slate-600">Recorded - {fmt(dur)}</p>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1">
        {!recording && !blob && (
          <>
            <button onClick={start} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Mic size={16} /><span>Start</span></button>
            {onCancel && <button onClick={cancel} className="px-4 py-3 rounded-xl bg-slate-200 text-slate-700 font-bold text-sm">Cancel</button>}
          </>
        )}
        {recording && (
          <button onClick={stop} className="flex-1 py-3 rounded-xl bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2"><Square size={16} fill="white" /><span>Stop</span></button>
        )}
        {!recording && blob && (
          <>
            <button onClick={again} className="flex-1 py-3 rounded-xl bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-2"><Mic size={16} /><span>Re-record</span></button>
            <button onClick={save} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"><Save size={16} /><span>Save</span></button>
            <button onClick={reset} className="p-3 rounded-xl bg-slate-200 text-slate-700"><RotateCcw size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;