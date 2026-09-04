import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MapPin, User, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import toast from 'react-hot-toast';

interface RegisterResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * SIMPLE REGISTRATION — no OTP, no email. Name + phone + place is all we need.
 * One phone number can register only once (the server enforces a UNIQUE phone
 * index; duplicates are pointed to Login). Aadhaar verification comes later.
 */
export const RegisterResidentModal: React.FC<RegisterResidentModalProps> = ({
  isOpen, onClose, onSuccess,
}) => {
  const { registerResident, userCoords } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [localityId, setLocalityId] = useState(GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locality = useMemo(
    () => GUDALUR_LOCALITIES.find((l) => l.id === localityId) ?? GUDALUR_LOCALITIES[0],
    [localityId],
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }
    if (digits.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    try {
      const profile = await registerResident({
        name: name.trim(),
        phone: digits,
        localityId,
        customPlaceName: customPlaceName.trim() || undefined,
        pincode: locality.pincode || '643211',
        lat: userCoords?.lat,
        lng: userCoords?.lng,
      });
      toast.success(`Welcome! Your Gudalur ID: ${profile.gudalurId}`, { duration: 6000, icon: '🪪' });
      setName('');
      setPhone('');
      setCustomPlaceName('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = String((err && err.message) || '');
      if ((err && err.code === 'DUPLICATE_PHONE') || /duplicate|already registered|unique key/i.test(msg)) {
        toast.error('This phone number is already registered — please use Login instead.', { duration: 5000 });
      } else {
        toast.error(msg || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
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
                  Register — Get your Gudalur ID
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                No OTP needed. Just your name, mobile number and place — one number, one registration.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={80}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile Number *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Your Place (Gudalur &amp; Nilgiris) *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <select
                    value={localityId}
                    onChange={(e) => setLocalityId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition bg-white"
                  >
                    {GUDALUR_LOCALITIES.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Pincode {locality.pincode} — filled automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Specific Estate / Village (Optional)</label>
                <input
                  type="text"
                  value={customPlaceName}
                  onChange={(e) => setCustomPlaceName(e.target.value)}
                  placeholder="e.g. Glenrock Division 2"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                <span>{isSubmitting ? 'Generating Gudalur ID…' : 'Generate My Gudalur ID'}</span>
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Already registered? Use Login with your mobile number or Gudalur ID.
                Aadhaar verification arrives later.
              </p>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterResidentModal;
