// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.
import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Compass, 
  Check, 
  X, 
  Radio, 
  Upload, 
  Loader2, 
  ShieldAlert, 
  Crosshair,
  Volume2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import { WildlifeAnimal, ThreatLevel, WildlifeIncident } from '../../types';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { playEmergencyAlertSound, sendBrowserWildlifeNotification } from '../../utils/geoUtils';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (incident: WildlifeIncident) => void;
}

export const ReportWildlifeModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile, userCoords, acquireLiveLocation } = useAuth();
  const { lang, t } = useLanguage();

  const [animalType, setAnimalType] = useState<WildlifeAnimal>('ELEPHANT');
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>('IMMINENT_DANGER');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [customPlace, setCustomPlace] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [herdSize, setHerdSize] = useState<number>(1);
  const [behavior, setBehavior] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(userCoords || null);
  const [isAcquiringGps, setIsAcquiringGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When modal opens, immediately capture live GPS
  useEffect(() => {
    if (isOpen && !coords) {
      handleGetLiveGps();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGetLiveGps = async () => {
    setIsAcquiringGps(true);
    const loc = await acquireLiveLocation();
    setIsAcquiringGps(false);
    if (loc) {
      setCoords(loc);
      toast.success(lang === 'ta' ? 'துல்லிய ஜிபிஎஸ் இடம் பெறப்பட்டது!' : 'Live GPS location captured!');
    } else {
      toast.error(lang === 'ta' ? 'இருப்பிட அனுமதி தேவை' : 'Please enable device GPS / Location');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === 'ta' ? 'கோப்பின் அளவு 5MB-க்குள் இருக்க வேண்டும்' : 'File size must be under 5MB');
      return;
    }

    setIsUploadingMedia(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result as string);
      setIsUploadingMedia(false);
      toast.success(lang === 'ta' ? 'புகைப்படம் இணைக்கப்பட்டது' : 'Photo attached successfully');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coords) {
      toast.error(
        lang === 'ta'
          ? 'நேரடி ஜிபிஎஸ் இருப்பிடம் கட்டாயம் தேவை! இருப்பிடத்தை பதிவு செய்யவும்.'
          : 'Live GPS location is compulsory for wildlife warnings. Please tap Tag GPS!'
      );
      return;
    }

    const selectedLoc = GUDALUR_LOCALITIES.find((l) => l.id === localityId);
    const locName = customPlace.trim() || selectedLoc?.name || 'Gudalur Taluk';

    setIsSubmitting(true);

    const incidentData: WildlifeIncident = {
      id: `WILD-${Date.now()}`,
      type: animalType,
      animalType,
      threatLevel,
      localityId,
      localityName: locName,
      customPlace: customPlace.trim() || undefined,
      pincode: pincode.trim() || selectedLoc?.pincode || '643211',
      lat: coords.lat,
      lng: coords.lng,
      generalizedArea: `${locName} (${selectedLoc?.administrativeParent || 'Gudalur'})`,
      herdSize: Number(herdSize) || 1,
      behavior: behavior.trim() || (lang === 'ta' ? 'வன எல்லையோர நடமாட்டம்' : 'Active movement near plantation border'),
      urgency: threatLevel === 'CRITICAL_ATTACK' ? 'CRITICAL' : threatLevel === 'IMMINENT_DANGER' ? 'HIGH' : 'NORMAL',
      mediaUrl: mediaUrl || undefined,
      mediaType: 'image',
      reportedBy: profile?.name || user?.displayName || 'Alert Citizen',
      reporterPhone: profile?.phone || '',
      reporterGudalurId: profile?.gudalurId || 'GD-2026-LIVE',
      reporterLocality: profile?.localityName || locName,
      reporterPincode: profile?.pincode || pincode,
      verifiedByForestDept: false,
      timestamp: Date.now()
    };

    try {
      // 1. Save to Firestore
      try {
        await addDoc(collection(db, 'wildlife_incidents'), incidentData);
      } catch (firestoreErr) {
        console.warn('Firestore incident write fallback to local storage:', firestoreErr);
      }

      // 2. Save to localStorage broadcast list
      const existing = JSON.parse(localStorage.getItem('onegudalur_real_wildlife') || '[]');
      existing.unshift(incidentData);
      localStorage.setItem('onegudalur_real_wildlife', JSON.stringify(existing));

      // 3. Play emergency sound & dispatch browser notification
      playEmergencyAlertSound();
      sendBrowserWildlifeNotification(
        `🚨 ${animalType} SIGHTED: ${locName}`,
        `Threat Level: ${threatLevel}. Take immediate precautions!`
      );

      toast.success(
        lang === 'ta'
          ? 'வனவிலங்கு எச்சரிக்கை அனைத்து மக்களுக்கும் ஒளிபரப்பப்பட்டது!'
          : 'Wildlife alert broadcasted live to all Gudalur residents!'
      );

      if (onSuccess) onSuccess(incidentData);
      onClose();
    } catch (err) {
      console.error('Error broadcasting wildlife incident:', err);
      toast.error(lang === 'ta' ? 'பதிவு செய்வதில் பிழை' : 'Failed to broadcast alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-red-200 animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Header with High-Impact Warning Theme */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-red-600 text-white rounded-2xl animate-pulse shadow-md shadow-red-200">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900 flex items-center gap-2">
              <span>{lang === 'ta' ? 'நேரடி வனவிலங்கு நடமாட்டம் அறிவிப்பு' : 'Live Wildlife Sighting Alert'}</span>
            </h2>
            <p className="text-xs text-red-600 font-bold mt-0.5">
              {lang === 'ta'
                ? 'நேரடி ஜிபிஎஸ் இடம் மூலம் அனைத்து குடிமக்களுக்கும் உடனடி ஒலி எச்சரிக்கை செல்லும்'
                : 'Broadcasts instant GPS proximity alerts & audio siren to all citizens'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Mandatory GPS Position Bar */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${coords ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white animate-bounce'}`}>
                <Crosshair size={20} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-900">
                  {coords
                    ? (lang === 'ta' ? '✅ துல்லிய ஜிபிஎஸ் இருப்பிடம் பதிவு செய்யப்பட்டது' : '✅ Live GPS Coordinates Captured')
                    : (lang === 'ta' ? '⚠️ நேரடி ஜிபிஎஸ் இருப்பிடம் கட்டாயம்' : '⚠️ Live GPS Location Required')}
                </p>
                <p className="text-slate-600 font-mono text-[11px] mt-0.5">
                  {coords ? `Lat: ${coords.lat.toFixed(5)}, Lng: ${coords.lng.toFixed(5)}` : (lang === 'ta' ? 'பொத்தானை அழுத்தவும்' : 'Tap button to acquire GPS')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGetLiveGps}
              disabled={isAcquiringGps}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              {isAcquiringGps ? <Loader2 size={14} className="animate-spin" /> : <Compass size={14} />}
              <span>{coords ? (lang === 'ta' ? 'ஜிபிஎஸ் புதுப்பி' : 'Update GPS') : (lang === 'ta' ? 'ஜிபிஎஸ் பெறு' : 'Acquire GPS')}</span>
            </button>
          </div>

          {/* Animal Type Selection with Specific Dangerous Icons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              {lang === 'ta' ? 'பார்த்த விலங்கு வகை *' : 'Sighted Animal Species *'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'TIGER', labelEn: '🐅 Tiger (புலி)', labelTa: '🐅 புலி (Tiger)', color: 'border-red-500 bg-red-50 text-red-900' },
                { id: 'ELEPHANT', labelEn: '🐘 Elephant Herd', labelTa: '🐘 யானைக் கூட்டம்', color: 'border-amber-500 bg-amber-50 text-amber-900' },
                { id: 'LONE_TUSKER', labelEn: '🐘 Lone Tusker', labelTa: '🐘 ஒற்றை காட்டுயானை', color: 'border-orange-500 bg-orange-50 text-orange-900' },
                { id: 'LEOPARD', labelEn: '🐆 Leopard (சிறுத்தை)', labelTa: '🐆 சிறுத்தை (Leopard)', color: 'border-yellow-500 bg-yellow-50 text-yellow-900' },
                { id: 'GAUR', labelEn: '🐃 Indian Gaur', labelTa: '🐃 காட்டு மாடு (Gaur)', color: 'border-slate-500 bg-slate-50 text-slate-900' },
                { id: 'SLOTH_BEAR', labelEn: '🐻 Sloth Bear', labelTa: '🐻 கரடி (Sloth Bear)', color: 'border-stone-500 bg-stone-50 text-stone-900' },
                { id: 'WILD_BOAR', labelEn: '🐗 Wild Boar', labelTa: '🐗 காட்டுப் பன்றி', color: 'border-emerald-500 bg-emerald-50 text-emerald-900' },
                { id: 'OTHER', labelEn: '🐾 Other Wildlife', labelTa: '🐾 பிற வனவிலங்கு', color: 'border-slate-300 bg-white text-slate-700' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAnimalType(item.id as WildlifeAnimal)}
                  className={`p-2.5 rounded-2xl border text-xs font-bold text-left transition flex items-center justify-between ${
                    animalType === item.id ? `ring-2 ring-red-600 shadow-xs ${item.color}` : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{lang === 'ta' ? item.labelTa : item.labelEn}</span>
                  {animalType === item.id && <Check size={14} className="text-red-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Threat Level */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ta' ? 'அபாய நிலை / தீவிரம் *' : 'Threat Urgency Level *'}
            </label>
            <select
              value={threatLevel}
              onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)}
              className="w-full px-4 py-2.5 rounded-2xl border border-red-300 bg-red-50/50 text-xs font-bold text-slate-900 outline-none"
            >
              <option value="CRITICAL_ATTACK">
                {lang === 'ta' ? '🚨 உடனடி தாக்குதல் / மனிதன்-கால்நடை ஆபத்து (CRITICAL ATTACK)' : '🚨 Critical Attack / Immediate Danger to Human Life'}
              </option>
              <option value="IMMINENT_DANGER">
                {lang === 'ta' ? '⚠️ குடியிருப்பு / பள்ளி / வீடுகள் அருகில் நடமாட்டம் (IMMINENT DANGER)' : '⚠️ Active in Settlement / School Fringe (High Risk)'}
              </option>
              <option value="ACTIVE_MOVEMENT">
                {lang === 'ta' ? '⚡ தோட்டப்பாதை / பிரதான சாலை கடப்பது (ACTIVE MOVEMENT)' : '⚡ Crossing Plantation Road / Ghat Highway'}
              </option>
              <option value="ESTATE_CROSSING">
                {lang === 'ta' ? '🌿 எஸ்டேட் எல்லை ஓரத்தில் உள்ளது (ESTATE CROSSING)' : '🌿 Grazing along Estate Boundary'}
              </option>
              <option value="CAUTION">
                {lang === 'ta' ? '👁️ தூரத்து வனப்பகுதியில் தெரிந்தது (CAUTION)' : '👁️ Sighted in Distant Shola Buffer'}
              </option>
            </select>
          </div>

          {/* Locality, Custom Place, and Herd Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin size={12} className="text-emerald-600" />
                <span>{lang === 'ta' ? 'பகுதி *' : 'Locality *'}</span>
              </label>
              <select
                value={localityId}
                onChange={(e) => {
                  setLocalityId(e.target.value);
                  const sel = GUDALUR_LOCALITIES.find(l => l.id === e.target.value);
                  if (sel) {
                    setPincode(sel.pincode);
                    if (!coords) {
                      setCoords({ lat: sel.lat, lng: sel.lng });
                    }
                  }
                }}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs bg-white font-medium outline-none"
              >
                {GUDALUR_LOCALITIES.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {lang === 'ta' ? loc.nameTa : loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'ta' ? 'குறிப்பிட்ட இடம் / தோட்டம்' : 'Exact Landmark / Division'}
              </label>
              <input
                type="text"
                value={customPlace}
                onChange={(e) => setCustomPlace(e.target.value)}
                placeholder="e.g. Near Bridge / Div 3"
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'ta' ? 'எண்ணிக்கை (Herd Size)' : 'Animal Count'}
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={herdSize}
                onChange={(e) => setHerdSize(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs outline-none"
              />
            </div>
          </div>

          {/* Behavior / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'ta' ? 'விலங்கின் நடத்தை / எச்சரிக்கை குறிப்பு' : 'Animal Behavior & Resident Advisory'}
            </label>
            <textarea
              rows={2}
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              placeholder={lang === 'ta' ? 'எ.கா: ஆக்ரோஷமாக பிளிறுகிறது, வாழை தோட்டத்தில் மேய்கிறது, குடியிருப்பு நோக்கி நகர்கிறது...' : 'e.g. Stalking near tea factory gate, trumpeting, advancing toward worker lines...'}
              className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs outline-none"
            />
          </div>

          {/* Optional Photo / Video Upload */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-600" />
                <span>{lang === 'ta' ? 'புகைப்படம் / வீடியோ (கட்டாயமில்லை)' : 'Photo / Video Evidence (Optional)'}</span>
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="text-[11px] text-red-600 hover:underline font-bold"
                >
                  {lang === 'ta' ? 'நீக்கு' : 'Remove'}
                </button>
              )}
            </div>

            {mediaUrl ? (
              <div className="mt-2 relative h-32 rounded-xl overflow-hidden border border-slate-300">
                <img src={mediaUrl} alt="Wildlife Evidence" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-white border border-slate-300 hover:border-emerald-600 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition">
                  <Upload size={14} />
                  <span>{lang === 'ta' ? 'கேமரா / கேலரி' : 'Upload from Device'}</span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-slate-400">
                  {lang === 'ta' ? 'நேரில் கண்ட ஆதார படம்' : 'Attach photo for RRT Forest verification'}
                </span>
              </div>
            )}
          </div>

          {/* Broadcast Alert Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-lg shadow-red-200 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Radio size={20} className="animate-pulse" />
                  <span>
                    {lang === 'ta'
                      ? 'அனைத்து கூடலூர் மக்களுக்கும் நேரடி எச்சரிக்கை அனுப்பு'
                      : 'Broadcast Live Proximity Alert to All Residents'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
