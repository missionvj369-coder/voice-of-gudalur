import React, { createContext, useContext, useState } from 'react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Flame, User } from 'lucide-react';
import { GudalurIdModal } from '../GudalurIdModal';
import { OfflineIndicator } from '../OfflineIndicator';

/** Lets any page inside the Shell request a registered Gudalur Resident ID / open the ID card. */
export const IdModalContext = createContext<{
  openIdModal: () => void;
  /** Runs `fn` immediately if registered; otherwise opens registration and auto-runs `fn` once the ID is issued. */
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
  const { profile } = useAuth();
  const [idModalOpen, setIdModalOpen] = useState(false);
  // Civic actions requested before registration — they run automatically the moment the ID exists.
  const [readyQueue, setReadyQueue] = useState<{ id: number; fn: () => void }[]>([]);

  const openIdModal = () => setIdModalOpen(true);

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
      setIdModalOpen(true);
    },
    [profile]
  );

  return (
    <IdModalContext.Provider value={{ openIdModal, whenRegistered }}>
      <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased overflow-x-hidden flex flex-col">
        {/* — Fixed Header: constant, never drags — */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#0B111E]/95 backdrop-blur-sm border-b border-red-950/30 flex items-center">
          <div className="max-w-5xl mx-auto w-full px-4 flex items-center justify-between">
            {/* Brand */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => setIdModalOpen(true)}
            >
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shrink-0">
                <Flame size={12} className="text-amber-300" />
              </div>
              <span className="font-black text-xs text-white tracking-wider whitespace-nowrap">VOICE OF GUDALUR</span>
            </div>

            {/* All four languages visible + User avatar */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-lg bg-slate-900/60 border border-red-900/40 p-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    title={l.label}
                    className={`px-1.5 sm:px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all ${
                      lang === l.code
                        ? 'bg-red-600 text-white shadow'
                        : 'text-red-300/80 hover:text-white hover:bg-red-900/40'
                    }`}
                  >
                    <span className="hidden sm:inline">{l.label}</span>
                    <span className="sm:hidden">{l.short}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setIdModalOpen(true)}
                title={profile ? `${profile.name} — ${profile.gudalurId} — tap for ID card` : 'Register / Login'}
                className="flex items-center gap-1.5 rounded-full bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 transition pl-0.5 pr-1 py-0.5 shrink-0"
              >
                {profile ? (
                  <>
                    <span className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[10px] font-black text-white">
                      {profile.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden sm:inline font-mono text-[9px] font-bold text-emerald-300 tracking-wide">
                      {profile.gudalurId}
                    </span>
                  </>
                ) : (
                  <span className="h-6 w-6 rounded-full bg-red-600/40 flex items-center justify-center text-red-200">
                    <User size={12} />
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Content area: pad top for header (extra room so nothing sits under it) */}
        <main className="pt-16 pb-6 flex-1">
          {children}
        </main>

        {/* Footer — Universal Guard Trust initiative */}
        <footer className="relative z-10 border-t border-red-950/40 bg-[#0B111E] px-4 pt-16 pb-10">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
            <div>
              <div className="font-black text-sm text-white tracking-wider">VOICE OF GUDALUR</div>
              <p className="text-xs text-slate-400 mt-1">
                A citizen initiative by{' '}
                <a
                  href="https://ugtindia.space"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-red-400 hover:underline"
                >
                  Universal Guard Trust
                </a>
              </p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-1.5 text-xs text-slate-400">
              <a href="https://ugtindia.space" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                ugtindia.space ↗
              </a>
              <a href="https://ugtglobal.space" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">
                ugtglobal.space ↗
              </a>
              <a href="mailto:soulconnect@ugtglobal.space" className="hover:text-white transition">
                soulconnect@ugtglobal.space
              </a>
            </div>
          </div>
        </footer>

        <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
        <OfflineIndicator />
      </div>
    </IdModalContext.Provider>
  );
};

export default Shell;