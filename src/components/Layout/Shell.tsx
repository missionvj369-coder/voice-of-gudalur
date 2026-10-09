import React, { createContext, useContext, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth, readLocalSignature } from '../../context/AuthContext';
import {
  Flame, User, LogIn, LogOut, Menu, X, PenLine, BookOpen,
  Map as MapIcon, PawPrint, IdCard, UserPlus, Mic, MicOff, Type,
} from 'lucide-react';
import toast from 'react-hot-toast';

const InstagramIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
import { OPEN_REGISTER_EVENT, OPEN_LOGIN_EVENT } from '../../pages/about_helpers';
import { GudalurIdModal } from '../GudalurIdModal';
import AIPresenter from '../AIPresenter/AIPresenter';
import { AI_VOG_ENABLED } from '../../config/productionMode';

import { LoginResidentModal } from '../Auth/LoginResidentModal';
import { RegisterResidentModal } from '../Auth/RegisterResidentModal';

/** Lets any page inside the Shell request a registered Gudalur Resident ID / open the ID card. */
export const IdModalContext = createContext<{
  openIdModal: () => void;
  whenRegistered: (fn: () => void) => void;
}>({
  openIdModal: () => {},
  whenRegistered: () => {},
});

const LANGUAGES: { code: Language; short: string; label: string }[] = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'ta', short: 'தமி', label: 'தமிழ்' },
  { code: 'ml', short: 'മല', label: 'മലയാളം' },
  { code: 'kn', short: 'ಕನ್ನ', label: 'ಕನ್ನಡ' },
];

/** A menu entry — active route highlighted, closes the drawer on navigation. */
const DrawerLink: React.FC<{
  to: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
  end?: boolean;
}> = ({ to, icon, label, onNavigate, end }) => (
  <NavLink
    to={to}
    end={end}
    onClick={onNavigate}
    className={({ isActive }) =>
      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
        isActive
          ? 'bg-[var(--color-accent-400)] text-[var(--color-primary-900)] shadow-md'
          : 'text-[var(--color-neutral-100)]/85 hover:text-[var(--color-neutral-100)] hover:bg-[var(--color-primary-600)]/40'
      }`
    }
  >
    {icon}
    {label}
  </NavLink>
);

export const Shell: React.FC<{ children: React.ReactNode; petitionOnly?: boolean }> = ({ children, petitionOnly = false }) => {
  const { lang, setLang, t } = useLanguage();
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // === ACCESSIBILITY: Large-text mode (for low-vision users), persisted across visits. ===
  const [largeText, setLargeText] = useState<boolean>(() => {
    try { return localStorage.getItem('vog_large_text') === '1'; } catch { return false; }
  });
  React.useEffect(() => {
    document.body.classList.toggle('large-text', largeText);
    try { localStorage.setItem('vog_large_text', largeText ? '1' : '0'); } catch { /* private mode */ }
  }, [largeText]);
  // === ACCESSIBILITY: Voice navigation (Web Speech API) for low-literacy users. ===
  const [listening, setListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);
  // "Once signed, everywhere shows it" — only a REAL server-issued (VG-*) sign.
  // Re-render on sign events too (AuthContext dispatches 'vog:petition-signed'
  // after its server-authoritative sync on every login/register/boot), so the
  // menu pill survives re-login, new devices and cleared caches.
  const [, forceSignedTick] = useState(0);
  const supportRecorded = (() => {
    try { return readLocalSignature().signed; } catch { return false; }
  })();

  React.useEffect(() => {
    const bump = () => forceSignedTick((n) => n + 1);
    window.addEventListener('vog:petition-signed', bump);
    window.addEventListener('storage', bump);
    return () => {
      window.removeEventListener('vog:petition-signed', bump);
      window.removeEventListener('storage', bump);
    };
  }, []);
  // ACCESSIBILITY: Escape closes the menu drawer (keyboard users).
  React.useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);
  // ACCESSIBILITY: announce route changes to screen readers (aria-live region below).
  const location = useLocation();
  const [announce, setAnnounce] = useState('');
  React.useEffect(() => {
    const t = setTimeout(() => setAnnounce(document.title || 'Page loaded'), 300);
    return () => clearTimeout(t);
  }, [location.pathname]);
  const [readyQueue, setReadyQueue] = useState<{ id: number; fn: () => void }[]>([]);

  const openIdModal = () => {
    if (petitionOnly) return; // no profile/ID flows in the petition-only launch
    if (profile?.gudalurId) setIdModalOpen(true);
    else setRegisterModalOpen(true); // no profile → one-step Aadhaar scan registration
  };

  React.useEffect(() => {
    if (!profile?.gudalurId || readyQueue.length === 0) return;
    const items = readyQueue;
    setReadyQueue([]);
    items.forEach((it) => it.fn());
  }, [profile, readyQueue]);

  const whenRegistered = React.useCallback(
    (fn: () => void) => {
      if (profile?.gudalurId) { fn(); return; }
      setReadyQueue((q) => [...q, { id: Date.now(), fn }]);
      setRegisterModalOpen(true); // no profile → one-step Aadhaar scan registration
    },
    [profile]
  );

  // Voice command vocabulary — must live after openIdModal is declared.
  const VOICE_COMMANDS: { patterns: string[]; action: () => void; label: string }[] = React.useMemo(() => [
    { patterns: ['petition', 'sign', 'பேட்ஷன்', 'பிரார்த்தனை'], action: () => navigate('/sign-petition'), label: 'Sign petition' },
    { patterns: ['sighting', 'sightings', 'elephant', 'யானை'], action: () => navigate('/sightings'), label: 'Elephant sightings' },
    { patterns: ['voice', 'sound', 'record', 'குரல்'], action: () => navigate('/voices'), label: 'Community voices' },
    { patterns: ['about', 'movement', 'manifesto', 'இயக்கம்'], action: () => navigate('/about'), label: 'About movement' },
    { patterns: ['corridor', 'பாதை'], action: () => navigate('/corridors'), label: 'Corridors' },
    { patterns: ['profile', 'my card', 'id card', 'அட்டை'], action: () => { if (!petitionOnly) openIdModal(); }, label: 'My ID card' },
    { patterns: ['home', 'முகப்பு'], action: () => navigate('/'), label: 'Go home' },
  ], [navigate, petitionOnly, openIdModal]);

  const startVoiceNav = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error('Voice navigation is not supported on this browser.'); return; }
    if (listening) { recognitionRef.current?.stop(); return; }
    const rec = new SR();
    rec.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e: any) => {
      const said = Array.from(e.results as ArrayLike<any>)
        .flatMap((r: any) => Array.from(r as ArrayLike<any>).map((alt: any) => String(alt.transcript || '').toLowerCase()))
        .join(' | ');
      const match = VOICE_COMMANDS.find((c) => c.patterns.some((p) => said.includes(p.toLowerCase())));
      if (match) { toast.success(match.label); match.action(); }
      else { toast.error('Command not recognised — try "sign petition", "sightings" or "voices".'); }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  React.useEffect(() => {
    const onOpenRegister = () => setRegisterModalOpen(true);
    window.addEventListener(OPEN_REGISTER_EVENT, onOpenRegister);
    return () => window.removeEventListener(OPEN_REGISTER_EVENT, onOpenRegister);
  }, []);

  // RegisterResidentModals anywhere in the app can ask Shell to swap to Login.
  React.useEffect(() => {
    const onOpenLogin = () => {
      setRegisterModalOpen(false);
      setLoginModalOpen(true);
    };
    window.addEventListener(OPEN_LOGIN_EVENT, onOpenLogin);
    return () => window.removeEventListener(OPEN_LOGIN_EVENT, onOpenLogin);
  }, []);

  return (
    <IdModalContext.Provider value={{ openIdModal, whenRegistered }}>
      <div className="min-h-screen bg-transparent text-[#F5F5F5] font-sans antialiased overflow-x-hidden flex flex-col">
        {/* WCAG 24.1 — keyboard users jump straight to content, past the header. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-amber-500 focus:text-[#1B5E20] focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:shadow-lg"
        >
          Skip to main content
        </a>
        {/* Ambient attention layer — lightweight SVG background (no animated divs for low-end devices) */}
        <div className="og-ambient" aria-hidden="true">
          <svg
            className="absolute inset-0 w-full h-full -z-1 pointer-events-none"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 100 100"
            opacity="0.03"
          >
            <circle cx="20" cy="30" r="2" fill="currentColor" className="text-amber-400">
              <animate attributeName="opacity" values="0.03;0.05;0.03" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="50" cy="60" r="1.5" fill="currentColor" className="text-emerald-400">
              <animate attributeName="opacity" values="0.02;0.04;0.02" dur="6s" repeatCount="indefinite" />
            </circle>
            <circle cx="80" cy="40" r="1" fill="currentColor" className="text-slate-400">
              <animate attributeName="opacity" values="0.02;0.03;0.02" dur="5s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-gradient-to-r from-[#8DC63F] via-[#A9C84B] to-[#C9D84E] border-b border-[#1B5E20]/25 shadow-sm flex items-center">
          <div className="max-w-5xl mx-auto w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => { if (!petitionOnly) openIdModal(); else navigate('/'); }}>
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] flex items-center justify-center shrink-0">
                <Flame size={12} className="text-[#F5F5F5]" />
              </div>
              <span className="font-black text-xs text-[#123B0D] tracking-wider whitespace-nowrap">VOICE OF GUDALUR</span>
            </div>

            <div className="flex items-center gap-2">
              {!petitionOnly && (
              <button
                type="button"
                onClick={openIdModal}
                title={profile ? `${profile.name} — ${profile.gudalurId} — tap for ID card` : 'Register / Login'}
                className="flex items-center gap-1.5 rounded-full bg-[#1B5E20]/10 border border-[#1B5E20]/30 hover:bg-[#1B5E20]/20 transition pl-0.5 pr-1 py-0.5 shrink-0"
              >
                {profile ? (
                  <>
                    <span className="h-6 w-6 rounded-full bg-[#1B5E20] flex items-center justify-center text-[10px] font-black text-[#F5F5F5]">
                      {profile.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline font-mono text-[9px] font-bold text-[#1B5E20] tracking-wide">
                      {profile.gudalurId}
                    </span>
                  </>
                ) : (
                  <span className="h-6 w-6 rounded-full bg-[#1B5E20]/15 flex items-center justify-center text-[#123B0D]">
                    <User size={12} />
                  </span>
                )}
              </button>
              )}
              {/* ACCESSIBILITY: voice navigation — speak a command instead of reading menus. */}
              <button
                type="button"
                onClick={startVoiceNav}
                title={listening ? 'Listening… tap to stop' : 'Voice command — say "sign petition", "sightings", "voices"'}
                aria-label={listening ? 'Voice command listening, tap to stop' : 'Start voice command'}
                aria-pressed={listening}
                className={`rounded-lg p-1.5 border transition shrink-0 ${listening
                  ? 'bg-[#1B5E20] border-[#1B5E20] text-[#AED581] animate-pulse'
                  : 'bg-[#1B5E20]/10 border-[#1B5E20]/30 hover:bg-[#1B5E20]/20 text-[#123B0D]'}`}
              >
                {listening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              {/* ACCESSIBILITY: large-text mode toggle for low-vision users. */}
              <button
                type="button"
                onClick={() => setLargeText((v) => !v)}
                title={largeText ? 'Switch to normal text size' : 'Switch to large text (easy reading)'}
                aria-label={largeText ? 'Switch to normal text size' : 'Switch to large text size'}
                aria-pressed={largeText}
                className={`rounded-lg p-1.5 border transition shrink-0 ${largeText
                  ? 'bg-[#1B5E20] border-[#1B5E20] text-[#AED581]'
                  : 'bg-[#1B5E20]/10 border-[#1B5E20]/30 hover:bg-[#1B5E20]/20 text-[#123B0D]'}`}
              >
                <Type size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                title="Menu"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="rounded-lg p-1.5 bg-[#1B5E20]/10 border border-[#1B5E20]/30 hover:bg-[#1B5E20]/20 text-[#123B0D] transition shrink-0"
              >
                <Menu size={14} />
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="pt-16 pb-6 flex-1">
          {/* ACCESSIBILITY: screen-reader announcer for route changes. */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">{announce}</div>
          {children}
        </main>

                <footer className="relative z-10 border-t border-[#AED581]/20 bg-[#1B5E20]/80 px-4 pt-16 pb-10">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            <div>
              <div className="font-black text-sm text-[#F5F5F5] tracking-wider">VOICE OF GUDALUR</div>
              <p className="text-xs text-[#AED581]/80 mt-1">
                A citizen initiative by{' '}
                <a href="https://ugtindia.space" target="_blank" rel="noopener noreferrer" className="font-bold text-[#AED581] hover:underline">
                  Universal Guard Trust
                </a>
              </p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-1.5">
                <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/voiceofgudalur" target="_blank" rel="noopener noreferrer" title="Instagram — Voice of Gudalur" aria-label="Voice of Gudalur on Instagram" className="rounded-full border border-[#AED581]/40 p-2 transition hover:bg-[#AED581]/20">
                    <InstagramIcon size={15} />
                  </a>
                  <a href="https://www.instagram.com/universalguardtrust" target="_blank" rel="noopener noreferrer" title="Instagram — Universal Guard Trust" aria-label="Universal Guard Trust on Instagram" className="rounded-full border border-[#AED581]/40 p-2 transition hover:bg-[#AED581]/20">
                    <InstagramIcon size={15} />
                  </a>
                  <a href="https://www.facebook.com/universalguardtrust" target="_blank" rel="noopener noreferrer" title="Facebook — Universal Guard Trust" aria-label="Universal Guard Trust on Facebook" className="rounded-full border border-[#AED581]/40 p-2 transition hover:bg-[#AED581]/20">
                    <FacebookIcon size={15} />
                  </a>
                </div>
              </div>
              <div className="flex flex-col items-center sm:items-end gap-1.5 text-xs text-[#AED581]/80">
              <a href="https://ugtindia.space" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F5] transition">ugtindia.space ↗</a>
              <a href="https://ugtglobal.space" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F5] transition">ugtglobal.space ↗</a>
              <a href="mailto:soulconnect@ugtindia.space" className="hover:text-[#F5F5F5] transition">soulconnect@ugtglobal.space</a>
            </div>
          </div>
        </footer>

        {/* Slide-in menu — every section lives here instead of a header link bar. */}
        <AnimatePresence>
          {menuOpen && (
            <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Main menu">
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMenuOpen(false)}
              />
              <motion.aside
                className="absolute right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-[#1B5E20] border-l border-[#AED581]/30 shadow-2xl flex flex-col"
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
              >
                <div className="flex items-center justify-between px-4 h-14 border-b border-[#AED581]/20 shrink-0">
                  <span className="font-black text-xs text-[#F5F5F5] tracking-wider">{t('mnu.title')}</span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close menu"
                    className="rounded-lg p-1.5 text-[#F5F5F5]/70 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40 transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                  <DrawerLink to="/" icon={<PenLine size={16} />} label={t('mnu.sign_petition')} onNavigate={() => setMenuOpen(false)} end />
                  {supportRecorded && !petitionOnly && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#AED581]/30 bg-[#AED581]/15 px-3 py-2 text-[10px] font-bold leading-snug text-[#AED581]">
                      🌿 {t('mnu.support')}
                    </div>
                  )}
                  {!petitionOnly && (
                    <>
                      <DrawerLink to="/sign-petition" icon={<PenLine size={16} />} label={t('mnu.sign_full') || 'Sign Petition'} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/petition" icon={<PenLine size={16} />} label={t('mnu.sign_mobile') || 'Quick Sign (Mobile)'} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/about" icon={<BookOpen size={16} />} label={t('mnu.about')} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/corridors" icon={<MapIcon size={16} />} label={t('mnu.corridors')} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/sightings" icon={<PawPrint size={16} />} label={t('mnu.sightings')} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/voices" icon={<Flame size={16} />} label={t('mnu.voices') || 'Community Voices'} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/verify-sign" icon={<Flame size={16} />} label={t('mnu.verify') || 'Verify Signature'} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/officials" icon={<User size={16} />} label={t('mnu.officials') || 'Officials Portal'} onNavigate={() => setMenuOpen(false)} />
                      <DrawerLink to="/trust" icon={<BookOpen size={16} />} label={t('mnu.trust') || 'Trust & Privacy'} onNavigate={() => setMenuOpen(false)} />
                    </>
                  )}
                </nav>

                <div className="border-t border-[#AED581]/20 px-3 py-4 space-y-3 shrink-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#AED581]/70 px-0.5">
                    {t('mnu.language')}
                  </p>
                  <div className="flex items-center gap-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => {
                          if (l.code === lang) return;
                          // Persist immediately + reload so every string re-renders
                          // in the newly selected language.
                          try { localStorage.setItem('VoiceOfGudalur_lang', l.code); } catch { /* ignore */ }
                          setLang(l.code);
                          setMenuOpen(false);
                          // Update <html lang> for screen readers
                          document.documentElement.lang = l.code;
                          // Reload current URL (preserve pathname + hash) to apply
                          // new language everywhere WITHOUT navigating to home
                          setTimeout(() => window.location.assign(window.location.href), 100);
                        }}
                        title={l.label}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                          lang === l.code
                            ? 'bg-[#AED581] text-[#1B5E20] shadow'
                            : 'text-[#F5F5F5]/80 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40'
                        }`}
                      >
                        {l.short}
                      </button>
                    ))}
                  </div>

                  {!petitionOnly && (
                    profile ? (
                      <div className="space-y-2">
                        <div className="text-[10px] text-[#AED581]/80 font-mono truncate">
                          {profile.name} · {profile.gudalurId}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); openIdModal(); }}
                          className="w-full py-2.5 rounded-xl bg-[#AED581] text-[#1B5E20] font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <IdCard size={14} /> {t('mnu.my_card')}
                        </button>
                        <button
                          type="button"
                          onClick={async () => { setMenuOpen(false); await logout(); }}
                          className="w-full py-2.5 rounded-xl border border-[#AED581]/40 text-[#F5F5F5] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#388E3C]/40 transition"
                        >
                          <LogOut size={14} /> {t('mnu.logout')}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); setRegisterModalOpen(true); }}
                          className="w-full py-2.5 rounded-xl bg-[#AED581] text-[#1B5E20] font-bold text-xs flex items-center justify-center gap-2"
                        >
                          <UserPlus size={14} /> {t('mnu.register')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMenuOpen(false); setLoginModalOpen(true); }}
                          className="w-full py-2.5 rounded-xl border border-[#AED581]/40 text-[#F5F5F5] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#388E3C]/40 transition"
                        >
                          <LogIn size={14} /> {t('mnu.login')}
                        </button>
                      </div>
                    )
                  )}
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {!petitionOnly && <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />}
        {!petitionOnly && (
          <LoginResidentModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onNeedRegister={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }} />
        )}

        {/* Living-intelligence VOG greeter - global, everywhere, speak-only.
            Flag-gated: never mounts when AI_VOG_ENABLED=false (petition-only
            launch default) so no AI/LLM resource is spent. Reactivate by
            setting VITE_AI_VOG_ENABLED=true + VITE_APP_MODE=full. */}
        {AI_VOG_ENABLED && <AIPresenter language={lang} />}
        {!petitionOnly && (
          <RegisterResidentModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => { setRegisterModalOpen(false); }} onNeedLogin={() => { setRegisterModalOpen(false); setLoginModalOpen(true); }} />
        )}
      </div>
    </IdModalContext.Provider>
  );
};

export default Shell;
