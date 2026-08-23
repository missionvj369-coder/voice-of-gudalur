
import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MarketPrice, CommunityPost } from '../types';
import { TrendingUp, TrendingDown, Minus, Clock, Sprout, ShoppingBag, Plus, Tag, User, MapPin, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { chatWithGuideStream } from '../services/geminiService';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const Market: React.FC = () => {
  const { lang } = useLanguage();
  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [listings, setListings] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'index' | 'listings'>('index');

  const generateInsight = async () => {
    if (insightLoading || prices.length === 0) return;
    setInsightLoading(true);
    setInsight('');
    try {
      const crops = prices.map(p => `${p.crop}: ₹${p.price}/${p.unit}`).join(', ');
      const stream = chatWithGuideStream(`As a Gudalur Agricultural Expert, analyze these current market prices: ${crops}. Provide a one-sentence, highly practical strategy for local farmers about which crop to focus on or hold right now. Mention seasonal weather if relevant to Gudalur.`, [], lang);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setInsight(fullText);
      }
    } catch (err) {
      toast.error('AI Analyst is currently in the tea fields.');
    } finally {
      setInsightLoading(false);
    }
  };

  const diagnoseCrop = async () => {
    if (!symptoms.trim() || diagnosisLoading) return;
    setDiagnosisLoading(true);
    setDiagnosis('');
    try {
      const stream = chatWithGuideStream(`As a Gudalur Plant Pathologist, analyze these crop symptoms: "${symptoms}". Provide a concise diagnostic assessment and suggest common local organic treatments or control measures applicable in the Nilgiris environment. Be very specific about local shola/tea/ginger contexts.`, [], lang);
      let fullText = '';
      for await (const chunk of stream) {
        fullText += chunk;
        setDiagnosis(fullText);
      }
    } catch (err) {
      toast.error('The Lab is currently offline.');
    } finally {
      setDiagnosisLoading(false);
    }
  };

  useEffect(() => {
    // Official Prices
    const qPrices = query(collection(db, 'market_prices'), orderBy('updatedAt', 'desc'));
    const unsubPrices = onSnapshot(qPrices, (snapshot) => {
      const data: MarketPrice[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as MarketPrice));
      setPrices(data);
    });

    // Community Classifieds
    const qListings = query(
      collection(db, 'community_posts'), 
      where('category', '==', 'Classified'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubListings = onSnapshot(qListings, (snapshot) => {
      const data: CommunityPost[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as CommunityPost));
      setListings(data);
      setLoading(false);
    });

    return () => {
      unsubPrices();
      unsubListings();
    };
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="text-emerald-500" size={16} />;
      case 'down': return <TrendingDown className="text-red-500" size={16} />;
      default: return <Minus className="text-slate-400" size={16} />;
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between border-b pb-12 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             Live Economic Grid
          </div>
          <h1 className="text-6xl font-serif italic font-bold tracking-tight text-slate-900 leading-[0.9]">
            Town Exchange
          </h1>
          <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-xl mt-4">
            Real-time agricultural price index and community trade hub for the Gudalur hills.
          </p>
        </div>
        
        <div className="flex rounded-3xl bg-slate-100 p-2 shadow-inner border border-slate-200/50">
          <button 
            onClick={() => setView('index')}
            className={cn(
              "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'index' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Price Index
          </button>
          <button 
            onClick={() => setView('listings')}
            className={cn(
              "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
              view === 'listings' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Classifieds
          </button>
        </div>
      </div>

      {view === 'index' ? (
        <div className="space-y-12">
          <div className="rounded-[48px] border border-slate-200 bg-white p-10 shadow-2xl shadow-slate-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-50/50 to-transparent pointer-events-none" />
             <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-8">
                   <div className="flex h-20 w-20 items-center justify-center rounded-[32px] bg-slate-900 text-emerald-400 shadow-2xl shadow-slate-200">
                      <Sprout size={40} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Farmer Intelligence AI</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Advanced analysis of current Gudalur market trends</p>
                   </div>
                </div>
                <button 
                  onClick={generateInsight}
                  disabled={loading || prices.length === 0}
                  className="rounded-2xl bg-slate-900 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-200"
                >
                  {loading ? 'Decrypting Market...' : 'Run Analysis'}
                </button>
             </div>
             
             <AnimatePresence>
               {insight && (
                 <motion.div
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="mt-10 border-t border-slate-100 pt-10"
                 >
                    <div className="rounded-[32px] bg-slate-50 p-10 text-xl font-bold leading-relaxed text-slate-800 font-serif italic border border-slate-100">
                       "{insight}"
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
             <Sparkles className="absolute -bottom-16 -right-16 text-slate-100/50" size={320} />
          </div>

          {/* AI Crop Doctor - New Feature */}
          <div className="rounded-[48px] bg-slate-900 p-12 text-white relative overflow-hidden shadow-2xl">
             <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
             <div className="relative z-10 space-y-10">
                <div className="flex items-center gap-8">
                   <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500 text-slate-900 shadow-xl">
                      <Sparkles size={32} />
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-white tracking-tight">AI Crop Doctor</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Diagnostic Intelligence for Gudalur Growers</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <textarea 
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe your crop issues (e.g., 'Yellow spots on ginger leaves after first rain', 'White powder on tea flushes'...)"
                    className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-lg font-medium outline-none focus:border-emerald-500 focus:bg-white/10 transition-all min-h-[160px] placeholder:text-white/20"
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={diagnoseCrop}
                      disabled={diagnosisLoading || !symptoms.trim()}
                      className="rounded-2xl bg-emerald-500 px-10 py-5 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:bg-emerald-400 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-emerald-500/20"
                    >
                      {diagnosisLoading ? 'Analyzing Symptoms...' : 'Analyze Symptoms'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {diagnosis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="rounded-[32px] bg-white/10 p-10 border border-white/5"
                    >
                       <p className="text-lg font-serif italic text-emerald-50 leading-relaxed">
                         "{diagnosis}"
                       </p>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {prices.length === 0 && !loading && (
              <div className="col-span-full rounded-[48px] border-4 border-dashed border-slate-100 py-32 text-center">
                 <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50 text-slate-200">
                    <Sprout size={64} />
                 </div>
                 <p className="text-2xl font-serif italic font-bold text-slate-300">Synchronizing Local Cooperative Data...</p>
              </div>
            )}
            
            {prices.map((price) => (
              <motion.div
                key={price.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[40px] border border-slate-100 bg-white p-10 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all group"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <Tag size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 leading-none">{price.crop}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                        {getTrendIcon(price.trend)}
                        {price.trend === 'up' ? 'Price Surplus' : price.trend === 'down' ? 'Market Deficit' : 'Price Stability'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-3 mb-8">
                  <span className="text-5xl font-mono font-black text-slate-900 tracking-tighter">₹{price.price}</span>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">/ {price.unit}</span>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-slate-50 pt-8">
                   <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                     <Clock size={14} />
                     Synced {new Date(price.updatedAt).toLocaleDateString()}
                   </div>
                   <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="rounded-[48px] bg-slate-900 p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h3 className="mb-6 text-4xl font-serif italic font-bold leading-none tracking-tight text-emerald-50">Local Fair Trade Council</h3>
              <p className="mb-10 text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">Direct connection with Gudalur cooperatives for high-integrity trade in tea, pepper, and ginger. Ensuring ethical pricing for every hill grower.</p>
              <button className="rounded-2xl bg-white px-10 py-5 text-[10px] font-black text-slate-900 uppercase tracking-widest shadow-xl hover:scale-110 active:scale-95 transition-all">
                Connect with Cooperative
              </button>
            </div>
            <Sprout className="absolute -bottom-16 -right-16 text-white/5 h-80 w-80" />
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="flex items-center justify-between border-b border-slate-100 pb-8">
            <h2 className="text-3xl font-serif italic font-bold text-slate-900">Community Classifieds</h2>
            <Link 
              to="/community" 
              className="flex items-center gap-3 rounded-2xl bg-slate-900 px-8 py-4 text-[10px] font-black text-white shadow-xl hover:scale-110 active:scale-95 transition-all uppercase tracking-widest"
            >
              <Plus size={18} /> Post New Advertisement
            </Link>
          </div>

          <div className="grid gap-8">
            {listings.length === 0 && !loading ? (
              <div className="rounded-[48px] border-4 border-dashed border-slate-100 py-32 text-center">
                 <ShoppingBag size={80} className="mx-auto mb-8 text-slate-100" />
                 <p className="text-2xl font-serif italic font-bold text-slate-300">The Grounding Exchange is quiet today.</p>
              </div>
            ) : (
              listings.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[40px] border border-slate-50 bg-white p-10 shadow-xl hover:shadow-2xl hover:border-emerald-100 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-10">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="rounded-xl bg-emerald-50 px-4 py-2 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] border border-emerald-100/50">DIRECT TRADE</span>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Clock size={14} /> {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-3xl font-serif italic font-bold text-slate-800 leading-tight group-hover:text-slate-900 transition-colors">
                        "{item.content}"
                      </p>
                      <div className="flex flex-wrap items-center gap-4">
                         <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-inner">
                           <div className="h-6 w-6 rounded-lg bg-slate-200 flex items-center justify-center text-[8px]">
                              {item.userName?.charAt(0)}
                           </div>
                           {item.userName}
                         </div>
                         <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest shadow-inner">
                           <MapPin size={14} className="text-emerald-500" /> Local Verified
                         </div>
                      </div>
                    </div>
                    <button className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[32px] border border-slate-100 bg-slate-50 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-3xl group-hover:shadow-emerald-200 transition-all active:scale-95 group-hover:scale-110">
                      <ShoppingBag size={28} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

};

export default Market;
