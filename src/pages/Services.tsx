import React, { useState } from 'react';
import { 
  PhoneCall, 
  Search, 
  MapPin, 
  Clock, 
  ExternalLink, 
  ShieldCheck, 
  Building2, 
  HeartHandshake, 
  Car, 
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ServiceItem {
  id: string;
  name: string;
  nameTa: string;
  category: 'Healthcare' | 'Emergency' | 'Transport' | 'Agriculture' | 'Civic';
  phone: string;
  location: string;
  description: string;
  descriptionTa: string;
  timing: string;
}

const ESSENTIAL_SERVICES: ServiceItem[] = [
  {
    id: 'SRV-01',
    name: 'Gudalur Government Taluk Hospital (GH)',
    nameTa: 'கூடலூர் அரசு தலைமை தாலுகா மருத்துவமனை',
    category: 'Healthcare',
    phone: '04262-261224',
    location: 'Hospital Road, Gudalur Bazaar',
    description: '24/7 Emergency Casualty, Anti-Snake Venom, In-patient Wards, Maternity Care, and Ambulance Dispatch.',
    descriptionTa: '24 மணி நேர அவசர சிகிச்சை, பாம்புக்கடி மருந்து, மகப்பேறு சிகிச்சை மற்றும் அவசர ஊர்தி சேவை.',
    timing: '24x7 Emergency / 8:00 AM - 1:00 PM OP'
  },
  {
    id: 'SRV-02',
    name: 'ASHWINI Tribal Community Hospital (Gudalur Adivasi Hospital)',
    nameTa: 'அஸ்வினி ஆதிவாசி சமுதாய மருத்துவமனை',
    category: 'Healthcare',
    phone: '04262-261560',
    location: 'Chembala Road, Gudalur',
    description: 'Specialized healthcare & community outreach for Paniya, Kattunayakan, Kurumba, and Mullu Kurumba tribal communities.',
    descriptionTa: 'பழங்குடியின மக்களுக்கான சிறப்பு மருத்துவ சேவை மற்றும் சமுதாய சுகாதார மையம்.',
    timing: '8:30 AM - 5:00 PM'
  },
  {
    id: 'SRV-03',
    name: 'Gudalur Fire & Rescue Station',
    nameTa: 'கூடலூர் தீயணைப்பு மற்றும் மீட்புப் பணி நிலையம்',
    category: 'Emergency',
    phone: '101 / 04262-261299',
    location: 'Near Old Bus Stand, Gudalur',
    description: 'Fire suppression, forest fire control, tree fall clearance on ghat roads, and flood rescue operations.',
    descriptionTa: 'தீயணைப்பு, வனத்தீ கட்டுப்பாடு மற்றும் சாலை மர அகற்றும் அவசர மீட்புப் பணிகள்.',
    timing: '24x7 Emergency'
  },
  {
    id: 'SRV-04',
    name: 'INDCOSERVE Tea Cooperative Processing Unit',
    nameTa: 'இண்ட்கோசர்வ் தேயிலை உற்பத்தியாளர் கூட்டுறவு சங்கம்',
    category: 'Agriculture',
    phone: '04262-261340',
    location: 'Gudalur Tea Factory Complex',
    description: 'Fair-trade green leaf procurement, small tea grower member subsidies, and state-backed tea distribution.',
    descriptionTa: 'சிறு தேயிலை விவசாயிகளுக்கான நியாய விலை கொள்முதல் மற்றும் கூட்டுறவு சேவை.',
    timing: '9:00 AM - 5:00 PM'
  },
  {
    id: 'SRV-05',
    name: 'Gudalur Main Stand Auto & Taxi Association',
    nameTa: 'கூடலூர் மெயின் ஸ்டாண்ட் ஆட்டோ & டாக்சி சங்கம்',
    category: 'Transport',
    phone: '04262-261450',
    location: 'Opposite Gudalur Main Bus Stand',
    description: 'Local town trips, estate pickup, emergency midnight taxi transport to Sultan Bathery / Ooty hospitals.',
    descriptionTa: 'உள்ளூர் ஆட்டோ மற்றும் அவசர நள்ளிரவு டாக்சி சேவை.',
    timing: '24x7 (Stand Available)'
  },
  {
    id: 'SRV-06',
    name: 'TANGEDCO Gudalur Electrical Division (Minnal Helpline)',
    nameTa: 'தமிழ்நாடு மின்வாரியம் கூடலூர் கோட்டம்',
    category: 'Civic',
    phone: '94987 94987 / 04262-261230',
    location: 'Substation Road, Gudalur',
    description: 'Transformer repairs, high-tension wire maintenance, and emergency power restoration across 16 wards.',
    descriptionTa: 'மின் விநியோக சீரமைப்பு மற்றும் அவசர மின்வாரியப் புகார்கள்.',
    timing: '24x7 Toll-Free & Field Teams'
  }
];

export const Services: React.FC = () => {
  const { lang, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('ALL');

  const filteredServices = ESSENTIAL_SERVICES.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.nameTa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          srv.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCat === 'ALL' || srv.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <PhoneCall size={14} />
          <span>VERIFIED COMMUNITY LIFELINE DIRECTORY</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          {t('services.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          {t('services.subtitle')}
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search essential hospital, emergency, police, transport or agriculture service..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {['ALL', 'Healthcare', 'Emergency', 'Transport', 'Agriculture', 'Civic'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCat === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat === 'ALL' ? 'All Lifelines' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredServices.map((srv) => (
          <div
            key={srv.id}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {srv.category}
                </span>
                <span className="text-emerald-700 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 size={12} /> VERIFIED
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {lang === 'ta' ? srv.nameTa : srv.name}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ta' ? srv.descriptionTa : srv.description}
              </p>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{srv.location}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span>{srv.timing}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <a
                href={`tel:${srv.phone.split(' ')[0].replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition"
              >
                <PhoneCall size={14} className="text-emerald-400" />
                <span>Call {srv.phone}</span>
              </a>

              <span className="text-xs text-slate-400 font-medium">Gudalur Taluk</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
export default Services;
