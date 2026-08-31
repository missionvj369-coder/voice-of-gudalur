// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, CheckCircle2, Search, ExternalLink, BookmarkCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserGrievanceRecord } from '../types';

interface GrievanceTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (record: UserGrievanceRecord) => void;
}

export const GrievanceTrackerModal: React.FC<GrievanceTrackerModalProps> = ({ isOpen, onClose, onAdded }) => {
  const { profile, user } = useAuth();
  const { lang } = useLanguage();

  const [authority, setAuthority] = useState('Mudhalvarin Mugavari (CM Helpline 1100)');
  const [complaintId, setComplaintId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintId.trim() || !title.trim()) return;

    const record: UserGrievanceRecord = {
      id: `GRIEV-${Date.now()}`,
      userId: user?.uid || 'guest_resident',
      userGudalurId: profile?.gudalurId || 'GD-2026-CITIZEN',
      authority,
      complaintId: complaintId.trim(),
      title: title.trim(),
      submissionDate: Date.now(),
      status: 'SUBMITTED',
      notes
    };

    const existing = JSON.parse(localStorage.getItem('VoiceOfGudalur_my_grievances') || '[]');
    existing.unshift(record);
    localStorage.setItem('VoiceOfGudalur_my_grievances', JSON.stringify(existing));

    if (onAdded) onAdded(record);
    setSubmitted(true);
  };

  const handleReset = () => {
    setComplaintId('');
    setTitle('');
    setNotes('');
    setSubmitted(false);
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <BookmarkCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {lang === 'ta' ? 'அரசு புகார் எண்ணைக் கண்காணிக்க' : 'Track Official Grievance'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ta' ? 'முதல்வரின் முகவரி & மின்வாரிய புகார் கண்காணிப்பு' : 'Add official token number for unified status tracking'}
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
                  <div className="inline-flex p-3 bg-emerald-100 text-emerald-800 rounded-full">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Grievance Linked to Your Profile!</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Token <strong className="font-mono text-emerald-800">{complaintId}</strong> is now tracked on your Voice of Gudalur dashboard.
                    </p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition"
                  >
                    View My Tracker
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Government Portal / Department <span className="text-amber-600">*</span>
                    </label>
                    <select
                      value={authority}
                      onChange={(e) => setAuthority(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                    >
                      <option value="Mudhalvarin Mugavari (CM Helpline 1100)">Mudhalvarin Mugavari (CM Helpline 1100)</option>
                      <option value="TANGEDCO Minnal (94987 94987)">TANGEDCO Electricity (Minnal 94987 94987)</option>
                      <option value="Gudalur Municipality Grievance Desk">Gudalur Municipality Grievance Desk</option>
                      <option value="Tamil Nadu Forest Dept Division">Tamil Nadu Forest Dept Division</option>
                      <option value="Nilgiris Collectorate Grievance Day">Nilgiris District Collectorate Grievance</option>
                      <option value="National CPGRAMS Portal">National CPGRAMS Portal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Complaint / Token ID <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={complaintId}
                      onChange={(e) => setComplaintId(e.target.value)}
                      placeholder="e.g. TN-MM-2026-88129 or MINNAL-4412"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Subject / Brief Title <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Broken water pipe line repair request in Ward 12"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Follow-up Notes / Phone Reference
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Spoke to municipal junior engineer on Monday..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
                  >
                    <BookmarkCheck size={16} />
                    <span>Save & Track Grievance</span>
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
