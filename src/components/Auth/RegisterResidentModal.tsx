"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Phone, ShieldCheck, MapPin, Mail, User, CheckCircle2,
  Send, Loader2, RefreshCw, AlertCircle, Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import toast from 'react-hot-toast';

interface RegisterResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'phone' | 'otp' | 'details';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 30;

export const RegisterResidentModal: React.FC<RegisterResidentModalProps> = ({
  isOpen, onClose, onSuccess,
}) => {
  const { registerResident, requestOtp, verifyOtp, userCoords } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [localityId, setLocalityId] = useState(GUDALUR_LOCALITIES[0].id);
  const [localityText, setLocalityText] = useState(GUDALUR_LOCALITIES[0].name);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [pincode, setPincode] = useState('643211');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (isOpen && step === 'phone') {
      phoneInputRef.current?.focus();
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (step === 'otp') {
      const firstEmpty = otp.split('').findIndex((d) => d === '');
      const targetIndex = firstEmpty === -1 ? OTP_LENGTH - 1 : firstEmpty;
      otpRefs.current[targetIndex]?.focus();
    }
  }, [step, otp]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setIsSendingOtp(true);
    try {
      const res = await requestOtp(digits);
      if (res.otp) {
        setOtp(res.otp);
        toast.success('OTP sent (dev mode: ' + res.otp + ')', { duration: 3000 });
      } else {
        toast.success('OTP sent to your phone');
      }
      setStep('otp');
      setResendCountdown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error((err && err.message) || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    setOtpError('');
    if (value.length > 1) return;
    const newOtp = otp.split('');
    newOtp[index] = value;
    setOtp(newOtp.join(''));
    if (value && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== OTP_LENGTH || /\D/.test(otp)) {
      setOtpError('Please enter a valid 6-digit code');
      return;
    }
    setIsVerifying(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const result = await verifyOtp(digits, otp);
      if (result.isNew) {
        if (userCoords && !customPlaceName) {
          const nearest = GUDALUR_LOCALITIES.reduce((best, loc) => {
            const dist = Math.sqrt(
              Math.pow(loc.lat - userCoords.lat, 2) + Math.pow(loc.lng - userCoords.lng, 2),
            );
            return dist < (best.dist || Infinity) ? { loc, dist } : best;
          }, { loc: GUDALUR_LOCALITIES[0], dist: Infinity });
          setLocalityId(nearest.loc.id);
          setLocalityText(nearest.loc.name);
          setPincode(nearest.loc.pincode);
        }
        setStep('details');
      } else {
        toast.success('Welcome back!');
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      setOtpError((err && err.message) || 'Invalid code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    setResendCountdown(RESEND_COOLDOWN);
    setIsSendingOtp(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const res = await requestOtp(digits);
      if (res.otp) {
        setOtp(res.otp);
        toast.success('OTP resent (dev mode: ' + res.otp + ')', { duration: 3000 });
      } else {
        toast.success('OTP resent');
      }
    } catch (err) {
      toast.error((err && err.message) || 'Failed to resend OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      toast.error('Please provide a valid 10-digit mobile number');
      return;
    }
    setIsSubmitting(true);
    try {
      await registerResident({
        name: name.trim(),
        phone: digits,
        localityId,
        customPlaceName: customPlaceName.trim() || undefined,
        pincode: pincode.trim() || GUDALUR_LOCALITIES.find((l) => l.id === localityId)?.pincode || '643211',
        email: email.trim() || undefined,
        lat: userCoords?.lat,
        lng: userCoords?.lng,
      });
      toast.success('Registration complete! Your Gudalur ID is ready.');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = String((err && err.message) || '');
      if (err && err.code === 'DUPLICATE_PHONE' || /duplicate|already registered|unique key/i.test(msg)) {
        toast.error('This phone number is already registered. Please use Login instead.');
      } else if (/networkerror|failed to fetch|load failed/i.test(msg) && (!err || !err.status)) {
        toast.success('Registration saved locally (offline). Your Gudalur ID will sync when you are back online.');
        onSuccess?.();
        onClose();
      } else {
        toast.error((err && err.message) || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const reset = () => {
    setStep('phone');
    setPhone('');
    setOtp('');
    setName('');
    setOtpError('');
    setResendCountdown(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'phone') handlePhoneSubmit(e);
      if (step === 'otp') handleVerifyOtp();
    }
  };

  if (!isOpen) return null;

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
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center justify-center gap-2 mb-6">
              {(['phone', 'otp', 'details'] as Step[]).map((s, i) => (
                <React.Fragment key={s}>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s
                        ? 'bg-emerald-600 text-white'
                        : i < (['phone', 'otp', 'details'].indexOf(step))
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className="flex-1 h-0.5 bg-slate-200" />}
                </React.Fragment>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {step === 'phone' && (
                <motion.div key="phone" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                      <Smartphone size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Register Your Phone</h3>
                    <p className="text-sm text-slate-600">We will send a 6-digit code to verify your mobile number.</p>
                  </div>
                  <form onSubmit={handlePhoneSubmit} onKeyDown={handlePhoneKeyDown}>
                    <div className="relative mb-4">
                      <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        maxLength={14}
                        className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSendingOtp || phone.replace(/\D/g, '').length !== 10}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSendingOtp ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      <span>{isSendingOtp ? 'Sending…' : 'Send OTP'}</span>
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 'otp' && (
                <motion.div key="otp" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                      <ShieldCheck size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Enter OTP</h3>
                    <p className="text-sm text-slate-600">
                      Enter the 6-digit code sent to {phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center mb-4">
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i] || ''}
                        onChange={(e) => handleOtpChange(i, e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-11 h-12 text-center text-xl font-mono rounded-xl border-2 outline-none transition ${otpError ? 'border-red-300 focus:border-red-500' : 'border-slate-300 focus:border-emerald-500'}`}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                  {otpError && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-700">{otpError}</p>
                    </motion.div>
                  )}
                  <div className="text-center mb-4">
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={isVerifying || otp.length !== OTP_LENGTH}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow transition disabled:opacity-60"
                    >
                      {isVerifying ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Verifying…</span>
                      ) : 'Verify & Continue'}
                    </button>
                  </div>
                  <div className="text-center">
                    {resendCountdown > 0 ? (
                      <p className="text-sm text-slate-500">Resend in {resendCountdown}s</p>
                    ) : isSendingOtp ? (
                      <Loader2 size={16} className="animate-spin inline text-slate-400" />
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="text-sm font-bold text-emerald-700 hover:underline flex items-center gap-1 justify-center"
                      >
                        <RefreshCw size={14} /> Resend OTP
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {step === 'details' && (
                <motion.div key="details" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <div className="text-center mb-6">
                    <div className="flex justify-center mb-3">
                      <User size={32} className="text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-1">Your Details</h3>
                    <p className="text-sm text-slate-600">Enter your name and select your locality to get your Gudalur ID.</p>
                  </div>
                  <form onSubmit={handleDetailsSubmit}>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your full name as on phone bill"
                          maxLength={100}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Locality / Area *</label>
                          <input
                            list="gudalur-locality-list"
                            value={localityText}
                            onChange={handleLocalityTextChange}
                            placeholder="Type or select your locality"
                            className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900 bg-white"
                          />
                          <datalist id="gudalur-locality-list">
                            {GUDALUR_LOCALITIES.map((loc) => (
                              <option key={loc.id} value={loc.name} />
                            ))}
                          </datalist>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Pincode *</label>
                          <input
                            type="text"
                            value={pincode}
                            onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="643211"
                            maxLength={6}
                            className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono text-slate-900 bg-white outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Specific Estate / Village (Optional)</label>
                        <input
                          type="text"
                          value={customPlaceName}
                          onChange={(e) => setCustomPlaceName(e.target.value)}
                          placeholder="e.g. Glenrock Division 2"
                          maxLength={100}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Email (Optional)</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            maxLength={254}
                            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs outline-none transition"
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                      <span>{isSubmitting ? 'Generating Gudalur ID…' : 'Generate My Gudalur ID'}</span>
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RegisterResidentModal;
