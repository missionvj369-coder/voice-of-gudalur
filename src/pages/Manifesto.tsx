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
import { MANIFESTO_UI } from '../data/manifestoUi';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { IdModalContext } from '../components/Layout/Shell';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { db } from '../lib/supabase';
import toast from 'react-hot-toast';
import crisisImg from '../assets/images/gudalur_crisis_blood_1787476675818.jpg';

export const Manifesto: React.FC = () => {
  const { lang } = useLanguage();
  const { profile } = useAuth();
  const { whenRegistered, openIdModal } = useContext(IdModalContext);

  const manifesto: ManifestoContent = MANIFESTO_DATA[lang] || MANIFESTO_DATA.en;
  const ui = MANIFESTO_UI[lang] || MANIFESTO_UI.en;

  // Every civic action on this page requires a registered, verifiable Gudalur Resident ID
  // so endorsements and submissions stay real, traceable records.
  const isRegistered = !!(profile?.name && profile?.phone && profile?.gudalurId);
  // One flow for everyone: registered users act instantly; new users register once and the
  // same action continues automatically the moment their Gudalur ID is issued.
  const requireRegistered = (run: () => void): boolean => {
    whenRegistered(run);
    return isRegistered;
  };

  // Real signatures from Supabase only — starts at 0.
  const [signaturesCount, setSignaturesCount] = useState<number>(0);
  const [hasEndorsed, setHasEndorsed] = useState<boolean>(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSubmittingEndorse, setIsSubmittingEndorse] = useState(false);

  // Android back button closes the email composer instead of leaving the page.
  useEffect(() => {
    if (!showEmailModal) return;
    let backClosed = false;
    window.history.pushState({ manifestoEmail: true }, '');
    const onPop = () => { backClosed = true; setShowEmailModal(false); };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (!backClosed && window.history.state?.manifestoEmail) window.history.back();
    };
  }, [showEmailModal]);  // Android back button closes the endorsement sheet instead of leaving the page.
  useEffect(() => {
    if (!showSignModal) return;
    let backClosed = false;
    window.history.pushState({ manifestoSign: true }, '');
    const onPopSign = () => { backClosed = true; setShowSignModal(false); };
    window.addEventListener('popstate', onPopSign);
    return () => {
      window.removeEventListener('popstate', onPopSign);
      if (!backClosed && window.history.state?.manifestoSign) window.history.back();
    };
  }, [showSignModal]);

  useEffect(() => {
    let cancelled = false;
    db.getManifestoSignatureCount()
      .then(({ count }) => { if (!cancelled && typeof count === 'number' && count >= 0) setSignaturesCount(count); })
      .catch((err) => { console.warn('Supabase warning:', err); });
    return () => { cancelled = true; };
  }, []);

  const handleEndorse = async (_e?: React.FormEvent) => {
    _e?.preventDefault();
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

  const shareOnWhatsApp = () => {
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
    window.open(url, '_blank', 'noopener');
  };

  const handleWhatsAppShare = () => requireRegistered(shareOnWhatsApp);

  const handleDownloadPdf = () => {
    generateManifestoPdf(
      manifesto, lang, signaturesCount,
      profile?.name,
      profile?.localityName
    );
    toast.success('Downloaded your signed memorandum PDF.', { icon: '📄' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-6 relative">

      {/* Page identity — who we are, in one calm line */}
      <section className="pt-4 pb-1 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Initiative by Universal Guard Trust</p>
        <h1 className="mt-1 text-xl sm:text-2xl font-serif font-black tracking-tight text-white">Voice of Gudalur</h1>
        <p className="mt-1 text-xs text-stone-400 font-medium">One community. One voice. One unwavering demand: the Right to Life.</p>
      </section>

      {/* HERO — clear and focused */}
      <section className="relative rounded-3xl overflow-hidden shadow-xl border border-red-900/60 text-white">
        <div className="absolute inset-0 z-0">
          <img
            src={crisisImg}
            alt=""
            className="w-full h-full object-cover object-center brightness-[0.5]"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/75 to-black/85" />
        </div>
        <div className="relative z-10 p-6 sm:p-10 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight leading-tight text-white">
            {manifesto.title}
          </h1>
          <p className="mt-4 text-sm sm:text-base text-red-200/95 font-serif italic leading-relaxed">
            "{manifesto.subtitle}"
          </p>

          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-black/80 border border-red-900/60 shadow-lg">
            <p className="text-sm sm:text-base font-serif font-medium text-stone-100 leading-relaxed">
              {manifesto.proclamation}
            </p>
          </div>
        </div>
      </section>

            {/* Part I — Content without badges */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border border-red-900/60 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
          <h2 className="text-lg sm:text-xl font-serif font-black text-white">{manifesto.sections[0].title}</h2>
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
          <h2 className="text-lg sm:text-xl font-serif font-black text-white">{manifesto.sections[1].title}</h2>
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
          <h2 className="text-lg sm:text-xl font-serif font-black text-white">{manifesto.sections[2].title}</h2>
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
            "{ui.quote}"
          </p>
          <footer className="text-slate-400 text-sm mt-3 font-medium">
            {ui.quoteBy}
          </footer>
        </blockquote>
      </section>

      {/* Call to Action */}
      <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-12 border border-red-600 shadow-xl text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h3 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
            {ui.weptTitle}
          </h3>
          <p className="text-stone-300 text-sm sm:text-base max-w-2xl mx-auto">
            {ui.weptSub}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <button type="button" onClick={() => requireRegistered(() => setShowSignModal(true))} className="h-24 rounded-2xl bg-black/80 hover:bg-red-950/60 border border-red-700 hover:border-red-500 transition flex flex-col items-center justify-center gap-2">
              {hasEndorsed ? <CheckCircle2 size={24} className="text-emerald-400" /> : <Flame size={24} className="text-amber-400" />}
              <span className="font-black text-red-200 text-sm leading-none">{hasEndorsed ? ui.tabs.endorsed : ui.tabs.endorse}</span>
            </button>
            <button type="button" onClick={() => requireRegistered(() => setShowEmailModal(true))} className="h-24 rounded-2xl bg-black/80 hover:bg-red-950/60 border border-red-700 hover:border-red-500 transition flex flex-col items-center justify-center gap-2">
              <Mail size={24} className="text-red-400" />
              <span className="font-black text-red-200 text-sm leading-none">{ui.tabs.email}</span>
            </button>
            <button type="button" onClick={() => requireRegistered(shareOnWhatsApp)} className="h-24 rounded-2xl bg-black/80 hover:bg-emerald-950/60 border border-emerald-700 hover:border-emerald-500 transition flex flex-col items-center justify-center gap-2">
              <Share2 size={24} className="text-emerald-400" />
              <span className="font-black text-emerald-200 text-sm leading-none">{ui.tabs.share}</span>
            </button>
            <button type="button" onClick={() => requireRegistered(handleDownloadPdf)} className="h-24 rounded-2xl bg-black/80 hover:bg-teal-950/60 border border-teal-700 hover:border-teal-500 transition flex flex-col items-center justify-center gap-2">
              <Download size={24} className="text-teal-400" />
              <span className="font-black text-teal-200 text-sm leading-none">{ui.tabs.pdf}</span>
            </button>
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
                  {ui.signTitle}
                </h3>
                <p className="text-xs sm:text-sm text-stone-300">
                  {ui.signSub}
                </p>
              </div>
              <form onSubmit={handleEndorse} className="space-y-4">
                {/* Auto-detected identity - pulled straight from the registered Gudalur Resident Card */}
                <div className="rounded-2xl bg-emerald-950/40 border border-emerald-700/60 p-4 space-y-2 text-left">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    <CheckCircle2 size={12} />
                    {ui.autoDetected}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-stone-200">
                    <p><span className="text-stone-500">{ui.nameLabel} </span><strong>{profile?.name}</strong></p>
                    <p><span className="text-stone-500">{ui.phoneLabel} </span><strong>{profile?.phone}</strong></p>
                    <p><span className="text-stone-500">{ui.idLabel} </span><strong className="font-mono text-emerald-300">{profile?.gudalurId}</strong></p>
                    <p><span className="text-stone-500">{ui.localityLabel} </span><strong>{profile?.localityName}</strong></p>
                  </div>
                </div>
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setShowSignModal(false)} className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs">{ui.cancelBtn}</button>
                  <button type="submit" disabled={isSubmittingEndorse} className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-950 border border-red-400">
                    {isSubmittingEndorse ? 'Recording...' : ui.confirmBtn}
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
            key="manifesto-email-modal"
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            initialLang={lang}
          />
        )}
      </AnimatePresence>

      {/* Emergency Hotlines */}
      <section className="bg-stone-900 rounded-3xl p-4 sm:p-5 flex flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3 text-sm text-stone-200">
          <PhoneCall size={16} className="text-red-400 animate-bounce" />
          <span>{ui.forestRrt}</span>
          <a href="tel:18004256100" title="Tap to call Gudalur Forest Rapid Response Team" className="font-mono font-bold text-red-300 hover:text-red-200 hover:underline">1800 425 6100</a>
          <span className="text-stone-500">/</span>
          <span>{ui.medical}</span>
          <a href="tel:108" title="Tap to call Ambulance 108" className="font-mono font-bold text-red-300 hover:text-red-200 hover:underline">108</a>
        </div>
      </section>

      {/* TAKE ACTION — one clear row at the natural end of the read */}
      <section className="pt-2 pb-4">
        <div className="rounded-3xl bg-stone-900 border border-red-900/50 shadow-xl px-4 py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center gap-2 sm:block sm:text-center sm:pr-4 sm:border-r border-stone-700/70 shrink-0">
              <div className="text-2xl font-black text-red-400 leading-none">{signaturesCount.toLocaleString()}</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-wide">{ui.endorsements}</div>
            </div>

            <div className="grid grid-cols-4 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2">
              <button
                onClick={() => requireRegistered(() => setShowSignModal(true))}
                title="Sign & Endorse the Proclamation"
                className="w-full sm:w-16 h-16 rounded-2xl bg-gradient-to-b from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-950/40 transition flex flex-col items-center justify-center gap-1.5"
              >
                {hasEndorsed ? <CheckCircle2 size={18} className="text-emerald-300" /> : <Flame size={18} className="text-amber-300" />}
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{hasEndorsed ? ui.tabs.endorsed : ui.tabs.endorse}</span>
              </button>

              <button
                onClick={() => requireRegistered(() => setShowEmailModal(true))}
                title="Send Official Email to CM & NTCA"
                className="w-full sm:w-16 h-16 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white shadow-md transition flex flex-col items-center justify-center gap-1.5 border border-red-900/40"
              >
                <Mail size={18} className="text-red-400" />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none text-stone-200">{ui.tabs.email}</span>
              </button>

              <button
                onClick={() => requireRegistered(shareOnWhatsApp)}
                title="Share on WhatsApp"
                className="w-full sm:w-16 h-16 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/30 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Share2 size={18} />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{ui.tabs.share}</span>
              </button>

              <button
                onClick={() => requireRegistered(handleDownloadPdf)}
                title="Download the signed memorandum PDF"
                className="w-full sm:w-16 h-16 rounded-2xl bg-gradient-to-b from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-md transition flex flex-col items-center justify-center gap-1.5"
              >
                <Download size={18} />
                <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{ui.tabs.pdf}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Closing salutation */}
      <p className="text-center font-serif font-black text-amber-300/90 text-sm sm:text-base tracking-[0.25em] pb-2">
        जय हिन्द • JAI HIND 🇮🇳
      </p>
    </div>
  );
};

export default Manifesto;
