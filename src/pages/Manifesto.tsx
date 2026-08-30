import React, { useState, useEffect, useContext } from 'react';
import {
  Flame,
  Mail,
  Download,
  Lock,
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
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANIFESTO_DATA, ManifestoContent } from '../data/manifestoData';
import { MANIFESTO_UI } from '../data/manifestoUi';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { IdModalContext } from '../components/Layout/Shell';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { useSearchParams } from 'react-router-dom';
import { db, isSupabaseConfigured, savePendingSignature, getPendingLedgerCount } from '../lib/supabase';
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
  const [hasSigned, setHasSigned] = useState<boolean>(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isSubmittingEndorse, setIsSubmittingEndorse] = useState(false);
  // Official submission docket returned from Supabase when the citizen confirms the email was sent.
  const [emailSubmissionRef, setEmailSubmissionRef] = useState<string | null>(null);

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

  const [emailSubmissionAt, setEmailSubmissionAt] = useState<string | null>(null);
  // Restore this resident's official status from the cloud ledger: the already-signed flag
  // and the docket ref of the latest email submission (keeps the PDF unlocked after a refresh).
  useEffect(() => {
    let cancelled = false;
    const gid = profile?.gudalurId;
    if (!gid) { setHasSigned(false); setEmailSubmissionRef(null); return; }
    db.checkManifestoSignature(gid).then((signed) => { if (!cancelled) setHasSigned(signed); });
    db.getLatestManifestoSubmission(gid).then((sub) => {
      if (cancelled) return;
      if (sub?.docketRef) setEmailSubmissionRef(sub.docketRef);
      // The REAL sent-time from the ledger — printed on the PDF instead of the download time.
      setEmailSubmissionAt(sub?.createdAt || null);
    });
    return () => { cancelled = true; };
  }, [profile?.gudalurId]);

  // Guided civic journey: after registration the citizen is brought straight to the
  // petition signature; after signing, straight to the official email.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const step = searchParams.get('auto');
    if (!step) return;
    if (step === 'sign' && isRegistered && !hasSigned) setShowSignModal(true);
    else if (step === 'sign' && isRegistered && hasSigned) setShowEmailModal(true);
    else if (step === 'email' && isRegistered) setShowEmailModal(true);
    searchParams.delete('auto');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, isRegistered, hasSigned]);

  const handleEndorse = async (_e?: React.FormEvent) => {
    _e?.preventDefault();
    // One signature per resident — once signed, the option is permanently closed.
    if (hasSigned) {
      setShowSignModal(false);
      toast.success('You have already signed this petition — your support is on record.');
      return;
    }
    // Identity is auto-detected from the registered Gudalur Resident Card - no manual typing needed.
    if (!profile?.name || !profile?.phone || !profile?.gudalurId) {
      setShowSignModal(false);
      openIdModal();
      toast.error('Please register your Gudalur Resident Card first so your signature is a real, verifiable record.');
      return;
    }
        setIsSubmittingEndorse(true);
    try {
      if (!isSupabaseConfigured()) {
        // Cloud ledger not yet live — record the intent locally so it is
        // never lost.  A banner in the header shows how many are pending.
        const saved = savePendingSignature({
          name: profile!.name,
          locality: profile!.localityName || 'Gudalur',
          contact: profile!.phone,
          gudalur_id: profile!.gudalurId,
          signed_at: Date.now(),
          source: 'manifesto',
        });
        if (saved) {
          setSignaturesCount((c) => c + 1);
          setHasSigned(true);
        }
        setShowSignModal(false);
        toast('Signature recorded on your device 📋 — it will sync to the official ledger once the platform goes live.', {
          icon: '📋',
          duration: 6000,
        });
        return;
      }
      const { error, alreadySigned } = await db.addManifestoSignature({
        name: profile.name,
        locality: profile.localityName || 'Gudalur',
        contact: profile.phone,
        gudalur_id: profile.gudalurId,
      });
      if (error) { toast.error('Could not register your signature. Please check your connection and try again.'); return; }
      if (!alreadySigned) setSignaturesCount((c) => c + 1);
      setHasSigned(true);
      setShowSignModal(false);
      toast.success(alreadySigned
        ? 'You have already signed this petition — your support is on record.'
        : 'Your signature is registered as a real, verifiable record.');
      // Guided flow: straight from signing into the official email step.
      if (!alreadySigned) setTimeout(() => setShowEmailModal(true), 900);
    } catch (err) {
      console.error('Signature error:', err);
      toast.error('Could not register your signature. Please try again.');
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
    text += `🇮🇳 *Stand with us as Voice of Gudalur!*\n`;
    text += `Read, Sign & Send Email to CM:\n${window.location.origin}/`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  };

  const handleWhatsAppShare = () => requireRegistered(shareOnWhatsApp);

  const handleDownloadPdf = () => {
    if (!profile?.name || !profile?.phone || !profile?.gudalurId) return;
    const doc = generateManifestoPdf({
      manifesto,
      lang,
      signaturesCount,
      resident: {
        name: profile.name,
        locality: profile.localityName || 'Gudalur',
        phone: profile.phone,
        email: profile.email,
        gudalurId: profile.gudalurId,
        pincode: profile.pincode,
      },
      submissionRef: emailSubmissionRef || undefined,
      // Ledger time of the recorded dispatch — the PDF never shows the download time.
      dispatchedAt: emailSubmissionAt
        ? new Date(emailSubmissionAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
        : undefined,
    });
    // Open the freshly generated PDF in a new tab so it can be PRINTED directly.
    try {
      const blobUrl = doc.output('bloburl') as unknown as string;
      window.open(blobUrl, '_blank', 'noopener');
    } catch {
      /* the download is already in progress — print from the browser's PDF viewer */
    }
    toast.success('Your signed petition PDF is downloading — use Print in the new tab too.', { icon: '📄' });
  };

  // One shared, stacked action list — used at the end of the read and in the hero CTA.
  // Kept as a single source of truth so the two sections never drift.
  const ctaActions: {
    key: string;
    icon: React.ReactNode;
    title: string;
    sub: string;
    onClick: () => void;
    titleAttr: string;
    border: string;
    iconBox: string;
    iconColor: string;
  }[] = [
    {
      key: 'sign',
      title: hasSigned ? ui.tabs.endorsed : ui.tabs.endorse,
      sub: hasSigned ? ui.actionSubs.signed : ui.actionSubs.endorse,
      icon: <Flame size={20} className={hasSigned ? 'text-emerald-300' : 'text-red-200'} />,
      onClick: () => {
        if (hasSigned) {
          toast.success('You have already signed — one signature per resident, permanently recorded in the ledger.');
          return;
        }
        requireRegistered(() => setShowSignModal(true));
      },
      titleAttr: hasSigned ? 'You have already signed this petition' : 'Sign the petition and show your support',
      border: hasSigned ? 'border-emerald-700/70 bg-emerald-950/50' : 'border-rose-500/80 bg-gradient-to-br from-red-800/80 via-red-900/70 to-red-950/70',
      iconBox: hasSigned ? 'bg-emerald-600/30' : 'bg-gradient-to-br from-rose-500/40 to-red-600/40',
      iconColor: hasSigned ? 'text-emerald-300' : 'text-rose-100',
    },
    {
      key: 'email',
      title: ui.tabs.email,
      sub: ui.actionSubs.email,
      icon: <Mail size={20} className="text-indigo-200" />,
      onClick: () => requireRegistered(() => setShowEmailModal(true)),
      titleAttr: 'Send the official petition email straight to the Chief Minister and all related departments',
      border: 'border-violet-500/60 bg-gradient-to-br from-violet-900/60 to-indigo-950/60',
      iconBox: 'bg-gradient-to-br from-violet-500/35 to-indigo-600/35',
      iconColor: 'text-violet-200',
    },
    {
      key: 'share',
      title: ui.tabs.share,
      sub: ui.actionSubs.share,
      icon: <Share2 size={20} className="text-green-300" />,
      onClick: () => requireRegistered(shareOnWhatsApp),
      titleAttr: 'Spread the petition on WhatsApp and social media',
      border: 'border-emerald-500/60 bg-gradient-to-br from-emerald-900/60 to-green-950/60',
      iconBox: 'bg-gradient-to-br from-emerald-500/35 to-green-600/35',
      iconColor: 'text-emerald-200',
    },
    {
      key: 'pdf',
      title: ui.tabs.pdf,
      sub: emailSubmissionRef ? ui.actionSubs.pdf : ui.actionSubs.pdfLocked,
      icon: emailSubmissionRef ? <Download size={20} className="text-amber-300" /> : <Lock size={20} className="text-slate-400" />,
      onClick: () => {
        if (!isRegistered) { requireRegistered(() => setShowEmailModal(true)); return; }
        if (!emailSubmissionRef) {
          // Flow gate: the PDF is generated from the recorded submission — no email sent, no PDF.
          toast.error('Send the official email first — your PDF carries your recorded docket number as proof.');
          setShowEmailModal(true);
          return;
        }
        handleDownloadPdf();
      },
      titleAttr: emailSubmissionRef ? 'Download the petition copy to print and submit' : 'Available after your official email is sent',
      border: emailSubmissionRef ? 'border-amber-400/70 bg-gradient-to-br from-amber-800/60 to-amber-950/60' : 'border-slate-800/60 bg-slate-900/50',
      iconBox: emailSubmissionRef ? 'bg-gradient-to-br from-amber-400/35 to-amber-600/35' : 'bg-slate-700/40',
      iconColor: emailSubmissionRef ? 'text-amber-200' : 'text-slate-400',
    },
  ];

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
          <div className="space-y-2.5 pt-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 text-center">
              Take all four steps — one after another
            </p>
            {ctaActions.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                title={a.titleAttr}
                className={`w-full py-3.5 px-4 rounded-2xl border-2 transition flex items-center justify-between gap-3 ${a.border} hover:brightness-125`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${a.iconBox}`}>
                    {a.icon}
                  </span>
                  <span className="text-left min-w-0">
                    <span className={`block font-black text-sm leading-tight text-white ${a.iconColor}`}>{a.title}</span>
                    <span className="block text-[10px] text-slate-400 leading-snug">{a.sub}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="text-slate-500 shrink-0" />
              </button>
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
            initialDocketRef={emailSubmissionRef}
            onSubmissionRecorded={(ref) => setEmailSubmissionRef(ref)}
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

      {/* Closing salutation */}
      <p className="text-center font-serif font-black text-amber-300/90 text-sm sm:text-base tracking-[0.25em] pb-2">
        जय हिन्द • JAI HIND 🇮🇳
      </p>
    </div>
  );
};

export default Manifesto;
