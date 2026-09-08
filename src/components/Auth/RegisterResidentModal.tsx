import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MapPin, User, CheckCircle2, Loader2, ShieldCheck, LogIn, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { OPEN_LOGIN_EVENT } from '../../pages/about_helpers';
import toast from 'react-hot-toast';

interface RegisterResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRegistered?: (profile: { gudalurId: string; name: string; phone: string }) => void;
  onNeedLogin?: () => void;
}

export const RegisterResidentModal: React.FC<RegisterResidentModalProps> = ({
  isOpen, onClose, onSuccess, onRegistered, onNeedLogin,
}) => {
  const { registerResident } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNeedLogin = () => {
    if (onNeedLogin) onNeedLogin();
    else window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) { toast.error(t('reg.name_required')); return; }
    if (digits.length !== 10) { toast.error(t('reg.phone_required')); return; }
    if (address.trim().length < 3) { toast.error(t('reg.address_required') || 'Please enter your full address / place'); return; }
    if (!/^[0-9]{6}$/.test(pincode.trim())) { toast.error(t('reg.pincode_required') || 'Please enter a valid 6-digit pincode'); return; }
    setIsSubmitting(true);
    try {
      try {
        const checkResponse = await fetch(`/api/auth/check-phone?phone=${digits}`);
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          if (checkData.exists) {
            toast.error('Mobile number already registered! Please login instead.', { duration: 6000, icon: '📱' });
            setIsSubmitting(false);
            return;
          }
        }
      } catch { /* server enforces uniqueness */ }
      const profile = await registerResident({
        name: name.trim(), phone: digits, localityId: '',
        address: address.trim(), customPlaceName: address.trim(),
        pincode: pincode.trim(), aadhaarNumber: aadhaarNumber.trim() || undefined,
      });
      toast.success(t('reg.welcome').replace('{n}', profile.gudalurId), { duration: 6000, icon: '🪪' });
      setName(''); setPhone(''); setAddress(''); setPincode(''); setAadhaarNumber('');
      onSuccess?.();
      onRegistered?.({ gudalurId: profile.gudalurId, name: profile.name, phone: profile.phone });
      onClose();
    } catch (err: any) {
      const msg = String((err && err.message) || '');
      if ((err && err.code === 'DUPLICATE_PHONE') || /duplicate|already registered|unique key|phone.*exist|mobile.*registered/i.test(msg)) {
        toast.error('Mobile number already registered! Please login instead.', { duration: 6000, icon: '📱' });
      } else { toast.error(msg || t('reg.fail')); }
    } finally { setIsSubmitting(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#0A3D0A]/80 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative my-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]">
              <div className="relative shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt:6">
                <button type="button" onClick={onClose} className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition" aria-label="Close"><X size={18} /></button>
                <div className="space-y-1.5 pr-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><ShieldCheck size={20} /></div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">{t('reg.title')}</h3>
                  </div>
                  <p className="text-xs text-slate-500">{t('reg.subtitle')}</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.name')} *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate:400" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" maxLength={80}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition text-slate-900 bg-white placeholder:text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.phone')} *</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate:400" />
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" maxLength={12}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.place')}</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-3.5 text-slate:400 pointer-events-none z-10" />
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                        placeholder={t('reg.address_placeholder') || "House / street, area, town/city, state"}
                        maxLength={200} autoComplete="street-address"
                        className="w-full pl-10 pr-3 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition text-slate-900 bg-white placeholder:text-slate-400 resize-none" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">{t('reg.address_hint') || 'Type your own address — supporters from every district of India are welcome.'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.pincode')}</label>
                    <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="641034" maxLength={6}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate:400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.aadhaar_opt') || 'Aadhaar number (optional)'}</label>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate:400" />
                      <input type="text" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))} placeholder="12-digit Aadhaar (optional)" maxLength={12}
                        className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate:400" />
                    </div>
                    <p className="text-[11px] text-amber-700 mt-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5">
                      {t('reg.aadhaar_note') || 'You can register without Aadhaar. Only a signature with a valid Aadhaar on file counts as valid proof — you can update it anytime from your profile.'}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                  <button type="submit" disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{isSubmitting ? t('reg.submitting') : t('reg.submit')}</span>
                  </button>
                  <button type="button" onClick={handleNeedLogin}
                    className="w-full py-2.5 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition flex items-center justify-center gap-2">
                    <LogIn size={14} /><span>{t('reg.login_cta')}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">{t('reg.already')}</p>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterResidentModal;
