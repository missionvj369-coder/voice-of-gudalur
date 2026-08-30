import React, { useState } from 'react';
import { Bus, Search, Clock, MapPin, AlertCircle, Moon, Compass, DollarSign, Filter, MessageCircle, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { BUS_ROUTES } from '../data/gudalurMasterData';
import { BusRoute } from '../types';
import { generateWhatsAppBusText, shareToWhatsApp, shareViaWebShare } from '../utils/whatsappShare';
import toast from 'react-hot-toast';

export const BusTimings: React.FC = () => {
  const { lang, t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filteredRoutes = BUS_ROUTES.filter(route => {
    const matchesSearch = route.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.routeNameTa.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          route.via.some(v => v.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'ALL' || route.type.toLowerCase().includes(selectedType.toLowerCase());
    return matchesSearch && matchesType;
  });

  const handleShareBus = (route: BusRoute) => {
    const text = generateWhatsAppBusText({
      routeNumber: route.routeNumber,
      routeName: route.routeName,
      routeNameTa: route.routeNameTa,
      from: route.from,
      to: route.to,
      via: route.via,
      timings: route.timings,
      fareEstimate: route.fareEstimate
    });
    shareToWhatsApp(text);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
            <Bus size={14} />
            <span>GHAT & INTERSTATE TIMETABLE NETWORK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
            {t('bus.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            {t('bus.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-2xl border border-emerald-200 self-start sm:self-auto">
          <ShieldCheck size={16} className="text-emerald-600" />
          <span>{lang === 'ta' ? 'அதிகாரப்பூர்வ TNSTC / KSRTC நேர அட்டவணை' : 'Verified TNSTC & KSRTC Schedules'}</span>
        </div>
      </div>

      {/* Mudumalai Night Closure Alert Banner */}
      <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
        <Moon size={22} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-amber-900">Mudumalai & Bandipur Night Road Closure (9:00 PM – 6:00 AM)</p>
          <p className="text-amber-800 leading-relaxed">
            All public buses and private vehicles to Mysore/Bengaluru via Theppakadu are strictly regulated. The last daytime departure from Gudalur Bus Stand towards Mysore is at 5:30 PM.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by destination or intermediate stop (e.g. Ooty, Calicut, Naduvattam, Bathery, Chembala)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {['ALL', 'Ghat', 'Interstate', 'Town Regular', 'Express'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
                selectedType === type
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type === 'ALL' ? 'All Routes' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Bus Routes List */}
      <div className="space-y-5">
        {filteredRoutes.map((route) => (
          <div
            key={route.id}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {route.routeNumber}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {route.type}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 pt-1">
                  {lang === 'ta' ? route.routeNameTa : route.routeName}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-slate-400">Est. Fare:</span>
                  <span className="font-bold text-slate-900 ml-1.5 font-mono">{route.fareEstimate}</span>
                </div>

                <button
                  onClick={() => handleShareBus(route)}
                  className="px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-xs flex items-center gap-1.5 transition"
                  title="Share schedule to WhatsApp"
                >
                  <MessageCircle size={14} />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Stops Corridor */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <MapPin size={13} className="text-emerald-600 shrink-0" />
                <span>{route.from} ➔ {route.to}</span>
              </div>
              <p className="text-slate-500 pl-4">
                <strong>Via Stops:</strong> {route.via.join(' • ')}
              </p>
            </div>

            {/* Timetable Departures */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Daily Departures from Gudalur Bus Stand ({route.frequency}):</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {route.timings.map((time, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-xs font-bold bg-slate-100 hover:bg-emerald-50 text-slate-800 px-2.5 py-1 rounded-xl border border-slate-200"
                  >
                    {time}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
export default BusTimings;
