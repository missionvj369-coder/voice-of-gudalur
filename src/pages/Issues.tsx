import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  ThumbsUp, 
  MapPin, 
  Building2, 
  Plus, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES } from '../data/gudalurMasterData';
import { CivicIssue, IssueCategory, IssueStatus } from '../types';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { GudalurIdModal } from '../components/GudalurIdModal';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { generateWhatsAppCivicIssueText, shareToWhatsApp } from '../utils/whatsappShare';

export const Issues: React.FC = () => {
  const { lang, t } = useLanguage();
  const { profile } = useAuth();

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
    const q = query(collection(db, 'civic_issues'), orderBy('createdAt', 'desc'), limit(50));
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
        console.warn('Firestore issues sync warning, relying on local reports:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<CivicIssue | null>(null);

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.localityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          issue.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || issue.category === selectedCategory;
    const matchesStatus = selectedStatus === 'ALL' || issue.status === selectedStatus;
    return matchesSearch && matchesCat && matchesStatus;
  });

  const handleUpvote = (issueId: string) => {
    setIssues(prev => {
      const updated = prev.map(issue => {
        if (issue.id === issueId) {
          return { ...issue, upvotesCount: issue.upvotesCount + 1 };
        }
        return issue;
      });
      localStorage.setItem('VoiceOfGudalur_local_issues', JSON.stringify(updated));
      return updated;
    });
  };

  const getStatusBadge = (status: IssueStatus) => {
    switch (status) {
      case 'REPORTED':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">Reported</span>;
      case 'VERIFICATION':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">Verifying</span>;
      case 'ASSIGNED':
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">Assigned Dept</span>;
      case 'ACTION':
        return <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-200 animate-pulse">Action in Progress</span>;
      case 'RESOLVED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Resolved & Verified</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            {t('issues.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {t('issues.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
        >
          <Plus size={16} />
          <span>{t('issues.report_btn')}</span>
        </button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by issue title, tracking ID (e.g. GD-ISSUE-2026-1042), or locality..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {['ALL', 'roads', 'water', 'electricity', 'sanitation', 'wildlife', 'ghat_safety'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'ALL' ? 'All Categories' : cat.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Directory List */}
      {filteredIssues.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'ta' ? 'தற்போது புதிய புகார்கள் இல்லை' : 'No Open Civic Issues'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {lang === 'ta'
                ? 'உங்கள் பகுதியில் உள்ள குடிநீர், சாலை, மின்சாரம் அல்லது வனவிலங்கு தொடர்பான உண்மை பிரச்னைகளை முதல் நபராகப் பதிவு செய்யுங்கள்.'
                : 'All issues are verified from live citizen reports. Be the first to log a verified civic issue in your locality.'}
            </p>
          </div>
          <button
            onClick={() => setReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
          >
            <Plus size={16} />
            <span>{t('issues.report_btn')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {issue.id}
                    </span>
                    <p className="text-[11px] text-slate-400">Reported by {issue.reporterName} ({issue.reporterGudalurId})</p>
                  </div>
                  {getStatusBadge(issue.status)}
                </div>

                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {issue.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {issue.description}
                </p>

                {/* Department & Official Grievance Token */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Building2 size={12} /> Assigned:
                    </span>
                    <span className="font-semibold text-slate-800">{issue.assignedAuthority}</span>
                  </div>
                  {issue.officialGrievanceId && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Official Token:</span>
                      <span className="font-mono font-bold text-emerald-800">{issue.officialGrievanceId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-700 font-semibold">
                  <MapPin size={14} className="text-emerald-600" />
                  <span>{issue.localityName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const text = generateWhatsAppCivicIssueText({
                        id: issue.id,
                        title: issue.title,
                        localityName: issue.localityName,
                        category: issue.category,
                        status: issue.status,
                        assignedAuthority: issue.assignedAuthority,
                        officialGrievanceId: issue.officialGrievanceId
                      });
                      shareToWhatsApp(text);
                    }}
                    className="p-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] transition"
                    title="Share issue to WhatsApp"
                  >
                    <MessageCircle size={15} />
                  </button>

                  <button
                    onClick={() => handleUpvote(issue.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold transition"
                  >
                    <ThumbsUp size={13} />
                    <span>{issue.upvotesCount} Citizens Endorsed</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onIssueCreated={(newIssue) => setIssues(prev => [newIssue, ...prev])}
      />

    </div>
  );
};
export default Issues;
