import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Camera, MapPin, CheckCircle2, Send, Tag, Building2, MessageCircle, Share2, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { CivicIssue, IssueCategory } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { generateWhatsAppCivicIssueText, shareToWhatsApp } from '../utils/whatsappShare';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocalityId?: string;
  onIssueCreated?: (issue: CivicIssue) => void;
}

const CATEGORIES: { id: IssueCategory; nameEn: string; nameTa: string; authority: string }[] = [
  { id: 'roads', nameEn: 'Road Damage & Potholes', nameTa: 'சாலைப் பழுது & பள்ளங்கள்', authority: 'Highways Dept / Gudalur Municipality' },
  { id: 'water', nameEn: 'Drinking Water Supply & Leakage', nameTa: 'குடிநீர் தட்டுப்பாடு & கசிவு', authority: 'TWAD Board / Municipality Water Wing' },
  { id: 'electricity', nameEn: 'Electricity, Transformer & Hanging Wires', nameTa: 'மின்வாரியம் & அறுந்த மின்கம்பிகள்', authority: 'TANGEDCO / TNEB Gudalur' },
  { id: 'sanitation', nameEn: 'Waste Management & Drainage Block', nameTa: 'கழிவுநீர் & குப்பை மேலாண்மை', authority: 'Sanitary Inspector, Gudalur Municipality' },
  { id: 'wildlife', nameEn: 'Elephant Sighting & Fence Damage', nameTa: 'காட்டு யானை & சோலார் வேலி பழுது', authority: 'Tamil Nadu Forest Department (Gudalur Division)' },
  { id: 'ghat_safety', nameEn: 'Ghat Landslide & Tree Fall Risk', nameTa: 'மலைப்பாதை மண்சரிவு & மர அபாயம்', authority: 'State Disaster Management & Police Patrol' },
  { id: 'health', nameEn: 'Hospital Emergency & Ambulance Delay', nameTa: 'மருத்துவமனை & அவசர சிகிச்சை', authority: 'Govt Taluk Hospital / Health Services' },
  { id: 'other', nameEn: 'Other Public Grievance', nameTa: 'பிற பொதுப் பிரச்சனைகள்', authority: 'Taluk Tahsildar Office' }
];

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({
  isOpen,
  onClose,
  defaultLocalityId,
  onIssueCreated
}) => {
  const { profile, user } = useAuth();
  const { lang, t } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('roads');
  const [localityId, setLocalityId] = useState(defaultLocalityId || profile?.localityId || GUDALUR_LOCALITIES[0].id);
  const [landmark, setLandmark] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedIssue, setSubmittedIssue] = useState<CivicIssue | null>(null);

  const selectedLoc = GUDALUR_LOCALITIES.find(l => l.id === localityId) || GUDALUR_LOCALITIES[0];
  const selectedCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    const trackingId = `GD-ISSUE-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newIssue: CivicIssue = {
      id: trackingId,
      title,
      description,
      category,
      localityId: selectedLoc.id,
      localityName: selectedLoc.name,
      lat: selectedLoc.lat,
      lng: selectedLoc.lng,
      address: landmark || selectedLoc.name,
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
      reporterId: user ? user.uid : 'anon_reporter',
      reporterName: profile?.name || 'Local Resident',
      reporterGudalurId: profile?.gudalurId || 'GD-2026-RESIDENT',
      status: 'REPORTED',
      assignedAuthority: selectedCat.authority,
      timeline: [
        {
          status: 'REPORTED',
          timestamp: Date.now(),
          actor: profile?.name || 'Citizen Reporter',
          note: `Issue reported with initial evidence in ${selectedLoc.name}. Routed to ${selectedCat.authority}.`
        }
      ],
      upvotesCount: 1,
      upvotedBy: [user?.uid || 'current_user'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'civic_issues', trackingId), newIssue);
    } catch (err) {
      console.warn('Could not write issue to firestore, keeping local state:', err);
    }

    // Save locally as fallback
    const existing = JSON.parse(localStorage.getItem('onegudalur_local_issues') || '[]');
    existing.unshift(newIssue);
    localStorage.setItem('onegudalur_local_issues', JSON.stringify(existing));

    if (onIssueCreated) {
      onIssueCreated(newIssue);
    }

    setIsSubmitting(false);
    setSubmittedIssue(newIssue);
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setLandmark('');
    setPhotoUrl('');
    setSubmittedIssue(null);
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
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-800 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">
                    {lang === 'ta' ? 'மக்கள் பிரச்சனையைப் பதிவுசெய்' : 'Report Civic Issue'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {lang === 'ta' ? 'ஆதாரத்துடன் பதிவு செய்து அரசு தீர்வை கண்காணிக்கலாம்' : 'Evidence-based reporting with permanent tracking ID'}
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
              {submittedIssue ? (
                /* Success View */
                <div className="text-center py-4 space-y-4">
                  <div className="inline-flex p-3 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Issue Successfully Logged!</h4>
                    <p className="text-sm text-slate-600 mt-1">
                      Tracking ID: <strong className="font-mono text-emerald-700">{submittedIssue.id}</strong>
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Authority:</span>
                      <span className="font-bold text-slate-800">{submittedIssue.assignedAuthority}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Locality:</span>
                      <span className="font-bold text-slate-800">{submittedIssue.localityName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initial Status:</span>
                      <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">REPORTED</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const text = generateWhatsAppCivicIssueText({
                          id: submittedIssue.id,
                          title: submittedIssue.title,
                          localityName: submittedIssue.localityName,
                          category: submittedIssue.category,
                          status: submittedIssue.status,
                          assignedAuthority: submittedIssue.assignedAuthority,
                          officialGrievanceId: submittedIssue.officialGrievanceId
                        });
                        shareToWhatsApp(text);
                      }}
                      className="flex-1 py-3 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <MessageCircle size={16} />
                      <span>Share on WhatsApp</span>
                    </button>

                    <button
                      onClick={handleReset}
                      className="flex-1 py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Locality in Gudalur <span className="text-rose-500">*</span>
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Category of Civic Issue <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as IssueCategory)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nameEn} ({c.nameTa})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 size={12} /> Target: {selectedCat.authority}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Specific Problem Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Major water pipeline leakage near Kasimvayal bridge"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Detailed Description & Impact <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened, how long it has persisted, and affected homes..."
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Landmark / Street Address
                    </label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. 50 meters past Forest Buffer Gate on Main Road"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg shadow-emerald-700/20 transition flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    <span>{isSubmitting ? 'Logging Issue...' : 'Submit & Generate Tracking ID'}</span>
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
