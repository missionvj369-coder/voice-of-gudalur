import React, { useState } from 'react';
import { 
  MapPin, 
  Users, 
  AlertTriangle, 
  Compass, 
  Search, 
  Building2, 
  ExternalLink, 
  CheckCircle2, 
  Phone, 
  ChevronRight, 
  ShieldAlert,
  Layers,
  Map as MapIcon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { GUDALUR_LOCALITIES, ADMINISTRATIVE_AREAS } from '../data/gudalurMasterData';
import { Locality } from '../types';
import { RegisterResidentModal } from '../components/Auth/RegisterResidentModal';
import toast from 'react-hot-toast';

export const Localities: React.FC = () => {
  const { lang } = useLanguage();
  const { profile, updateLocality } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedLocality, setSelectedLocality] = useState<Locality | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const zones = [
    { id: 'ALL', labelEn: 'All Areas (அனைத்தும்)', labelTa: 'அனைத்து பகுதிகள்' },
    { id: 'CENTRAL_TOWN', labelEn: 'Central Town & Kasimvayal', labelTa: 'நகர மையம் & காசிம்வயல்' },
    { id: 'SOUTH_OVALLEY_RIDGE', labelEn: 'O\'Valley & Naduvattam', labelTa: 'ஓ\'வேலி & நடுவட்டம்' },
    { id: 'NORTH_BANDIPUR', labelEn: 'Thorapalli & Mudumalai Gate', labelTa: 'தோரப்பள்ளி & முதுமலை' },
    { id: 'EAST_MUDUMALAI', labelEn: 'Masinagudi & Moyar', labelTa: 'மசினகுடி & மாயாறு' },
    { id: 'WEST_WAYANAD_NILAMBUR', labelEn: 'Pattavayal, Nadugani & Devala', labelTa: 'பட்டவயல், நாடுகாணி & தேவாலா' }
  ];

  const filteredLocalities = GUDALUR_LOCALITIES.filter((loc) => {
    const matchesZone = selectedZone === 'ALL' || loc.borderZone === selectedZone;
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      loc.name.toLowerCase().includes(term) ||
      loc.nameTa.toLowerCase().includes(term) ||
      loc.pincode.includes(term) ||
      loc.administrativeParent.toLowerCase().includes(term) ||
      loc.landmarks.some((lm) => lm.toLowerCase().includes(term));

    return matchesZone && matchesSearch;
  });

  const handleSetPrimaryLocality = async (loc: Locality) => {
    if (!profile) {
      setIsRegisterModalOpen(true);
      return;
    }
    await updateLocality(loc.id, undefined, loc.pincode);
    toast.success(
      lang === 'ta'
        ? `உங்கள் முதன்மை பகுதியாக ${loc.nameTa} தேர்ந்தெடுக்கப்பட்டது!`
        : `Primary area set to ${loc.name}!`
    );
  };

  return (
    <div className="space-y-8">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <Compass size={14} />
            <span>{lang === 'ta' ? 'கூடலூர் எல்லைகள் & பகுதிகள்' : 'Complete Gudalur Border & Localities Atlas'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {lang === 'ta' ? 'ஓ\'வேலி முதல் மசினகுடி வரை • அனைத்து கிராமங்கள்' : 'From O\'Valley to Masinagudi • All Hamlets & Borders'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {lang === 'ta'
              ? 'கூடலூரின் அனைத்து எல்லைப் பகுதிகள்: கேரளா வயநாடு எல்லை (பட்டவயல், சேரம்பாடி), மலப்புரம் சுரம் (நாடுகாணி), கர்நாடகா எல்லை (கக்கநல்லா), சோலை முகடு (ஓ\'வேலி) மற்றும் கிழக்கு எல்லை (மசினகுடி).'
              : 'Detailed geographic mapping of all administrative taluks, municipalities, and forest border zones across the Nilgiris western slopes.'}
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ta' ? 'ஊர் பெயர், அஞ்சல் குறியீடு (Pincode) தேடவும்...' : 'Search locality, village, landmark, pincode...'}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 focus:border-emerald-600 focus:bg-white text-sm outline-none transition"
            />
          </div>
        </div>

        {/* Border Zone Filter Pills */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedZone === z.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lang === 'ta' ? z.labelTa : z.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* 2. ADMINISTRATIVE BORDER OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ADMINISTRATIVE_AREAS.map((admin) => (
          <div
            key={admin.id}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold">
                  {admin.type}
                </span>
                {admin.wardsCount && (
                  <span className="text-[10px] text-slate-500 font-bold">
                    {admin.wardsCount} Wards
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {lang === 'ta' ? admin.nameTa : admin.name}
              </h3>
              {admin.borderDescription && (
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {admin.borderDescription}
                </p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>HQ: {admin.headquarters}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. LOCALITIES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLocalities.map((loc) => {
          const isUserArea = profile?.localityId === loc.id;
          const isAlert = loc.alertStatus === 'ALERT';

          return (
            <div
              key={loc.id}
              className={`bg-white rounded-3xl p-6 border shadow-xs flex flex-col justify-between transition hover:shadow-md ${
                isUserArea
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20'
                  : isAlert
                  ? 'border-red-300 bg-red-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div>
                
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                    PIN: {loc.pincode}
                  </span>
                  
                  {isAlert ? (
                    <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <ShieldAlert size={12} />
                      <span>{lang === 'ta' ? 'தீவிர எச்சரிக்கை' : 'Active Wildlife Alert'}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <CheckCircle2 size={12} />
                      <span>{loc.verificationStatus === 'VERIFIED_OFFICIAL' ? 'Verified' : 'Community'}</span>
                    </span>
                  )}
                </div>

                {/* Locality Title */}
                <h3 className="text-base font-bold font-serif text-slate-900">
                  {lang === 'ta' ? loc.nameTa : loc.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {loc.administrativeParent}
                </p>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                  {lang === 'ta' ? loc.descriptionTa : loc.description}
                </p>

                {/* Key Landmarks */}
                {loc.landmarks && loc.landmarks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {loc.landmarks.slice(0, 3).map((lm, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {lm}
                      </span>
                    ))}
                  </div>
                )}

              </div>

              {/* Footer CTA & Coordinator */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <div>
                  {loc.coordinatorPhone ? (
                    <a
                      href={`tel:${loc.coordinatorPhone}`}
                      className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Phone size={12} className="text-emerald-600" />
                      <span>{loc.coordinatorName || 'Coordinator Desk'}</span>
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">Gudalur Taluk Network</span>
                  )}
                </div>

                <button
                  onClick={() => handleSetPrimaryLocality(loc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    isUserArea
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isUserArea ? (lang === 'ta' ? 'உங்கள் பகுதி ✓' : 'Your Area ✓') : (lang === 'ta' ? 'என் பகுதி' : 'Set as My Area')}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal */}
      <RegisterResidentModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

    </div>
  );
};

export default Localities;

