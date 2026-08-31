/**
 * LiveGisMap.tsx
 * Leaflet-based GIS map showing wildlife sightings and voice petitions with proximity alerts.
 */
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Volume2 } from 'lucide-react';
import { db, supabase } from '../lib/supabase';
import { calculateDistanceKm, formatProximityWarning } from '../utils/geoUtils';
import { useLanguage } from '../context/LanguageContext';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Sighting {
  id: string; species: string; location: string; lat: number; lng: number;
  reportedBy: string; reportedByName: string; reportedAt: number; severity: string;
}

interface VoicePetition {
  id: string; title: string; description: string; audioUrl: string;
  localityName: string; lat: number; lng: number; createdByName: string; createdAt: number; category: string;
}

function Recenter({ coords }: { coords: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => { map.setView([coords.lat, coords.lng], 13); }, [coords, map]);
  return null;
}

export const LiveGisMap: React.FC<{ userCoords?: { lat: number; lng: number } | null; onProximityAlert?: (w: any, d: number) => void }> = ({ userCoords, onProximityAlert }) => {
  const { lang } = useLanguage();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [voices, setVoices] = useState<VoicePetition[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<'all' | 'sightings' | 'voices'>('all');
  const center = userCoords || { lat: 11.5333, lng: 76.6 };

  useEffect(() => {
    const fetchData = async () => {
      try { const { data: sData } = await db.getAnimalSightings(100); setSightings(sData || []); } catch (e) { console.error(e); }
      try { const { data: vData } = await db.getVoicePetitions(100); setVoices(vData || []); } catch (e) { console.error(e); }
    };
    fetchData();
    const ch1 = supabase.channel('animal_sightings').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'animal_sightings' }, fetchData).subscribe();
    const ch2 = supabase.channel('voice_petitions').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_petitions' }, fetchData).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  useEffect(() => {
    if (!userCoords || !onProximityAlert) return;
    sightings.forEach(s => {
      const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng);
      if (dist <= 6) { const warning = formatProximityWarning(dist, lang === 'ta' ? 'ta' : 'en'); onProximityAlert(warning, dist); }
    });
  }, [sightings, userCoords, onProximityAlert, lang]);

  const filteredSightings = selectedLayer === 'all' || selectedLayer === 'sightings' ? sightings : [];
  const filteredVoices = selectedLayer === 'all' || selectedLayer === 'voices' ? voices : [];

  const customSightingIcon = (severity: string) => {
    const color = severity === 'HIGH' ? '#dc2626' : severity === 'MEDIUM' ? '#f59e0b' : '#059669';
    return L.divIcon({ className: 'custom-marker', html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>`, iconSize: [32, 32], iconAnchor: [16, 32] });
  };

  const customVoiceIcon = L.divIcon({ className: 'custom-marker', html: `<div style="width:28px;height:28px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/></svg></div>`, iconSize: [28, 28], iconAnchor: [14, 28] });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Layers:</span>
          <div className="flex bg-slate-100 rounded-xl p-1">{(['all', 'sightings', 'voices'] as const).map(layer => (<button key={layer} onClick={() => setSelectedLayer(layer)} className={`px-3 py-1 rounded-lg text-xs font-bold transition ${selectedLayer === layer ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>{layer.charAt(0).toUpperCase() + layer.slice(1)}</button>))}</div>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> High</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Medium</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span> Low</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span> Voice</span>
        </div>
      </div>
      <div className="rounded-3xl overflow-hidden border-4 border-slate-200 shadow-xl" style={{ height: '500px' }}>
        <MapContainer center={[center.lat, center.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          {userCoords && <Recenter coords={userCoords} />}
          {userCoords && (<Marker position={[userCoords.lat, userCoords.lng]}><Popup><div className="text-xs font-bold">You are here</div></Popup></Marker>)}
          {filteredSightings.map(s => (<Marker key={s.id} position={[s.lat, s.lng]} icon={customSightingIcon(s.severity)}><Popup><div className="space-y-2 text-xs"><div className="flex items-center gap-2"><AlertTriangle size={14} className={s.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'} /><span className="font-bold text-slate-900">{s.species}</span></div><p className="text-slate-600"><strong>Location:</strong> {s.location}</p><p className="text-slate-600"><strong>Reported by:</strong> {s.reportedByName}</p><p className="text-slate-500"><strong>Time:</strong> {new Date(s.reportedAt).toLocaleString()}</p>{userCoords && <p className="text-slate-500"><strong>Distance:</strong> {calculateDistanceKm(userCoords.lat, userCoords.lng, s.lat, s.lng).toFixed(1)} km</p>}</div></Popup></Marker>))}
          {filteredVoices.map(v => (<Marker key={v.id} position={[v.lat, v.lng]} icon={customVoiceIcon}><Popup><div className="space-y-2 text-xs" style={{ minWidth: '200px' }}><div className="flex items-center gap-2"><Volume2 size={14} className="text-amber-500" /><span className="font-bold text-slate-900">{v.title}</span></div><p className="text-slate-600">{v.description}</p><p className="text-slate-500"><strong>By:</strong> {v.createdByName}</p><p className="text-slate-500"><strong>Area:</strong> {v.localityName}</p><p className="text-slate-500"><strong>Category:</strong> {v.category}</p><audio controls src={v.audioUrl} className="w-full mt-2" /></div></Popup></Marker>))}
        </MapContainer>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-center"><p className="text-2xl font-mono font-bold text-red-600">{sightings.filter(s => s.severity === 'HIGH').length}</p><p className="text-[10px] text-slate-500 uppercase font-bold">High Alert</p></div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-center"><p className="text-2xl font-mono font-bold text-amber-600">{sightings.length}</p><p className="text-[10px] text-slate-500 uppercase font-bold">Total Sightings</p></div>
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-center"><p className="text-2xl font-mono font-bold text-amber-600">{voices.length}</p><p className="text-[10px] text-slate-500 uppercase font-bold">Voice Petitions</p></div>
      </div>
    </div>
  );
};