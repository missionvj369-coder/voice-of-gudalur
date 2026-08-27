import React, { useState } from 'react';
import { ShieldCheck, MapPin, Phone, User, Check, X, Compass, Loader2, IdCard, Copy, CheckCircle2, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import { LoginResidentModal } from './LoginResidentModal';
import toast from 'react-hot-toast';
import type { UserProfile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RegisterResidentModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { user, profile, registerResident, userCoords, acquireLiveLocation } = useAuth();
  const { lang, t } = useLanguage();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [isLocating, setIsLocating] = useState(false);
  const [gpsCaptured, setGpsCaptured] = useState<boolean>(!!userCoords);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedProfile, setIssuedProfile] = useState<UserProfile | null>(null);
  const [idCopied, setIdCopied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return (
      <LoginResidentModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        onNeedRegister={() => setShowLogin(false)}
      />
    );
  }

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

  const handleCopyId = () => {
    if (issuedProfile) {
      navigator.clipboard.writeText(
        `ONE GUDALUR Resident ID: ${issuedProfile.gudalurId} | Phone: ${issuedProfile.phone} | Name: ${issuedProfile.name}`
      );
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
      toast.success('Gudalur ID copied to clipboard!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(lang === 'ta' ? 'பெயரை உள்ளிடவும்' : 'Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error(lang === 'ta' ? 'செல்லுபடியாகும் 10 இலக்க தொலைபேசி எண்ணை உள்ளிடவும்' : 'Please provide a valid 10-digit mobile number');
      return;
    }
    if (!pincode.trim() || pincode.trim().length !== 6) {
      toast.error(lang === 'ta' ? '6 இலக்க அஞ்சல் குறியீட்டை (Pincode) உள்ளிடவும்' : 'Please enter a valid 6-digit Pincode');
      return;
    }

    setIsSubmitting(true);
    try {
      const registered = await registerResident({
        name: name.trim(),
        phone: phone.trim(),
        localityId,
        customPlaceName: customPlaceName.trim() || undefined,
        pincode: pincode.trim(),
        lat: userCoords?.lat,
        lng: userCoords?.lng
      });
      // Show the issued unique Gudalur ID on the success screen
      setIssuedProfile(registered);
    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err?.code === 'DUPLICATE_PHONE' || /already registered/i.test(err?.message || '')) {
        toast.error(err.message, { duration: 6000 });
        setShowLogin(true);
      } else {
        toast.error(lang === 'ta' ? 'பதிவு செய்வதில் பிழை ஏற்பட்டது' : 'Failed to save resident registration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ============ SUCCESS SCREEN — the issued unique Gudalur ID ============ */
  if (issuedProfile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center space-y-5">
          <div className="mx-auto p-3 w-fit rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black font-serif text-slate-900">
              {lang === 'ta' ? 'பதிவு வெற்றி!' : 'Registration Successful!'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {lang === 'ta'
                ? 'உங்கள் தனிப்பட்ட கூடலூர் ஐடி உருவாக்கி சேமிக்கப்பட்டது. இதை சேமித்து வைக்கவும்.'
                : 'Your unique Gudalur ID was generated and saved. Keep it safe — login anytime with this ID + your phone number. No password needed.'}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Your Gudalur ID Number</p>
            <p className="text-2xl font-mono font-black tracking-wider">{issuedProfile.gudalurId}</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-300 font-mono">
              <span>📞 {issuedProfile.phone}</span>
              <span>👤 {issuedProfile.name}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyId}
            className="w-full py-3 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 text-slate-700 hover:text-emerald-700 font-bold text-sm transition flex items-center justify-center gap-2"
          >
            {idCopied ? <Check size={18} className="text-emerald-600" /> : <Copy size={16} />}
            <span>{idCopied ? (lang === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'ID Copied!') : (lang === 'ta' ? 'ஐடியை நகலெடுக்க' : 'Copy & Save My ID')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition"
          >
            {lang === 'ta' ? 'தொடரவும்' : 'Continue to My Resident Card'}
          </button>
        </div>
      </div>
    );
  }

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

        {/* Phone-only auth notice */}
        <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
          <IdCard size={20} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <p className="font-bold">
              {lang === 'ta' ? 'தொலைபேசி எண் மட்டுமே — கடவுச்சொல் இல்லை' : 'Phone number only — no password'}
            </p>
            <p className="text-emerald-700 mt-0.5">
              {lang === 'ta'
                ? 'பதிவு செய்தவுடன் ஒரு தனிப்பட்ட கூடலூர் ஐடி (எ.கா. GD-2026-123456) உருவாக்கப்பட்டு சேமிக்கப்படும். அந்த ஐடி + தொலைபேசி எண் மூலம் எப்போது வேண்டுமானாலும் உள்நுழையலாம்.'
                : 'On registration a unique Gudalur ID (e.g. GD-2026-123456) is generated and saved for you. Login anytime with that ID + your phone number.'}
            </p>
          </div>
        </div>

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

          {/* Already registered? Passwordless login */}
          <button
            type="button"
            onClick={() => setShowLogin(true)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <LogIn size={13} />
            <span>
              {lang === 'ta'
                ? 'ஏற்கனவே ஐடி உள்ளதா? தொலைபேசி + ஐடி மூலம் உள்நுழைக'
                : 'Already have an ID? Login with Phone + ID'}
            </span>
          </button>

        </form>

      </div>
    </div>
  );
};
