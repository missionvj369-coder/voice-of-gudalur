import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Share2, 
  ExternalLink, 
  Building2, 
  ShieldCheck, 
  Lock, 
  Plus, 
  Sparkles, 
  MapPin, 
  Clock, 
  ChevronRight,
  Download,
  Flame,
  Award,
  MessageCircle,
  Printer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Petition, SupporterInfo } from '../types';
import { CITIZEN_PETITIONS } from '../data/gudalurMasterData';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, increment, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RegisterResidentModal } from '../components/Auth/RegisterResidentModal';
import { generatePetitionPDF } from '../utils/pdfGenerator';
import { generateWhatsAppPetitionText, shareToWhatsApp, shareViaWebShare } from '../utils/whatsappShare';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';

export const Petitions: React.FC = () => {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();

  const [petitions, setPetitions] = useState<Petition[]>(CITIZEN_PETITIONS);
  const [selectedPetition, setSelectedPetition] = useState<Petition>(CITIZEN_PETITIONS[0]);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  // Synchronize live petitions from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'petitions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Petition[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push({ ...docSnap.data(), id: docSnap.id } as Petition);
          });
          setPetitions(loaded);
          const current = loaded.find((p) => p.id === selectedPetition.id) || loaded[0];
          if (current) setSelectedPetition(current);
        } else {
          // Initialize master citizen demands into Firestore if empty
          CITIZEN_PETITIONS.forEach(async (pet) => {
            try {
              await setDoc(doc(db, 'petitions', pet.id), pet);
            } catch (e) {
              console.warn('Seed petition error:', e);
            }
          });
        }
      },
      (error) => {
        console.warn('Firestore petitions sync notice:', error);
      }
    );

    return () => unsubscribe();
  }, [selectedPetition.id]);

  const hasUserSupported = (petition: Petition): boolean => {
    if (!profile) return false;
    return petition.supporters?.some((s) => s.uid === profile.uid || s.gudalurId === profile.gudalurId);
  };

  const handleSupportPetition = async (petition: Petition) => {
    if (!profile) {
      toast.error(
        lang === 'ta'
          ? 'கோரிக்கைக்கு ஆதரவளிக்க குடிமக்கள் பதிவு / உள்நுழைவு கட்டாயம்!'
          : 'Please complete Resident Registration to support official petitions!'
      );
      setIsRegisterModalOpen(true);
      return;
    }

    if (hasUserSupported(petition)) {
      toast(lang === 'ta' ? 'நீங்கள் ஏற்கனவே ஆதரவளித்துள்ளீர்கள்!' : 'You have already signed this demand!');
      return;
    }

    setSigning(true);

    const newSupporter: SupporterInfo = {
      uid: profile.uid,
      name: profile.name,
      localityName: profile.localityName,
      pincode: profile.pincode || '643211',
      gudalurId: profile.gudalurId,
      signedAt: Date.now()
    };

    try {
      // 1. Update Firestore
      const petitionRef = doc(db, 'petitions', petition.id);
      await updateDoc(petitionRef, {
        supportCount: increment(1),
        supporters: arrayUnion(newSupporter)
      });

      // 2. Update local state
      const updatedPetitions = petitions.map((p) => {
        if (p.id === petition.id) {
          const updatedSupporters = [newSupporter, ...(p.supporters || [])];
          return {
            ...p,
            supportCount: (p.supportCount || 0) + 1,
            supporters: updatedSupporters
          };
        }
        return p;
      });

      setPetitions(updatedPetitions);
      const updatedSelected = updatedPetitions.find((p) => p.id === petition.id);
      if (updatedSelected) setSelectedPetition(updatedSelected);

      toast.success(
        lang === 'ta'
          ? 'உங்கள் குரல் பதிவு செய்யப்பட்டது! கூடலூர் குடிமக்கள் ஆதரவுக்கு நன்றி.'
          : 'Your signature has been officially registered!'
      );
    } catch (err) {
      console.error('Error signing petition:', err);
      // Fallback local support update
      const updatedPetitions = petitions.map((p) => {
        if (p.id === petition.id) {
          const updatedSupporters = [newSupporter, ...(p.supporters || [])];
          return {
            ...p,
            supportCount: (p.supportCount || 0) + 1,
            supporters: updatedSupporters
          };
        }
        return p;
      });
      setPetitions(updatedPetitions);
      const updatedSelected = updatedPetitions.find((p) => p.id === petition.id);
      if (updatedSelected) setSelectedPetition(updatedSelected);
      toast.success(lang === 'ta' ? 'ஆதரவு பதிவு செய்யப்பட்டது!' : 'Signature added!');
    } finally {
      setSigning(false);
    }
  };

  const handleWhatsAppBroadcast = (petition: Petition) => {
    const text = generateWhatsAppPetitionText({
      title: petition.title,
      titleTa: petition.titleTa,
      targetAuthority: petition.targetAuthority,
      evidenceSummary: petition.evidenceSummary,
      supportCount: petition.supportCount,
      petitionId: petition.id
    });
    shareToWhatsApp(text);
  };

  const handleDownloadPDF = (petition: Petition) => {
    try {
      generatePetitionPDF(petition);
      toast.success(
        lang === 'ta'
          ? 'அதிகாரப்பூர்வ மனு கடிதம் PDF தரவிறக்கம் செய்யப்பட்டது!'
          : 'Official Representation Letter PDF downloaded!'
      );
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    }
  };

  const handleShare = async (petition: Petition) => {
    const text = generateWhatsAppPetitionText({
      title: petition.title,
      titleTa: petition.titleTa,
      targetAuthority: petition.targetAuthority,
      evidenceSummary: petition.evidenceSummary,
      supportCount: petition.supportCount,
      petitionId: petition.id
    });
    const shared = await shareViaWebShare(`OneGudalur Demand: ${petition.title}`, text);
    if (!shared) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(lang === 'ta' ? 'இணைப்பு நகலெடுக்கப்பட்டது!' : 'Petition link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <ShieldCheck size={14} />
            <span>{lang === 'ta' ? 'கூடலூருக்காக ஒன்றிணைவோம் • நேரடி குடிமக்கள் குரல்' : 'Act For Gudalur • Lawful Civic Demands'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {lang === 'ta' ? 'கூடலூர் மக்களின் அதிகாரப்பூர்வ கோரிக்கைகள்' : 'Unified Demands & Public Representations'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {lang === 'ta'
              ? 'உரிமைகள், வனவிலங்கு பாதுகாப்பு மற்றும் அரசு மருத்துவமனைக்கான மக்கள் கோரிக்கைகளுக்கு நேரடி ஆதரவு அளியுங்கள். பதிவு செய்யப்பட்ட குடிமக்கள் மட்டுமே வாக்களிக்க முடியும்.'
              : 'Sign and amplify collective representations submitted to the District Administration, Forest Department, and Tamil Nadu Government.'}
          </p>
        </div>

        {/* Resident Action Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${profile ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
              {profile ? <Award size={24} /> : <Lock size={24} />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                {profile
                  ? (lang === 'ta' ? `சரிபார்க்கப்பட்ட குடிமகன்: ${profile.name}` : `Verified Resident: ${profile.name}`)
                  : (lang === 'ta' ? 'பதிவு செய்யப்படாத பார்வையாளர்' : 'Unregistered Resident')}
              </p>
              <p className="text-[11px] text-slate-500">
                {profile
                  ? `${profile.gudalurId} • ${profile.localityName} (${profile.pincode})`
                  : (lang === 'ta' ? 'ஆதரவளிக்க குடிமக்கள் அட்டை தேவை' : 'Citizen Card required to sign petitions')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition self-start sm:self-auto"
          >
            {profile ? (lang === 'ta' ? 'எனது அட்டை விவரம்' : 'My Citizen Card') : (lang === 'ta' ? 'இப்போதே பதிவு செய் →' : 'Register Now →')}
          </button>
        </div>
      </div>

      {/* 2. PETITION SELECTION TABS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {petitions.map((pet) => {
          const isSelected = selectedPetition.id === pet.id;
          const isSigned = hasUserSupported(pet);

          return (
            <div
              key={pet.id}
              onClick={() => setSelectedPetition(pet)}
              className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                    {pet.status.replace(/_/g, ' ')}
                  </span>
                  {isSigned && (
                    <span className="flex items-center gap-1 text-emerald-700 text-[10px] font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} />
                      <span>{lang === 'ta' ? 'ஆதரவளித்தீர்' : 'Signed'}</span>
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {lang === 'ta' ? pet.titleTa : pet.title}
                </h3>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Users size={14} className="text-emerald-700" />
                  <span>{pet.supportCount.toLocaleString()} {lang === 'ta' ? 'குடிமக்கள்' : 'Supporters'}</span>
                </span>
                <span className="text-emerald-700 font-bold text-[11px] flex items-center">
                  {lang === 'ta' ? 'விவரம் பார்க்க' : 'View Demand'} <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. SELECTED PETITION DETAILED VIEW */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        
        {/* Title & Authority Meta */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {selectedPetition.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck size={13} />
                <span>{lang === 'ta' ? 'நேரடி மக்கள் கோரிக்கை' : 'Verified Citizen Representation'}</span>
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 tracking-tight">
              {lang === 'ta' ? selectedPetition.titleTa : selectedPetition.title}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Building2 size={14} className="text-emerald-700" />
                <span>{lang === 'ta' ? (selectedPetition.targetAuthorityTa || selectedPetition.targetAuthority) : selectedPetition.targetAuthority}</span>
              </span>
              <span>•</span>
              <span>{lang === 'ta' ? 'துவக்கியவர்:' : 'Submitted by:'} {selectedPetition.createdByName}</span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => handleSupportPetition(selectedPetition)}
              disabled={signing || hasUserSupported(selectedPetition)}
              className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md ${
                hasUserSupported(selectedPetition)
                  ? 'bg-emerald-100 text-emerald-800 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
              }`}
            >
              <CheckCircle2 size={18} />
              <span>
                {hasUserSupported(selectedPetition)
                  ? (lang === 'ta' ? 'ஆதரவு அளிக்கப்பட்டது' : 'You Signed This Demand')
                  : (lang === 'ta' ? 'ஆதரவளிக்கவும்' : 'Sign & Support')}
              </span>
            </button>

            {/* Official PDF Download Button */}
            <button
              onClick={() => handleDownloadPDF(selectedPetition)}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl transition flex items-center gap-2 text-xs font-bold shadow-xs"
              title={lang === 'ta' ? 'அதிகாரப்பூர்வ மனு கடிதம் PDF தரவிறக்கம்' : 'Download Official Representation Letter (PDF)'}
            >
              <Download size={16} />
              <span className="hidden sm:inline">{lang === 'ta' ? 'மனு PDF' : 'Official PDF'}</span>
            </button>

            {/* WhatsApp Community Share Button */}
            <button
              onClick={() => handleWhatsAppBroadcast(selectedPetition)}
              className="px-4 py-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-2xl transition flex items-center gap-2 text-xs font-bold shadow-xs"
              title="Share on WhatsApp Community"
            >
              <MessageCircle size={16} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={() => handleShare(selectedPetition)}
              className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition"
              title="Share Petition"
            >
              <Share2 size={17} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          
          {/* Main Demand Text (8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* The Concrete Problem */}
            <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} />
                <span>{lang === 'ta' ? 'பிரச்சனையின் தீவிரம் (The Crisis)' : 'Ground Reality & Public Crisis'}</span>
              </h4>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                {lang === 'ta' ? selectedPetition.problemTa : selectedPetition.problem}
              </p>
            </div>

            {/* Official Citizen Demands */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-serif mb-3">
                {lang === 'ta' ? 'அரசிடம் முன்வைக்கப்படும் குறிப்பிட்ட கோரிக்கைகள்:' : 'Specific Policy Actions Demanded from the Government:'}
              </h4>
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {lang === 'ta' ? selectedPetition.demandTa : selectedPetition.demand}
              </div>
            </div>

            {/* Evidence & Ground Data */}
            <div className="p-5 rounded-2xl bg-slate-100/70 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 block uppercase mb-1">
                {lang === 'ta' ? 'ஆதாரங்கள் & புள்ளிவிவரங்கள்' : 'Evidence Base & Ground Documentation'}
              </span>
              <p className="text-xs text-slate-700">
                {lang === 'ta' ? (selectedPetition.evidenceSummaryTa || selectedPetition.evidenceSummary) : selectedPetition.evidenceSummary}
              </p>
            </div>

            {/* Official Government Response (if any) */}
            {selectedPetition.officialResponse && (
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1 text-blue-900 font-bold text-xs">
                  <Building2 size={16} />
                  <span>{lang === 'ta' ? 'அரசின் அதிகாரப்பூர்வ பதில்' : 'Official Government Response'}</span>
                  <span className="text-[10px] text-blue-600">
                    ({new Date(selectedPetition.officialResponse.responseDate).toLocaleDateString()})
                  </span>
                </div>
                <p className="text-xs text-blue-950 font-medium">
                  {selectedPetition.officialResponse.text}
                </p>
              </div>
            )}

          </div>

          {/* Supporters & Live Signatures Feed (4 COLS) */}
          <div className="lg:col-span-4 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col h-[520px]">
            
            <div className="pb-3 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-700" />
                  <span>{lang === 'ta' ? 'நேரடி ஆதரவாளர்கள் பட்டியல்' : 'Live Supporter Signatures'}</span>
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  {selectedPetition.supportCount.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'ta'
                  ? 'பெயர், ஊர் மற்றும் அஞ்சல் குறியீட்டுடன் கூடிய பதிவு'
                  : 'Displaying verified resident name & locality'}
              </p>
            </div>

            {/* Supporters Scroll List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
              {selectedPetition.supporters && selectedPetition.supporters.length > 0 ? (
                selectedPetition.supporters.map((sup, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{sup.name}</span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                        {sup.gudalurId || 'GD-CITIZEN'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" />
                        <span>{sup.localityName}</span>
                      </span>
                      <span className="font-mono text-slate-400">{sup.pincode}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-center p-4 text-xs text-slate-400">
                  {lang === 'ta' ? 'இக்கோரிக்கைக்கு முதல் ஆதரவாளராக இருங்கள்!' : 'Be the first registered citizen to sign this demand!'}
                </div>
              )}
            </div>

            {/* Footer Notice */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center">
              {lang === 'ta'
                ? '🔒 குடிமக்கள் தரவு பாதுகாப்பானது • மாவட்ட ஆட்சியருக்கு சமர்ப்பிக்கப்படும்'
                : '🔒 Authenticated with Gudalur Citizen Identity Protocol'}
            </div>

          </div>

        </div>

      </div>

      {/* Modal */}
      <RegisterResidentModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => {
          handleSupportPetition(selectedPetition);
        }}
      />

    </div>
  );
};

export default Petitions;

