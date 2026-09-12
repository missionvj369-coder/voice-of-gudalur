import React, { createContext, useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth, readLocalSignature } from '../../context/AuthContext';
import {
  Flame, User, LogIn, LogOut, Menu, X, PenLine, BookOpen,
  Map as MapIcon, PawPrint, IdCard, UserPlus,
} from 'lucide-react';

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
      `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
        isActive ? 'bg-[#AED581] text-[#1B5E20]' : 'text-[#F5F5F5]/85 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40'
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
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                title="Menu"
                aria-label="Open menu"
                className="rounded-lg p-1.5 bg-[#1B5E20]/10 border border-[#1B5E20]/30 hover:bg-[#1B5E20]/20 text-[#123B0D] transition shrink-0"
              >
                <Menu size={14} />
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="pt-16 pb-6 flex-1">
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
                          // Reload same URL to apply new language everywhere
                          setTimeout(() => window.location.reload(), 100);
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
