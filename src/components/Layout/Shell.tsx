import React, { useState } from 'react';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Flame, User } from 'lucide-react';
import { GudalurIdModal } from '../GudalurIdModal';
import { OfflineIndicator } from '../OfflineIndicator';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { lang, setLang } = useLanguage();
  const { profile } = useAuth();
  const [idModalOpen, setIdModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans antialiased overflow-x-hidden">
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
            <span className="font-black text-xs text-white tracking-wider">ONE GUDALUR</span>
          </div>

          {/* Right: Lang selector + User avatar */}
          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="appearance-none text-[9px] font-black uppercase bg-slate-900/60 border border-red-900/40 rounded-lg px-1.5 py-1 text-red-300 focus:outline-none focus:ring-1 focus:ring-red-600"
            >
              <option value="en">EN</option>
              <option value="ta">தமி</option>
              <option value="ml">മല</option>
              <option value="kn">ಕನ್ನ</option>
            </select>
            <button
              type="button"
              onClick={() => setIdModalOpen(true)}
              className="h-7 w-7 rounded-full bg-red-600/30 flex items-center justify-center text-[9px] font-black text-red-300 border border-red-500/40 hover:bg-red-600/40 transition"
            >
              <User size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* Content area: pad top for header, bottom for the sticky action bar */}
      <main className="pt-14 pb-28">
        {children}
      </main>

      <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};

export default Shell;
