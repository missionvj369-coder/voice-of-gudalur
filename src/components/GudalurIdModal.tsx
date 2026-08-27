import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, QrCode, MapPin, Phone, User, CheckCircle2, Share2, Copy, Check, Compass, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import toast from 'react-hot-toast';

interface GudalurIdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GudalurIdModal: React.FC<GudalurIdModalProps> = ({ isOpen, onClose }) => {
  const { profile, registerResident, userCoords, acquireLiveLocation } = useAuth();
  const { lang, t } = useLanguage();
  
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState(profile?.customPlaceName || '');
  const [pincode, setPincode] = useState(profile?.pincode || '643211');
  const [copied, setCopied] = useState(false);
  const [isRegistering, setIsRegistering] = useState(!profile);
  const [isLocating, setIsLocating] = useState(false);

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
    try {
      await registerResident({
        name: name.trim(),
        phone: phone.trim(),
        localityId,
        customPlaceName: customPlaceName.trim() || undefined,
        pincode: pincode.trim()
      });
      setIsRegistering(false);
      toast.success('Your unique Gudalur ID has been generated!');
    } catch (err: any) {
      toast.error(err?.message || 'Registration failed. Please try again.');
    }
  };

  const handleCopy = () => {
    if (profile?.gudalurId) {
      navigator.clipboard.writeText(`ONE GUDALUR Resident ID: ${profile.gudalurId} | Locality: ${profile.localityName} (${profile.pincode})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    if (!profile) return;
    const text = encodeURIComponent(
      `🌿 *ONE GUDALUR Resident Identity*\n` +
      `👤 Name: ${profile.name}\n` +
      `🆔 Gudalur ID: ${profile.gudalurId}\n` +
      `📍 Locality: ${profile.localityName} (${profile.pincode})\n` +
      `🛡️ Status: ${profile.verificationLevel}\n` +
      `Together for a safer, united Gudalur! https://onegudalur.org`
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
              {profile && !isRegistering ? (
                /* The Digital ID Card */
                <div className="space-y-4">
                  <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-slate-700/80 overflow-hidden">
                    <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                    
                    {/* Card Top */}
                    <div className="flex items-start justify-between border-b border-slate-700/60 pb-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                          <span className="text-[10px] uppercase font-black tracking-widest text-emerald-300">ONE GUDALUR</span>
                        </div>
                        <h4 className="text-lg font-black tracking-tight text-white mt-0.5">RESIDENT CITIZEN CARD</h4>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                        {profile.verificationLevel.replace('_', ' ')}
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
                        <span className="text-[8px] font-mono font-bold mt-1 text-slate-600">VERIFIED</span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>The Nilgiris Western Plateau</span>
                      <span>GD-2026-REGULAR</span>
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
              ) : (
                /* Registration / Edit Form */
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. S. Murugan / Ananya Nair"
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mobile Number (For Locality SMS Alerts) <span className="text-rose-500">*</span>
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
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Locality / Area <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={localityId}
                        onChange={(e) => {
                          setLocalityId(e.target.value);
                          const sel = GUDALUR_LOCALITIES.find(l => l.id === e.target.value);
                          if (sel) setPincode(sel.pincode);
                        }}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs bg-white"
                      >
                        {GUDALUR_LOCALITIES.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Pincode <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="643211"
                        maxLength={6}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono outline-none"
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
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 mt-2"
                  >
                    <CheckCircle2 size={18} />
                    <span>Generate My Gudalur ID</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
