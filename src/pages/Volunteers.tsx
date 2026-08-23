import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Volunteer } from '../types';
import { 
  Heart, Users, ShieldCheck, MapPin, Phone, Clock, 
  Search, Plus, X, HandHeart, Sparkles, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

const VolunteerPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegForm, setShowRegForm] = useState(false);

  const [newVolunteer, setNewVolunteer] = useState({
    skills: '',
    area: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'volunteers'), where('status', '==', 'approved'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Volunteer[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Volunteer));
      setVolunteers(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, 'volunteers'), {
        userId: user.uid,
        name: profile.name,
        phone: profile.phone,
        area: newVolunteer.area || profile.area,
        skills: newVolunteer.skills.split(',').map(s => s.trim()),
        status: 'pending',
        createdAt: Date.now()
      });
      toast.success('Registration sent! Admin will review your profile shortly.');
      setShowRegForm(false);
    } catch (err) {
      toast.error('Registration failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
           <div className="max-w-md">
             <h1 className="text-3xl font-black tracking-tight mb-2">Our Guardians</h1>
             <p className="text-slate-400 font-medium leading-relaxed">
               Gudalur is built on community. Join our volunteer network to help during emergencies, elephant alerts, or local events.
             </p>
           </div>
           <button
             onClick={() => setShowRegForm(true)}
             className="flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-900 shadow-xl hover:scale-105 active:scale-95 transition-all"
           >
             <HandHeart size={20} />
             Become a Volunteer
           </button>
        </div>
        <Sparkles className="absolute -bottom-4 -right-4 text-white/5" size={200} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-transparent" />
             <p className="text-sm font-bold text-slate-500">Connecting with our guardians...</p>
          </div>
        ) : volunteers.map((v) => (
          <motion.div
            layout
            key={v.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:border-emerald-100 hover:shadow-xl transition-all"
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Users size={24} />
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none">
                  Approved
                </span>
                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 uppercase">
                   <ShieldCheck size={10} /> Verified
                </div>
              </div>
            </div>

            <h3 className="mb-1 text-lg font-black text-slate-900">{v.name}</h3>
            <div className="mb-4 flex flex-wrap gap-1.5">
               {v.skills.map((skill, idx) => (
                 <span key={idx} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[9px] font-bold text-slate-500">
                   {skill}
                 </span>
               ))}
            </div>

            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <MapPin size={14} />
                {v.area}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400">
                <Clock size={14} />
                Joined {new Date(v.createdAt).toLocaleDateString()}
              </div>
            </div>

            <a
              href={`tel:${v.phone}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-600 hover:shadow-lg"
            >
              <Phone size={14} />
              Contact Volunteer
            </a>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showRegForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Volunteer Entry</h2>
                  <p className="text-xs font-medium text-slate-500">Your help makes Gudalur safer</p>
                </div>
                <button onClick={() => setShowRegForm(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Skills & Expertise</label>
                  <input
                    required
                    placeholder="e.g. First Aid, Driving, Navigation, Local Guide"
                    value={newVolunteer.skills}
                    onChange={e => setNewVolunteer(p => ({ ...p, skills: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
                  />
                  <p className="text-[10px] font-medium text-slate-400">Separate skills with commas</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Area</label>
                  <input
                    placeholder="Area you can support (defaults to your profile area)"
                    value={newVolunteer.area}
                    onChange={e => setNewVolunteer(p => ({ ...p, area: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900"
                  />
                </div>

                <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100 flex gap-3">
                   <div className="text-amber-600">
                      <Clock size={20} />
                   </div>
                   <p className="text-[11px] font-medium text-amber-700 leading-relaxed">
                     Your application will be reviewed by Gudalur Area Leads. Once approved, your contact details will be visible to residents in need.
                   </p>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-100 transition-all hover:bg-emerald-600 active:scale-95"
                >
                  Send Application
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolunteerPage;
