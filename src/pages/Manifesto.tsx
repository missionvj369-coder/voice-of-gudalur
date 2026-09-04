import React, { useState, useContext } from 'react';
import { Flame, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { IdModalContext } from '../components/Layout/Shell';
import { manifestoApi } from '../services/api';
import toast from 'react-hot-toast';

/** "About the Movement" — the original home content, now a topic inside the menu. */
export const Manifesto: React.FC = () => {
  const { profile } = useAuth();
  const { whenRegistered } = useContext(IdModalContext);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

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
        <h1 className="text-4xl font-serif font-bold text-slate-900">About the Movement</h1>
        <p className="text-lg text-slate-600">Voice of Gudalur — a citizen-led civic platform for Gudalur, The Nilgiris</p>
      </motion.div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 max-w-xl mx-auto">
        <h2 className="text-xl font-bold text-slate-900">Right to Life Manifesto</h2>
        <p className="text-sm text-slate-600">
          Our collective demands for a better Gudalur — safe roads, human–wildlife coexistence
          and dignified public services. Sign to show your support.
        </p>
        <button onClick={handleSign} disabled={signing}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
          {signed ? <><CheckCircle2 size={16} /> Signed</> : <><Flame size={16} /> Sign Manifesto</>}
        </button>
      </div>

      <div className="text-center text-sm text-slate-500">
        <p>Privacy-first. Zero passwords. Register with your phone number and sign in seconds.</p>
      </div>
    </div>
  );
};

export default Manifesto;
