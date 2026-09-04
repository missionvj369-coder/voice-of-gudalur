import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, IdCard, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import toast from 'react-hot-toast';

interface LoginResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Opens the registration modal instead (for new residents). */
  onNeedRegister?: () => void;
}

/**
 * PASSWORDLESS LOGIN — residents sign in with their Phone Number + Gudalur ID number only.
 * No password is ever requested.
 */
export const LoginResidentModal: React.FC<LoginResidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNeedRegister,
}) => {
  const { loginResident } = useAuth();
  const { lang } = useLanguage();

  const [phone, setPhone] = useState('');
  const [gudalurId, setGudalurId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    // EITHER identifier is enough — no field is mandatory on its own.
    if (digits.length !== 10 && !gudalurId.trim()) {
      toast.error('Enter your mobile number OR your Gudalur ID — either one is enough to continue.');
      return;
    }
    if (phone.trim() && digits.length > 0 && digits.length < 10) {
      toast.error('Mobile number looks incomplete — enter all 10 digits, or clear it and use your Gudalur ID.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const resident = await loginResident(digits.length === 10 ? phone : '', gudalurId.trim().toUpperCase());
      toast.success(
        lang === 'ta' ? `வரவேற்பு, ${resident.name}!` : `Welcome back, ${resident.name}!`,
        { icon: '🪪' }
      );
      setPhone('');
      setGudalurId('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Check your details and try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A3D0A]/80 backdrop-blur-md overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="space-y-1.5 mb-6 pr-8">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {lang === 'ta' ? 'குடிமகன் உள்நுழைவு' : 'Resident Login'}
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'ta'
                  ? 'உங்கள் தொலைபேசி எண் அல்லது கூடலூர் ஐடி எண் — இவற்றில் ஏதேனும் ஒன்றை மட்டும் பயன்படுத்தவும் — கடவுச்சொல் தேவையில்லை.'
                  : 'Sign in with your mobile number OR your Gudalur ID — either one works. No password needed.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                {lang === 'ta'
                  ? 'தொலைபேசி எண் அல்லது கூடலூர் ஐடி — இரண்டில் ஒன்றை மட்டும் உள்ளிடவும்.'
                  : 'Enter your mobile number OR your Gudalur ID — either one is enough.'}
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'}
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={14}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'கூடலூர் ஐடி எண்' : 'Gudalur ID Number'}
                </label>
                <div className="relative">
                  <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gudalurId}
                    onChange={(e) => setGudalurId(e.target.value)}
                    placeholder="GDR000000"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono uppercase text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {lang === 'ta'
                    ? 'பதிவு செய்யும் போது பெற்ற ஐடியை உள்ளிடவும் (எ.கா. GDR000001)'
                    : 'Enter the ID issued when you registered (e.g. GDR000001)'}
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoggingIn ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    <span>{lang === 'ta' ? 'உள்நுழை' : 'Login to My Resident Card'}</span>
                  </>
                )}
              </button>

              {onNeedRegister && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNeedRegister();
                  }}
                  className="w-full text-center text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  {lang === 'ta'
                    ? 'இன்னும் பதிவு செய்யவில்லையா? புதிய குடிமக்கள் அட்டை உருவாக்குக'
                    : 'Not registered yet? Create your Resident Card'}
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginResidentModal;

