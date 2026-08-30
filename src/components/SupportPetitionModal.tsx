import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HeartHandshake, CheckCircle2, ShieldCheck, MapPin, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Petition } from '../types';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';

interface SupportPetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  petition: Petition | null;
  onSupported?: (petitionId: string) => void;
}

export const SupportPetitionModal: React.FC<SupportPetitionModalProps> = ({
  isOpen,
  onClose,
  petition,
  onSupported
}) => {
  const { profile, registerResident, user } = useAuth();
  const { lang, t } = useLanguage();

  const [name, setName] = useState(profile?.name || '');
  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [isDone, setIsDone] = useState(false);

  if (!petition) return null;

  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile && name.trim()) {
      await registerResident({
        name: name.trim(),
        phone: '',
        localityId,
        pincode: '643211'
      });
    }
    if (onSupported) {
      onSupported(petition.id);
    }
    setIsDone(true);
  };

  const handleClose = () => {
    setIsDone(false);
    onClose();
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-200 text-emerald-800 rounded-xl">
                  <HeartHandshake size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {lang === 'ta' ? 'மக்கள் கோரிக்கைக்கு ஆதரவு' : 'Support Civic Demand'}
                  </h3>
                  <p className="text-xs text-slate-500">Lawful evidence-driven citizen backing</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {isDone ? (
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Your Support is Recorded!</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                      Thank you for standing up for Gudalur. Your verified citizen backing has been added to this official demand.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
                  >
                    Return to Petitions
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSupport} className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700">
                    <p className="font-bold text-slate-900 mb-1">{petition.title}</p>
                    <p className="text-slate-500 line-clamp-2">{petition.problem}</p>
                  </div>

                  {!profile && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Your Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. R. Subramanian"
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Your Locality <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={localityId}
                          onChange={(e) => setLocalityId(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                        >
                          {GUDALUR_LOCALITIES.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.nameTa})
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  {profile && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{profile.name}</p>
                        <p className="text-slate-500">{profile.localityName} • ID: {profile.gudalurId}</p>
                      </div>
                      <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        VERIFIED CITIZEN
                      </span>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                    By clicking support, you confirm you are a resident or stakeholder of Gudalur Taluk and endorse this lawful civic petition to the government authorities.
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <HeartHandshake size={18} />
                    <span>Confirm & Sign Demand</span>
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
