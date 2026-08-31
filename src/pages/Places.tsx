import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Users, 
  AlertTriangle, 
  CheckSquare, 
  Phone, 
  MessageCircle, 
  ShieldCheck, 
  ChevronRight,
  Filter,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_LOCALITIES, ADMINISTRATIVE_AREAS } from '../data/gudalurMasterData';
import { Locality } from '../types';
import { LocalityMap } from '../components/Map/LocalityMap';
import { ReportIssueModal } from '../components/ReportIssueModal';
import { GudalurIdModal } from '../components/GudalurIdModal';

export const Places: React.FC = () => {
  const { profile, updateLocality } = useAuth();
  const { lang, t } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedLocality, setSelectedLocality] = useState<Locality>(GUDALUR_LOCALITIES[0]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);

  const filteredLocalities = GUDALUR_LOCALITIES.filter(loc => {
    const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          loc.nameTa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          loc.alternativeNames.some(alt => alt.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArea = selectedArea === 'ALL' || loc.administrativeParent.includes(selectedArea);
    return matchesSearch && matchesArea;
  });

  const handleJoinLocality = (loc: Locality) => {
    if (profile) {
      updateLocality(loc.id);
    } else {
      setIdModalOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            {t('places.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {t('places.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
          >
            <Plus size={16} />
            <span>Report Locality Issue</span>
          </button>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin size={14} className="text-emerald-600" />
            <span>Interactive Locality Geographic Grid ({GUDALUR_LOCALITIES.length} Nodes)</span>
          </span>
          <span className="text-[11px] text-slate-500">Click any pin to inspect locality</span>
        </div>
        <LocalityMap
          localities={filteredLocalities}
          selectedLocalityId={selectedLocality.id}
          onSelectLocality={setSelectedLocality}
          height="340px"
        />
      </div>

      {/* Search & Area Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('places.search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedArea('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedArea === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Localities ({GUDALUR_LOCALITIES.length})
          </button>
          <button
            onClick={() => setSelectedArea('Municipality')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedArea === 'Municipality'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Gudalur Municipality
          </button>
          <button
            onClick={() => setSelectedArea('Panchayat')}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedArea === 'Panchayat'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Town Panchayats (Devala / O'Valley)
          </button>
        </div>
      </div>

      {/* Localities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLocalities.map((loc) => {
          const isUserLocality = profile?.localityId === loc.id;
          return (
            <div
              key={loc.id}
              className={`rounded-3xl bg-white border p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                isUserLocality ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {loc.administrativeParent} • Ward {loc.wardNumber || 'General'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">{loc.name}</h3>
                    <p className="text-xs text-emerald-700 font-semibold">{loc.nameTa}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    loc.alertStatus === 'ALERT' ? 'bg-amber-100 text-amber-800' :
                    loc.alertStatus === 'CAUTION' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {loc.alertStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-3">
                  {lang === 'ta' ? loc.descriptionTa : loc.description}
                </p>

                {/* Geographic & Administrative Details */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Revenue Village:</span>
                    <span className="font-semibold text-slate-800">{loc.revenueVillage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Administrative Unit:</span>
                    <span className="font-semibold text-slate-800">{loc.administrativeParent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">PIN Code:</span>
                    <span className="font-mono font-bold text-slate-800">{loc.pincode}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => handleJoinLocality(loc)}
                  className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    isUserLocality
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  <ShieldCheck size={14} />
                  <span>{isUserLocality ? 'My Home Locality' : t('places.join_locality')}</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedLocality(loc);
                    setReportModalOpen(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                  title="Report issue in this locality"
                >
                  <CheckSquare size={14} />
                </button>

                {loc.whatsAppGroupLink && (
                  <a
                    href={loc.whatsAppGroupLink}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs transition"
                    title="Locality WhatsApp Community"
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ReportIssueModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        defaultLocalityId={selectedLocality.id}
      />
      <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />

    </div>
  );
};
export default Places;
