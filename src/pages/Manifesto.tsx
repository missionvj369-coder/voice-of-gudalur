import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Flame, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
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
  FileText,
  Mail,
  Send,
  Copy,
  ExternalLink,
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
import { EMAIL_RECIPIENTS, EMAIL_PETITION_DATA } from '../data/emailPetitionData';
import { SendEmailModal } from '../components/Manifesto/SendEmailModal';
import { generateManifestoPdf } from '../utils/manifestoPdfGenerator';
import { db } from '../lib/firebase';
import { doc, setDoc, increment, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import crisisBloodBg from '../assets/images/gudalur_crisis_blood_1787476675818.jpg';

export const Manifesto: React.FC = () => {
  const { lang, setLang } = useLanguage();
  const { profile } = useAuth();

  const manifesto: ManifestoContent = MANIFESTO_DATA[lang] || MANIFESTO_DATA.en;

  // Signatures / Endorsements state
  const [signaturesCount, setSignaturesCount] = useState<number>(() => {
    const saved = localStorage.getItem('onegudalur_manifesto_signatures');
    return saved ? parseInt(saved, 10) : 14820;
  });

  const [hasEndorsed, setHasEndorsed] = useState<boolean>(() => {
    return localStorage.getItem('onegudalur_has_endorsed_manifesto') === 'true';
  });

  const [endorserName, setEndorserName] = useState(profile?.name || '');
  const [endorserLocality, setEndorserLocality] = useState(profile?.locality || 'O\'Valley');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSelectedLang, setEmailSelectedLang] = useState<Language>(lang);

  // Audio Speech Synthesis
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Sync selected email lang when app lang changes
  useEffect(() => {
    setEmailSelectedLang(lang);
  }, [lang]);

  // Sync endorsement count from Firestore
  useEffect(() => {
    const docRef = doc(db, 'manifesto_stats', 'global');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.count && data.count > 14000) {
          setSignaturesCount(data.count);
          localStorage.setItem('onegudalur_manifesto_signatures', data.count.toString());
        }
      }
    }, (err) => {
      console.warn('Firestore manifesto sync warning:', err);
    });

    return () => unsub();
  }, []);

  // Handle Speech
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech is not supported on this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();

    // Prepare speech text
    const textToSpeak = `${manifesto.title}. ${manifesto.openingQuote}. ${manifesto.proclamation}. ${manifesto.sections.map(s => `${s.title}. ${s.content.join(' ')}`).join('. ')}. ${manifesto.callToAction.slogans.join('. ')}. ${manifesto.callToAction.closing}`;
    
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Set appropriate language code
    if (lang === 'ta') utterance.lang = 'ta-IN';
    else if (lang === 'ml') utterance.lang = 'ml-IN';
    else if (lang === 'kn') utterance.lang = 'kn-IN';
    else utterance.lang = 'en-IN';

    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    toast.success('Reading proclamation aloud...');
  };

  // Stop speech when changing language or unmounting
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  // Handle Endorsement Submit
  const handleEndorse = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const name = endorserName.trim() || profile?.name || 'Citizen of Gudalur';
    const loc = endorserLocality || profile?.locality || 'Gudalur Taluk';

    const newCount = signaturesCount + 1;
    setSignaturesCount(newCount);
    setHasEndorsed(true);
    localStorage.setItem('onegudalur_has_endorsed_manifesto', 'true');
    localStorage.setItem('onegudalur_manifesto_signatures', newCount.toString());
    setShowSignModal(false);

    try {
      const statsRef = doc(db, 'manifesto_stats', 'global');
      await setDoc(statsRef, { count: increment(1), lastUpdated: Date.now() }, { merge: true });

      // Record signature doc
      const sigId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'manifesto_signatures', sigId), {
        name,
        locality: loc,
        timestamp: Date.now(),
        lang
      });
    } catch (err) {
      console.warn('Silent fallback for Firestore endorsement:', err);
    }

    toast.success('Your endorsement has been registered with OneGudalur!', {
      icon: '✊'
    });
  };

  // WhatsApp Broadcast
  const handleWhatsAppShare = () => {
    let text = `🩸 *${manifesto.title}*\n\n`;
    text += `✊ "${manifesto.openingQuote}"\n\n`;
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

  // PDF Generation
  const handleDownloadPdf = () => {
    generateManifestoPdf(
      manifesto,
      lang,
      signaturesCount,
      profile?.name || (hasEndorsed ? endorserName : undefined),
      profile?.locality || endorserLocality
    );
    toast.success('Downloaded Official Representation Memorandum PDF!');
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

            {/* Read Aloud Toggle */}
            <button
              onClick={handleToggleSpeech}
              className={cn(
                "flex items-center gap-2 px-4 py-3.5 rounded-2xl border font-bold text-xs backdrop-blur-md transition",
                isSpeaking 
                  ? "bg-amber-500/30 border-amber-400 text-amber-200"
                  : "bg-black/60 hover:bg-black/80 border-red-900/70 text-stone-200"
              )}
            >
              {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isSpeaking ? (lang === 'ta' ? 'நிறுத்துக' : 'Stop Narration') : (lang === 'ta' ? 'வாசிப்பைக் கேட்க' : 'Listen Proclamation')}</span>
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
                <div className="h-8 w-8 rounded-full bg-red-700 border-2 border-black flex items-center justify-center text-[10px] font-black text-white shadow-md">14k</div>
                <div className="h-8 w-8 rounded-full bg-rose-900 border-2 border-black flex items-center justify-center text-[10px] font-black text-white">OV</div>
                <div className="h-8 w-8 rounded-full bg-stone-800 border-2 border-black flex items-center justify-center text-[10px] font-black text-amber-400">CH</div>
              </div>
              <div>
                <p className="font-bold text-white text-sm">
                  {signaturesCount.toLocaleString()} {lang === 'ta' ? 'கூடலூர் குடிமக்கள் கையொப்பம்' : lang === 'kn' ? 'ನಾಗರಿಕ ಬೆಂಬಲಗಳು' : 'Verified Resident Endorsements'}
                </p>
                <p className="text-[11px] text-red-300 font-medium">
                  {lang === 'ta' ? 'ஓவேலி, சேரம்பாடி, பந்தலூர் உள்ளிட்ட 24 விளிம்புப் பகுதிகளிலிருந்து' : 'Across O\'Valley, Cherambadi, Pandalur & 24 Frontline Localities'}
                </p>
              </div>
            </div>

            {/* Direct Gateway to Sub-Page Civic Hub */}
            <Link
              to="/hub"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 hover:bg-red-950 text-red-300 hover:text-white border border-red-700/60 text-xs font-bold transition group backdrop-blur-md"
            >
              <span>{lang === 'ta' ? 'கூடலூர் தகவல் மையம் & நேரலை' : lang === 'kn' ? 'ನಾಗರಿಕ ಮಾಹಿತಿ ಕೇಂದ್ರ' : 'Go to Gudalur Civic Hub & Pulse'}</span>
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
            <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
              {manifesto.sections[0].title}
            </h2>
          </div>

          <div className="text-stone-300 text-sm sm:text-base leading-relaxed space-y-4 font-sans">
            {manifesto.sections[0].content.map((paragraph, idx) => (
              <p key={idx} className={idx === 0 ? "font-serif text-base sm:text-lg text-red-200 font-bold border-l-2 border-red-500 pl-4 py-1 bg-red-950/30 rounded-r-xl" : ""}>
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
            <Link to="/wildlife" className="text-red-300 font-bold hover:text-white hover:underline flex items-center gap-1">
              <span>View Sighting Log</span>
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

        {/* 3.5 Citizen Emergency Representation & Direct Email Console */}
        <section id="official-email-petition" className="rounded-3xl bg-stone-950 text-white p-6 sm:p-10 border-2 border-red-900/80 shadow-2xl space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-red-900/40 pb-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-700/80 text-white border border-red-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Mail size={12} />
                  Direct Administrative Action
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-black/60 text-red-300 border border-red-900 text-[10px] font-semibold hidden sm:inline">
                  TO: CM Cell | CC: NTCA + UN Bodies
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                {lang === 'ta' ? 'அரசுக்கு நேரடி மின்னஞ்சல் மனு' : lang === 'ml' ? 'മുഖ്യമന്ത്രിക്കും NTCA-യ്ക്കും ഇമെയിൽ സന്ദേശം' : lang === 'kn' ? 'ಮುಖ್ಯಮಂತ್ರಿ ಮತ್ತು NTCA ಗೆ ನೇರ ಇಮೇಲ್ ಮನವಿ' : 'Direct Citizen Representation to CM Cell & NTCA'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
                {lang === 'ta'
                  ? 'கீழே மொழியைத் தேர்வு செய்து "மின்னஞ்சல் அனுப்புக" பட்டனை அழுத்தவும். உங்கள் மின்னஞ்சல் செயலியில் (Gmail/Outlook) தானாகவே அனைத்து அதிகாரிகளின் முகவரிகள், பொருள் மற்றும் 4 அம்சக் கோரிக்கைகள் நிரப்பப்படும்.'
                  : 'Select your preferred language below and click "Send Email". Your default mail app or Gmail will instantly load with all 10 verified recipient addresses, subject, and the complete 4-point mandate.'}
              </p>
            </div>

            {/* Language Selector Pills */}
            <div className="flex items-center bg-black p-1 rounded-2xl border border-red-900 shadow-inner shrink-0 self-start md:self-auto">
              {(['en', 'ta', 'ml', 'kn'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setEmailSelectedLang(l)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                    emailSelectedLang === l
                      ? 'bg-red-600 text-white shadow-md'
                      : 'text-stone-400 hover:text-white hover:bg-stone-800'
                  )}
                >
                  {l === 'en' ? 'English' : l === 'ta' ? 'தமிழ்' : l === 'ml' ? 'മലയാളം' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Primary TO */}
            <div className="p-4 rounded-2xl bg-black/80 border border-red-950 space-y-2">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-black text-red-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <Building2 size={13} />
                  PRIMARY RECIPIENTS (TO)
                </span>
                <span className="font-mono text-[10px] text-stone-500">2 Exec Offices</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-xl border border-stone-800">
                  <div>
                    <p className="font-bold text-white text-xs">Chief Minister's Special Cell</p>
                    <p className="font-mono text-red-300 text-[11px]">cmcell@tn.gov.in</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">TN CMO</span>
                </div>
                <div className="flex items-center justify-between bg-stone-900/90 px-3 py-2 rounded-xl border border-stone-800">
                  <div>
                    <p className="font-bold text-white text-xs">Chief Minister's Office</p>
                    <p className="font-mono text-red-300 text-[11px]">cmo@tn.gov.in</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">TN Exec</span>
                </div>
              </div>
            </div>

            {/* CC List Box */}
            <div className="p-4 rounded-2xl bg-black/80 border border-red-950 space-y-2">
              <div className="flex items-center justify-between text-stone-400">
                <span className="font-black text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <ShieldCheck size={13} />
                  CARBON COPY LIST (CC) — 8 REGULATORS & UN
                </span>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="text-red-400 hover:text-white text-[10px] font-semibold underline"
                >
                  View Full Directory
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">NTCA New Delhi</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">ms-ntca@nic.in</p>
                </div>
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">IG Forests, NTCA</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">ig-ntca@nic.in</p>
                </div>
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">District Collector Nilgiris</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">collrnlg@tn.nic.in</p>
                </div>
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">MLA Gudalur</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">mlagudalur@tn.gov.in</p>
                </div>
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">TN Wildlife Crime Board</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">tnfwccb@gmail.com</p>
                </div>
                <div className="bg-stone-900/90 p-2 rounded-xl border border-stone-800">
                  <p className="font-bold text-stone-200">UNEP & UN OHCHR</p>
                  <p className="font-mono text-stone-400 text-[10px] truncate">unep-news@un.org</p>
                </div>
              </div>
            </div>

          </div>

          {/* Email Content Box */}
          <div className="p-5 rounded-2xl bg-black border border-red-900/60 space-y-4">
            
            {/* Subject */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-red-400">
                  Subject Line ({emailSelectedLang.toUpperCase()})
                </span>
                <button
                  onClick={() => {
                    const content = EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en;
                    navigator.clipboard.writeText(content.subject);
                    toast.success('Copied subject line!');
                  }}
                  className="text-stone-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <Copy size={12} />
                  <span>Copy Subject</span>
                </button>
              </div>
              <p className="font-serif font-bold text-red-300 text-sm sm:text-base bg-stone-900/90 p-3 rounded-xl border border-stone-800">
                {(EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en).subject}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-stone-400 text-xs">
                <span className="font-bold uppercase tracking-wider text-[10px] text-red-400">
                  Representation Body
                </span>
                <button
                  onClick={() => {
                    const content = EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en;
                    const fullText = `${content.salutation}\n\n${content.body}\n\n${content.signoff}`;
                    navigator.clipboard.writeText(fullText);
                    toast.success('Copied email body!');
                  }}
                  className="text-stone-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <Copy size={12} />
                  <span>Copy Body</span>
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto p-4 rounded-xl bg-stone-900/90 border border-stone-800 text-xs sm:text-sm text-stone-200 whitespace-pre-line leading-relaxed font-sans">
                {(EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en).salutation}
                {'\n\n'}
                {(EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en).body}
                {'\n\n'}
                {(EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en).signoff}
              </div>
            </div>

          </div>

          {/* Action Dispatch Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <FileText size={15} />
              <span>Full Screen Dispatch & Customization</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {/* Send via Gmail Web */}
              <button
                onClick={() => {
                  const content = EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en;
                  const to = EMAIL_RECIPIENTS.to.map(r => r.email).join(',');
                  const cc = EMAIL_RECIPIENTS.cc.map(r => r.email).join(',');
                  const fullBody = `${content.salutation}\n\n${content.body}\n\n${content.signoff}`;
                  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&su=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(fullBody)}`;
                  window.open(gmailUrl, '_blank');
                  toast.success('Opening Gmail Compose with all 10 recipients and content...');
                }}
                className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs flex items-center gap-1.5 border border-stone-600 transition"
              >
                <ExternalLink size={14} />
                <span>Open in Gmail Web</span>
              </button>

              {/* Direct Send via Mailto */}
              <button
                onClick={() => {
                  const content = EMAIL_PETITION_DATA[emailSelectedLang] || EMAIL_PETITION_DATA.en;
                  const to = EMAIL_RECIPIENTS.to.map(r => r.email).join(',');
                  const cc = EMAIL_RECIPIENTS.cc.map(r => r.email).join(',');
                  const fullBody = `${content.salutation}\n\n${content.body}\n\n${content.signoff}`;
                  const mailtoUrl = `mailto:${to}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(fullBody)}`;
                  window.location.href = mailtoUrl;
                  toast.success('Opening mail client with pre-filled representation...', { icon: '✉️' });
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-red-950 transition transform hover:-translate-y-0.5 border border-red-400/40"
              >
                <Send size={15} />
                <span>Send Official Email (All 10 Authorities)</span>
              </button>
            </div>
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
                    : 'Join 14,800+ citizens demanding safe homes, dismantled corridor blockades, and 24/7 rapid response protection.'}
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
          />
        )}
      </AnimatePresence>

    </div>
  );
};

export default Manifesto;
