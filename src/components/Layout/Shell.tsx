import React, { createContext, useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  Flame, User, LogIn, LogOut, Menu, X, PenLine, BookOpen,
  Map as MapIcon, PawPrint, IdCard, UserPlus, RotateCcw, Instagram, Facebook,
} from 'lucide-react';
import { INTRO_SEEN_KEY } from '../OpeningAnimation';
import { OPEN_REGISTER_EVENT } from '../../pages/about_helpers';
import { GudalurIdModal } from '../GudalurIdModal';

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
      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
        isActive ? 'bg-[#AED581] text-[#1B5E20]' : 'text-[#F5F5F5]/85 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40'
      }`
    }
  >
    {icon}
    {label}
  </NavLink>
);

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang } = useLanguage();
  const { profile, logout } = useAuth();
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // "Once signed, everywhere shows it" — the petition gratitude chip in the menu.
  const supportRecorded = (() => {
    try { return localStorage.getItem('vog_petition_signed') === '1'; } catch { return false; }
  })();
  const [readyQueue, setReadyQueue] = useState<{ id: number; fn: () => void }[]>([]);

  const openIdModal = () => {
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

  React.useEffect(() => {
    const onOpenRegister = () => setRegisterModalOpen(true);
    window.addEventListener(OPEN_REGISTER_EVENT, onOpenRegister);
    return () => window.removeEventListener(OPEN_REGISTER_EVENT, onOpenRegister);
  }, []);

  return (
    <IdModalContext.Provider value={{ openIdModal, whenRegistered }}>
      <div className="min-h-screen bg-transparent text-[#F5F5F5] font-sans antialiased overflow-x-hidden flex flex-col">
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
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#1B5E20]/90 backdrop-blur-md border-b border-[#AED581]/30 flex items-center">
          <div className="max-w-5xl mx-auto w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={openIdModal}>
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#AED581] to-[#81C784] flex items-center justify-center shrink-0">
                <Flame size={12} className="text-[#1B5E20]" />
              </div>
              <span className="font-black text-xs text-[#F5F5F5] tracking-wider whitespace-nowrap">VOICE OF GUDALUR</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openIdModal}
                title={profile ? `${profile.name} — ${profile.gudalurId} — tap for ID card` : 'Register / Login'}
                className="flex items-center gap-1.5 rounded-full bg-[#AED581]/20 border border-[#AED581]/40 hover:bg-[#AED581]/30 transition pl-0.5 pr-1 py-0.5 shrink-0"
              >
                {profile ? (
                  <>
                    <span className="h-6 w-6 rounded-full bg-gradient-to-br from-[#AED581] to-[#81C784] flex items-center justify-center text-[10px] font-black text-[#1B5E20]">
                      {profile.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline font-mono text-[9px] font-bold text-[#AED581] tracking-wide">
                      {profile.gudalurId}
                    </span>
                  </>
                ) : (
                  <span className="h-6 w-6 rounded-full bg-[#AED581]/40 flex items-center justify-center text-[#1B5E20]">
                    <User size={12} />
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                title="Menu"
                aria-label="Open menu"
                className="rounded-lg p-1.5 bg-[#AED581]/20 border border-[#AED581]/40 hover:bg-[#AED581]/30 text-[#F5F5F5] transition shrink-0"
              >
                <Menu size={14} />
              </button>
            </div>
          </div>
        </header>

        <main className="pt-16 pb-6 flex-1">
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
            <div className="flex flex-col items-center sm:items-end gap-2 text-xs text-[#AED581]/80">
              <div className="flex items-center gap-3">
                <a href="https://www.instagram.com/voiceofgudalur" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Voice of Gudalur on Instagram" className="rounded-full border border-[#AED581]/40 p-2 transition hover:bg-[#AED581]/20">
                  <Instagram size={15} />
                </a>
                <a href="https://www.facebook.com/voiceofgudalur" target="_blank" rel="noopener noreferrer" title="Facebook" aria-label="Voice of Gudalur on Facebook" className="rounded-full border border-[#AED581]/40 p-2 transition hover:bg-[#AED581]/20">
                  <Facebook size={15} />
                </a>
              </div>
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
                  <span className="font-black text-xs text-[#F5F5F5] tracking-wider">MENU</span>
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
                  <DrawerLink to="/" icon={<PenLine size={16} />} label="Sign Petition" onNavigate={() => setMenuOpen(false)} end />
                  {supportRecorded && (
                    <div className="flex items-center gap-2 rounded-xl border border-[#AED581]/30 bg-[#AED581]/15 px-3 py-2 text-[10px] font-bold leading-snug text-[#AED581]">
                      🌿 Your support is recorded — thank you!
                    </div>
                  )}
                  <DrawerLink to="/about" icon={<BookOpen size={16} />} label="About the Movement" onNavigate={() => setMenuOpen(false)} />
                  <DrawerLink to="/corridors" icon={<MapIcon size={16} />} label="Closed Corridors Map" onNavigate={() => setMenuOpen(false)} />
                  <DrawerLink to="/sightings" icon={<PawPrint size={16} />} label="Animal Sightings" onNavigate={() => setMenuOpen(false)} />
                  <button
                    type="button"
                    onClick={() => {
                      try { sessionStorage.removeItem(INTRO_SEEN_KEY); } catch { /* ignore */ }
                      window.location.reload();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-[#F5F5F5]/85 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40 transition"
                  >
                    <RotateCcw size={16} /> Replay Opening
                  </button>
                </nav>

                <div className="border-t border-[#AED581]/20 px-3 py-4 space-y-3 shrink-0">
                  <div className="flex items-center gap-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLang(l.code)}
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

                  {profile ? (
                    <div className="space-y-2">
                      <div className="text-[10px] text-[#AED581]/80 font-mono truncate">
                        {profile.name} · {profile.gudalurId}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); openIdModal(); }}
                        className="w-full py-2.5 rounded-xl bg-[#AED581] text-[#1B5E20] font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <IdCard size={14} /> My Gudalur ID Card
                      </button>
                      <button
                        type="button"
                        onClick={async () => { setMenuOpen(false); await logout(); }}
                        className="w-full py-2.5 rounded-xl border border-[#AED581]/40 text-[#F5F5F5] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#388E3C]/40 transition"
                      >
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setRegisterModalOpen(true); }}
                        className="w-full py-2.5 rounded-xl bg-[#AED581] text-[#1B5E20] font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <UserPlus size={14} /> Register — Get Gudalur ID
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setLoginModalOpen(true); }}
                        className="w-full py-2.5 rounded-xl border border-[#AED581]/40 text-[#F5F5F5] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#388E3C]/40 transition"
                      >
                        <LogIn size={14} /> Login
                      </button>
                    </div>
                  )}
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
        <LoginResidentModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onNeedRegister={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }} />
        <RegisterResidentModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => { setRegisterModalOpen(false); }} />
      </div>
    </IdModalContext.Provider>
  );
};

export default Shell;
