import React, { createContext, useContext, useState } from 'react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Flame, User, LogIn, LogOut } from 'lucide-react';
import { GudalurIdModal } from '../GudalurIdModal';
import { OfflineIndicator } from '../OfflineIndicator';
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

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang } = useLanguage();
  const { profile, logout } = useAuth();
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
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
              <div className="flex items-center gap-0.5 rounded-lg bg-[#2E7D32]/60 border border-[#AED581]/30 p-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    title={l.label}
                    className={`px-1.5 sm:px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all ${
                      lang === l.code
                        ? 'bg-[#AED581] text-[#1B5E20] shadow'
                        : 'text-[#F5F5F5]/80 hover:text-[#F5F5F5] hover:bg-[#388E3C]/40'
                    }`}
                  >
                    <span className="hidden sm:inline">{l.label}</span>
                    <span className="sm:hidden">{l.short}</span>
                  </button>
                ))}
              </div>
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
                {profile && (
                  <button
                    type="button"
                    onClick={async () => { await logout(); }}
                    title="Logout"
                    className="ml-1 rounded-full p-1 text-[#F5F5F5]/60 hover:text-[#F5F5F5] hover:bg-[#388E3C]/50 transition shrink-0"
                  >
                    <LogOut size={12} />
                  </button>
                )}
              </button>
              {profile && (
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(true)}
                  title="Switch account"
                  className="ml-1 rounded-full p-1 text-[#F5F5F5]/60 hover:text-[#F5F5F5] hover:bg-[#388E3C]/50 transition shrink-0 hidden sm:flex"
                >
                  <LogIn size={12} />
                </button>
              )}
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
            <div className="flex flex-col items-center sm:items-end gap-1.5 text-xs text-[#AED581]/80">
              <a href="https://ugtindia.space" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F5] transition">ugtindia.space ↗</a>
              <a href="https://ugtglobal.space" target="_blank" rel="noopener noreferrer" className="hover:text-[#F5F5F5] transition">ugtglobal.space ↗</a>
              <a href="mailto:soulconnect@ugtindia.space" className="hover:text-[#F5F5F5] transition">soulconnect@ugtglobal.space</a>
            </div>
          </div>
        </footer>

        <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
        <LoginResidentModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} onNeedRegister={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }} />
        <RegisterResidentModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={() => { setRegisterModalOpen(false); }} />
        <OfflineIndicator />
      </div>
    </IdModalContext.Provider>
  );
};

export default Shell;
