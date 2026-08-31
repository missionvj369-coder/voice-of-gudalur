import React, { useState, useEffect, useContext } from 'react';
import {
  Flame,
  Mic,
  FileBarChart2,
  Mail,
  Download,
  Lock,
  Share2,
  CheckCircle2,
  AlertTriangle,
  PhoneCall,
  ChevronRight,
  Instagram,
  Facebook,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANIFESTO_DATA, ManifestoContent } from '../data/manifestoData';
import { MANIFESTO_UI } from '../data/manifestoUi';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { IdModalContext } from '../components/Layout/Shell';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { Link, useSearchParams } from 'react-router-dom';
import { db, isSupabaseConfigured, savePendingSignature, getPendingLedgerCount } from '../lib/supabase';
import { sanitizeText, checkRateLimit } from '../lib/security';
import { CAMPAIGN_GOAL, VOG_WHATSAPP_NUMBER } from '../constants';
import toast from 'react-hot-toast';
import crisisImg from '../assets/images/gudalur_crisis_blood_1787476675818.jpg';
import { LiveCounterBar } from '../components/Manifesto/LiveCounterBar';
import { CorridorMap } from '../components/Map/CorridorMap';
import { generatePolicyBriefPdf } from '../utils/policyBriefGenerator';

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

  // WhatsApp Voice reporting — reserved for verified residents who completed the full civic
  // journey (registered + signed + official email docket). Enforced again on the intake
  // receiver, which only accepts media from these registered numbers.
  const voiceEligible = isRegistered && hasSigned && !!emailSubmissionRef;
  const whatsappProvisioned = /^91[6-9]\d{8}$/.test(VOG_WHATSAPP_NUMBER);

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
    // Client-side rate limit: max 3 attempts / 60s to prevent spam bursts.
    const rl = checkRateLimit('manifesto-sign', 3, 60_000);
    if (!rl.allowed) {
      toast.error(`Too many attempts — please wait ${Math.ceil(rl.retryInMs / 1000)}s before trying again.`);
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
          name: sanitizeText(profile!.name, 120),
          locality: sanitizeText(profile!.localityName || 'Gudalur', 120),
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
        name: sanitizeText(profile.name, 120),
        locality: sanitizeText(profile.localityName || 'Gudalur', 120),
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

  // Official briefing document for the authorities — zero-server, generated in-browser.
  const handlePolicyBrief = async () => {
    const rl = checkRateLimit('policy-brief', 3, 60_000);
    if (!rl.allowed) {
      toast.error(`Please wait ${Math.ceil(rl.retryInMs / 1000)}s before generating again.`);
      return;
    }
    let dockets: number | null = null;
    if (isSupabaseConfigured()) {
      const { count } = await db.getManifestoSubmissionCount();
      dockets = count;
    }
    const doc = generatePolicyBriefPdf({
      signaturesCount,
      docketCount: dockets,
      generatedBy: profile?.gudalurId || undefined,
    });
    try {
      const blobUrl = doc.output('bloburl') as unknown as string;
      window.open(blobUrl, '_blank', 'noopener');
    } catch {
      /* the download is already in progress */
    }
    toast.success('Gudalur Human-Wildlife Conflict — Situation Report generated.', { icon: '📊' });
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
      icon: <Flame size={20} className="text-white" />,
      onClick: () => {
        if (hasSigned) {
          toast.success('You have already signed — one signature per resident, permanently recorded in the ledger.');
          return;
        }
        requireRegistered(() => setShowSignModal(true));
      },
      titleAttr: hasSigned ? 'You have already signed this petition' : 'Sign the petition and show your support',
      border: hasSigned ? 'border-emerald-600 bg-emerald-600 hover:bg-emerald-500' : 'border-amber-600 bg-amber-600 hover:bg-amber-500',
      iconBox: 'bg-white/15',
      iconColor: 'text-white',
    },
    {
      key: 'email',
      title: ui.tabs.email,
      sub: ui.actionSubs.email,
      icon: <Mail size={20} className="text-white" />,
      onClick: () => requireRegistered(() => setShowEmailModal(true)),
      titleAttr: 'Send the official petition email straight to the Chief Minister and all related departments',
      border: 'border-blue-600 bg-blue-600 hover:bg-blue-500',
      iconBox: 'bg-white/15',
      iconColor: 'text-white',
    },
    {
      key: 'share',
      title: ui.tabs.share,
      sub: ui.actionSubs.share,
      icon: <Share2 size={20} className="text-white" />,
      onClick: () => requireRegistered(shareOnWhatsApp),
      titleAttr: 'Spread the petition on WhatsApp and social media',
      border: 'border-[#25D366] bg-[#25D366] hover:bg-[#1eb85a]',
      iconBox: 'bg-white/15',
      iconColor: 'text-white',
    },
    {
      key: 'pdf',
      title: ui.tabs.pdf,
      sub: emailSubmissionRef ? ui.actionSubs.pdf : ui.actionSubs.pdfLocked,
      icon: emailSubmissionRef ? <Download size={20} className="text-white" /> : <Lock size={20} className="text-slate-400" />,
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
      border: emailSubmissionRef ? 'border-indigo-600 bg-indigo-600 hover:bg-indigo-500' : 'border-slate-700 bg-slate-800',
      iconBox: emailSubmissionRef ? 'bg-white/15' : 'bg-slate-700/40',
      iconColor: emailSubmissionRef ? 'text-white' : 'text-slate-400',
    },
    {
      key: 'brief',
      title: 'Policy Brief — Situation Report',
      sub: 'Gudalur human-wildlife conflict report for authorities — print-ready',
      icon: <FileBarChart2 size={20} className="text-white" />,
      onClick: () => { handlePolicyBrief(); },
      titleAttr: 'Generate the official Gudalur conflict situation report (PDF)',
      border: 'border-[#1B241E] bg-[#22302A] hover:bg-[#2A3A32]',
      iconBox: 'bg-white/15',
      iconColor: 'text-white',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-6 relative">

      {/* Live movement metrics — realtime Supabase ledger over WebSocket */}
      <LiveCounterBar />

      {/* Masthead — borderless editorial opener */}
      <section className="pt-10 pb-2 text-center px-2">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-500">Initiative by Universal Guard Trust</p>
        <h1 className="mt-3 text-4xl sm:text-6xl font-serif font-black tracking-tight leading-none headline-ivory">
          Voice of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#E67E22] to-[#D4AF37]">Gudalur</span>
        </h1>
        <p className="mt-4 text-[10px] sm:text-xs uppercase tracking-[0.25em] text-slate-400 font-bold">One community · One voice · The Right to Life</p>
      </section>

      {/* HERO — cinematic full-bleed image, pure typography, no boxes */}
      <section className="relative overflow-hidden text-[#F4F1EA]">
        <div className="absolute inset-0 z-0">
          <img
            src={crisisImg}
            alt=""
            className="w-full h-full object-cover object-center brightness-[0.45]"
            loading="eager"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0E0C]/85 via-[#0D1310]/55 to-[#0D1310]" />
        </div>
        <div className="relative z-10 px-5 py-16 sm:py-24 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-serif font-black tracking-tight leading-[1.05] text-white">
            {manifesto.title}
          </h2>
          <p className="mt-6 text-base sm:text-xl text-slate-300 font-serif italic leading-relaxed">
            "{manifesto.subtitle}"
          </p>
          <p className="mt-10 text-sm sm:text-base font-serif text-stone-100 leading-relaxed text-left max-w-2xl mx-auto first-letter:float-left first-letter:text-5xl first-letter:leading-[0.85] first-letter:font-black first-letter:text-[#D4AF37] first-letter:mr-2 first-letter:mt-1">
            {manifesto.proclamation}
          </p>
        </div>
      </section>

      {/* Part I — borderless editorial flow */}
      <section className="px-2 sm:px-6 pt-16 pb-4 text-[#F4F1EA] space-y-6 content-visibility-auto">
        <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight leading-tight max-w-3xl">
          {manifesto.sections[0].title}
        </h2>
        <div className="text-stone-300 text-base sm:text-lg leading-relaxed space-y-5 font-sans max-w-3xl">
          {manifesto.sections[0].content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
        <p className="text-xs sm:text-sm max-w-3xl leading-relaxed">
          <AlertTriangle size={13} className="text-amber-500 inline -mt-0.5 mr-1.5" />
          <strong className="text-amber-500 uppercase tracking-wide">Documented frontline conflict zones:</strong>{' '}
          <span className="text-stone-300">Lauriston (O'Valley), Cherambadi, Seaforth, Glenrock, Mayfield, Pandalur fringe tea estates.</span>
        </p>

        {/* Interactive GIS — the 11 blocked corridors + frontline hotspots */}
        <div className="pt-6 max-w-3xl space-y-2.5">
          <CorridorMap height="400px" />
          <p className="text-[10px] text-stone-500 font-mono">
            Interactive GIS · 11 blocked migratory corridors and documented conflict zones · tap any marker for the ground report
          </p>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* Part II — The Hard Truth, big-number editorial */}
      <section className="px-2 sm:px-6 pt-14 pb-4 text-[#F4F1EA] space-y-8 content-visibility-auto">
        <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight leading-tight max-w-3xl">
          {manifesto.sections[1].title}
        </h2>
        <p className="text-stone-300 text-base sm:text-lg font-medium max-w-3xl">{manifesto.sections[1].content[0]}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-10">
          {manifesto.sections[1].highlights?.map((item, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-800 leading-none">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">{item.badge}</span>
              </div>
              <h3 className="font-serif font-bold text-lg text-white leading-snug">{item.heading}</h3>
              <p className="text-sm text-stone-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* Part III — Non-Negotiable Demands, institutional statement band */}
      <section className="mt-10 bg-gradient-to-b from-[#1B241E]/70 via-[#16201A] to-transparent px-5 sm:px-10 py-14 text-[#F4F1EA] space-y-8 content-visibility-auto">
        <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight leading-tight max-w-3xl">
          {manifesto.sections[2].title}
        </h2>
        <p className="text-stone-300 text-base sm:text-lg font-medium max-w-3xl">{manifesto.sections[2].content[0]}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
          {manifesto.sections[2].highlights?.map((item, idx) => (
            <div key={idx} className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)] shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">{item.badge}</span>
              </div>
              <h3 className="font-serif font-bold text-xl text-white leading-snug">{item.heading}</h3>
              <p className="text-sm text-stone-300 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ground Reality — testimonial in pure typography */}
      <section className="px-2 sm:px-6 pt-16 pb-2">
        <div className="quote-card max-w-3xl mx-auto">
          <blockquote>
            <p className="text-xl sm:text-2xl font-serif italic leading-relaxed text-[#F4F1EA]">
              &ldquo;{ui.quote}&rdquo;
            </p>
            <footer className="text-stone-500 text-xs mt-4 font-bold uppercase tracking-[0.2em]">
              {ui.quoteBy}
            </footer>
          </blockquote>
        </div>
      </section>

      {/* Call to Action — full-bleed institutional band, borderless */}
      <section className="mt-12 bg-gradient-to-b from-[#1B241E]/70 via-[#141B16]/85 to-[#0D1310] px-5 sm:px-10 py-14 text-[#F4F1EA] text-center content-visibility-auto">
        <div className="max-w-3xl mx-auto space-y-7">
          <h3 className="text-3xl sm:text-5xl font-serif font-black tracking-tight leading-[1.05] headline-ivory">
            {ui.weptTitle}
          </h3>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {ui.weptSub}
          </p>
          {/* Campaign momentum — live ledger count vs milestone goal */}
          <div className="pt-2 text-left">
            <div className="flex items-end justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D4AF37]">Campaign momentum</span>
              <span className="text-xs font-mono font-bold text-[#F4F1EA]">
                {signaturesCount.toLocaleString('en-IN')} / {CAMPAIGN_GOAL.toLocaleString('en-IN')} signatures
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-white/[0.07] overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E67E22] transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, (signaturesCount / CAMPAIGN_GOAL) * 100)}%` }}
                role="progressbar"
                aria-valuenow={signaturesCount}
                aria-valuemin={0}
                aria-valuemax={CAMPAIGN_GOAL}
                aria-label={`Petition signatures toward ${CAMPAIGN_GOAL.toLocaleString('en-IN')} goal`}
              />
            </div>
          </div>
          <div className="space-y-3 pt-6 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 text-center">
              Take all four steps — one after another
            </p>
            {ctaActions.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                title={a.titleAttr}
                className={`w-full py-4 px-5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 backdrop-blur-sm ${a.border} hover:brightness-125 hover:scale-[1.01] active:scale-[0.99]`}
              >
                <span className="flex items-center gap-3.5 min-w-0">
                  <span className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${a.iconBox}`}>
                    {a.icon}
                  </span>
                  <span className="text-left min-w-0">
                    <span className={`block font-black text-sm sm:text-base leading-tight text-white ${a.iconColor}`}>{a.title}</span>
                    <span className="block text-[11px] text-white/60 leading-snug">{a.sub}</span>
                  </span>
                </span>
                <ChevronRight size={18} className="text-white/50 shrink-0" />
              </button>
            ))}

            {/* WhatsApp Voice Report — gated to verified residents (registered + signed + docket).
                The desk number is provisioned in src/constants (VOG_WHATSAPP_NUMBER); until then
                the card renders locked so the promise is visible without faking availability. */}
            <div
              className={`w-full py-4 px-5 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-sm transition ${
                voiceEligible && whatsappProvisioned
                  ? 'border-[#25D366]/60 bg-[#25D366]/10'
                  : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <span
                  className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${
                    voiceEligible && whatsappProvisioned ? 'bg-[#25D366]/25' : 'bg-slate-700/40'
                  }`}
                >
                  {voiceEligible && whatsappProvisioned ? (
                    <Mic size={20} className="text-white" />
                  ) : (
                    <Lock size={20} className="text-slate-400" />
                  )}
                </span>
                <span className="text-left min-w-0">
                  <span
                    className={`block font-black text-sm sm:text-base leading-tight ${
                      voiceEligible && whatsappProvisioned ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    WhatsApp Voice Report
                  </span>
                  {!whatsappProvisioned ? (
                    <span className="block text-[11px] text-white/60 leading-snug">
                      Official voice desk being provisioned — arriving soon.
                    </span>
                  ) : voiceEligible ? (
                    <span className="block text-[11px] text-white/60 leading-snug">
                      Send a voice note to the movement's verified desk — in your own language.
                    </span>
                  ) : (
                    <span className="block text-[11px] text-white/60 leading-snug">
                      Exclusively for residents who registered, signed, AND sent the official email —{' '}
                      <span className="text-white/85 font-bold">
                        {isRegistered
                          ? hasSigned
                            ? '✓ Signed'
                            : 'next: Sign the petition'
                          : 'next: Register your Gudalur ID'}
                        {!emailSubmissionRef && hasSigned ? ' → send the email' : ''}
                      </span>
                    </span>
                  )}
                </span>
              </span>
              {voiceEligible && whatsappProvisioned && (
                <a
                  href={`https://wa.me/${VOG_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Voice report from ${profile?.name || 'a verified resident'}\nGudalur ID: ${
                      profile?.gudalurId || ''
                    }\nDocket: ${emailSubmissionRef || ''}\n\n(Attaching my voice note describing the sighting/issue with my location)`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the movement's verified WhatsApp desk and attach your voice note"
                  className="shrink-0 rounded-xl bg-[#25D366] hover:bg-[#1eb85a] text-white text-[11px] font-black uppercase tracking-wide px-3.5 py-2.5 min-h-[48px] flex items-center transition"
                >
                  Open chat
                </a>
              )}
            </div>
          </div>
          <p className="font-serif font-black text-amber-300 text-xl sm:text-2xl pt-4 tracking-tight">{manifesto.callToAction.closing}</p>
        </div>
      </section>

      {/* Follow the movement — official channels */}
      <section className="pt-1 pb-4">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">Follow the movement</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
          {([
            { icon: <Instagram size={15} />, label: 'Voice of India', href: 'https://www.instagram.com/voice_of_india_voi?igsi=bGg4aXA0MjRueHp2&utm_source=qr' },
            { icon: <Instagram size={15} />, label: 'Voice for Gudalur', href: 'https://www.instagram.com/voice_for_gudalur?igsi=MXU2ajg4cjF6emt5Zg%3D%3D&utm_source=qr' },
            { icon: <Instagram size={15} />, label: 'Universal Guard Trust', href: 'https://www.instagram.com/universalguardtrust?igsi=ZXo3am9idm9kcWll&utm_source=qr' },
            { icon: <Facebook size={15} />, label: 'Facebook', href: 'https://www.facebook.com/share/198eCSR3p3/?mibextid=wwXIfr' },
          ]).map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-stone-200 transition hover:bg-amber-600/25 hover:text-white"
            >
              {s.icon}
              {s.label}
            </a>
          ))}
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
              className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-600 text-white p-6 sm:p-8 shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-600/30 text-amber-400 border border-amber-500/50">
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
                  <button type="submit" disabled={isSubmittingEndorse} className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs shadow-lg shadow-amber-950 border border-amber-400">
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

      {/* Public docket verification — authenticity check for officials & citizens */}
      <div className="flex items-center justify-center py-1">
        <Link
          to="/verify-docket"
          className="text-[11px] font-mono font-bold text-[#D4AF37] hover:text-[#F4F1EA] underline underline-offset-4 decoration-[#D4AF37]/40 min-h-[48px] flex items-center"
        >
          Verify an official docket number →
        </Link>
      </div>

      {/* Emergency Hotlines */}
      <section className="bg-[#16201A] rounded-3xl p-4 sm:p-5 shadow-xl border border-white/[0.06]">
        <div className="flex items-center gap-4 text-sm text-stone-200 overflow-x-auto no-scrollbar snap-x">
          <span className="hidden sm:inline text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37] shrink-0">Emergency</span>
          <PhoneCall size={16} className="text-[#E67E22] animate-bounce shrink-0" />
          <span className="shrink-0 whitespace-nowrap">{ui.forestRrt}</span>
          <a href="tel:18004256100" title="Tap to call Gudalur Forest Rapid Response Team" className="shrink-0 whitespace-nowrap min-h-[48px] flex items-center font-mono font-bold text-[#D4AF37] hover:text-[#F4F1EA] hover:underline">1800 425 6100</a>
          <span className="text-stone-500 shrink-0">/</span>
          <span className="shrink-0 whitespace-nowrap">{ui.medical}</span>
          <a href="tel:108" title="Tap to call Ambulance 108" className="shrink-0 whitespace-nowrap min-h-[48px] flex items-center font-mono font-bold text-[#D4AF37] hover:text-[#F4F1EA] hover:underline">108</a>
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
