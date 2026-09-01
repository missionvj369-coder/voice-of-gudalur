
import React, { useState, useEffect } from 'react';
import { 
  Book, Sparkles, Map, Leaf, Users, Shield, 
  ChevronRight, Search, Landmark, Coffee, Compass, BookOpen, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithGuideStream } from '../services/aiService';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const SECTIONS = [
  {
    id: 'nature',
    title: 'Flora & Fauna',
    icon: <Leaf className="text-emerald-500" />,
    description: 'Explore the biodiversity of Nilgiris, from wild elephants to shola forests.',
    color: 'bg-emerald-50'
  },
  {
    id: 'history',
    title: 'Town History',
    icon: <Landmark className="text-blue-500" />,
    description: 'Learn about Gudalur\s origins as a tri-junction and its colonial past.',
    color: 'bg-blue-50'
  },
  {
    id: 'culture',
    title: 'People & Culture',
    icon: <Users className="text-amber-500" />,
    description: 'The unique blend of Tamil, Malayalam, and tribal cultures.',
    color: 'bg-amber-50'
  },
  {
    id: 'spots',
    title: 'Hidden Gems',
    icon: <Compass className="text-amber-500" />,
    description: 'Spots beyond Needle Rock—peaceful trails and forest views.',
    color: 'bg-rose-50'
  },
  {
    id: 'kids',
    title: 'Hill Tales (Kids)',
    icon: <Sparkles className="text-purple-500" />,
    description: 'Fun forest facts and wildlife stories for our little guardians.',
    color: 'bg-purple-50'
  },
  {
    id: 'wisdom',
    title: 'Ancient Wisdom',
    icon: <Coffee className="text-amber-700" />,
    description: 'Traditional remedies and life wisdom from our elders.',
    color: 'bg-amber-100/50'
  }
];

const KnowledgeHub: React.FC = () => {
  const { lang, t } = useLanguage();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [explorerQuery, setExplorerQuery] = useState('');
  const [explorerResult, setExplorerResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dailyFact, setDailyFact] = useState('');
  const [dailyFactLoading, setDailyFactLoading] = useState(false);

  useEffect(() => {
    const fetchDailyFact = async () => {
      setDailyFactLoading(true);
      try {
        const stream = chatWithGuideStream(`Generate a surprising and educational 'Fact of the Day' about Gudalur's history, wildlife, or geography. The fact should be unique and formatted as a single, engaging paragraph. Focus on Nilgiris specific details.`, [], lang);
        let content = '';
        for await (const chunk of stream) {
          content += chunk;
          setDailyFact(content);
        }
      } catch (err) {
        setDailyFact('Did you know? Gudalur is often referred to as the "Gateway to the Nilgiris" because it connects three major South Indian states.');
      } finally {
        setDailyFactLoading(false);
      }
    };
    fetchDailyFact();
  }, [lang]);

  const handleExplore = async (topic?: string) => {
    const query = topic || explorerQuery;
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setExplorerResult('');
    try {
      const stream = chatWithGuideStream(`As the Voice of Gudalur Knowledge Hub, provide an educational and perfectly detailed overview (max 150 words) of this Gudalur-related topic using your search capabilities: ${query}`, [], lang);
      let content = '';
      for await (const chunk of stream) {
        content += chunk;
        setExplorerResult(content);
      }
    } catch (err) {
      toast.error('Gudalur Archives are currently unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="relative overflow-hidden rounded-[48px] bg-slate-900 p-12 text-white shadow-2xl shadow-emerald-900/20">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-emerald-400 backdrop-blur-xl">
            <BookOpen size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-serif italic font-bold tracking-tight">{t('kh.title')}</h1>
            <p className="max-w-xl text-slate-400 font-medium text-lg leading-relaxed">
              {t('kh.subtitle')}
            </p>
          </div>
        </div>
        <Sparkles className="absolute -bottom-16 -right-16 text-emerald-500/5" size={400} />
      </div>

      {/* Daily Heritage Discovery */}
      <div className="rounded-[40px] border border-emerald-100 bg-emerald-50/30 p-10 relative overflow-hidden group shadow-lg">
         <div className="relative z-10">
            <div className="mb-6 flex items-center gap-3">
               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <Landmark size={20} />
               </div>
               <h3 className="text-xl font-serif italic font-bold text-emerald-950">Daily Heritage Discovery</h3>
            </div>
            
            {dailyFactLoading && !dailyFact ? (
               <div className="h-20 animate-pulse bg-emerald-200/20 rounded-2xl w-full" />
            ) : (
               <p className="text-lg font-bold leading-relaxed text-emerald-900/80 font-serif italic max-w-4xl">
                 "{dailyFact}"
               </p>
            )}
            
            <div className="mt-8 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/50">
               Synced from Gudalur AI Archives <Clock size={12} />
            </div>
         </div>
         <Landmark className="absolute -bottom-24 -right-12 text-emerald-500/5" size={240} />
      </div>

      {/* Explorer Section */}
      <div className="rounded-[40px] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200">
        <div className="mb-8 flex items-center gap-6">
           <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-200">
             <Search size={28} />
           </div>
           <div>
             <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('kh.explore')}</h3>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live AI Archive • Deep Search</p>
           </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
           <input
             type="text"
             value={explorerQuery}
             onChange={e => setExplorerQuery(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && handleExplore()}
             placeholder={t('kh.search_placeholder')}
             className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-8 py-5 text-sm font-bold outline-none transition-all focus:border-slate-900 focus:bg-white"
           />
           <button
             onClick={() => handleExplore()}
             disabled={isLoading || !explorerQuery}
             className="rounded-2xl bg-slate-900 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
           >
             {isLoading ? 'Decrypting...' : 'Explore'}
           </button>
        </div>

        {explorerResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 rounded-[32px] bg-slate-50 p-10 text-lg font-bold leading-relaxed text-slate-700 shadow-inner border border-slate-200/60 font-serif italic"
          >
             <div className="mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
               <Sparkles size={16} /> Archive Insight Found
             </div>
             "{explorerResult}"
          </motion.div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => handleExplore(section.title)}
            className={cn(
              "group rounded-[32px] border border-slate-100 p-8 text-left transition-all hover:shadow-2xl hover:-translate-y-1",
              section.color
            )}
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm transition-all group-hover:scale-110 group-hover:shadow-lg">
              {section.icon}
            </div>
            <h4 className="mb-2 text-sm font-black uppercase tracking-widest text-slate-900">{section.title}</h4>
            <p className="text-xs font-bold text-slate-500 leading-relaxed mb-4">{section.description}</p>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               Deep Learn <ChevronRight size={12} />
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-slate-50 p-8 border border-slate-100">
         <h3 className="mb-6 text-lg font-black text-slate-900 flex items-center gap-2">
            <Compass size={20} className="text-slate-400" />
            Quick Facts
         </h3>
         <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Elevation</h5>
               <p className="font-bold text-slate-900">1,100 m (3,600 ft)</p>
            </div>
            <div className="space-y-2">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Economy</h5>
               <p className="font-bold text-slate-900">Tea, Spices, Forestry</p>
            </div>
            <div className="space-y-2">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Languages</h5>
               <p className="font-bold text-slate-900">Tamil, Malayalam, Kannada, Paniya</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default KnowledgeHub;
