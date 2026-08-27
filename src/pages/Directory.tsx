// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.

import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Service, UserProfile } from '../types';
import { 
  Phone, Search, MapPin, ExternalLink, ShieldCheck, 
  Heart, Users, Plus, X, Star, Clock, Car, Wrench, 
  Zap, Briefcase, Settings, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const CATEGORIES = [
  { id: 'Auto', icon: <Car size={16} />, label: 'Auto' },
  { id: 'Plumber', icon: <Wrench size={16} />, label: 'Plumber' },
  { id: 'Electrician', icon: <Zap size={16} />, label: 'Electrician' },
  { id: 'Labor', icon: <Briefcase size={16} />, label: 'Labor/Kooli' },
  { id: 'Mechanic', icon: <Settings size={16} />, label: 'Mechanic' },
  { id: 'Agriculture', icon: <Sparkles size={16} />, label: 'Agriculture' },
  { id: 'Hospital', icon: <Heart size={16} />, label: 'Hospital' },
  { id: 'Police', icon: <ShieldCheck size={16} />, label: 'Police' },
];

const Directory: React.FC = () => {
  const { user, profile } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'donors'>('services');
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [newService, setNewService] = useState({
    providerName: '',
    category: 'Auto',
    phone: '',
    area: '',
    description: '',
    availability: 'Daily 9 AM - 6 PM'
  });

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('providerName'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setServices(data);
      if (activeTab === 'services') setLoading(false);
    }, () => {
      toast.error('Failed to load directory');
    });
    return unsubscribe;
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'donors') {
      const q = query(collection(db, 'users'), where('isBloodDonor', '==', true));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: any[] = [];
        snapshot.forEach(doc => data.push({ uid: doc.id, ...doc.data() }));
        setDonors(data);
        setLoading(false);
      });
      return unsubscribe;
    }
  }, [activeTab]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'services'), {
        ...newService,
        userId: user.uid,
        isVerified: false,
        createdAt: Date.now()
      });
      toast.success('Professional profile registered! Resident will see you soon.');
      setShowRegisterForm(false);
      setNewService({ providerName: '', category: 'Auto', phone: '', area: '', description: '', availability: 'Daily 9 AM - 6 PM' });
    } catch (err) {
      toast.error('Registration failed');
    }
  };

  const filtered = services.filter(s => {
    const matchesSearch = (s.providerName || '').toLowerCase().includes(search.toLowerCase()) || 
                         (s.category || '').toLowerCase().includes(search.toLowerCase()) ||
                         (s.area || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between border-b pb-12 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
             <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
             Strategic Support Network
          </div>
          <h1 className="text-6xl font-serif italic font-bold tracking-tight text-slate-900 leading-[0.9]">
            The Compass
          </h1>
          <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-xl mt-4">
            A precision-indexed directory of Gudalur's essential services, professionals, and lifelines.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex rounded-3xl bg-slate-100 p-2 shadow-inner border border-slate-200/50">
              <button
                onClick={() => setActiveTab('services')}
                className={cn(
                  "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'services' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Service Index
              </button>
              <button
                onClick={() => setActiveTab('donors')}
                className={cn(
                  "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
                  activeTab === 'donors' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Donor Network
              </button>
            </div>
            <button
              onClick={() => setShowRegisterForm(true)}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400 shadow-2xl shadow-slate-200 hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        <div className="relative group">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-8 text-slate-400 group-focus-within:text-slate-900 transition-colors">
            <Search size={24} />
          </div>
          <input
            type="text"
            placeholder="Search for mechanics, plumbers, or specific areas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-[32px] border border-slate-200 bg-white py-6 pl-20 pr-8 text-xl font-medium outline-none transition-all focus:border-slate-900 focus:bg-slate-50/30 shadow-sm focus:shadow-2xl"
          />
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "flex whitespace-nowrap rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
              selectedCategory === 'all' ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
            )}
          >
            All Sectors
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "flex items-center gap-3 whitespace-nowrap rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] border transition-all",
                selectedCategory === cat.id ? "bg-emerald-600 text-white border-emerald-600 shadow-xl" : "bg-white text-slate-400 border-slate-100 hover:border-emerald-100"
              )}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {activeTab === 'services' ? filtered.map((service) => (
          <motion.div
            layout
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative rounded-[40px] border border-slate-50 bg-white p-10 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all"
          >
            <div className="mb-8 flex items-start justify-between">
              <div className="rounded-2xl bg-slate-50 p-5 text-slate-400 transition-all group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-xl group-hover:shadow-emerald-200">
                {CATEGORIES.find(c => c.id === service.category)?.icon || <Users size={28} />}
              </div>
              <div className="flex flex-col items-end gap-2">
                 <span className="rounded-xl bg-emerald-50/50 px-3 py-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/30">
                  {service.category}
                </span>
                {service.isVerified && (
                  <div className="flex items-center gap-1 text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                    <ShieldCheck size={12} /> Verified Asset
                  </div>
                )}
              </div>
            </div>
            
            <h3 className="mb-2 text-2xl font-serif italic font-bold text-slate-900 tracking-tight leading-none group-hover:text-emerald-600 transition-colors">{service.providerName}</h3>
            <p className="mb-6 text-sm font-medium text-slate-500 line-clamp-2 italic leading-relaxed">"{service.description || 'Dedicated local provider serving the Gudalur hills.'}"</p>
            
            <div className="mb-10 space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <MapPin size={16} className="text-emerald-500" />
                {service.area}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <Clock size={16} className="text-slate-300" />
                {service.availability || 'Full Operation'}
              </div>
            </div>

            <a
              href={`tel:${service.phone}`}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-5 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all hover:bg-emerald-600 hover:shadow-2xl hover:shadow-emerald-200 shadow-xl active:scale-95"
            >
              <Phone size={16} />
              Engage Professional
            </a>
          </motion.div>
        )) : donors.map((donor) => (
          <motion.div 
            layout
            key={donor.uid} 
            className="group relative rounded-[40px] border border-red-50 bg-white p-10 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all"
          >
            <div className="mb-8 flex items-start justify-between">
              <div className="h-16 w-16 rounded-[24px] bg-red-50 flex items-center justify-center text-red-500 font-serif italic font-black text-3xl shadow-inner border border-red-100/50">
                {donor.bloodGroup}
              </div>
              <div className="p-3 bg-red-50 text-red-400 rounded-xl group-hover:scale-110 transition-transform">
                <Heart size={24} className="fill-red-500 text-red-500" />
              </div>
            </div>
            
            <h3 className="mb-2 text-2xl font-serif italic font-bold text-slate-900 tracking-tight group-hover:text-red-600 transition-colors">{donor.name}</h3>
            
            <div className="mb-10 flex flex-col gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-red-400" /> {donor.area}
              </div>
              <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50/50 px-4 py-2 rounded-xl w-fit border border-red-100/30">
                 <Zap size={14} className="animate-pulse" /> Emergency Ready
              </div>
            </div>

            <a
              href={`tel:${donor.phone}`}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red-600 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-red-700 hover:shadow-2xl hover:shadow-red-200 active:scale-95 shadow-xl"
            >
              <Phone size={16} />
              Contact Guardian
            </a>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showRegisterForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-8 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="w-full max-w-2xl rounded-[48px] bg-white p-12 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.5)] border border-white/20"
            >
              <div className="mb-10 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-serif italic font-bold text-slate-900 tracking-tight">Register Service</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-2">Enlist in the Gudalur Strategic Network</p>
                </div>
                <button onClick={() => setShowRegisterForm(false)} className="rounded-2xl p-4 text-slate-400 hover:bg-slate-50 transition-colors">
                  <X size={32} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Identity/Brand</label>
                    <input
                      required
                      placeholder="Salim's Hill Auto"
                      value={newService.providerName}
                      onChange={e => setNewService(p => ({ ...p, providerName: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold outline-none focus:border-slate-900 focus:bg-slate-50/50 transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sector</label>
                    <div className="relative">
                      <select
                        value={newService.category}
                        onChange={e => setNewService(p => ({ ...p, category: e.target.value as any }))}
                        className="w-full rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold outline-none focus:border-slate-900 appearance-none bg-white transition-all shadow-sm"
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                      <Briefcase size={14} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Contact Protocol</label>
                    <input
                      required
                      type="tel"
                      placeholder="Verified mobile context"
                      value={newService.phone}
                      onChange={e => setNewService(p => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold outline-none focus:border-slate-900 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Strategic Area</label>
                    <input
                      required
                      placeholder="e.g. New Bazar Hub"
                      value={newService.area}
                      onChange={e => setNewService(p => ({ ...p, area: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold outline-none focus:border-slate-900 shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Service Capabilities</label>
                  <textarea
                    placeholder="Describe your expertise and community commitment..."
                    rows={4}
                    value={newService.description}
                    onChange={e => setNewService(p => ({ ...p, description: e.target.value }))}
                    className="w-full resize-none rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold outline-none focus:border-slate-900 transition-all shadow-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-3xl bg-slate-900 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.02] active:scale-95"
                >
                  Confirm Deployment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[48px] border-4 border-dashed border-slate-100 py-40 text-center">
             <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-8">
                <Search size={64} />
             </div>
             <p className="text-3xl font-serif italic font-bold text-slate-900 mb-2">Sector Uncharted</p>
             <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No verified assets matching your query in this sector.</p>
        </div>
      )}
    </div>
  );

};

export default Directory;
