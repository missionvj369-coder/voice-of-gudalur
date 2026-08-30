import React, { useState } from 'react';
import { 
  Landmark, 
  PhoneCall, 
  ExternalLink, 
  FileText, 
  CheckCircle2, 
  BookmarkCheck, 
  Plus, 
  Search, 
  Building2, 
  Clock,
  Mail,
  Send,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GOVERNMENT_CHANNELS } from '../data/gudalurMasterData';
import { UserGrievanceRecord } from '../types';
import { GrievanceTrackerModal } from '../components/GrievanceTrackerModal';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';

export const Government: React.FC = () => {
  const { lang, t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [myGrievances, setMyGrievances] = useState<UserGrievanceRecord[]>(() => {
    const saved = localStorage.getItem('VoiceOfGudalur_my_grievances');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return []; }
    }
    return [
      {
        id: 'GRIEV-1',
        userId: 'demo_user',
        userGudalurId: 'GD-2026-1042',
        authority: 'Mudhalvarin Mugavari (CM Helpline 1100)',
        complaintId: 'TN-MM-2026-99120',
        title: 'Road reconstruction demand near Kasimvayal bridge',
        submissionDate: Date.now() - 1000 * 60 * 60 * 24 * 3,
        status: 'FIELD_INSPECTION_SCHEDULED',
        notes: 'Forwarded to District Collectorate & Municipality Engineer'
      }
    ];
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-2">
            <Landmark size={14} />
            <span>OFFICIAL TAMIL NADU GRIEVANCE REDRESSAL CHANNELS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            {t('govt.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {t('govt.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
        >
          <BookmarkCheck size={16} />
          <span>Track Official Complaint ID</span>
        </button>
      </div>

      {/* Direct Administrative Representation Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 border border-indigo-900/60 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Flame size={12} />
              Emergency Citizen Representation
            </span>
            <span className="text-xs text-indigo-300 font-medium hidden sm:inline">Constitutional Article 21</span>
          </div>
          <h3 className="font-serif font-black text-lg sm:text-xl text-white">
            Send Official Human Safety & Corridor Representation to CM Cell & NTCA
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Dispatch our pre-drafted legal representation in English, Tamil, Malayalam, or Kannada with automatic CC to the National Tiger Conservation Authority, Nilgiris District Collector, Gudalur MLA, and UN Human Rights bodies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/40 transition transform hover:-translate-y-0.5"
          >
            <Mail size={16} />
            <span>Open Email Dispatcher</span>
          </button>
        </div>
      </div>

      {/* User's Tracked Grievances Box */}
      {myGrievances.length > 0 && (
        <div className="p-6 rounded-3xl bg-white border border-indigo-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <BookmarkCheck size={18} className="text-indigo-600" />
              <span>My Tracked Government Complaints ({myGrievances.length})</span>
            </h3>
            <span className="text-xs text-slate-500">Linked to your Gudalur ID</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myGrievances.map((gr) => (
              <div key={gr.id} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-950 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {gr.complaintId}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {gr.status}
                  </span>
                </div>
                <p className="font-bold text-slate-900">{gr.title}</p>
                <p className="text-slate-500">{gr.authority}</p>
                {gr.notes && <p className="text-indigo-900 italic font-medium bg-white p-2 rounded-xl border border-indigo-100">{gr.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Government Channels List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {GOVERNMENT_CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {ch.category}
                </span>
                <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  OFFICIAL
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {lang === 'ta' ? ch.authorityNameTa : ch.authorityName}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ta' ? ch.descriptionTa : ch.description}
              </p>

              {/* Department Meta */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Helpline:</span>
                  <a href={`tel:${ch.helpline.split(' ')[0]}`} className="font-bold text-emerald-700 underline">
                    {ch.helpline}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Submission:</span>
                  <span className="font-semibold text-slate-800">{ch.submissionMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tracking:</span>
                  <span className="font-semibold text-slate-800">{ch.trackingMechanism}</span>
                </div>
              </div>
            </div>

            {/* Direct Official Link */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={ch.onlineUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                <span>Open Government Portal</span>
                <ExternalLink size={14} />
              </a>

              <button
                onClick={() => setModalOpen(true)}
                className="text-xs font-bold text-slate-700 hover:text-slate-900 underline"
              >
                Save Ticket to Profile
              </button>
            </div>
          </div>
        ))}
      </div>

      <GrievanceTrackerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={(newRec) => setMyGrievances(prev => [newRec, ...prev])}
      />

      <SendEmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
      />

    </div>
  );
};
export default Government;
