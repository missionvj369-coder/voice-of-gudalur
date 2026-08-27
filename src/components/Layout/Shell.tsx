import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Flame, 
  HeartHandshake, 
  ShieldCheck, 
  Menu, 
  X, 
  User, 
  ChevronRight,
  FileText,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';
import { GudalurLiveBar } from '../GudalurLiveBar';
import { GudalurIdModal } from '../GudalurIdModal';
import { OfflineIndicator } from '../OfflineIndicator';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);

  const mainNavItems = [
    { 
      name: lang === 'ta' ? 'உரிமைப் பிரகடனம்' : lang === 'ml' ? 'അവകാശ പ്രഖ്യാപനം' : lang === 'kn' ? 'ಹಕ್ಕು ಪ್ರಣಾಳಿಕೆ' : 'Right to Life Manifesto', 
      path: '/', 
      icon: Flame,
      subtitle: lang === 'ta' ? 'அடிப்படை உரிமை • Article 21' : 'Core Proclamation • Article 21',
      activeColor: 'bg-red-600 text-white shadow-red-900/30'
    },
    { 
      name: lang === 'ta' ? 'கூடலூருக்கான கோரிக்கைகள்' : lang === 'ml' ? 'ജനകീയ ആവശ്യങ്ങൾ' : lang === 'kn' ? 'ನಾಗರಿಕ ಬೇಡಿಕೆಗಳು' : 'Act for Gudalur', 
      path: '/act', 
      icon: HeartHandshake,
      subtitle: lang === 'ta' ? 'மனுக்கள் & அதிகாரப்பூர்வ தீர்வுகள்' : 'Demands, Petitions & Solutions',
      activeColor: 'bg-emerald-600 text-white shadow-emerald-900/30'
    },
    { 
      name: lang === 'ta' ? 'குடிமக்கள் அடையாள அட்டை' : lang === 'ml' ? 'പൗര തിരിച്ചറിയൽ കാർഡ്' : lang === 'kn' ? 'ನಿವಾಸಿ ಗುರುತಿನ ಚೀಟಿ' : 'Resident Citizen Card', 
      path: '/profile', 
      icon: ShieldCheck,
      subtitle: lang === 'ta' ? 'சரிபார்க்கப்பட்ட குடியுரிமை ID' : 'Verified Digital Gudalur ID',
      activeColor: 'bg-slate-900 text-white shadow-slate-900/30'
    },
  ];

  if (profile?.role === 'PLATFORM_ADMIN' || profile?.role === 'CORE_ADMIN' || user?.email === 'vijaybalakrishnanshanmugam@gmail.com') {
    mainNavItems.push({ 
      name: 'Admin Console', 
      path: '/admin', 
      icon: ShieldAlert,
      subtitle: 'Moderation & Representation',
      activeColor: 'bg-indigo-600 text-white shadow-indigo-900/30'
    });
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans flex flex-col selection:bg-red-900 selection:text-white">
      {/* 1. Top Environmental Live Bar */}
      <GudalurLiveBar />

      {/* 2. Top Application Header */}
      <header className="sticky top-0 z-40 bg-[#0B111E]/95 backdrop-blur-md border-b border-red-950/60 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-900 text-white flex items-center justify-center shadow-lg shadow-red-950/80 border border-red-500/40 group-hover:scale-105 transition-transform">
              <Flame size={20} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black tracking-tight text-lg sm:text-xl text-white">
                  ONE GUDALUR
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800">
                  Right to Life
                </span>
              </div>
              <p className="text-[10px] text-stone-400 tracking-wide font-medium hidden md:block">
                {lang === 'ta' ? 'அமைதியான மக்கள் போராட்டம் • Article 21' : 'Constitutional Citizen Movement • Article 21'}
              </p>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Gudalur ID Card Button */}
            <button
              onClick={() => setIdModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold border border-stone-700 shadow-md transition"
            >
              <ShieldCheck size={15} className="text-emerald-400" />
              <span className="hidden sm:inline">
                {profile ? profile.gudalurId : (lang === 'ta' ? 'குடிமக்கள் அட்டை' : 'My ID Card')}
              </span>
              <span className="sm:hidden">ID</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-black p-0.5 rounded-xl border border-stone-800">
              {(['en', 'ta', 'ml', 'kn'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                    lang === l
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  )}
                >
                  {l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : l === 'ml' ? 'മല' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-300 hover:bg-stone-800 md:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>
      </header>

      {/* 3. Main Body & Sidebar Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Desktop Left Focused Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block border-r border-red-950/60 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto bg-[#070A12]">
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold px-3 py-1">
              FOCUSED CITIZEN ACTION
            </p>
            {mainNavItems.map((item) => {
              const active = location.pathname === item.path || (item.path === '/act' && location.pathname === '/petitions');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-2xl transition-all border',
                    active
                      ? `${item.activeColor} border-transparent shadow-lg`
                      : 'bg-stone-900/50 hover:bg-stone-800 text-stone-300 hover:text-white border-stone-800/80'
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl shrink-0 mt-0.5",
                    active ? "bg-white/20 text-white" : "bg-stone-800 text-stone-400"
                  )}>
                    <item.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm leading-snug">{item.name}</p>
                    <p className={cn("text-[11px] mt-0.5 line-clamp-1", active ? "text-white/80" : "text-stone-400")}>
                      {item.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Quick Verified Citizen ID Card Box */}
          <div className="mt-8 p-5 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-950 to-red-950 text-white border border-red-900/60 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-red-400 font-black tracking-wider">
                MY GUDALUR ID
              </span>
              <span className="text-[9px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                {profile?.verificationLevel || 'REGISTERED'}
              </span>
            </div>
            
            <div>
              <p className="font-bold text-sm text-white truncate">
                {profile?.name || (lang === 'ta' ? 'குடிமக்கள் அட்டை பெறுக' : 'Get Resident ID')}
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {profile ? `${profile.localityName} (${profile.pincode})` : 'Join the official citizen ledger'}
              </p>
            </div>

            <button
              onClick={() => setIdModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-950 transition flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={14} />
              <span>{profile ? 'View Digital Card' : 'Generate My ID Card'}</span>
            </button>
          </div>

          {/* Emergency Lifeline Contact Reminder */}
          <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-stone-800 text-[11px] text-stone-400 space-y-1.5">
            <p className="font-bold text-stone-300 flex items-center gap-1 text-xs">
              <ShieldAlert size={14} className="text-red-400" />
              <span>Forest RRT Emergency Line</span>
            </p>
            <p className="font-mono text-red-300 font-bold text-sm">1800 425 6100</p>
            <p className="text-[10px] text-stone-500">24/7 Gudalur Wildlife Rapid Response</p>
          </div>
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 bg-[#090D16]">
          {children}
        </main>

      </div>

      {/* 4. Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed inset-0 z-50 bg-[#0B111E] lg:hidden flex flex-col text-white"
          >
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-red-500" />
                <span className="font-serif font-bold text-white">ONE GUDALUR</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:bg-stone-800"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto space-y-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold px-2">
                CORE SECTIONS
              </p>
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-2xl text-base font-bold transition border',
                    location.pathname === item.path
                      ? `${item.activeColor} border-transparent`
                      : 'bg-stone-900 text-stone-200 border-stone-800 hover:bg-stone-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight size={16} className="text-stone-500" />
                </Link>
              ))}

              <div className="pt-6 mt-4 border-t border-stone-800">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIdModalOpen(true);
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm shadow-xl shadow-red-950 flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  <span>{profile ? `My Gudalur ID (${profile.gudalurId})` : 'Generate My Resident ID'}</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Mobile Bottom 3-Tab Bar */}
      <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-stone-800 bg-[#0B111E]/95 backdrop-blur-md px-4 py-2.5 md:hidden flex items-center justify-around">
        <Link
          to="/"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-bold transition',
            location.pathname === '/' ? 'text-red-500 font-black' : 'text-stone-400 hover:text-white'
          )}
        >
          <Flame size={22} className={location.pathname === '/' ? 'text-red-500 animate-pulse' : 'text-stone-400'} />
          <span>{lang === 'ta' ? 'பிரகடனம்' : 'Manifesto'}</span>
        </Link>

        <Link
          to="/act"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-bold transition',
            location.pathname === '/act' || location.pathname === '/petitions' ? 'text-emerald-400 font-black' : 'text-stone-400 hover:text-white'
          )}
        >
          <HeartHandshake size={22} className={location.pathname === '/act' || location.pathname === '/petitions' ? 'text-emerald-400' : 'text-stone-400'} />
          <span>{lang === 'ta' ? 'கோரிக்கைகள்' : 'Act / Demands'}</span>
        </Link>

        <Link
          to="/profile"
          className={cn(
            'flex flex-col items-center gap-1 text-[11px] font-bold transition',
            location.pathname === '/profile' ? 'text-white font-black' : 'text-stone-400 hover:text-white'
          )}
        >
          <ShieldCheck size={22} className={location.pathname === '/profile' ? 'text-emerald-400' : 'text-stone-400'} />
          <span>{lang === 'ta' ? 'குடிமக்கள் அட்டை' : 'My ID'}</span>
        </Link>
      </nav>

      {/* Universal Modals & Offline Helper */}
      <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};
export default Shell;
