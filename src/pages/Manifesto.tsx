import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Flame, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  ArrowRight, 
  Building2, 
  Cpu, 
  Radio, 
  TreePine, 
  PhoneCall, 
  Scale, 
  Users, 
  HeartHandshake,
  Check,
  ChevronRight,
  Compass,
  Mail,
  Send,
  Copy,
  Globe,
  ShieldCheck,
  Skull,
  Crosshair,
  Footprints
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage, type Language } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { MANIFESTO_DATA, ManifestoContent } from '../data/manifestoData';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { db } from '../lib/supabase';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import crisisBloodBg from '../assets/images/gudalur_crisis_blood_1787476675818.jpg';

export const Manifesto: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { profile } = useAuth();

  const manifesto: ManifestoContent = MANIFESTO_DATA[lang] || MANIFESTO_DATA.en;

  // Signatures / Endorsements state — starts at 0; only REAL rows from Supabase are counted.
  const [signaturesCount, setSignaturesCount] = useState<number>(0);

  const [hasEndorsed, setHasEndorsed] = useState<boolean>(() => {
    return localStorage.getItem('onegudalur_has_endorsed_manifesto') === 'true';
  });

  const [endorserName, setEndorserName] = useState(profile?.name || '');
  const [endorserLocality, setEndorserLocality] = useState(profile?.localityName || 'O\'Valley');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSelectedLang, setEmailSelectedLang] = useState<Language>(lang);
  // Official email submission proof — unlocks the signed PDF ONLY after a real submission record.
  const [submissionRef, setSubmissionRef] = useState<string | null>(null);
  const [isSubmittingEndorse, setIsSubmittingEndorse] = useState(false);

  // Sync selected email lang when app lang changes
  useEffect(() => {
    setEmailSelectedLang(lang);
  }, [lang]);

  // Sync endorsement count from Supabase (falls back to cached count offline)
  useEffect(() => {
    let cancelled = false;
    db.getManifestoSignatureCount()
      .then(({ count }) => {
        if (!cancelled && typeof count === 'number' && count >= 0) {
          setSignaturesCount(count);
        }
      })
      .catch((err) => {
        console.warn('Supabase manifesto sync warning:', err);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  

  // Handle Endorsement Submit — only records a REAL, identified resident endorsement.
  const handleEndorse = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (endorserName.trim() || profile?.name || '').trim();
    const loc = (endorserLocality.trim() || profile?.localityName || 'Local Gudalur').trim();

    if (!name) {
      toast.error('Please enter your full name.');
      return;
    }
    // A genuine endorsement needs a registered Gudalur Resident Card so it stays a real, verifiable record.
    if (!profile?.phone || !profile?.gudalurId) {
      setShowSignModal(false);
      toast.error('Please register your Gudalur Resident Card first so your endorsement is a real, verifiable record.');
      return;
    }

    setIsSubmittingEndorse(true);
    try {
      const { error } = await db.addManifestoSignature({
        name,
        locality: loc,
        contact: profile.phone,
        gudalur_id: profile.gudalurId,
      });
      if (error) {
        toast.error('Could not register your endorsement. Please check your connection and try again.');
        return;
      }
      // Only reflect a genuine, DB-confirmed endorsement.
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

  // WhatsApp Broadcast
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
    text += `3. 24/7 Decentralized Rapid Response Teams (RRTs) in O'Valley, Cherambadi & Pandalur.\n`;
    text += `4. Immediate eradication of Lantana ambush overgrowth.\n\n`;
    text += `🇮🇳 *Stand with us as One Voice of Gudalur!*\n`;
    text += `Read, Sign & Send Email to CM:\n${window.location.origin}/`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // PDF Generation — allowed ONLY after an official email submission has been recorded.
  const handleDownloadPdf = () => {
    if (!submissionRef) {
      setShowEmailModal(true);
      toast('Send the official email to the authorities first — your signed PDF proof unlocks after submission.', { icon: '🔒' });
      return;
    }
    generateManifestoPdf(
      manifesto,
      lang,
      signaturesCount,
      profile?.name || (hasEndorsed ? endorserName : undefined),
      profile?.localityName || endorserLocality,
      submissionRef
    );
    toast.success('Downloaded your signed memorandum with official submission proof.');
  };

  // Invoked after the email modal records a REAL submission — unlocks & auto-downloads the signed PDF.
  const handleEmailSubmitted = (ref: string) => {
    setSubmissionRef(ref);
    setShowEmailModal(false);
    generateManifestoPdf(
      manifesto,
      lang,
      signaturesCount,
      profile?.name || (hasEndorsed ? endorserName : undefined),
      profile?.localityName || endorserLocality,
      ref
    );
    toast.success(`Official submission recorded (${ref}). Your signed PDF is ready.`, { icon: '📄' });
  };

  return (
    <div className="space-y-12 pb-20 relative">

      {/* Blood Atmospheric Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-40">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-900/20 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 right-10 w-[500px] h-[500px] bg-rose-950/30 rounded-full blur-[160px]" />
        <div className="absolute bottom-10 left-10 w-[600px] h-[600px] bg-red-950/20 rounded-full blur-[150px]" />
      </div>

      {/* 1. Dramatic "Blooded" Hero Section with Elephant & Tiger Attack Visual Background */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-red-900/70 text-white z-10">
        
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src={crisisBloodBg} 
            alt="Gudalur Human Wildlife Crisis - Elephants and Tigers Confrontation"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.45] contrast-125 saturate-150"
          />
          {/* Blood-Red & Onyx Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-red-950/75 to-black/85" />
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-black/50 to-black/90" />
          {/* Subtle Blood-Red Scanline/Texture */}
          <div className="absolute inset-0 bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-12 lg:p-14 max-w-5xl space-y-7">
          
          {/* Top Badges & Language Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-800/40 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-red-700/80 text-white border border-red-500 text-xs font-black uppercase tracking-wider shadow-lg shadow-red-950">
                <Flame size={14} className="text-amber-300 animate-pulse" />
                <span>{manifesto.badge}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/60 text-red-300 border border-red-900/80 text-xs font-semibold backdrop-blur-md">
                <ShieldAlert size={14} className="text-red-400" />
                <span>Article 21: Right to Life</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-950/70 text-amber-300 border border-red-800/60 text-xs font-semibold backdrop-blur-md animate-pulse">
                <Skull size={13} className="text-red-400" />
                <span>Human Tragedy Crisis Zone</span>
              </span>
            </div>

            {/* In-Hero Multi-Lingual Switcher */}
            <div className="flex items-center bg-black/80 backdrop-blur-md p-1 rounded-2xl border border-red-900/80 shadow-inner">
              {(['en', 'ta', 'ml', 'kn'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-black transition-all',
                    lang === l
                      ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-950 border border-red-400'
                      : 'text-stone-300 hover:text-white hover:bg-red-950/40'
                  )}
                >
                  {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : l === 'ml' ? 'മലയാളം' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-black tracking-tight leading-tight text-white drop-shadow-[0_4px_12px_rgba(220,38,38,0.5)]">
              {manifesto.title}
            </h1>
            <p className="text-base sm:text-lg text-red-200/95 font-serif italic max-w-3xl leading-relaxed border-l-2 border-red-500 pl-4">
              "{manifesto.subtitle}"
            </p>
          </div>

          {/* Resolute Proclamation Box with Blood Accents */}
          <div className="p-5 sm:p-6 rounded-2xl bg-black/75 backdrop-blur-md border-l-4 border-red-600 border-y border-r border-red-900/60 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase tracking-widest">
              <AlertTriangle size={15} className="text-red-500" />
              <span>Gudalur Frontline Reality</span>
            </div>
            <p className="text-base sm:text-lg font-serif font-medium text-stone-100 leading-relaxed">
              {manifesto.proclamation}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Endorse Button */}
            {!hasEndorsed ? (
              <button
                onClick={() => setShowSignModal(true)}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm shadow-xl shadow-red-950/80 border border-red-400/40 transition transform hover:-translate-y-0.5"
              >
                <Flame size={18} className="text-amber-300 animate-pulse" />
                <span>{lang === 'ta' ? 'இப்பிரகடனத்தை ஆதரிக்கிறேன்' : lang === 'ml' ? 'ഞാൻ പിന്തുണയ്ക്കുന്നു' : lang === 'kn' ? 'ಈ ಪ್ರಣಾಳಿಕೆಯನ್ನು ಬೆಂಬಲಿಸಿ' : 'Sign & Endorse Proclamation'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-black/80 border border-red-500 text-red-300 font-bold text-sm backdrop-blur-md">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>{lang === 'ta' ? 'நீங்கள் ஆதரித்துள்ளீர்கள்' : lang === 'ml' ? 'നിങ്ങൾ പിന്തുണച്ചു' : lang === 'kn' ? 'ನೀವು ಬೆಂಬಲಿಸಿದ್ದೀರಿ' : 'You Endorsed This Movement'}</span>
              </div>
            )}

            {/* Send Email Representation Button */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-red-900 to-stone-900 hover:from-red-800 hover:to-stone-800 text-white font-bold text-xs border border-red-600/70 shadow-lg shadow-red-950 transition transform hover:-translate-y-0.5"
            >
              <Mail size={16} className="text-red-400" />
              <span>{lang === 'ta' ? 'அரசுக்கு மின்னஞ்சல் அனுப்புக' : lang === 'ml' ? 'ഇമെയിൽ അയക്കുക' : lang === 'kn' ? 'ಇಮೇಲ್ ಕಳುಹಿಸಿ' : 'Send Official Email to CM & NTCA'}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-700/90 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition border border-emerald-500/40 backdrop-blur-md"
            >
              <Share2 size={16} />
              <span>WhatsApp</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-black/60 hover:bg-stone-900 text-white border border-stone-700 font-bold text-xs transition backdrop-blur-md"
            >
              <Download size={16} />
              <span>{lang === 'ta' ? 'மனு PDF' : lang === 'kn' ? 'ಮನವಿ PDF' : 'Download Docket PDF'}</span>
            </button>
          </div>

          {/* Live Signature Counter Banner */}
          <div className="pt-5 border-t border-red-900/50 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-300">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-red-700 border-2 border-black flex items-center justify-center text-[10px] font-black text-white shadow-md">OG</div>
                <div className="h-8 w-8 rounded-full bg-rose-900 border-2 border-black flex items-center justify-center text-[10px] font-black text-white">OV</div>
                <div className="h-8 w-8 rounded-full bg-stone-800 border-2 border-black flex items-center justify-center text-[10px] font-black text-amber-400">CH</div>
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  {signaturesCount.toLocaleString()} {lang === 'ta' ? 'கூடலூர் குடிமக்கள் கையொப்பம்' : lang === 'kn' ? 'ನಾಗರಿಕ ಬೆಂಬಲಗಳು' : 'Resident Endorsements'}
                </p>
                <p className="text-[11px] text-red-300 font-medium">
                  {lang === 'ta' ? 'ஓவேலி, சேரம்பாடி, பந்தலூர் உள்ளிட்ட 24 விளிம்புப் பகுதிகளிலிருந்து' : 'Across O\'Valley, Cherambadi, Pandalur & 24 Frontline Localities'}
                </p>
              </div>
            </div>

            {/* Direct Gateway to Act for Gudalur Petitions */}
            <Link
              to="/act"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black shadow-lg shadow-emerald-950/50 transition group"
            >
              <span>{lang === 'ta' ? 'அதிகாரப்பூர்வ கோரிக்கைகள் & மனுக்கள்' : lang === 'kn' ? 'ನಾಗರಿಕ ಬೇಡಿಕೆಗಳು & ಮನವಿಗಳು' : 'Act for Gudalur — Petitions & Solutions'}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </section>

      {/* 2. Urgent Live Emergency Lifeline Bar */}
      <section className="bg-gradient-to-r from-red-950 via-stone-900 to-red-950 border-2 border-red-800/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl text-white">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center shrink-0 shadow-inner">
            <PhoneCall size={24} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-600 text-white font-black text-[10px] uppercase tracking-wider">24x7 Emergency</span>
              <h4 className="text-xs sm:text-sm font-bold text-red-200 uppercase tracking-wider">
                {lang === 'ta' ? 'உடனடி அவசர வனத்துறை & ஆம்புலன்ஸ் தொடர்புகள்' : 'Wildlife Attack & Medical Emergency Hotlines'}
              </h4>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Forest Division RRT: <span className="font-mono font-bold text-red-300">1800 425 6100</span> / <span className="font-mono font-bold text-red-300">04262 261262</span> | Medical Ambulance: <span className="font-mono font-bold text-red-300">108</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:18004256100"
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-950 transition"
          >
            Call Forest RRT
          </a>
          <a
            href="tel:108"
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs border border-stone-600 transition"
          >
            Call 108
          </a>
        </div>
      </section>

      {/* 3. The Core Manifesto Sections — Styled with Blooded Intensity */}
      <div className="space-y-10">
        
        {/* Part I: The Silent Grief of Gudalur — Our Homes Have Become Open-Air Cages */}
        <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border-2 border-red-900/60 shadow-2xl space-y-6 relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
            <span className="px-3 py-1 rounded-xl bg-red-900/60 text-red-300 font-black text-xs uppercase tracking-wider border border-red-700/50">
              {manifesto.sections[0].part}
            </span>
            {/* The hero already carries this part's headline — no duplicated title here */}
            {manifesto.sections[0].title && (
              <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                {manifesto.sections[0].title}
              </h2>
            )}
          </div>

          <div className="text-stone-300 text-sm sm:text-base leading-relaxed space-y-4 font-sans">
            {manifesto.sections[0].content.map((paragraph, idx) => (
              <p key={idx}>
                {paragraph}
              </p>
            ))}
          </div>

          {/* Frontline Estate Hotspots Callout */}
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-stone-200 font-medium">
              <AlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>
                <strong className="text-red-400">Documented Frontline Conflict Zones:</strong> Lauriston (O'Valley), Cherambadi, Seaforth, Glenrock, Mayfield, Pandalur fringe tea estates.
              </span>
            </div>
            <Link to="/act" className="text-red-300 font-bold hover:text-white hover:underline flex items-center gap-1">
              <span>Act on This Crisis</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </section>

        {/* Part II: The Hard Truth — Why Are We Dying? */}
        <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-10 border-2 border-red-900/60 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-red-900/40 pb-4">
            <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
              {manifesto.sections[1].part}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
              {manifesto.sections[1].title}
            </h2>
          </div>

          <p className="text-stone-300 text-sm font-medium">
            {manifesto.sections[1].content[0]}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {manifesto.sections[1].highlights?.map((item, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-black/60 hover:bg-red-950/40 border border-red-900/50 hover:border-red-600 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-red-950 text-red-300 border border-red-800">
                      {item.badge}
                    </span>
                    {idx === 0 ? <Footprints size={20} className="text-red-400" /> : idx === 1 ? <Crosshair size={20} className="text-amber-400" /> : <Scale size={20} className="text-rose-400" />}
                  </div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    {item.heading}
                  </h3>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Part III: What Must Be Done Now (No More Excuses) */}
        <section className="bg-gradient-to-br from-black via-red-950/80 to-black text-white rounded-3xl p-6 sm:p-10 border-2 border-red-600/70 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-red-800/40 pb-4">
            <span className="px-3 py-1 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-950">
              {manifesto.sections[2].part}
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
              {manifesto.sections[2].title}
            </h2>
          </div>

          <p className="text-stone-300 text-sm font-medium">
            {manifesto.sections[2].content[0]}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {manifesto.sections[2].highlights?.map((item, idx) => (
              <div 
                key={idx}
                className="p-6 rounded-2xl bg-black/70 border border-red-900/70 hover:border-red-500 transition-all space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-red-950 text-red-300 border border-red-700">
                    {item.badge}
                  </span>
                  {idx === 0 ? <TreePine size={22} className="text-emerald-400" /> : idx === 1 ? <Cpu size={22} className="text-cyan-400" /> : idx === 2 ? <Radio size={22} className="text-red-400" /> : <TreePine size={22} className="text-amber-400" />}
                </div>
                <h3 className="font-serif font-bold text-lg text-white">
                  {item.heading}
                </h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>


        {/* Part IV: Call to Action & Stand As One */}
        <section className="bg-stone-950 text-white rounded-3xl p-6 sm:p-12 border-2 border-red-600 shadow-2xl text-center space-y-6 relative overflow-hidden">
          
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-wider shadow-lg">
              <Flame size={15} className="animate-pulse" />
              <span>{manifesto.callToAction.title}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-serif font-black text-white tracking-tight">
              {lang === 'ta' ? 'இனி மௌனம் இல்லை — ஒன்றாக எழுவோம்!' : 'We Have Wept in Silence for Too Long.'}
            </h3>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              {lang === 'ta'
                ? 'இனி வெற்று வாக்குறுதிகளோ, இழப்பீட்டுக் குறிப்புகளோ, இறுதிச் சடங்குகளோ வேண்டாம்.'
                : 'No more empty promises, no more post-tragedy compensation memos, and no more funerals.'}
            </p>

            {/* Slogans Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              {manifesto.callToAction.slogans.map((slogan, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-black/80 border border-red-800/80 shadow-md flex items-center justify-center text-center">
                  <p className="font-serif font-black text-red-300 text-sm sm:text-base">
                    {slogan}
                  </p>
                </div>
              ))}
            </div>

            {/* Closing Proclamation */}
            <p className="font-serif font-black text-lg sm:text-xl text-amber-400 pt-3 tracking-wide">
              {manifesto.callToAction.closing}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-red-900/40">
            {!hasEndorsed ? (
              <button
                onClick={() => setShowSignModal(true)}
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-base shadow-xl shadow-red-950 border border-red-400/40 transition transform hover:scale-105"
              >
                <Flame size={20} className="text-amber-300 animate-pulse" />
                <span>{lang === 'ta' ? 'இப்பிரகடனத்தை ஆதரிக்கிறேன்' : 'Sign & Endorse Proclamation'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-red-950 text-red-300 font-black text-sm border border-red-700">
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span>{lang === 'ta' ? 'நீங்கள் ஆதரவு அளித்துள்ளீர்கள்' : 'You Stand With Gudalur'}</span>
              </div>
            )}

            {/* Direct Email Action in Footer */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm border border-red-700 shadow-md transition"
            >
              <Mail size={18} className="text-red-400" />
              <span>{lang === 'ta' ? 'அரசுக்கு மின்னஞ்சல்' : lang === 'kn' ? 'ಸರ್ಕಾರಕ್ಕೆ ಇಮೇಲ್' : 'Send Email to CM & NTCA'}</span>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-md transition"
            >
              <Share2 size={18} />
              <span>{lang === 'ta' ? 'வாட்ஸ்அப்பில் பரப்பு' : 'Share on WhatsApp'}</span>
            </button>
          </div>
        </section>

      </div>

      {/* 5. Endorsement Modal */}
      <AnimatePresence>
        {showSignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
                  {lang === 'ta' ? 'கூடலூர் உரிமைப் பிரகடனத்தில் கையொப்பமிடுங்கள்' : 'Endorse the Gudalur Right to Life Proclamation'}
                </h3>
                <p className="text-xs sm:text-sm text-stone-300">
                  {lang === 'ta' 
                    ? 'நமது கூட்டுக்குரல் அரசு மற்றும் உச்சநீதிமன்ற கவனத்திற்குச் செல்ல உங்கள் ஆதரவை பதிவு செய்யுங்கள்.'
                    : 'Your endorsement is a real, verifiable record submitted to the authorities.'}
                </p>
              </div>

              <form onSubmit={handleEndorse} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                    {lang === 'ta' ? 'உங்கள் பெயர்' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={endorserName}
                    onChange={(e) => setEndorserName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar / Smt. Fatima"
                    className="w-full rounded-xl bg-stone-900 border border-stone-700 px-4 py-3 text-sm text-white placeholder:text-stone-500 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                    {lang === 'ta' ? 'வசிக்கும் பகுதி' : 'Locality / Village / Estate'}
                  </label>
                  <input
                    type="text"
                    required
                    value={endorserLocality}
                    onChange={(e) => setEndorserLocality(e.target.value)}
                    placeholder="e.g. O'Valley, Cherambadi, Pandalur, Thorapalli..."
                    className="w-full rounded-xl bg-stone-900 border border-stone-700 px-4 py-3 text-sm text-white placeholder:text-stone-500 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSignModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-950 border border-red-400"
                  >
                    Confirm Endorsement
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Send Email Representation Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <SendEmailModal
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            initialLang={emailSelectedLang}
            onSubmitted={handleEmailSubmitted}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default Manifesto;