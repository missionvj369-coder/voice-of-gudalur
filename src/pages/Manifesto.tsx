import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Flame, PenLine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CorridorMap } from '../components/CorridorMap';
import { GetGDRCard } from './about_helpers';
import { petitionApi } from '../services/api';

export const Manifesto: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [total, setTotal] = useState<number | null>(null);

  // Load the live petition count once for the About page numbers.
  React.useEffect(() => {
    let alive = true;
    petitionApi.signStats().then((s) => { if (alive) setTotal(s?.total ?? 0); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-10">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">About the Movement</h1>
        <p className="text-base text-[#AED581] max-w-2xl mx-auto">
          Voice of Gudalur — a citizen-led civic platform for Gudalur, The Nilgiris.
        </p>
      </motion.div>

      {/* Live total chip */}
      {total !== null && total > 0 && (
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#AED581]/30 bg-[#AED581]/10 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-black text-[#E8F5E9]">
              {total.toLocaleString('en-IN')} verified signs — live
            </span>
          </div>
        </div>
      )}

      {/* The platform story — content only, no buttons */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">Why Voice of Gudalur exists</h2>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">
          Gudalur is the keystone ecological bridge of the Nilgiri Biosphere Reserve — home to
          over 6,000 wild elephants, tigers and leopards, and to the farming communities who live
          alongside them. When human life, wildlife movement and development all compete for the
          same narrow valley floor, the result is a system in conflict: night-time road closures,
          crop raids, injuries, and rising fear on both sides.
        </p>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">
          We believe the answer is not to push wildlife away or keep people out — it is to
          <strong className="text-[#F5F5F5]"> redesign the shared space </strong> the way the opening
          animation shows: a system of dedicated lanes. Safe, uninterrupted corridors for elephants
          and tigers; protected, dignified passage for every resident; and a single civic voice that
          carries our demands to the government desks that serve us.
        </p>
        <p className="text-sm text-[#E6F7E6] leading-relaxed">
          Voice of Gudalur is that civic voice — a privacy-first, offline-first platform where you
          can register, sign petitions, see live support from every locality, track closed corridors,
          and send verified grievances to the Chief Minister's cell. One community, one voice, the
          right to life.
        </p>
      </div>

      {/* The closed-corridor GIS map — the "GIS map we had previously", live here */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">Closed corridors, live</h2>
        <p className="text-sm text-[#E6F7E6]">
          The 11 closed / restricted wildlife corridors around Gudalur on the map — forest gates,
          night-closure sections and elephant-fringe buffers.
        </p>
        <CorridorMap />
      </div>

      {/*__CORRIDORS__*/}

      {/* Mudhalvarin Mugavari — embedded grievance ticket */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#F5F5F5]">Send a grievance — Mudhalvarin Mugavari</h2>
        <p className="text-sm text-[#E6F7E6]">
          Submit your issue directly to the Chief Minister's cell on the official Tamil Nadu
          CM Helpline portal, embedded below.
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#FAF5EA]">
          <iframe
            src="https://cmhelpline.tnega.org/portal/en/ticket/35665012410302427"
            title="Mudhalvarin Mugavari Grievance Ticket"
            width="100%"
            height="600"
            style={{ border: 'none' }}
            loading="lazy"
          />
        </div>
        <p className="text-[11px] text-[#AED581]/70 leading-relaxed">
          Note: this is the official government portal. If the page appears blank, the portal is
          restricting cross-origin embedding (or requires you to be logged in to that portal) —
          you can open the same ticket directly on{' '}
          <a
            href="https://cmhelpline.tnega.org/portal/en/ticket/35665012410302427"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#AED581] underline"
          >
            cmhelpline.tnega.org ↗
          </a>
          .
        </p>
      </div>

      {/* Privacy note */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-xs text-[#AED581]/80 leading-relaxed max-w-xl mx-auto">
          Privacy-first. Your phone number stays private and is never shown publicly. Zero
          passwords. Aadhaar verification arrives later.
        </p>
      </div>

      {/* Sign in Petition CTA at the bottom */}
      <div className="rounded-3xl border border-amber-200/40 bg-gradient-to-br from-amber-50/90 to-orange-50/80 p-6 text-center space-y-4">
        <div className="text-4xl" aria-hidden>📜</div>
        <p className="text-sm text-slate-700 max-w-md mx-auto leading-relaxed">
          Help redesign the space we share — sign the Right to Life petition. Your one verified
          signature strengthens the voice of every community in Gudalur.
        </p>
        {profile ? (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95"
          >
            <PenLine size={16} /> Sign in Petition
          </button>
        ) : (
          <GetGDRCard className="mx-auto" />
        )}
      </div>
    </div>
  );
};

export default Manifesto;