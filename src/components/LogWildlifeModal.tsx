import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Compass, Eye, CheckCircle2, Radio, PhoneCall } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { WildlifeIncident } from '../types';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface LogWildlifeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged?: (incident: WildlifeIncident) => void;
}

export const LogWildlifeModal: React.FC<LogWildlifeModalProps> = ({ isOpen, onClose, onLogged }) => {
  const { profile, user } = useAuth();
  const { lang, t } = useLanguage();

  const [localityId, setLocalityId] = useState(profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [areaDescription, setAreaDescription] = useState('');
  const [herdSize, setHerdSize] = useState(2);
  const [behavior, setBehavior] = useState('Crossing road calmly towards tea estate buffer');
  const [urgency, setUrgency] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [submitted, setSubmitted] = useState(false);

  const selectedLoc = GUDALUR_LOCALITIES.find(l => l.id === localityId) || GUDALUR_LOCALITIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `WILDLIFE-${Date.now()}`;
    const incident: WildlifeIncident = {
      id,
      type: 'ELEPHANT',
      animalType: 'ELEPHANT',
      threatLevel: urgency === 'HIGH' ? 'IMMINENT_DANGER' : urgency === 'MEDIUM' ? 'ACTIVE_MOVEMENT' : 'CAUTION',
      localityId: selectedLoc.id,
      localityName: selectedLoc.name,
      generalizedArea: areaDescription || selectedLoc.name,
      lat: selectedLoc.lat,
      lng: selectedLoc.lng,
      herdSize,
      behavior,
      urgency,
      reportedBy: profile?.name || 'Local Resident',
      verifiedByForestDept: true,
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, 'wildlife_incidents', id), incident);
    } catch (err) {
      console.warn('Firestore wildlife write error:', err);
    }

    const localList = JSON.parse(localStorage.getItem('onegudalur_wildlife_logs') || '[]');
    localList.unshift(incident);
    localStorage.setItem('onegudalur_wildlife_logs', JSON.stringify(localList));

    if (onLogged) onLogged(incident);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAreaDescription('');
    setSubmitted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-200 text-amber-900 rounded-xl">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {lang === 'ta' ? 'வனவிலங்கு நடமாட்டப் பதிவு' : 'Log Wildlife Sighting'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {lang === 'ta' ? 'முன்கூட்டிய எச்சரிக்கை மற்றும் பாதுகாப்பு' : 'Early warning intelligence for neighbor safety'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex p-3 bg-amber-100 text-amber-800 rounded-full">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Sighting Broadcasted!</h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
                      Neighbors in <strong>{selectedLoc.name}</strong> and Forest Division RRT informed. Always maintain a 50m safe buffer distance.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                    <span>Forest Rapid Response Helpline:</span>
                    <a href="tel:18004256100" className="font-bold underline flex items-center gap-1 text-emerald-800">
                      <PhoneCall size={12} /> 1800 425 6100
                    </a>
                  </div>

                  <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Locality</label>
                    <select
                      value={localityId}
                      onChange={(e) => setLocalityId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                    >
                      {GUDALUR_LOCALITIES.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.nameTa})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Generalized Area / Landmark
                    </label>
                    <input
                      type="text"
                      required
                      value={areaDescription}
                      onChange={(e) => setAreaDescription(e.target.value)}
                      placeholder="e.g. Near Moyar stream culvert, 100m from school road"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Approx Herd Size</label>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={herdSize}
                        onChange={(e) => setHerdSize(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Urgency Level</label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as any)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                      >
                        <option value="LOW">Low (Grazing in deep forest)</option>
                        <option value="MEDIUM">Medium (Near estate path)</option>
                        <option value="HIGH">High (Near residential homes / Road)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observed Movement / Notes</label>
                    <textarea
                      rows={2}
                      value={behavior}
                      onChange={(e) => setBehavior(e.target.value)}
                      placeholder="e.g. Peaceful grazing, moving slowly away from road..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-amber-500 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Radio size={16} />
                    <span>Broadcast Sighting</span>
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
