import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, QrCode, MapPin, Phone, Mail, User, CheckCircle2, Share2, Copy, Check, Compass, Loader2 } from 'lucide-react';
import { useAuth, DUPLICATE_PHONE_ERROR } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import toast from 'react-hot-toast';

interface GudalurIdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GudalurIdModal: React.FC<GudalurIdModalProps> = ({ isOpen, onClose }) => {
  const { profile, registerResident, loginResident, updateResident, userCoords, acquireLiveLocation } = useAuth();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [localityText, setLocalityText] = useState(profile?.localityName || GUDALUR_LOCALITIES[0].name);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [email, setEmail] = useState(profile?.email || '');
  const [copied, setCopied] = useState(false);
  // The ID card is always shown first to registered residents — never the registration form again.
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Android back button closes the ID modal instead of leaving the page.
  React.useEffect(() => {
    if (!isOpen) return;
    let backClosed = false;
    window.history.pushState({ gudalurIdModal: true }, '');
    const onPop = () => { backClosed = true; onClose(); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!backClosed && window.history.state?.gudalurIdModal) window.history.back();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Locality combobox: type to filter the complete official Gudalur list, or add your own place below.
  const handleLocalityTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalityText(v);
    const lower = v.trim().toLowerCase();
    const match = GUDALUR_LOCALITIES.find((l) => l.name.toLowerCase() === lower);
    if (match) {
      setLocalityId(match.id);
      setPincode(match.pincode);
      setCustomPlaceName('');
    }
  };

  // Registered residents EDIT their existing ID in place; new residents register.
  const isEditMode = !!profile?.gudalurId;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Please provide a valid 10-digit mobile number');
      return;
    }
    // If the resident typed a locality that isn't in the official list, save it as
    // their own estate / village / settlement so the record stays precise.
    let resolvedCustomPlace = customPlaceName.trim() || undefined;
    if (localityText.trim()) {
      const lower = localityText.trim().toLowerCase();
      if (!GUDALUR_LOCALITIES.some((l) => l.name.toLowerCase() === lower)) {
        resolvedCustomPlace = localityText.trim();
      }
    }
    try {
      if (isEditMode) {
        // UPDATE IN PLACE — same Gudalur ID, same ledger row, never a new creation.
        await updateResident({
          name: name.trim(),
          phone: phone.trim(),
          localityId,
          customPlaceName: resolvedCustomPlace,
          email: email.trim() || undefined,
          pincode: pincode.trim()
        });
        setIsRegistering(false);
        toast.success('Your Gudalur ID details are updated in the official ledger.');
        setTimeout(() => onClose(), 1500);
      } else {
        await registerResident({
          name: name.trim(),
          phone: phone.trim(),
          localityId,
          customPlaceName: resolvedCustomPlace,
          email: email.trim() || undefined,
          pincode: pincode.trim()
        });
        setIsRegistering(false);
        toast.success('Your unique Gudalur ID has been generated! Next: sign the petition.');
        // Guided civic journey — straight from registration to the petition signature.
        setTimeout(() => {
          onClose();
          navigate('/manifesto?auto=sign');
        }, 1400);
      }
    } catch (err: any) {
      // Duplicate mobile: professional recovery — flip straight to login with the number prefilled.
      if (err?.code === DUPLICATE_PHONE_ERROR || /already registered/i.test(err?.message || '')) {
        toast.error('This mobile number is already registered. Please login — we have filled your number for you.', { duration: 5000 });
        setLoginPhone(phone.trim());
        setIsRegistering(false);
        setIsLoggingIn(true);
      } else {
        toast.error(err?.message || (isEditMode ? 'Update failed. Please try again.' : 'Registration failed. Please try again.'));
      }
    }
  };

  // Returning residents: EITHER mobile number OR Gudalur ID, no password — works on any device.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = loginPhone.replace(/\D/g, '');
    const hasPhone = digits.length === 10;
    const hasId = loginId.trim().length > 0;
    if (!hasPhone && !hasId) {
      toast.error('Enter your mobile number OR your Gudalur ID — either one is enough to continue.');
      return;
    }
    if (loginPhone.trim() && digits.length > 0 && digits.length < 10) {
      toast.error('Mobile number looks incomplete — enter all 10 digits, or clear it and use your Gudalur ID.');
      return;
    }
    try {
      await loginResident(hasPhone ? loginPhone.trim() : '', hasId ? loginId.trim().toUpperCase() : '');
      setIsLoggingIn(false);
      toast.success('Welcome back! Your Gudalur ID is active.');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Check your details and try again.');
    }
  };

  const handleCopy = () => {
    if (profile?.gudalurId) {
      navigator.clipboard.writeText(`VOICE OF GUDALUR Resident ID: ${profile.gudalurId} | Locality: ${profile.localityName} (${profile.pincode})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!profile) return;
    const text = encodeURIComponent(
      `🌿 *VOICE OF GUDALUR Resident Identity*\n` +
      `👤 Name: ${profile.name}\n` +
      `🆔 Gudalur ID: ${profile.gudalurId}\n` +
      `📍 Locality: ${profile.localityName} (${profile.pincode})\n` +
      `Together for a safer, united Gudalur! https://voiceofgudalur.org`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{t('id.title')}</h3>
                  <p className="text-xs text-slate-500">{t('id.subtitle')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {profile && !isRegistering && !isLoggingIn ? (
                /* The Digital ID Card */
                <div className="space-y-4">
                  <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-slate-700/80 overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                    
                    {/* Card Top */}
                    <div className="flex items-start justify-between border-b border-slate-700/60 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300">VOICE OF GUDALUR</span>
                        </div>
                        <h4 className="text-lg font-black tracking-tight text-white mt-0.5">RESIDENT CITIZEN CARD</h4>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                        RESIDENT
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="col-span-2 space-y-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Resident Name</p>
                          <p className="text-base font-bold text-white leading-snug">{profile.name}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Locality & Pincode</p>
                          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                            <MapPin size={14} className="shrink-0" />
                            <span>{profile.localityName} ({profile.pincode})</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Gudalur ID Number</p>
                          <p className="font-mono text-sm font-bold tracking-wider text-amber-300">{profile.gudalurId}</p>
                        </div>
                      </div>

                      {/* QR Representation */}
                      <div className="flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner text-slate-900">
                        <QrCode size={64} className="text-slate-900" />
                        <span className="text-[8px] font-mono font-bold mt-1 text-slate-600">RESIDENT</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>The Nilgiris Western Plateau</span>
                      <span>{profile.gudalurId}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition"
                    >
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                    <button
                      onClick={handleWhatsAppShare}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition"
                    >
                      <Share2 size={16} />
                      <span>{t('id.share_whatsapp')}</span>
                    </button>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
                    <button
                      onClick={() => setIsRegistering(true)}
                      className="text-slate-600 hover:text-emerald-700 font-semibold underline"
                    >
                      Edit My Details
                    </button>
                    <span>{t('id.privacy_notice')}</span>
                  </div>
                </div>
              ) : isLoggingIn ? (
                /* Login Form — returning residents: EITHER mobile OR Gudalur ID, any device, no password */
                <form onSubmit={handleLogin} className="space-y-4">
                  <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    Enter your mobile number <span className="font-black">OR</span> your Gudalur ID — either one is enough. No password needed.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Registered Mobile Number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="tel"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        placeholder="9488210421"
                        maxLength={12}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Gudalur ID
                    </label>
                    <div className="relative">
                      <ShieldCheck size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        placeholder="GDR000000"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <CheckCircle2 size={18} />
                    <span>Login to My Gudalur ID</span>
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    New resident?{' '}
                    <button type="button" onClick={() => setIsLoggingIn(false)} className="font-bold text-emerald-700 underline">
                      Register instead
                    </button>
                  </p>
                </form>
              ) : (
                /* Registration / Edit Form */
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Full Name <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. S. Murugan / Ananya Nair"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mobile Number (For Locality SMS Alerts) <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="9488210421"
                        maxLength={12}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address (Optional — printed on your petition PDF)
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Locality / Area <span className="text-amber-600">*</span>
                      </label>
                      <input
                        list="gudalur-locality-list"
                        value={localityText}
                        onChange={handleLocalityTextChange}
                        placeholder="Type or select your locality — e.g. New Bazar, Devala, O'Valley…"
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900 bg-white"
                      />
                      <datalist id="gudalur-locality-list">
                        {GUDALUR_LOCALITIES.map((loc) => (
                          <option key={loc.id} value={loc.name} />
                        ))}
                      </datalist>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Complete Gudalur taluk list ({GUDALUR_LOCALITIES.length} places) — type to search, or add your own estate / settlement below.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pincode <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="643211"
                        maxLength={6}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 bg-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Specific Estate / Village Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customPlaceName}
                      onChange={(e) => setCustomPlaceName(e.target.value)}
                      placeholder="e.g. Glenrock Division 2"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 bg-white outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <CheckCircle2 size={18} />
                    <span>{isEditMode ? 'Update My Details' : 'Generate My Gudalur ID'}</span>
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Already registered?{' '}
                    <button type="button" onClick={() => setIsLoggingIn(true)} className="font-bold text-emerald-700 underline">
                      Login here
                    </button>
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
