import React, { useState } from 'react';
import { ShieldCheck, MapPin, Phone, User, Check, X, Compass, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterResidentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile, registerResident, userCoords, acquireLiveLocation, loginWithGoogle } = useAuth();
  const { lang, t } = useLanguage();

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState<boolean>(!!userCoords);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAcquireGps = async () => {
    setIsLocating(true);
    const coords = await acquireLiveLocation();
    setIsLocating(false);
    if (coords) {
      setGpsCaptured(true);
      toast.success(lang === 'ta' ? 'ஜிபிஎஸ் இருப்பிடம் பதிவு செய்யப்பட்டது!' : 'Live GPS location captured successfully!');
    } else {
      toast.error(lang === 'ta' ? 'இருப்பிட அனுமதி தேவை' : 'Please enable location permissions in your browser');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      toast.error(lang === 'ta' ? 'செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்' : 'Please provide a valid 10-digit mobile number');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      toast.error(lang === 'ta' ? '6 இலக்க அஞ்சல் குறியீட்டை (Pincode) உள்ளிடவும்' : 'Please enter a valid 6-digit Pincode');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerResident({
        name: name.trim(),
        phone: phone.trim(),
        localityId,
        customPlaceName: customPlaceName.trim() || undefined,
        pincode: pincode.trim(),
        lat: userCoords?.lat,
        lng: userCoords?.lng
      });
      toast.success(
        lang === 'ta'
          ? 'கூடலூர் குடிமக்கள் அட்டை வெற்றிகரமாக உருவாக்கப்பட்டது!'
          : 'Gudalur Resident Citizen Card successfully registered!'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Registration failed:', err);
      toast.error(lang === 'ta' ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது' : 'Failed to save resident registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-slate-900">
              {lang === 'ta' ? 'கூடலூர் குடிமக்கள் பதிவு' : 'Gudalur Resident Registration'}
            </h2>
            <p className="text-xs text-slate-500">
              {lang === 'ta'
                ? 'வனவிலங்கு பாதுகாப்பு எச்சரிக்கை & அதிகாரப்பூர்வ ஆதரவு அட்டை'
                : 'Verified local network for wildlife safety & civic demands'}
            </p>
          </div>
        </div>

        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-emerald-900">
              <p className="font-bold">{lang === 'ta' ? 'Google கணக்கு மூலம் தொடரவும்' : 'Link with Google Account'}</p>
              <p className="text-emerald-700">{lang === 'ta' ? 'விரைவான உள்நுழைவு மற்றும் பாதுகாப்பான தரவு' : 'Fast one-click verified authentication'}</p>
            </div>
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition whitespace-nowrap"
            >
              {lang === 'ta' ? 'Google உள்நுழைவு' : 'Sign in with Google'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-emerald-600" />
              <span>{lang === 'ta' ? 'முழுப் பெயர் *' : 'Full Resident Name *'}</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. K. Sivakumar / Mary Joseph"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
            />
          </div>

          {/* Mobile Phone Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Phone size={14} className="text-emerald-600" />
              <span>{lang === 'ta' ? 'மொபைல் எண் (அவசர எச்சரிக்கைக்கு) *' : 'Mobile Number (For Emergency Alerts) *'}</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9488210421"
              maxLength={12}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
            />
          </div>

          {/* Locality & Pincode Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" />
                <span>{lang === 'ta' ? 'பகுதி / ஊர் *' : 'Locality / Area *'}</span>
              </label>
              <select
                value={localityId}
                onChange={(e) => {
                  setLocalityId(e.target.value);
                  const selected = GUDALUR_LOCALITIES.find(l => l.id === e.target.value);
                  if (selected) setPincode(selected.pincode);
                }}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-xs font-medium bg-white outline-none transition"
              >
                {GUDALUR_LOCALITIES.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {lang === 'ta' ? `${loc.nameTa} (${loc.name})` : `${loc.name} (${loc.administrativeParent})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === 'ta' ? 'அஞ்சல் குறியீடு (Pincode) *' : 'Pincode (Postal Code) *'}
              </label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="643211"
                maxLength={6}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-sm outline-none transition font-mono"
              />
            </div>
          </div>

          {/* Option to specify custom estate / village name if not in main list */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {lang === 'ta'
                ? 'குறிப்பிட்ட எஸ்டேட் / கிராமம் / தெரு பெயர் (பட்டியலில் இல்லை எனில்)'
                : 'Specific Estate / Village / Hamlet (If not listed above)'}
            </label>
            <input
              type="text"
              value={customPlaceName}
              onChange={(e) => setCustomPlaceName(e.target.value)}
              placeholder="e.g. Seaforth Division 2 / Padanthorai Colony / Upper Glenrock"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 text-sm outline-none transition"
            />
          </div>

          {/* Live GPS Location Capture */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${gpsCaptured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                <Compass size={20} className={isLocating ? 'animate-spin' : ''} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-slate-800">
                  {gpsCaptured
                    ? (lang === 'ta' ? 'துல்லிய ஜிபிஎஸ் பதிவு செய்யப்பட்டது' : 'Live GPS Coordinates Tagged')
                    : (lang === 'ta' ? 'நேரடி ஜிபிஎஸ் இருப்பிடம்' : 'Live GPS Proximity Tag')}
                </p>
                <p className="text-slate-500">
                  {userCoords
                    ? `${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}`
                    : (lang === 'ta' ? 'வனவிலங்கு தூரத்தை கணக்கிட உதவுகிறது' : 'Calculates real distance to animal sightings')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAcquireGps}
              disabled={isLocating}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl transition shadow-2xs"
            >
              {isLocating ? <Loader2 size={14} className="animate-spin" /> : (lang === 'ta' ? 'இருப்பிடம் புதுப்பி' : 'Tag GPS')}
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Check size={18} />
                  <span>
                    {profile
                      ? (lang === 'ta' ? 'விவரங்களை புதுப்பிக்கவும்' : 'Update Resident Citizen Card')
                      : (lang === 'ta' ? 'குடிமக்கள் அட்டையை பதிவு செய்' : 'Complete Verified Registration')}
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
