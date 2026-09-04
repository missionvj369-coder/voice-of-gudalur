import React, { useState, useContext } from 'react';
import { Flame, Mic, CheckCircle2, Share2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { IdModalContext } from '../components/Layout/Shell';
import { Link } from 'react-router-dom';
import { manifestoApi } from '../services/api';
import toast from 'react-hot-toast';

export const Manifesto: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { whenRegistered } = useContext(IdModalContext);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signatures, setSignatures] = useState(0);

  const isRegistered = !!(profile?.name && profile?.phone && profile?.gudalurId);

  const handleSign = async () => {
    if (!isRegistered) { whenRegistered(() => handleSign()); return; }
    setSigning(true);
    try {
      const res = await manifestoApi.sign();
      if (!res.isDuplicate) { setSigned(true); toast.success('Thank you for signing!'); }
      else { toast.success('You have already signed.'); }
    } catch (e: any) { toast.error(e?.error || 'Sign failed'); }
    setSigning(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
        <h1 className="text-4xl font-serif font-bold text-slate-900">Voice of Gudalur</h1>
        <p className="text-lg text-slate-600">A citizen-led civic platform for Gudalur, The Nilgiris</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Manifesto</h2>
          <p className="text-sm text-slate-600">Our collective demands for a better Gudalur. Sign to show your support.</p>
          <button onClick={handleSign} disabled={signing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {signed ? <><CheckCircle2 size={16} /> Signed</> : <><Flame size={16} /> Sign Manifesto</>}
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Rise Voice</h2>
          <p className="text-sm text-slate-600">Record your voice petition for the community.</p>
          <Link to="/voice-soundboard"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm text-center flex items-center justify-center gap-2">
            <Mic size={16} /> Record Voice <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <div className="text-center text-sm text-slate-500">
        <p>Privacy-first. On-device Aadhaar verification. Zero passwords.</p>
      </div>
    </div>
  );
};

export default Manifesto;
