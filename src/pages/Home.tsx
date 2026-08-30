import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  CheckSquare, 
  Compass, 
  HeartHandshake, 
  Landmark, 
  PhoneCall, 
  ArrowRight, 
  Users, 
  Sparkles, 
  ThumbsUp, 
  Clock, 
  Building2,
  Share2,
  CheckCircle2,
  Flame
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES, INITIAL_URGENT_ALERTS, INITIAL_PETITIONS } from '../data/gudalurMasterData';
import { LocalityMap } from '../components/Map/LocalityMap';
import { GudalurIdModal } from '../components/GudalurIdModal';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { CivicIssue } from '../types';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const Home: React.FC = () => {
  const { profile, user } = useAuth();
  const { lang, t } = useLanguage();

  const [idModalOpen, setIdModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedLocality, setSelectedLocality] = useState(GUDALUR_LOCALITIES[0]);

  // Load issues from local state / firestore
  const [issues, setIssues] = useState<CivicIssue[]>(() => {
    const saved = localStorage.getItem('VoiceOfGudalur_local_issues');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { 
        return []; 
      }
    }
    return [];
  });

  useEffect(() => {
    const q = query(collection(db, 'civic_issues'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteList: CivicIssue[] = [];
        snapshot.forEach((docSnap) => {
          remoteList.push({ ...docSnap.data(), id: docSnap.id } as CivicIssue);
        });

        // Merge with local storage fallback
        const local = JSON.parse(localStorage.getItem('VoiceOfGudalur_local_issues') || '[]');
        const merged = [...remoteList];
        local.forEach((locItem: CivicIssue) => {
          if (!merged.some(m => m.id === locItem.id)) {
            merged.push(locItem);
          }
        });
        merged.sort((a, b) => b.createdAt - a.createdAt);
        setIssues(merged);
      },
      (error) => {
        console.warn('Firestore issues sync warning on home:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpvote = (issueId: string) => {
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return { ...issue, upvotesCount: issue.upvotesCount + 1 };
      }
      return issue;
    }));
  };

  return (
    <div className="space-y-8">
      
      {/* Top Banner: The Right to Life Proclamation */}
      <div className="rounded-2xl bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-white p-4 sm:p-5 border border-rose-800/60 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0">
            <Flame size={22} className="text-rose-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Official Citizen Proclamation
              </span>
              <span className="text-xs text-rose-200/80 font-medium hidden md:inline">14,800+ Citizen Signatures</span>
            </div>
            <h3 className="font-serif font-bold text-sm sm:text-base text-white mt-0.5">
              {lang === 'ta' ? 'உரிமைக்குரல்: கூடலூர் மனித-வனவிலங்கு நெருக்கடி பிரகடனம்' : lang === 'kn' ? 'ಬದುಕುವ ಹಕ್ಕು: ಗೂಡಲೂರಿನ ನಾಗರಿಕ ಪ್ರಣಾಳಿಕೆ' : 'The Right to Life: Ending the Human Crisis on the Frontlines of Gudalur'}
            </h3>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition shrink-0"
        >
          <span>{lang === 'ta' ? 'முழு பிரகடனத்தை வாசிக்க' : lang === 'kn' ? 'ಪ್ರಣಾಳಿಕೆ ಓದಿ' : 'Read & Sign Proclamation'}</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 1. Hero Civic Section */}
      <section className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-6 sm:p-10 shadow-xl border border-slate-700/80 overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {t('hero.badge')}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
            {lang === 'ta' ? 'ஒரே கூடலூர். ஒருமித்த மக்கள்.' : 'Gudalur United.'}
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            {t('hero.subheadline')}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => setIdModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
            >
              <ShieldCheck size={18} />
              <span>{profile ? `My Gudalur ID: ${profile.gudalurId}` : t('hero.join_btn')}</span>
            </button>

            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/15 backdrop-blur-sm transition"
            >
              <CheckSquare size={18} className="text-rose-400" />
              <span>{t('places.report_issue')}</span>
            </button>

            <Link
              to="/act"
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700 transition"
            >
              <HeartHandshake size={18} className="text-amber-400" />
              <span>{t('act.title')}</span>
            </Link>
          </div>
        </div>

        {/* Hero Bottom Metric Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-700/60 text-xs">
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">16</p>
            <p className="text-slate-400 mt-0.5 font-medium">{t('hero.verified_localities')}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">2</p>
            <p className="text-slate-400 mt-0.5 font-medium">{lang === 'ta' ? 'வட்டங்கள் (கூடலூர், பந்தலூர்)' : 'Taluks (Gudalur & Pandalur)'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">6</p>
            <p className="text-slate-400 mt-0.5 font-medium">{lang === 'ta' ? 'அரசு குறைதீர்ப்பு வழிகள்' : 'Govt Grievance Portals'}</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-cyan-400">24/7</p>
            <p className="text-slate-400 mt-0.5 font-medium">Forest RRT & CM 1100</p>
          </div>
        </div>
      </section>

      {/* 2. Emergency & Lifeline Quick-Dial Strip */}
      <section className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <PhoneCall size={18} className="text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900">
              {lang === 'ta' ? 'கூடலூர் அவசர உதவி எண்கள் (24/7)' : 'Gudalur 24x7 Emergency Lifelines'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Direct Government & Emergency Desks</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <a
            href="tel:18004256100"
            className="flex flex-col p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 transition group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Elephant & Wildlife RRT</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-amber-900 mt-1">1800 425 6100</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Gudalur Forest Div</span>
          </a>

          <a
            href="tel:9498794987"
            className="flex flex-col p-3 rounded-2xl bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-200 transition group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">TNEB Minnal Power</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-cyan-900 mt-1">94987 94987</span>
            <span className="text-[10px] text-slate-500 mt-0.5">24x7 EB Grievance</span>
          </a>

          <a
            href="tel:1100"
            className="flex flex-col p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 transition group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">CM Helpline 1100</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 mt-1">1100 (Toll-Free)</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Mudhalvarin Mugavari</span>
          </a>

          <a
            href="tel:04262261224"
            className="flex flex-col p-3 rounded-2xl bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Gudalur GH Hospital</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-rose-900 mt-1">04262-261224</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Casualty & Anti-Venom</span>
          </a>

          <a
            href="tel:04262261222"
            className="flex flex-col p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition group"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Police & Highway</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-slate-900 mt-1">04262-261222</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Gudalur Police Station</span>
          </a>
        </div>
      </section>

      {/* 3. Interactive Locality Map & Places Hub */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">
              {t('places.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {t('places.subtitle')}
            </p>
          </div>
          <Link
            to="/places"
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition"
          >
            <span>View All 16 Localities</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Map */}
          <div className="lg:col-span-2">
            <LocalityMap
              localities={GUDALUR_LOCALITIES}
              selectedLocalityId={selectedLocality.id}
              onSelectLocality={setSelectedLocality}
              height="380px"
            />
          </div>

          {/* Selected Locality Spotlight Card */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {selectedLocality.administrativeParent}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">{selectedLocality.name}</h3>
                <p className="text-xs text-emerald-700 font-semibold">{selectedLocality.nameTa}</p>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                selectedLocality.alertStatus === 'ALERT' ? 'bg-rose-100 text-rose-800' :
                selectedLocality.alertStatus === 'CAUTION' ? 'bg-amber-100 text-amber-800' :
                'bg-emerald-100 text-emerald-800'
              }`}>
                {selectedLocality.alertStatus}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ta' ? selectedLocality.descriptionTa : selectedLocality.description}
            </p>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500">Revenue Village:</span>
                <span className="font-semibold text-slate-800">{selectedLocality.revenueVillage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Taluk / Admin:</span>
                <span className="font-semibold text-slate-800">{selectedLocality.administrativeParent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PIN Code:</span>
                <span className="font-semibold font-mono text-slate-800">{selectedLocality.pincode}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setSelectedLocality(selectedLocality);
                  setReportModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
              >
                <CheckSquare size={14} />
                <span>Report Issue in {selectedLocality.name}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Active Civic Petitions (Act For Gudalur) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">{t('act.title')}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('act.subtitle')}</p>
          </div>
          <Link
            to="/act"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>All Demands</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {INITIAL_PETITIONS.map((petition) => (
            <div
              key={petition.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {petition.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">By {petition.createdByName}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {lang === 'ta' ? petition.titleTa : petition.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3">
                  {lang === 'ta' ? petition.problemTa : petition.problem}
                </p>
              </div>

              {/* Verified Signatures CTA */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-700">{petition.supportCount.toLocaleString()} Verified Resident Signatures</span>
                  <span className="text-slate-500 text-[11px]">{petition.status === 'IN_GOVT_REVIEW' ? 'Under Review' : 'Active Representation'}</span>
                </div>
                <Link
                  to="/act"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition text-center block"
                >
                  View Evidence & Sign Petition
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Live Civic Issue Stream */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">{t('issues.title')}</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{t('issues.subtitle')}</p>
          </div>
          <Link
            to="/issues"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>All Issues Tracker</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {issues.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-sm font-bold text-slate-900">
                {lang === 'ta' ? 'தற்போது திறந்த புகார்கள் இல்லை' : 'No Open Civic Issues'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ta'
                  ? 'உங்கள் பகுதியின் குடிநீர், சாலை, மின்சாரம் அல்லது பாதுகாப்பு புகார்களை இங்கு எளிதாக பதிவு செய்யலாம்.'
                  : 'All civic issues are logged directly by verified local residents. Click below to log a real issue in your area.'}
              </p>
            </div>
            <button
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
            >
              <CheckSquare size={14} />
              <span>{t('places.report_issue')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issues.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {issue.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {issue.status}
                    </span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-snug">{issue.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-2">{issue.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 text-slate-700 font-semibold">
                    <MapPin size={13} className="text-emerald-600" />
                    <span>{issue.localityName}</span>
                  </div>

                  <button
                    onClick={() => handleUpvote(issue.id)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold transition text-xs"
                  >
                    <ThumbsUp size={13} />
                    <span>{issue.upvotesCount} Backed</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Universal Modals */}
      <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        defaultLocalityId={selectedLocality.id}
        onIssueCreated={(newIssue) => setIssues(prev => [newIssue, ...prev])}
      />

    </div>
  );
};
export default Home;
