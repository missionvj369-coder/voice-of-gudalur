
import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Report } from '../types';
import { ShieldCheck, History, Clock, MapPin, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'my'>('all');

  useEffect(() => {
    let q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc')
    );

    if (filter === 'my' && user) {
      q = query(
        collection(db, 'reports'),
        where('reporterId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Report[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Report);
      });
      setReports(data);
      setLoading(false);
    }, (error) => {
      console.error("Reports listener error:", error);
      toast.error("Failed to load reports");
      setLoading(false);
    });

    return unsubscribe;
  }, [filter, user]);

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between border-b pb-12 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-slate-600 font-black text-[10px] uppercase tracking-[0.3em] mb-4">
             <span className="flex h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
             Verified Intelligence Ledger
          </div>
          <h1 className="text-6xl font-serif italic font-bold tracking-tight text-slate-900 leading-[0.9]">
            Town Reports
          </h1>
          <p className="text-slate-500 font-medium text-xl leading-relaxed max-w-xl mt-4">
            A permanent record of community reports, verification status, and field responses.
          </p>
        </div>
        
        <div className="flex rounded-3xl bg-slate-100 p-2 shadow-inner border border-slate-200/50">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
              filter === 'all' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Public Ledger
          </button>
          <button
            onClick={() => setFilter('my')}
            className={cn(
              "rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all",
              filter === 'my' ? "bg-white text-slate-900 shadow-xl" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Personal Transmission
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {reports.map((report) => (
          <motion.div
            key={report.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex flex-col rounded-[48px] border border-slate-100 bg-white overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all"
          >
            {report.photoUrl && (
              <div className="relative h-72 overflow-hidden bg-slate-900">
                 <img src={report.photoUrl} alt={report.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90" />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                 <div className="absolute bottom-8 left-8">
                    <span className={cn(
                      "rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] border backdrop-blur-xl shadow-lg",
                      report.status === 'approved' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
                      report.status === 'rejected' ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    )}>
                      {report.status} STATUS
                    </span>
                 </div>
              </div>
            )}
            
            <div className="p-12 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
                  <Clock size={14} />
                  Filed {new Date(report.createdAt).toLocaleDateString()}
                </div>
                {!report.photoUrl && (
                  <span className={cn(
                    "rounded-xl px-3 py-1 text-[8px] font-black uppercase tracking-widest border",
                    report.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    report.status === 'rejected' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {report.status}
                  </span>
                )}
              </div>
              
              <h3 className="text-3xl font-serif italic font-bold text-slate-900 tracking-tight leading-none">{report.title}</h3>
              <p className="line-clamp-3 text-lg font-medium text-slate-500 leading-relaxed italic">"{report.description}"</p>
              
              <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-slate-50 pt-10">
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <MapPin size={16} className="text-emerald-500" />
                  {report.location.address}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-2.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100/30">
                  <ShieldCheck size={16} />
                  {report.category} Analysis
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {reports.length === 0 && !loading && (
          <div className="col-span-full rounded-[48px] border-4 border-dashed border-slate-100 py-40 text-center">
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-slate-50 text-slate-200">
               <History size={64} strokeWidth={1} />
            </div>
            <h3 className="text-3xl font-serif italic font-bold text-slate-900 mb-2">Archive Vacant</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No active transmissions found in the current sector.</p>
          </div>
        )}

        {loading && (
          <div className="col-span-full py-40 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent shadow-xl"></div>
            <p className="mt-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Attuning to Ledger...</p>
          </div>
        )}
      </div>
    </div>
  );

};

export default Reports;
