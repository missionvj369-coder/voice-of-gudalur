// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.
import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Phone, 
  Crosshair, 
  Eye, 
  Volume2, 
  VolumeX, 
  Layers, 
  Navigation, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  Filter, 
  Flame,
  Camera
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { WildlifeIncident, WildlifeAnimal } from '../types';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateDistanceKm, formatProximityWarning, playEmergencyAlertSound } from '../utils/geoUtils';
import { ReportWildlifeModal } from '../components/Wildlife/ReportWildlifeModal';
import { RegisterResidentModal } from '../components/Auth/RegisterResidentModal';
import toast from 'react-hot-toast';

// Custom Map Controller to smoothly pan to coordinates
function MapPanController({ coords, zoom }: { coords: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, zoom || 14, { duration: 1.2 });
    }
  }, [coords, zoom, map]);
  return null;
}

// Custom Leaflet DivIcon Generators for reliable rendering
const createAnimalMarkerIcon = (animal: string, threat: string) => {
  const isTiger = animal === 'TIGER';
  const isLeopard = animal === 'LEOPARD';
  const isCritical = threat === 'CRITICAL_ATTACK' || threat === 'IMMINENT_DANGER';

  const bgColor = isCritical ? '#DC2626' : isTiger ? '#EA580C' : '#D97706';
  const emoji = isTiger ? '🐅' : isLeopard ? '🐆' : animal === 'SLOTH_BEAR' ? '🐻' : animal === 'GAUR' ? '🐃' : '🐘';

  return L.divIcon({
    className: 'custom-animal-pin',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 0 15px ${isCritical ? 'rgba(220, 38, 38, 0.8)' : 'rgba(0,0,0,0.3)'};
        border: 3px solid white;
        animation: ${isCritical ? 'pulse 1.5s infinite' : 'none'};
      ">
        ${emoji}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20]
  });
};

const userLocationIcon = L.divIcon({
  className: 'custom-user-pin',
  html: `
    <div style="
      background-color: #2563EB;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 12px #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

export const WildlifeHub: React.FC = () => {
  const { user, profile, userCoords, acquireLiveLocation } = useAuth();
  const { lang, t } = useLanguage();

  const [incidents, setIncidents] = useState<WildlifeIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnimalFilter, setSelectedAnimalFilter] = useState<string>('ALL');
  const [mapType, setMapType] = useState<'STREET' | 'SATELLITE'>('SATELLITE');
  const [selectedIncident, setSelectedIncident] = useState<WildlifeIncident | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([11.5034, 76.4912]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load Real Incidents from Firestore with real-time onSnapshot synchronization
  useEffect(() => {
    const q = query(collection(db, 'wildlife_incidents'), orderBy('timestamp', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: WildlifeIncident[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ ...docSnap.data(), id: docSnap.id } as WildlifeIncident);
        });

        // Also merge local storage backup reports
        const local = JSON.parse(localStorage.getItem('onegudalur_real_wildlife') || '[]');
        const combined = [...loaded];
        local.forEach((locItem: WildlifeIncident) => {
          if (!combined.some((c) => c.id === locItem.id)) {
            combined.push(locItem);
          }
        });

        combined.sort((a, b) => b.timestamp - a.timestamp);
        setIncidents(combined);
        setLoading(false);
      },
      (error) => {
        console.warn('Firestore snapshot notice, using local storage state:', error);
        const local = JSON.parse(localStorage.getItem('onegudalur_real_wildlife') || '[]');
        setIncidents(local);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Update map center when userCoords are available
  useEffect(() => {
    if (userCoords) {
      setMapCenter([userCoords.lat, userCoords.lng]);
    }
  }, [userCoords]);

  // Compute live distances to all incidents
  const processedIncidents = incidents.map((inc) => {
    let distanceKm: number | undefined;
    if (userCoords && inc.lat && inc.lng) {
      distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, inc.lat, inc.lng);
    }
    return { ...inc, distanceFromUserKm: distanceKm };
  });

  const filteredIncidents = processedIncidents.filter((inc) => {
    if (selectedAnimalFilter === 'ALL') return true;
    if (selectedAnimalFilter === 'TIGER') return inc.animalType === 'TIGER' || inc.type === 'TIGER';
    if (selectedAnimalFilter === 'ELEPHANT') return inc.animalType === 'ELEPHANT' || inc.animalType === 'LONE_TUSKER';
    if (selectedAnimalFilter === 'LEOPARD') return inc.animalType === 'LEOPARD';
    return inc.animalType === selectedAnimalFilter;
  });

  // Identify any critical alert within 3km of the resident
  const criticalNearbyAlert = processedIncidents.find(
    (inc) => inc.distanceFromUserKm !== undefined && inc.distanceFromUserKm <= 3.0
  );

  const handleTestSiren = () => {
    playEmergencyAlertSound();
    toast.success(
      lang === 'ta'
        ? '🔊 அவசர எச்சரிக்கை ஒலி ஒலித்தது!'
        : '🔊 Emergency wildlife proximity siren played!'
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP EMERGENCY BROADCAST BANNER */}
      {criticalNearbyAlert && (
        <div className="p-5 rounded-3xl bg-red-600 text-white shadow-xl shadow-red-200 border-2 border-red-400 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white text-red-600 rounded-2xl shrink-0 shadow-md">
              <Flame size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white text-red-700 text-xs font-black uppercase tracking-wider">
                  {lang === 'ta' ? 'உடனடி ஆபத்து' : 'IMMINENT DANGER'}
                </span>
                <span className="text-xs font-mono font-bold">
                  {criticalNearbyAlert.distanceFromUserKm} KM {lang === 'ta' ? 'தொலைவில்' : 'AWAY'}
                </span>
              </div>
              <h3 className="text-lg font-bold mt-1">
                {lang === 'ta'
                  ? `எச்சரிக்கை! உங்கள் பகுதி அருகில் ${criticalNearbyAlert.animalType} நடமாட்டம் (${criticalNearbyAlert.localityName})`
                  : `URGENT: ${criticalNearbyAlert.animalType} active near ${criticalNearbyAlert.localityName}`}
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                {criticalNearbyAlert.behavior || (lang === 'ta' ? 'வீட்டுக்குள்ளேயே பாதுகாப்பாக இருங்கள். தோட்டப் பாதைகளை தவிர்க்கவும்.' : 'Stay indoors and avoid estate footpaths immediately.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            <button
              onClick={handleTestSiren}
              className="px-4 py-2 bg-white text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Volume2 size={16} />
              <span>{lang === 'ta' ? 'ஒலி எச்சரிக்கை' : 'Play Siren'}</span>
            </button>
            <a
              href="tel:18004256100"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Phone size={16} />
              <span>{lang === 'ta' ? 'வனத்துறை RRT: 1800 425 6100' : 'Forest RRT: 1800 425 6100'}</span>
            </a>
          </div>
        </div>
      )}

      {/* 2. HERO / RADAR CONTROL BAR */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-3">
              <Radio size={14} className="animate-pulse" />
              <span>{lang === 'ta' ? 'நேரடி வனவிலங்கு ரேடார் & பாதுகாப்பு நெட்வொர்க்' : 'Live Wildlife Radar & Citizen Safety Net'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
              {lang === 'ta' ? 'கூடலூர் நேரடி வனவிலங்கு தகவல் மையம்' : 'Real-time Wildlife Sightings & Radar'}
            </h1>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              {lang === 'ta'
                ? 'புலி, காட்டு யானை மற்றும் சிறுத்தை நடமாட்டத்தை உடனுக்குடன் தெரிந்துகொள்ளுங்கள். உங்கள் ஜிபிஎஸ் இடத்திலிருந்து நேரடி தூரத்தை கணக்கிடுகிறது.'
                : 'Live verified sightings of tigers, elephants, and leopards across Gudalur, O\'Valley, and border regions with automatic GPS distance warning.'}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-200 transition flex items-center gap-2"
            >
              <Plus size={18} />
              <span>{lang === 'ta' ? 'விலங்கு நடமாட்டத்தை அறிவிக்கவும்' : 'Report Animal Sighting'}</span>
            </button>

            <button
              onClick={() => acquireLiveLocation()}
              className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition flex items-center gap-2"
              title={lang === 'ta' ? 'எனது இருப்பிடத்தை புதுப்பி' : 'Update My Live GPS'}
            >
              <Crosshair size={16} className="text-emerald-700" />
              <span>{lang === 'ta' ? 'ஜிபிஎஸ் புதுப்பி' : 'Refresh GPS'}</span>
            </button>

            <button
              onClick={handleTestSiren}
              className="p-3.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-2xl transition"
              title={lang === 'ta' ? 'அவசர சைரன் சோதனை' : 'Test Emergency Siren'}
            >
              <Volume2 size={18} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">
              {lang === 'ta' ? 'உங்கள் இருப்பிடம்' : 'Your Live Location'}
            </span>
            <span className="text-xs font-bold text-slate-900 truncate block mt-0.5">
              {userCoords ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}` : profile?.localityName || 'Gudalur Town'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50/50 border border-red-100">
            <span className="text-[11px] font-bold text-red-600 block uppercase">
              {lang === 'ta' ? 'பதிவான நடமாட்டங்கள்' : 'Active Sightings'}
            </span>
            <span className="text-lg font-black text-red-900 block mt-0.5">
              {incidents.length}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-700 block uppercase">
              {lang === 'ta' ? 'வனத்துறை உதவி எண்' : 'Forest Control Room'}
            </span>
            <a href="tel:18004256100" className="text-xs font-bold text-emerald-900 block mt-0.5 hover:underline">
              1800 425 6100 (24x7)
            </a>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
            <span className="text-[11px] font-bold text-amber-700 block uppercase">
              {lang === 'ta' ? 'குடிமக்கள் உறுப்பினர்' : 'Resident Status'}
            </span>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="text-xs font-bold text-amber-900 hover:underline block mt-0.5 text-left"
            >
              {profile ? profile.gudalurId : (lang === 'ta' ? 'அட்டை பெறுக →' : 'Get Citizen Card →')}
            </button>
          </div>
        </div>
      </div>

      {/* 3. SATELLITE MAP & REAL-TIME SIGHTINGS SPLIT VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* MAP SECTION (7 COLS) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-4 shadow-xs border border-slate-200 flex flex-col h-[520px]">
          
          {/* Map Header & Controls */}
          <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900 font-serif">
                {lang === 'ta' ? 'நேரடி நிலப்பரப்பு & செயற்கைக்கோள் பார்வை' : 'Live Terrain & Satellite Danger Zones'}
              </h3>
            </div>

            {/* Satellite / Street Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMapType('SATELLITE')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  mapType === 'SATELLITE' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {lang === 'ta' ? 'செயற்கைக்கோள்' : 'Satellite'}
              </button>
              <button
                onClick={() => setMapType('STREET')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  mapType === 'STREET' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {lang === 'ta' ? 'சாலை வரைபடம்' : 'Terrain'}
              </button>
            </div>
          </div>

          {/* Leaflet Container */}
          <div className="flex-1 rounded-2xl overflow-hidden relative border border-slate-200">
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              {mapType === 'SATELLITE' ? (
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Earthstar Geographics'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  maxZoom={18}
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              <MapPanController coords={selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : null} />

              {/* User Location Blue Dot */}
              {userCoords && (
                <Marker position={[userCoords.lat, userCoords.lng]} icon={userLocationIcon}>
                  <Popup>
                    <div className="p-1 text-xs font-sans">
                      <p className="font-bold text-blue-700">📍 {lang === 'ta' ? 'உங்கள் நேரடி இருப்பிடம்' : 'Your Live Location'}</p>
                      <p className="text-slate-600">{profile?.localityName || 'Gudalur'}</p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Wildlife Incident Markers & Danger Buffer Circles */}
              {filteredIncidents.map((inc) => (
                <React.Fragment key={inc.id}>
                  <Marker
                    position={[inc.lat, inc.lng]}
                    icon={createAnimalMarkerIcon(inc.animalType, inc.threatLevel)}
                    eventHandlers={{
                      click: () => setSelectedIncident(inc)
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs font-sans max-w-[200px]">
                        <div className="flex items-center gap-1 font-bold text-red-600 mb-1">
                          <span>{inc.animalType === 'TIGER' ? '🐅' : inc.animalType === 'LEOPARD' ? '🐆' : '🐘'}</span>
                          <span>{inc.animalType}</span>
                        </div>
                        <p className="font-bold text-slate-900">{inc.localityName}</p>
                        <p className="text-slate-600 mt-1">{inc.behavior}</p>
                        {inc.distanceFromUserKm !== undefined && (
                          <p className="mt-1 font-bold text-red-600">
                            {inc.distanceFromUserKm} km {lang === 'ta' ? 'தொலைவில்' : 'away'}
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>

                  {/* 800m Caution Circle */}
                  <Circle
                    center={[inc.lat, inc.lng]}
                    radius={800}
                    pathOptions={{
                      color: inc.threatLevel === 'CRITICAL_ATTACK' ? '#DC2626' : '#EA580C',
                      fillColor: inc.threatLevel === 'CRITICAL_ATTACK' ? '#DC2626' : '#EA580C',
                      fillOpacity: 0.15,
                      weight: 1.5
                    }}
                  />
                </React.Fragment>
              ))}
            </MapContainer>

            {/* Floating Map Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-[11px] font-bold shadow-md border border-slate-200 flex items-center gap-3">
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                <span>Tiger/High Threat</span>
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Elephant/Gaur</span>
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>You</span>
              </span>
            </div>
          </div>
        </div>

        {/* LIVE SIGHTINGS FEED (5 COLS) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col h-[520px]">
          
          {/* Feed Header & Species Filter */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold font-serif text-slate-900">
              {lang === 'ta' ? 'நேரடி நடமாட்ட பட்டியல்' : 'Live Incident Radar'}
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {filteredIncidents.length} {lang === 'ta' ? 'அறிவிப்புகள்' : 'Reports'}
            </span>
          </div>

          {/* Quick Species Filter Pills */}
          <div className="flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: lang === 'ta' ? 'அனைத்தும்' : 'All' },
              { id: 'TIGER', label: '🐅 Tiger' },
              { id: 'ELEPHANT', label: '🐘 Elephant' },
              { id: 'LEOPARD', label: '🐆 Leopard' },
              { id: 'GAUR', label: '🐃 Gaur' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedAnimalFilter(f.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedAnimalFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Incidents Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredIncidents.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShieldAlert size={40} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">
                  {lang === 'ta' ? 'தற்போது புதிய எச்சரிக்கைகள் இல்லை' : 'No active sightings recorded'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ta' ? 'விலங்கு நடமாட்டத்தை நீங்கள் கண்டால் மேலே உள்ள பொத்தானை அழுத்தி அறிவிக்கவும்.' : 'If you spot wildlife in your locality, tap Report Animal Sighting.'}
                </p>
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const prox = inc.distanceFromUserKm !== undefined ? formatProximityWarning(inc.distanceFromUserKm, lang) : null;

                return (
                  <div
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncident(inc);
                      setMapCenter([inc.lat, inc.lng]);
                    }}
                    className={`p-4 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-red-500 bg-red-50/50 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {/* Top Row: Animal, Threat, Distance */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {inc.animalType === 'TIGER' ? '🐅' : inc.animalType === 'LEOPARD' ? '🐆' : '🐘'}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {inc.animalType} {inc.herdSize > 1 ? `(${inc.herdSize})` : ''}
                          </h4>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin size={11} className="text-emerald-600" />
                            <span>{inc.localityName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Distance Pill */}
                      {prox && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${prox.color}`}>
                          {prox.label}
                        </span>
                      )}
                    </div>

                    {/* Behavior Description */}
                    <p className="text-xs text-slate-700 mt-2 line-clamp-2">
                      {inc.behavior}
                    </p>

                    {/* Media thumbnail if exists */}
                    {inc.mediaUrl && (
                      <div className="mt-2 h-20 w-full rounded-xl overflow-hidden border border-slate-200 relative">
                        <img src={inc.mediaUrl} alt="Wildlife" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                          Evidence
                        </span>
                      </div>
                    )}

                    {/* Footer Meta */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        <span>{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                      <span>By: {inc.reportedBy} ({inc.reporterGudalurId || 'Resident'})</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* 4. EMERGENCY PROTOCOLS & OFFICIAL RAPID RESPONSE CONTACTS */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-bold mb-3">
            <ShieldAlert size={14} />
            <span>{lang === 'ta' ? 'அவசர வனவிலங்கு பாதுகாப்பு விதிகள்' : 'Standard Wildlife Encounter Safety Protocols'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif">
            {lang === 'ta'
              ? 'யானை அல்லது புலி தென்பட்டால் செய்ய வேண்டியவை'
              : 'Immediate Action Protocols for Elephant & Tiger Sightings'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            {lang === 'ta'
              ? 'கூடலூர் மற்றும் ஓ\'வேலி வனப்பகுதிகளில் வனவிலங்குகளை எதிர்கொள்ளும் போது பதற்றமடையாமல் பாதுகாப்பான வழிகளை பின்பற்றவும்.'
              : 'Follow verified forest guidelines when encountering wildlife along estate corridors and peripheral roads.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <h4 className="text-sm font-bold text-amber-400 mb-1">
              {lang === 'ta' ? '1. அமைதி காக்கவும்' : '1. Maintain Visual Distance'}
            </h4>
            <p className="text-xs text-slate-300">
              {lang === 'ta'
                ? 'யானைகள் அல்லது புலிகளை நோக்கி கற்கள் எறியவோ, கூச்சலிடவோ கூடாது. மெதுவாக பின்நோக்கி பாதுகாப்பான இடத்திற்கு செல்லவும்.'
                : 'Never shout, flash bright vehicle lights, or throw objects. Back away slowly while keeping the animal in your peripheral field.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <h4 className="text-sm font-bold text-amber-400 mb-1">
              {lang === 'ta' ? '2. இரவு பயண எச்சரிக்கை' : '2. Night Ghat & Estate Curfew'}
            </h4>
            <p className="text-xs text-slate-300">
              {lang === 'ta'
                ? 'இரவு 8 மணிக்கு மேல் இருசக்கர வாகனங்களில் தேயிலைத் தோட்ட உட்பாதைகளில் செல்வதை தவிர்க்கவும்.'
                : 'Avoid two-wheeler commutes on unlit plantation paths and mud tracks after 8:00 PM.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
            <h4 className="text-sm font-bold text-amber-400 mb-1">
              {lang === 'ta' ? '3. வனத்துறை அதிரடிப்படை' : '3. Immediate RRT Dispatch'}
            </h4>
            <p className="text-xs text-slate-300 mb-2">
              {lang === 'ta'
                ? 'கூடலூர் வனக்கோட்ட அவசர கட்டுப்பாட்டு அறைக்கு உடனே தகவல் தெரிவிக்கவும்.'
                : 'Call Gudalur Forest Rapid Response Team for immediate field siren and drone tracking.'}
            </p>
            <a
              href="tel:18004256100"
              className="inline-block text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              📞 1800 425 6100 (Toll-Free)
            </a>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportWildlifeModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={(newInc) => {
          setIncidents((prev) => [newInc, ...prev]);
          setMapCenter([newInc.lat, newInc.lng]);
        }}
      />

      <RegisterResidentModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

    </div>
  );
};

export default WildlifeHub;

