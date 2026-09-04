/**
 * RiseVoice.tsx
 * Community voice platform with two modes:
 *   - Voice of Gudalur — Gudalur residents register their voice
 *   - Voice for Gudalur — Others register their voice for Gudalur
 * Records via device microphone, uploads to Storj, saves to database.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Play, Pause, Upload, Trash2, Users, Volume2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { wildlifeApi } from '../services/api';
// Simple audio upload helper - stores as data URL for demo
// In production, replace with actual Storj/S3 upload
function audioBlobMeta(blob: Blob): { ext: string; contentType: string } {
  if (blob.type.includes('mp4')) return { ext: 'm4a', contentType: 'audio/mp4' };
  if (blob.type.includes('webm')) return { ext: 'webm', contentType: 'audio/webm' };
  return { ext: 'webm', contentType: 'audio/webm' };
}

async function uploadAudioToStorage(_type: string, blob: Blob, ext: string, contentType: string): Promise<string> {
  // Demo: return data URL. Replace with actual Storj upload in production.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Upload failed'));
    reader.readAsDataURL(blob);
  });
}

type VoiceMode = 'voice-of-gudalur' | 'voice-for-gudalur';

interface VoicePetition {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  localityName: string;
  speakerName: string;
  createdAt: number;
  category: string;
  mode: VoiceMode;
}

const MAX_RECORD_SECONDS = 120;

export const RiseVoice: React.FC<{ userCoords?: { lat: number; lng: number } | null }> = ({ userCoords }) => {
  const { profile } = useAuth();
  const [mode, setMode] = useState<VoiceMode>('voice-of-gudalur');
  const [petitions, setPetitions] = useState<VoicePetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Civic Problem');
  const [durationSec, setDurationSec] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchPetitions = useCallback(async () => {
    setLoading(true);
    try {
      const { petitions: data } = await wildlifeApi.voicePetitions();
      const mapped: VoicePetition[] = (data || []).map((r: any) => ({
        id: r.id,
        title: (r.transcript || r.place_name || 'Voice petition').slice(0, 80),
        description: r.transcript || '',
        audioUrl: r.audio_url,
        localityName: r.place_name,
        speakerName: r.speaker_name || 'Resident',
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        category: r.language || 'voice',
        mode: r.mode || 'voice-of-gudalur',
      }));
      setPetitions(mapped);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPetitions(); }, [fetchPetitions]);

  const stopTracks = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setErr(null);
    blobRef.current = null;
    chunksRef.current = [];
    setDurationSec(0);

    if (!navigator.mediaDevices?.getUserMedia) {
      setErr('Your browser does not support audio recording. Use a modern browser like Chrome or Firefox.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';

      let recorder: MediaRecorder;
      try { recorder = new MediaRecorder(stream, { mimeType }); }
      catch { recorder = new MediaRecorder(stream); }

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        blobRef.current = blob;
        stopTracks();
        setRecording(false);
      };
      recorder.onerror = () => {
        setErr('Recording error. Please try again.');
        stopTracks();
        setRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDurationSec(Math.floor((Date.now() - startTime) / 1000));
      }, 200);

      timeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, MAX_RECORD_SECONDS * 1000);
    } catch (e: any) {
      if (e.name === 'NotAllowedError') {
        setErr('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else if (e.name === 'NotFoundError') {
        setErr('No microphone found. Please connect a microphone and try again.');
      } else {
        setErr('Could not start recording. Please check your microphone.');
      }
      stopTracks();
    }
  }, [stopTracks]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    stopTracks();
    mediaRecorderRef.current = null;
    blobRef.current = null;
    chunksRef.current = [];
    setRecording(false);
    setDurationSec(0);
    setErr(null);
  }, [stopTracks]);

  const handlePublish = async () => {
    if (!blobRef.current) { toast.error('Record audio first'); return; }
    if (!title.trim()) { toast.error('Enter a title'); return; }
    if (!profile) { toast.error('Please sign in to publish'); return; }

    setUploading(true);
    try {
      const { ext, contentType } = audioBlobMeta(blobRef.current);
      const audioUrl = await uploadAudioToStorage('voice', blobRef.current, ext, contentType);
      const transcript = description.trim()
        ? `${title.trim()} — ${description.trim()} [${category}]`
        : `${title.trim()} [${category}]`;

      await wildlifeApi.addVoicePetition({
        placeName: profile.localityName || title.trim(),
        language: navigator.language?.toLowerCase().startsWith('ta') ? 'ta' : 'en',
        audioUrl,
        transcript,
        lat: profile.lat || userCoords?.lat || 0,
        lng: profile.lng || userCoords?.lng || 0,
      });

      toast.success('Voice published!');
      setShowRecorder(false);
      setTitle('');
      setDescription('');
      resetRecording();
      fetchPetitions();
    } catch (e: any) {
      toast.error(e?.error ?? e?.message ?? 'Publish failed');
    } finally {
      setUploading(false);
    }
  };

  const togglePlayback = (p: VoicePetition) => {
    if (playingId === p.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) { audioRef.current.src = p.audioUrl; audioRef.current.play(); }
      setPlayingId(p.id);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const filteredPetitions = petitions.filter((p) => {
    if (mode === 'voice-of-gudalur') return p.mode === 'voice-of-gudalur' || !p.mode;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Rise Voice</h2>
          <p className="text-sm text-slate-500">Record, share, and amplify community voices</p>
        </div>
        <button onClick={() => setShowRecorder(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition active:scale-95">
          <Mic size={16} /> Record Voice
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button onClick={() => setMode('voice-of-gudalur')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition ${mode === 'voice-of-gudalur' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Voice of Gudalur
        </button>
        <button onClick={() => setMode('voice-for-gudalur')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition ${mode === 'voice-for-gudalur' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Voice for Gudalur
        </button>
      </div>
      <p className="text-xs text-slate-400 -mt-3">
        {mode === 'voice-of-gudalur'
          ? 'For Gudalur residents - register your voice on Voice of Gudalur'
          : 'For everyone - register your voice for Gudalur'}
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Volume2 size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Voice Petitions</span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900">{filteredPetitions.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Mode</span>
          </div>
          <p className="text-sm font-bold text-slate-900">{mode === 'voice-of-gudalur' ? 'Of Gudalur' : 'For Gudalur'}</p>
        </div>
      </div>

      {showRecorder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Record Your Voice</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Your concern..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option>Civic Problem</option>
                  <option>Elephant Alert</option>
                  <option>Accident</option>
                  <option>Water Issue</option>
                  <option>Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
              {recording ? (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-red-600">
                    <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-lg font-mono font-bold">{fmt(durationSec)}</span>
                  </div>
                  <p className="text-xs text-slate-500">Recording... Max {MAX_RECORD_SECONDS}s</p>
                </div>
              ) : blobRef.current ? (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <Mic size={20} />
                    <span className="text-sm font-bold">Audio recorded</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Tap the microphone to start recording</p>
              )}
              {err && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 w-full">
                  <AlertCircle size={16} className="text-red-600 shrink-0" />
                  <p className="text-xs text-red-700">{err}</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                {!recording && !blobRef.current && (
                  <button onClick={startRecording} className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold transition">
                    <Mic size={18} /> Start Recording
                  </button>
                )}
                {recording && (
                  <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold transition">
                    <Square size={18} fill="white" /> Stop
                  </button>
                )}
                {!recording && blobRef.current && (
                  <>
                    <button onClick={startRecording} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold">Re-record</button>
                    <button onClick={resetRecording} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <button onClick={handlePublish} disabled={uploading || !blobRef.current || !title.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition">
              {uploading ? 'Publishing...' : <><Upload size={16} /> Publish Voice Petition</>}
            </button>
            <button onClick={() => { setShowRecorder(false); resetRecording(); }} className="w-full py-2 text-slate-500 text-sm hover:text-slate-700 transition">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : filteredPetitions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Mic size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No voice petitions yet. Be the first to record!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPetitions.map((p) => (
            <div key={p.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">{p.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{p.speakerName} - {p.localityName}</p>
                </div>
                <button onClick={() => togglePlayback(p)} className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition shrink-0">
                  {playingId === p.id ? <Pause size={16} /> : <Play size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
    </div>
  );
};

export default RiseVoice;