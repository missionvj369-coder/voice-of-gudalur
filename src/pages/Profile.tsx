import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { RegisterResidentModal } from '../components/Auth/RegisterResidentModal';
import { LoginResidentModal } from '../components/Auth/LoginResidentModal';
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  User, 
  Heart, 
  QrCode, 
  Check, 
  Copy, 
  Share2, 
  Compass, 
  Award, 
  Flame, 
  FileText, 
  CheckCircle2,
     Edit3,
  LogIn,
  LogOut,
  IdCard
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Profile: React.FC = () => {
    const { user, profile, registerResident, updateLocality, userCoords, acquireLiveLocation, logout } = useAuth();
  const { lang, t } = useLanguage();

  const [name, setName] = useState(profile?.name || (user as any)?.displayName || (user as any)?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [isBloodDonor, setIsBloodDonor] = useState(profile?.isBloodDonor || false);
  const [bloodGroup, setBloodGroup] = useState(profile?.bloodGroup || 'O+');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setPhone(profile.phone);
      setLocalityId(profile.localityId);
      setCustomPlaceName(profile.customPlaceName || '');
      setPincode(profile.pincode);
      setIsBloodDonor(profile.isBloodDonor);
      setBloodGroup(profile.bloodGroup || 'O+');
    }
  }, [profile]);

  const handleCopy = () => {
    if (profile?.gudalurId) {
      navigator.clipboard.writeText(
        `🌿 VOICE OF GUDALUR Citizen Identity Card\nID: ${profile.gudalurId}\nResident: ${profile.name}\nLocality: ${profile.localityName} (${profile.pincode})\nStatus: ${profile.verificationLevel}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Resident ID details copied to clipboard!');
    }
  };

  const handleWhatsAppShare = () => {
    if (!profile) return;
    const text = encodeURIComponent(
      `🌿 *VOICE OF GUDALUR Resident Identity*\n` +
      `👤 Name: ${profile.name}\n` +
      `🆔 Gudalur ID: ${profile.gudalurId}\n` +
      `📍 Locality: ${profile.localityName} (${profile.pincode})\n` +
      `🛡️ Status: ${profile.verificationLevel}\n` +
      `Together for a safer, united Gudalur! https://voiceofgudalur.space`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    setSaving(true);
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
      setIsEditing(false);
      toast.success('Profile and Citizen Card updated successfully!');
    } catch (err: any) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest mb-1">
            <ShieldCheck size={16} />
            <span>Verified Citizen Dashboard</span>
          </div>
          <h1 className="text-3xl font-serif font-black text-slate-900">
            {lang === 'ta' ? 'எனது கூடலூர் அடையாள அட்டை' : 'My Resident Profile & ID'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === 'ta'
              ? 'கூடலூர் சமூகப் பாதுகாப்பு, வனவிலங்கு எச்சரிக்கை மற்றும் குடிமக்கள் உரிமை அட்டை'
              : 'Permanent verified civic proof and emergency network participation'}
          </p>
        </div>

                <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E7D32] hover:bg-[#388E3C] text-white font-bold text-xs shadow-md transition"
          >
            <Edit3 size={14} />
            <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
          </button>
          <button
            onClick={async () => {
              await logout();
              toast.success('Logged out successfully.');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs border border-red-800/40 transition"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Phone-only Auth CTA for unregistered visitors */}
      {!profile && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 shrink-0">
              <IdCard size={22} />
            </div>
            <div className="text-xs">
              <p className="font-black text-emerald-900">
                {lang === 'ta' ? 'உங்கள் கூடலூர் குடிமக்கள் அட்டையை உருவாக்குங்கள்' : 'Create your Gudalur Resident Citizen Card'}
              </p>
              <p className="text-emerald-700 mt-0.5 max-w-xl">
                {lang === 'ta'
                  ? 'தொலைபேசி எண் மட்டும் போதும் — கடவுச்சொல் இல்லை. பதிவின் மூலம் ஒரு தனிப்பட்ட ஐடி உருவாக்கப்படும்; அந்த ஐடி + தொலைபேசி எண் மூலம் உள்நுழையலாம்.'
                  : 'Only your phone number is needed — no password. Registration generates a unique Gudalur ID; login anytime with that ID + your phone number.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300 transition"
            >
              <LogIn size={14} />
              <span>{lang === 'ta' ? 'உள்நுழைவு' : 'Login'}</span>
            </button>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
            >
              <IdCard size={14} />
              <span>{lang === 'ta' ? 'இப்போதே பதிவு செய்' : 'Register Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Digital Card & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Digital ID Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#388E3C] text-white shadow-2xl border border-[#AED581]/30 overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <ShieldCheck size={160} />
            </div>

            {/* Top Bar */}
            <div className="flex items-start justify-between border-b border-slate-700/60 pb-5 mb-6 relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-xs uppercase font-black tracking-widest text-emerald-300">
                    VOICE OF GUDALUR
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                  RESIDENT CITIZEN CARD
                </h2>
                <p className="text-[11px] text-slate-400">The Nilgiris Western Plateau, Tamil Nadu</p>
              </div>

              <div className="bg-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 border border-emerald-500/30">
                {profile?.verificationLevel ? profile.verificationLevel.replace('_', ' ') : 'RESIDENT'}
              </div>
            </div>

            {/* Card Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center relative z-10">
              <div className="sm:col-span-2 space-y-4">
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Resident Citizen</p>
                  <p className="text-lg font-bold text-white leading-snug">
                    {profile?.name || name || 'Citizen Member'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Locality & Pincode</p>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300 mt-0.5">
                    <MapPin size={15} className="shrink-0 text-emerald-400" />
                    <span>
                      {profile?.localityName || 'SS Nagar'} {profile?.pincode ? `(${profile.pincode})` : ''}
                    </span>
                  </div>
                  {profile?.customPlaceName && (
                    <p className="text-xs text-slate-400 mt-0.5 pl-5">{profile.customPlaceName}</p>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Gudalur ID Number</p>
                  <p className="font-mono text-base font-black tracking-widest text-amber-300 mt-0.5">
                    {profile?.gudalurId || 'GD-2026-REGULAR'}
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner text-slate-900 shrink-0">
                <QrCode size={80} className="text-slate-900" />
                <span className="text-[9px] font-mono font-black mt-2 text-emerald-700 tracking-wider">
                  VERIFIED CITIZEN
                </span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400 relative z-10">
              <div className="flex items-center gap-2">
                <span>Role: <strong className="text-slate-200">{profile?.role || 'LOCAL_MEMBER'}</strong></span>
                {profile?.isBloodDonor && (
                  <span className="bg-rose-950/80 text-rose-300 border border-rose-800 px-2 py-0.2 rounded-md font-bold text-[10px]">
                    Donor: {profile.bloodGroup || 'O+'}
                  </span>
                )}
              </div>
              <span className="font-mono">GD-LEGAL-2026</span>
            </div>
          </div>

          {/* Card Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-200 shadow-xs transition"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span>{copied ? 'Copied Details' : 'Copy ID Info'}</span>
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs shadow-md transition"
            >
              <Share2 size={16} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Right Column: Civic Stats & Status */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Metrics */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Award size={18} className="text-emerald-600" />
              <span>Civic Activity & Contribution</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-2xl font-black text-slate-900 font-mono">
                  {profile?.issuesReported || 0}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-1">Issues Documented</p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <p className="text-2xl font-black text-emerald-800 font-mono">
                  {profile?.issuesSupported || 0}
                </p>
                <p className="text-xs text-emerald-700 font-medium mt-1">Petitions Signed</p>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <p className="text-2xl font-black text-indigo-800 font-mono">
                  {profile?.representationsCreated || 0}
                </p>
                <p className="text-xs text-indigo-700 font-medium mt-1">Demands Created</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                <p className="text-2xl font-black text-amber-800 font-mono">
                  {profile?.alertsAcknowledged || 0}
                </p>
                <p className="text-xs text-amber-700 font-medium mt-1">Alerts Monitored</p>
              </div>
            </div>
          </div>

          {/* Blood Donor Badge */}
          <div className="p-6 rounded-3xl bg-rose-50/60 border border-rose-200/80 flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0">
              <Heart size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-sm">Emergency Blood Donor Network</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {profile?.isBloodDonor 
                  ? `You are listed as an active ${profile.bloodGroup || 'O+'} blood donor in Gudalur Taluk.`
                  : 'Join the community blood donor squad for Gudalur Govt Hospital emergencies.'}
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Form Section */}
      {isEditing && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              Update Resident Information
            </h3>
            <span className="text-xs text-slate-400">All changes update your digital citizen card</span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full resident name"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 text-sm outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={12}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 text-sm outline-none transition"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Locality *</label>
                <select
                  value={localityId}
                  onChange={(e) => {
                    setLocalityId(e.target.value);
                    const selected = GUDALUR_LOCALITIES.find(l => l.id === e.target.value);
                    if (selected) setPincode(selected.pincode);
                  }}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 text-xs font-medium bg-white outline-none"
                >
                  {GUDALUR_LOCALITIES.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.nameTa})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Postal Pincode *</label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="643211"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 text-sm outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Specific Estate / Hamlet / Village Name (Optional)
              </label>
              <input
                type="text"
                value={customPlaceName}
                onChange={(e) => setCustomPlaceName(e.target.value)}
                placeholder="e.g. Upper Seaforth Division 2 / Padanthorai Colony"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-emerald-600 text-sm outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Auth Modals */}
      <RegisterResidentModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => toast.success('Resident card activated!')}
      />
      <LoginResidentModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onNeedRegister={() => setIsRegisterOpen(true)}
      />

    </div>
  );
};

export default Profile;
