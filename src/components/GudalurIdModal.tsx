import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, QrCode, MapPin, Phone, Mail, User, CheckCircle2, Share2, Copy, Check, LocateFixed, Loader2, BadgeCheck } from 'lucide-react';
import { useAuth, DUPLICATE_PHONE_ERROR } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

interface GudalurIdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GudalurIdModal: React.FC<GudalurIdModalProps> = ({ isOpen, onClose }) => {
  const { profile, registerResident, loginResident, updateResident, userCoords, acquireLiveLocation } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityText, setLocalityText] = useState(profile?.customPlaceName || profile?.localityName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [copied, setCopied] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locVerified, setLocVerified] = useState(false);
  const [editCoords, setEditCoords] = useState<{ lat: number; lng: number } | null>(null);

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
  }, [isOpen]);

  const handleAddressTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalityText(e.target.value);
    setLocVerified(false);
  };

  const isEditMode = !!profile?.gudalurId;

  const handleLocate = async () => {
    setIsLocating(true);
    setLocVerified(false);
    try {
      let c = userCoords;
      if (!c) c = await acquireLiveLocation();
      if (!c) { toast.error('Live location is unavailable. Please type your full address.'); setIsLocating(false); return; }
      let placeText = '';
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lng}&localityLanguage=en`,
          { credentials: 'omit' },
        );
        if (res.ok) {
          const g = await res.json();
          const parts = [g.locality, g.city, g.principalSubdivision, g.countryName]
            .filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0);
          placeText = [...new Set(parts)].join(', ');
        }
      } catch { /* best-effort */ }
      if (placeText) setLocalityText(placeText);
      setEditCoords({ lat: c.lat, lng: c.lng });
      setLocVerified(true);
      toast.success(placeText ? `Live location verified — ${placeText}` : `Live location verified (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)})`);
    } catch {
      toast.error('Could not access location. Please type your full address.');
    } finally { setIsLocating(false); }
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your full name'); return; }
    if (phone.replace(/\D/g, '').length < 10) { toast.error('Please provide a valid 10-digit mobile number'); return; }
    const typedAddress = localityText.trim();
    if (typedAddress.length < 3) { toast.error('Please enter your full address / place'); return; }
    try {
      if (isEditMode) {
        await updateResident({
          name: name.trim(), phone: phone.trim(), localityId: '',
          address: typedAddress, email: email.trim() || undefined,
          pincode: pincode.trim(), lat: editCoords?.lat, lng: editCoords?.lng,
        });
        setIsRegistering(false);
        toast.success('Your supporter details are updated in the official ledger.');
        setTimeout(() => onClose(), 1500);
      } else {
        await registerResident({
          name: name.trim(), phone: phone.trim(), localityId: '',
          address: typedAddress, email: email.trim() || undefined,
          pincode: pincode.trim(), lat: editCoords?.lat, lng: editCoords?.lng,
        });
        setIsRegistering(false);
        toast.success('Your unique Digital Supporter ID has been generated! Next: sign the petition.');
        setTimeout(() => { onClose(); navigate('/manifesto?auto=sign'); }, 1400);
      }
    } catch (err: any) {
      if (err?.code === DUPLICATE_PHONE_ERROR || /already registered/i.test(err?.message || '')) {
        toast.error('This mobile number is already registered. Please login — we have filled your number for you.', { duration: 5000 });
        setLoginPhone(phone.trim()); setIsRegistering(false); setIsLoggingIn(true);
      } else {
        toast.error(err?.message || (isEditMode ? 'Update failed. Please try again.' : 'Registration failed. Please try again.'));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = loginPhone.replace(/\D/g, '');
    const hasPhone = digits.length === 10;
    const hasId = loginId.trim().length > 0;
    if (!hasPhone && !hasId) { toast.error('Enter your mobile number OR your supporter ID — either one is enough to continue.'); return; }
    if (loginPhone.trim() && digits.length > 0 && digits.length < 10) { toast.error('Mobile number looks incomplete — enter all 10 digits, or clear it and use your supporter ID.'); return; }
    try {
      await loginResident(hasPhone ? loginPhone.trim() : '', hasId ? loginId.trim().toUpperCase() : '');
      setIsLoggingIn(false);
      toast.success('Welcome back! Your supporter ID is active.');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Check your details and try again.');
    }
  };

  const handleCopy = () => {
    if (profile?.gudalurId) {
      navigator.clipboard.writeText(`VOICE OF GUDALUR Supporter ID: ${profile.gudalurId} | Place: ${profile.customPlaceName || profile.localityName} (${profile.pincode || 'India'})`);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!profile) return;
    const text = encodeURIComponent(
      `🌿 *VOICE OF GUDALUR — Digital Supporter*\n` +
      `👤 Name: ${profile.name}\n` +
      `🆔 Supporter ID: ${profile.gudalurId}\n` +
      `📍 Place: ${profile.customPlaceName || profile.localityName}\n` +
      `I support the Right to Life petition — join me! https://voiceofgudalur.space`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A3D0A]/70 backdrop-blur-sm overflow-y-auto">
          <motion.div initial={{ scale: 0.95, opacity: 0, y: 15 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl"><ShieldCheck size={20} /></div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{t('id.title')}</h3>
                  <p className="text-xs text-slate-500">{t('id.subtitle')}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {profile && !isRegistering && !isLoggingIn ? (
                <div className="space-y-4">
                  <div className="relative rounded-3xl p-6 bg-gradient-to-br from-[#2E7D32] via-[#1B5E20] to-[#388E3C] text-white shadow-xl border border-[#AED581]/30 overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                    <div className="flex items-start justify-between border-b border-slate-700/60 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300">VOICE OF GUDALUR</span>
                        </div>
                        <h4 className="text-lg font-black tracking-tight text-white mt-0.5">DIGITAL SUPPORTER CARD</h4>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-[11px] font-bold text-emerald-200">NATIONAL</div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Supporter Name</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                          <User size={14} className="shrink-0 text-emerald-300" /><span>{profile.name}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Address / Place</p>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                          <MapPin size={14} className="shrink-0" /><span>{profile.customPlaceName || profile.localityName}{profile.pincode ? ` · ${profile.pincode}` : ''}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-400">Digital Supporter ID</p>
                        <p className="font-mono text-sm font-bold tracking-wider text-amber-300">{profile.gudalurId}</p>
                      </div>
                      {profile.lat && profile.lng ? (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Verified Location</p>
                          <p className="font-mono text-xs font-semibold tracking-wider text-emerald-200">{profile.lat.toFixed(4)}, {profile.lng.toFixed(4)}</p>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-inner text-slate-900">
                      <QrCode size={64} className="text-slate-900" />
                      <span className="text-[8px] font-mono font-bold mt-1 text-slate-600">SUPPORTER</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>One Nation · One Movement</span><span>{profile.gudalurId}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={handleCopy} className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition">
                      {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                      <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                    </button>
                    <button onClick={handleWhatsAppShare} className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition">
                      <Share2 size={16} /><span>{t('id.share_whatsapp')}</span>
                    </button>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
                    <button onClick={() => setIsRegistering(true)} className="text-slate-600 hover:text-emerald-700 font-semibold underline">Edit My Details</button>
                    <span>{t('id.privacy_notice')}</span>
                  </div>
                </div>
              ) : isLoggingIn ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                    Enter your mobile number <span className="font-black">OR</span> your supporter ID — either one is enough. No password needed.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Registered Mobile Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                      <input type="tel" value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} placeholder="9488210421" maxLength={12}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Digital Supporter ID</label>
                    <div className="relative">
                      <ShieldCheck size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                      <input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="GD-2026-XXXXXX"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono text-slate-900 bg-white" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2">
                    <CheckCircle2 size={18} /><span>Login to My Supporter ID</span>
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    New supporter?{' '}<button type="button" onClick={() => setIsLoggingIn(false)} className="font-bold text-emerald-700 underline">Register instead</button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Full Name <span className="text-amber-600">*</span></label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. S. Murugan / Ananya Nair"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number <span className="text-amber-600">*</span></label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                      <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={12}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address (Optional)</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Address / Place <span className="text-amber-600">*</span></label>
                    <div className="flex gap-2 items-start">
                      <div className="relative flex-1">
                        <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate:400" />
                        <input type="text" value={localityText} onChange={handleAddressTextChange}
                          placeholder="House / street, area, town/city, state — from anywhere in India" autoComplete="street-address" maxLength={200}
                          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900 bg-white" />
                      </div>
                      <button type="button" onClick={() => { void handleLocate(); }} disabled={isLocating}
                        className="shrink-0 px-3 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-50"
                        title={t('reg.locate_title') || 'Verify my real location with GPS (nationwide)'}>
                        {isLocating ? <Loader2 size={14} className="animate-spin" /> : <LocateFixed size={14} />}
                        <span className="hidden sm:inline">Live Verify</span>
                      </button>
                    </div>
                    {locVerified && (
                      <p className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-1">
                        <BadgeCheck size={12} />Live GPS verified{editCoords ? ` (${editCoords.lat.toFixed(4)}, ${editCoords.lng.toFixed(4)})` : ''} — your real location is recorded.
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">Supporters from every district of India are welcome — your own address is used on the signature.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode (Optional)</label>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="641034" maxLength={6}
                      className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 bg-white outline-none" />
                  </div>
                  <button type="submit" className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2">
                    <CheckCircle2 size={18} /><span>{isEditMode ? 'Update My Details' : 'Generate My Digital Supporter ID'}</span>
                  </button>
                  <p className="text-center text-xs text-slate-500">
                    Already registered?{' '}<button type="button" onClick={() => setIsLoggingIn(true)} className="font-bold text-emerald-700 underline">Login here</button>
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
