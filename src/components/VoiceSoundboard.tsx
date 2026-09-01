/**
 * VoiceSoundboard.tsx
 * Community voice soundboard with audio recorder, Storj upload, place ranking, and playback.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Play, Pause, Upload, MapPin, Users, Award, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { db, supabase } from '../lib/supabase';
import { uploadToStorj, audioBlobMeta } from '../lib/storj';
import { recordVoiceNote } from '../services/voiceRecordService';
import { calculateDistanceKm } from '../utils/geoUtils';

export interface VoicePetition {
  id: string; title: string; description: string; audioUrl: string;
  localityId: string; localityName: string; lat: number; lng: number;
  createdBy: string; createdByName: string; createdByGudalurId: string;
  createdAt: number; supportCount: number; category: string;
}

export const VoiceSoundboard: React.FC<{ userCoords?: { lat: number; lng: number } | null }> = ({ userCoords }) => {
  const { profile } = useAuth();
  const [petitions, setPetitions] = useState<VoicePetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Civic Problem');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioBlob = useRef<Blob | null>(null);

  const fetchPetitions = async () => {
    setLoading(true);
    try {
      const { data } = await db.getVoicePetitions({ limit: 50 });
      // Map DB rows (voice_petitions schema) to the local VoicePetition model
      const mapped: VoicePetition[] = (data || []).map(r => ({
        id: r.id,
        title: (r.transcript || r.place_name || 'Voice petition').slice(0, 80),
        description: r.transcript || '',
        audioUrl: r.audio_url,
        localityId: '',
        localityName: r.place_name,
        lat: r.latitude,
        lng: r.longitude,
        createdBy: r.docket_id || '',
        createdByName: r.speaker_name || 'Resident',
        createdByGudalurId: '',
        createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        supportCount: 0,
        category: r.language || 'voice',
      }));
      setPetitions(mapped);
    }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPetitions();
    const ch = supabase.channel('voice_petitions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_petitions' }, () => fetchPetitions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleRecord = async () => {
    setRecording(true);
    const r = await recordVoiceNote(120);
    setRecording(false);
    if (r) { currentAudioBlob.current = r.blob; toast.success(`Recorded ${Math.round(r.durationMs / 1000)}s`); }
    else toast.error('Recording failed');
  };

  const handleUpload = async () => {
    if (!currentAudioBlob.current || !newTitle.trim() || !profile) { toast.error('Record audio and fill details'); return; }
    setUploading(true);
    try {
      const { ext, contentType } = audioBlobMeta(currentAudioBlob.current);
      const url = await uploadToStorj('voice', currentAudioBlob.current, ext, contentType);
      // voice_petitions schema: place_name, language, audio_url, transcript, speaker_name, latitude, longitude
      const transcript = newDescription.trim()
        ? `${newTitle.trim()} — ${newDescription.trim()} [${newCategory}]`
        : `${newTitle.trim()} [${newCategory}]`;
      const { error } = await db.addVoicePetition({
        place_name: profile.localityName || newTitle.trim(),
        language: navigator.language?.toLowerCase().startsWith('ta') ? 'ta' : 'en',
        audio_url: url,
        transcript,
        speaker_name: profile.name,
        latitude: profile.lat || 0,
        longitude: profile.lng || 0,
      });
      if (error) throw error;
      toast.success('Published!'); setShowRecorder(false); setNewTitle(''); setNewDescription(''); currentAudioBlob.current = null; fetchPetitions();
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const togglePlayback = (p: VoicePetition) => {
    if (playingId === p.id) { audioRef.current?.pause(); setPlayingId(null); }
    else { if (audioRef.current) { audioRef.current.src = p.audioUrl; audioRef.current.play(); setPlayingId(p.id); } }
  };

  // const ranked definition broken - replaced belowlat, a.lng) - calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)).map((p, i) => ({ ...p, rank: i + 1, distance: calculateDistanceKm(userCoords.lat, userCoords.lng, p.lat, p.lng) })) : petitions.map((p, i) => ({ ...p, rank: i + 1, distance: 0 }));lat, a.lng) - calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)).map((p, i) => ({ ...p, rank: i + 1, distance: calculateDistanceKm(userCoords.lat, userCoords.lng, p.lat, p.lng) })) : petitions.map((p, i) => ({ ...p, rank: i + 1, distance: 0 }));
const ranked = userCoords ? [...petitions].sort((a, b) => calculateDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng) - calculateDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng)).map((p, i) => ({ ...p, rank: i + 1, distance: calculateDistanceKm(userCoords.lat, userCoords.lng, p.lat, p.lng) })) : petitions.map((p, i) => ({ ...p, rank: i + 1, distance: 0 }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-serif font-bold text-slate-900">Community Voice Soundboard</h2>
          <p className="text-xs text-slate-500">Record, share, and amplify local voices</p>
        </div>
        <button onClick={() => setShowRecorder(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg transition active:scale-95">
          <Mic size={16} /> Record Voice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Volume2 size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Voice Petitions</span>
          </div>
          <p className="text-2xl font-mono font-bold text-slate-900">{petitions.length}</p>
        </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((p) => (
            <motion.div 
              key={p.id} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-sm">
                {p.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{p.title}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{p.category}</span>
                </div>
                <p className="text-xs text-slate-500 truncate">{p.description}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1"><MapPin size={10} />{p.localityName}</span>
                  <span>•</span>
                  <span>{p.createdByName}</span>
                  <span>•</span>
                  <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.distance !== undefined && p.distance > 0 && (
                    <>
                      <span>•</span>
                      <span className={p.distance <= 3 ? 'text-amber-600 font-bold' : ''}>{p.distance.toFixed(1)} km away</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={() => togglePlayback(p)} 
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition ${playingId === p.id ? 'bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
              >
                {playingId === p.id ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
              </button>
            </motion.div>
          ))}
        </div>
      )}

      </div>


      <AnimatePresence>
        {showRecorder && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-serif font-bold text-slate-900">Record Voice Petition</h3>
                <button onClick={() => setShowRecorder(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Your concern..." className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>Civic Problem</option>
                    <option>Elephant Alert</option>
                    <option>Accident</option>
                    <option>Water Issue</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Brief description..." rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 py-4">
                {currentAudioBlob.current ? (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                      <span className="text-sm font-bold">Audio recorded</span>
                    </div>
                    <button onClick={handleRecord} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold">Re-record</button>
                  </div>
                ) : (
                  <button onClick={handleRecord} disabled={recording} className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white transition ${recording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500'}`}>
                    {recording ? 'Recording…' : 'Tap to Record'}
                  </button>
                )}
              </div>
              <button 
                onClick={handleUpload} 
                disabled={uploading || !currentAudioBlob.current || !newTitle.trim()} 
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? 'Uploading…' : <><Upload size={16} /> Publish Voice Petition</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} onPause={() => setPlayingId(null)} />
    </div>
  );
};