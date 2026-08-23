import React, { useState } from 'react';
import { 
  Building2, 
  ExternalLink, 
  Phone, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  FileText, 
  Search, 
  ShieldCheck, 
  ChevronRight,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GOVERNMENT_CHANNELS } from '../data/gudalurMasterData';
import { GovernmentChannel } from '../types';

export const GovtChannels: React.FC = () => {
  const { lang } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<GovernmentChannel | null>(null);

  const filteredChannels = GOVERNMENT_CHANNELS.filter((ch) => {
    const term = searchQuery.toLowerCase();
    return (
      ch.authorityName.toLowerCase().includes(term) ||
      ch.authorityNameTa.toLowerCase().includes(term) ||
      ch.category.toLowerCase().includes(term) ||
      ch.helpline.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      
      {/* 1. HERO HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold mb-3">
            <Building2 size={14} />
            <span>{lang === 'ta' ? 'அரசு துறை குறைதீர்ப்பு தளங்கள்' : 'Official Government Portals & Grievances'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {lang === 'ta' ? 'நேரடி அரசு இணைப்புகள் & அவசர உதவி எண்கள்' : 'Verified Government Portals & Emergency Desks'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {lang === 'ta'
              ? 'தமிழ்நாடு அரசு மற்றும் மாவட்ட நிர்வாகத்தின் அதிகாரப்பூர்வ குறைதீர்ப்பு தளங்கள். உண்மையான இணைப்புகள், 24x7 அவசர தொலைபேசி எண்கள் மற்றும் மனு தாக்கல் முறைகள்.'
              : 'Direct links and 24x7 toll-free contact numbers for the Tamil Nadu Chief Minister Helpline (1100), TANGEDCO Minnal, Forest Department Rapid Response Team, and District Collectorate.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-6 relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ta' ? 'அரசு துறை, மின்சாரம், வனத்துறை தேடவும்...' : 'Search by department, electricity, forest, collectorate...'}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 focus:border-blue-600 focus:bg-white text-sm outline-none transition shadow-2xs"
          />
        </div>
      </div>

      {/* 2. CHANNELS DIRECTORY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredChannels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200 flex flex-col justify-between hover:shadow-md transition"
          >
            <div>
              
              {/* Category & Status */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold">
                  {channel.category}
                </span>
                <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 size={13} />
                  <span>{lang === 'ta' ? 'சரிபார்க்கப்பட்டது' : 'Verified Official'}</span>
                </span>
              </div>

              {/* Authority Name */}
              <h3 className="text-base sm:text-lg font-bold font-serif text-slate-900">
                {lang === 'ta' ? channel.authorityNameTa : channel.authorityName}
              </h3>

              {/* Description */}
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {lang === 'ta' ? channel.descriptionTa : channel.description}
              </p>

              {/* Detailed Channels Info */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5 text-xs">
                
                {/* Helpline */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                    <Phone size={14} className="text-blue-600" />
                    <span>{lang === 'ta' ? 'உதவி எண்:' : 'Helpline:'}</span>
                  </span>
                  <a
                    href={`tel:${channel.helpline.split(' ')[0]}`}
                    className="font-bold text-blue-700 hover:underline font-mono"
                  >
                    {channel.helpline}
                  </a>
                </div>

                {/* Workflow / SLA */}
                <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-emerald-950">
                  <span className="font-bold block mb-0.5">{lang === 'ta' ? 'தீர்வு செயல்முறை:' : 'Workflow & Tracking:'}</span>
                  <p className="text-[11px] text-emerald-800">{channel.trackingMechanism}</p>
                </div>

              </div>

            </div>

            {/* CTA Button */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                {channel.address}
              </span>
              <a
                href={channel.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <span>{lang === 'ta' ? 'தளத்திற்கு செல்' : 'Visit Official Portal'}</span>
                <ExternalLink size={13} />
              </a>
            </div>

          </div>
        ))}
      </div>

      {/* 3. GRIEVANCE FILING ADVISORY */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-600 text-white rounded-2xl">
            <HelpCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold font-serif">
              {lang === 'ta' ? 'மனு தாக்கல் செய்யும் போது கவனிக்க வேண்டியவை' : 'Resident Guide for Faster Grievance Resolution'}
            </h3>
            <p className="text-xs text-slate-300">
              {lang === 'ta' ? 'உங்கள் மனு மீது விரைந்து நடவடிக்கை எடுக்க கீழ்க்கண்ட முறைகளை பின்பற்றவும்' : 'Follow these key points to ensure strict timebound action by officials'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 text-xs text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700">
            <span className="font-bold text-amber-400 block mb-1">1. {lang === 'ta' ? 'மனு எண் (Token ID)' : 'Save Token Number'}</span>
            <p>{lang === 'ta' ? 'மனு பதிவு செய்தவுடன் SMS மூலம் வரும் 14 இலக்க பதிவு எண்ணை பத்திரமாக குறித்து வைத்துக் கொள்ளவும்.' : 'Always retain the 14-digit token received via SMS for tracking and collectorate escalation.'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700">
            <span className="font-bold text-amber-400 block mb-1">2. {lang === 'ta' ? '14 நாட்கள் வரம்பு' : '14-Day Mandatory SLA'}</span>
            <p>{lang === 'ta' ? 'முதல்வரின் முகவரி மனுக்களுக்கு 14 நாட்களுக்குள் வட்டாட்சியர் அல்லது பிடிஓ பதில் அளிப்பது கட்டாயம்.' : 'Under Mudhalvarin Mugavari, officials must resolve or report status within 14 business days.'}</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700">
            <span className="font-bold text-amber-400 block mb-1">3. {lang === 'ta' ? 'அவசர நிலை' : 'Emergency Situations'}</span>
            <p>{lang === 'ta' ? 'வனவிலங்கு அல்லது மின்கம்பி ஆபத்துகளுக்கு இணையதளத்தில் மனு போடுவதற்கு முன் உதவி எண்ணை (1800 425 6100 / 94987 94987) அழைக்கவும்.' : 'For wildlife attacks or snapped power lines, dial the emergency hotline before online filing.'}</p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default GovtChannels;

