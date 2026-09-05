import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, MapPin, User, CheckCircle2, Loader2, ShieldCheck, Search, ChevronDown, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../../data/gudalurMasterData';
import { OPEN_LOGIN_EVENT } from '../../pages/about_helpers';
import toast from 'react-hot-toast';

interface RegisterResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onRegistered?: (profile: { gudalurId: string; name: string; phone: string }) => void;
  /** Switches this registration form to the Login modal (for already-registered residents). */
  onNeedLogin?: () => void;
}

/**
 * SIMPLE REGISTRATION — no OTP, no email. Name + phone + place is all we need.
 * One phone number can register only once (the server enforces a UNIQUE phone
 * index; duplicates are pointed to Login). Aadhaar verification comes later.
 */
export const RegisterResidentModal: React.FC<RegisterResidentModalProps> = ({
  isOpen, onClose, onSuccess, onRegistered, onNeedLogin,
}) => {
  const { registerResident, userCoords } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [localityId, setLocalityId] = useState(GUDALUR_LOCALITIES[0].id);
  const [customPlaceName, setCustomPlaceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placeSearch, setPlaceSearch] = useState(GUDALUR_LOCALITIES[0].name);
  const [showPlaceDropdown, setShowPlaceDropdown] = useState(false);
  const [filteredLocalities, setFilteredLocalities] = useState(GUDALUR_LOCALITIES);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const locality = useMemo(
    () => GUDALUR_LOCALITIES.find((l) => l.id === localityId) ?? GUDALUR_LOCALITIES[0],
    [localityId],
  );

  // Filter localities based on search input
  useEffect(() => {
    if (placeSearch.trim() === '') {
      setFilteredLocalities(GUDALUR_LOCALITIES);
    } else {
      const search = placeSearch.toLowerCase();
      setFilteredLocalities(
        GUDALUR_LOCALITIES.filter(
          (loc) =>
            loc.name.toLowerCase().includes(search) ||
            loc.nameTa?.toLowerCase().includes(search) ||
            loc.alternativeNames?.some((alt) => alt.toLowerCase().includes(search))
        )
      );
    }
  }, [placeSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          placeInputRef.current && !placeInputRef.current.contains(event.target as Node)) {
        setShowPlaceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = (loc: typeof GUDALUR_LOCALITIES[0]) => {
    setLocalityId(loc.id);
    setPlaceSearch(loc.name);
    setShowPlaceDropdown(false);
  };

  if (!isOpen) return null;

  /** "Already registered?" → hand over to the Login modal (local handler, or the global Shell bus). */
  const handleNeedLogin = () => {
    if (onNeedLogin) onNeedLogin();
    else window.dispatchEvent(new Event(OPEN_LOGIN_EVENT));
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (name.trim().length < 2) {
      toast.error(t('reg.name_required'));
      return;
    }
    if (digits.length !== 10) {
      toast.error(t('reg.phone_required'));
      return;
    }
    
    // Check if phone number already exists
    setIsSubmitting(true);
    try {
      // First check if phone is already registered
      const checkResponse = await fetch(`/api/auth/check-phone?phone=${digits}`);
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          toast.error('Mobile number already registered! Please login instead.', { duration: 6000, icon: '📱' });
          setIsSubmitting(false);
          return;
        }
      }
    } catch {
      // If check fails, continue with registration (server will validate)
    }
    
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
      toast.success(t('reg.welcome').replace('{n}', profile.gudalurId), { duration: 6000, icon: '🪪' });
      setName('');
      setPhone('');
      setCustomPlaceName('');
      setPlaceSearch(GUDALUR_LOCALITIES[0].name);
      onSuccess?.();
      onRegistered?.({
        gudalurId: profile.gudalurId,
        name: profile.name,
        phone: profile.phone,
      });
      onClose();
    } catch (err: any) {
      const msg = String((err && err.message) || '');
      if ((err && err.code === 'DUPLICATE_PHONE') || /duplicate|already registered|unique key|phone.*exist|mobile.*registered/i.test(msg)) {
        toast.error('Mobile number already registered! Please login instead.', { duration: 6000, icon: '📱' });
      } else {
        toast.error(msg || t('reg.fail'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        /* Scroll-safe overlay: the inner wrapper scrolls as a whole, so the top of the
           card (heading + close button) can NEVER be clipped — and the card itself is
           capped to the screen height so the layout always fits the device screen. */
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#0A3D0A]/80 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative my-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
            >
              {/* Pinned header — heading + close button always visible */}
              <div className="relative shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1.5 pr-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck size={20} />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {t('reg.title')}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t('reg.subtitle')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                {/* Scrollable form body — only the fields scroll, header/footer stay put */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.name')} *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    maxLength={80}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.phone')} *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.place')} *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                  <input
                    ref={placeInputRef}
                    type="text"
                    value={placeSearch}
                    onChange={(e) => {
                      setPlaceSearch(e.target.value);
                      setShowPlaceDropdown(true);
                    }}
                    onFocus={() => setShowPlaceDropdown(true)}
                    placeholder={t('reg.place_placeholder') || 'Type your area name...'}
                    className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition text-slate-900 bg-white placeholder:text-slate-400"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlaceDropdown(!showPlaceDropdown)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <ChevronDown size={16} className={`transition-transform ${showPlaceDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {t('reg.pincode').replace('{n}', locality.pincode || '')} · {filteredLocalities.length} areas
                </p>
                
                {/* Searchable Dropdown */}
                <AnimatePresence>
                  {showPlaceDropdown && (
                    <motion.div
                      ref={dropdownRef}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg"
                    >
                      {filteredLocalities.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">
                          <Search size={16} className="inline mr-2" />
                          {t('reg.no_areas') || 'No areas found. Type to search...'}
                        </div>
                      ) : (
                        filteredLocalities.slice(0, 50).map((loc) => (
                          <button
                            key={loc.id}
                            type="button"
                            onClick={() => handleSelectPlace(loc)}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition flex items-center gap-2 ${
                              localityId === loc.id ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-700'
                            }`}
                          >
                            <MapPin size={14} className="text-slate-400 flex-shrink-0" />
                            <span className="truncate">{loc.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{loc.pincode}</span>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('reg.estate')}</label>
                <input
                  type="text"
                  value={customPlaceName}
                  onChange={(e) => setCustomPlaceName(e.target.value)}
                  placeholder="e.g. Glenrock Division 2"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs outline-none transition text-slate-900 bg-white placeholder:text-slate-400"
                />
              </div>

                </div>

                {/* Pinned footer — Submit + Login always reachable, no scrolling needed */}
                <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    <span>{isSubmitting ? t('reg.submitting') : t('reg.submit')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNeedLogin}
                    className="w-full py-2.5 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition flex items-center justify-center gap-2"
                  >
                    <LogIn size={14} />
                    <span>{t('reg.login_cta')}</span>
                  </button>

                  <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                    {t('reg.already')}
                  </p>
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
