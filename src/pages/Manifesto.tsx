import React, { useState, useEffect, useContext } from 'react';
import {
  Flame,
  Mail,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  Footprints,
  Crosshair,
  Scale,
  Cpu,
  Radio,
  TreePine,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANIFESTO_DATA, ManifestoContent } from '../data/manifestoData';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { IdModalContext } from '../components/Layout/Shell';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { db } from '../lib/supabase';
import toast from 'react-hot-toast';
import crisisImg from '../assets/images/gudalur_crisis_blood_1787476675818.jpg';

export const Manifesto: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { openIdModal } = useContext(IdModalContext);

  const manifesto: ManifestoContent = MANIFESTO_DATA[lang] || MANIFESTO_DATA.en;

  // Every civic action on this page requires a registered, verifiable Gudalur Resident ID
  // so endorsements and submissions stay real, traceable records.
  const isRegistered = !!(profile?.name && profile?.phone && profile?.gudalurId);
  const requireRegistered = (action: string): boolean => {
    if (isRegistered) return true;
    openIdModal();
    toast(`Please register your Gudalur Resident ID first to ${action}.`, { icon: '🪪' });
    return false;
  };

  // Real signatures from Supabase only — starts at 0.
  const [signaturesCount, setSignaturesCount] = useState<number>(0);
  const [hasEndorsed, setHasEndorsed] = useState<boolean>(false);
  const [endorserName, setEndorserName] = useState(profile?.name || '');
  const [endorserLocality, setEndorserLocality] = useState(profile?.localityName || "O'Valley");
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSelectedLang, setEmailSelectedLang] = useState<Language>(lang);
  const [isSubmittingEndorse, setIsSubmittingEndorse] = useState(false);

  useEffect(() => { setEmailSelectedLang(lang); }, [lang]);

  useEffect(() => {
    let cancelled = false;
    db.getManifestoSignatureCount()
      .then(({ count }) => { if (!cancelled && typeof count === 'number' && count >= 0) setSignaturesCount(count); })
      .catch((err) => { console.warn('Supabase warning:', err); });
    return () => { cancelled = true; };
  }, []);

  const handleEndorse = async (e: React.FormEvent) => {
    e.preventDefault();
    // Identity is auto-detected from the registered Gudalur Resident Card - no manual typing needed.
    if (!profile?.name || !profile?.phone || !profile?.gudalurId) {
      setShowSignModal(false);
      openIdModal();
      toast.error('Please register your Gudalur Resident Card first so your endorsement is a real, verifiable record.');
      return;
    }
    setIsSubmittingEndorse(true);
    try {
      const { error } = await db.addManifestoSignature({
        name: profile.name,
        locality: profile.localityName || 'Gudalur',
        contact: profile.phone,
        gudalur_id: profile.gudalurId,
      });
      if (error) { toast.error('Could not register your endorsement. Please check your connection and try again.'); return; }
      setSignaturesCount((c) => c + 1);
      setHasEndorsed(true);
      setShowSignModal(false);
      toast.success('Your endorsement is registered as a real, verifiable record.');
    } catch (err) {
      console.error('Endorsement error:', err);
      toast.error('Could not register your endorsement. Please try again.');
    } finally {
      setIsSubmittingEndorse(false);
    }
  };

  const handleWhatsAppShare = () => {
    let text = `🩸 *${manifesto.title}*\n\n`;
    text += `✊ "${manifesto.subtitle}"\n\n`;
    text += `⚠️ *WHY ARE WE DYING? — THE HARD TRUTH:*\n`;
    text += `• 11 Traditional Migratory Corridors blocked by walls & fences.\n`;
    text += `• Elephants & Tigers trapped in fragmented pockets next to human lines.\n`;
    text += `• Bureaucratic blind spots leaving residential zones defenseless.\n\n`;
    text += `🚨 *OUR NON-NEGOTIABLE DEMANDS:*\n`;
    text += `1. Unconditional Removal of Blockades on 11 corridors.\n`;
    text += `2. AI-Driven Thermal & Acoustic Early Warning Networks.\n`;
    text += `3. Rapid Response Teams (RRTs) in O'Valley, Cherambadi & Pandalur.\n`;
    text += `4. Immediate eradication of Lantana ambush overgrowth.\n\n`;
    text += `🇮🇳 *Stand with us as One Voice of Gudalur!*\n`;
    text += `Read, Sign & Send Email to CM:\n${window.location.origin}/`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = () => {
    generateManifestoPdf(
      manifesto, lang, signaturesCount,
      profile?.name || (hasEndorsed ? endorserName : undefined),
      profile?.localityName || endorserLocality
    );
    toast.success('Downloaded your signed memorandum PDF.', { icon: '📄' });
  };

  return (
    <div className="space-y-8 pb-28 relative">

      {/* Atmospheric ambient background glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-rose-950/30 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[150px]" />
      </div>

      {/* HERO: Image + Title + Subtitle + Proclamation (NO badges) */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-red-900/70 text-white z-10">
        <div className="absolute inset-0 z-0">
          <img
            src={crisisImg}
            alt=""
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.45] contrast-125 saturate-150"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/75 to-black/85" />
        </div>
        <div className="relative z-10 p-6 sm:p-12 lg:p-14 max-w-4xl">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black tracking-tight leading-tight text-white drop-shadow-[0_4px_12px_rgba(220,38,38,0.5)]">
            {manifesto.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-red-200/95 font-serif italic max-w-3xl leading-relaxed border-l-2 border-red-500 pl-4">
            "{manifesto.subtitle}"
          </p>

          {/* ONE-Line Proclamation — rendered once */}
          <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-black/75 backdrop-blur-md border-l-4 border-red-600 border-y border-r border-red-900/60 shadow-2xl">
            <p className="text-base sm:text-lg font-serif font-medium text-stone-100 leading-relaxed">
              {manifesto.proclamation}
            </p>
          </div>
        </div>
      </section>

            {/* Emergency Hotlines */}
      <section className="bg-stone-900 rounded-3xl p-4 sm:p-5 flex flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3 text-sm text-stone-200">
          <PhoneCall size={16} className="text-red-400 animate-bounce" />
          <span>Forest RRT:</span>
          <a href="tel:18004256100" title="Tap to call Gudalur Forest Rapid Response Team" className="font-mono font-bold text-red-300 hover:text-red-200 hover:underline">1800 425 6100</a>
          <span className="text-stone-500">/</span>
          <span>Medical:</span>
          <a href="tel:108" title="Tap to call Ambulance 108" className="font-mono font-bold text-red-300 hover:text-red-200 hover:underline">108</a>
        </div>
      </section>

      {/* Part I — Content without badges */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border border-red-900/60 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
          <span className="px-3 py-1 rounded-xl bg-red-900/60 text-red-300 font-black text-xs uppercase">{manifesto.sections[0].part}</span>
        </div>
        <div className="text-stone-300 text-sm sm:text-base leading-relaxed space-y-4 font-sans">
          {manifesto.sections[0].content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {/* Frontline Conflict Zones — no Act-for-Gudalur link */}
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-center gap-3 text-xs">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <span>
            <strong className="text-red-400">Documented Frontline Conflict Zones:</strong> Lauriston (O'Valley), Cherambadi, Seaforth, Glenrock, Mayfield, Pandalur fringe tea estates.
          </span>
        </div>
      </section>

      {/* Part II — The Hard Truth */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border border-red-900/60 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
          <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs uppercase shadow-lg shadow-red-950">{manifesto.sections[1].part}</span>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-white">{manifesto.sections[1].title}</h2>
        </div>
        <p className="text-stone-300 text-sm font-medium">{manifesto.sections[1].content[0]}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {manifesto.sections[1].highlights?.map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-black/70 hover:bg-red-950/40 border border-red-900/50 transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase px-2.5 py-1 rounded-lg bg-red-950 text-red-300 border border-red-700">{item.badge}</span>
                  {idx === 0 ? <Footprints size={20} className="text-red-400" /> : idx === 1 ? <Crosshair size={20} className="text-amber-400" /> : <Scale size={20} className="text-rose-400" />}
                </div>
                <h3 className="font-serif font-bold text-lg text-white">{item.heading}</h3>
                <p className="text-xs text-stone-300 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Part III — Non-Negotiable Demands */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border border-red-600/70 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-red-800/40 pb-4">
          <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs uppercase shadow-lg shadow-red-950">{manifesto.sections[2].part}</span>
          <h2 className="text-xl sm:text-2xl font-serif font-black text-white">{manifesto.sections[2].title}</h2>
        </div>
        <p className="text-stone-300 text-sm font-medium">{manifesto.sections[2].content[0]}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {manifesto.sections[2].highlights?.map((item, idx) => (
            <div key={idx} className="p-6 rounded-2xl bg-black/70 border border-red-900/70 hover:border-red-500 transition-all space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-red-950 text-red-300 border border-red-700">{item.badge}</span>
                {idx === 0 ? <TreePine size={22} className="text-emerald-400" /> : idx === 1 ? <Cpu size={22} className="text-cyan-400" /> : idx === 2 ? <Radio size={22} className="text-red-400" /> : <TreePine size={22} className="text-amber-400" />}
              </div>
              <h3 className="font-serif font-bold text-lg text-white">{item.heading}</h3>
              <p className="text-xs text-stone-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ground Reality Testimonial */}
      <section className="bg-stone-950 rounded-3xl p-6 sm:p-10 border border-red-900/60 shadow-xl">
        <blockquote className="text-center text-stone-100">
          <p className="text-base sm:text-lg font-serif italic leading-relaxed max-w-2xl mx-auto">
            "We live in constant fear during evening hours. Our children cannot walk home safely after school without thermal detection and early warning."
          </p>
          <footer className="text-slate-400 text-sm mt-3 font-medium">
            — Local Estate Resident, O'Valley
          </footer>
        </blockquote>
      </section>

      {/* Call to Action */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-12 border border-red-600 shadow-xl text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
            We Have Wept in Silence for Too Long.
          </h3>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mx-auto">
            No more empty promises, no more post-tragedy compensation memos, and no more funerals.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
            {manifesto.callToAction.slogans.map((slogan, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-black/80 border border-red-800/80">
                <p className="font-serif font-black text-red-300 text-sm">{slogan}</p>
              </div>
            ))}
          </div>
          <p className="font-serif font-black text-amber-400 text-lg pt-3">{manifesto.callToAction.closing}</p>
        </div>
      </section>

      {/* Sign & Endorse Modal */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg rounded-3xl bg-stone-950 border-2 border-red-600 text-white p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50">
                  <Flame size={24} className="animate-pulse" />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif font-black text-white">
                  Endorse the Gudalur Right to Life Proclamation
                </h3>
                <p className="text-xs sm:text-sm text-stone-300">
                  Your endorsement is a real, verifiable record submitted to the authorities.
                </p>
              </div>
              <form onSubmit={handleEndorse} className="space-y-4">
                {/* Auto-detected identity - pulled straight from the registered Gudalur Resident Card */}
                <div className="rounded-2xl bg-emerald-950/40 border border-emerald-700/60 p-4 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={12} />
                    Auto-detected from your registered Resident Card
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-200">
                    <p><span className="text-stone-500">Name: </span><strong>{profile?.name}</strong></p>
                    <p><span className="text-stone-500">Phone: </span><strong>{profile?.phone}</strong></p>
                    <p><span className="text-stone-500">Resident ID: </span><strong className="font-mono text-emerald-300">{profile?.gudalurId}</strong></p>
                    <p><span className="text-stone-500">Locality: </span><strong>{profile?.localityName}</strong></p>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setShowSignModal(false)} className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs">Cancel</button>
                  <button type="submit" disabled={isSubmittingEndorse} className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-950 border border-red-400">
                    {isSubmittingEndorse ? 'Recording...' : 'Confirm Endorsement'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send Official Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <SendEmailModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            initialLang={emailSelectedLang}
          />
        )}
      </AnimatePresence>

      {/* BOTTOM ACTION BAR — four labelled tabs, floated slightly above the edge */}
      <div className="fixed bottom-2 left-0 right-0 z-40 px-3">
        <div className="max-w-5xl mx-auto bg-[#0B111E]/95 backdrop-blur-md border border-red-950/50 rounded-2xl shadow-2xl shadow-black/60">
          <div className="px-3 py-2 flex items-center justify-between gap-3">
            {/* Signature count — compact */}
            <div className="text-center shrink-0 px-1">
              <div className="text-xl font-black text-red-400 leading-none">{signaturesCount.toLocaleString()}</div>
              <div className="text-[8px] text-slate-400 mt-1 uppercase tracking-wide">Resident Endorsements</div>
            </div>

            {/* Four action tabs — icon + title so every user understands the action */}
            <div className="flex items-center gap-1.5">
              {/* 1. Sign & Endorse */}
              <button
                onClick={() => { if (requireRegistered('endorse the proclamation')) setShowSignModal(true); }}
                title="Sign & Endorse the Proclamation"
                className="w-16 h-14 rounded-xl bg-gradient-to-b from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-950/50 transition flex flex-col items-center justify-center gap-1"
              >
                {hasEndorsed ? <CheckCircle2 size={15} className="text-emerald-300" /> : <Flame size={15} className="text-amber-300" />}
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{hasEndorsed ? 'Endorsed' : 'Endorse'}</span>
              </button>

              {/* 2. Send Official Email */}
              <button
                onClick={() => { if (requireRegistered('send the official email')) setShowEmailModal(true); }}
                title="Send Official Email to CM & NTCA"
                className="w-16 h-14 rounded-xl bg-stone-800 hover:bg-stone-700 text-white shadow-md transition flex flex-col items-center justify-center gap-1 border border-red-900/40"
              >
                <Mail size={15} className="text-red-400" />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none text-stone-200">Email</span>
              </button>

              {/* 3. WhatsApp Share */}
              <button
                onClick={() => { if (requireRegistered('share the movement')) handleWhatsAppShare(); }}
                title="Share on WhatsApp"
                className="w-16 h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/30 transition flex flex-col items-center justify-center gap-1"
              >
                <Share2 size={15} />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Share</span>
              </button>

              {/* 4. Download Signed PDF */}
              <button
                onClick={() => { if (requireRegistered('download the signed PDF')) handleDownloadPdf(); }}
                title="Download the signed memorandum PDF"
                className="w-16 h-14 rounded-xl bg-gradient-to-b from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md transition flex flex-col items-center justify-center gap-1"
              >
                <Download size={15} />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Manifesto;
