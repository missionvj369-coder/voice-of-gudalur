import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  MapPin, 
  AlertTriangle, 
  CheckSquare, 
  Compass, 
  HeartHandshake, 
  Landmark, 
  Bus, 
  PhoneCall, 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  Menu, 
  X, 
  LogOut, 
  User, 
  Plus,
  Radio,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, type Language } from '../../context/LanguageContext';
import { cn } from '../../lib/utils';
import { GudalurLiveBar } from '../GudalurLiveBar';
import { GudalurIdModal } from '../GudalurIdModal';
import { ReportIssueModal } from '../ReportIssueModal';
import { OfflineIndicator } from '../OfflineIndicator';

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [idModalOpen, setIdModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const mainNavItems = [
    { name: t('nav.manifesto') || 'Manifesto', path: '/', icon: Flame },
    { name: t('nav.hub') || 'City Hub', path: '/hub', icon: Home },
    { name: t('nav.places'), path: '/places', icon: MapPin },
    { name: t('nav.live'), path: '/live', icon: Radio },
    { name: t('nav.issues'), path: '/issues', icon: CheckSquare },
    { name: t('nav.wildlife'), path: '/wildlife', icon: Compass },
    { name: t('nav.petitions'), path: '/act', icon: HeartHandshake },
    { name: t('nav.government'), path: '/government', icon: Landmark },
    { name: t('nav.bus'), path: '/bus-timings', icon: Bus },
    { name: t('nav.services'), path: '/services', icon: PhoneCall },
    { name: t('nav.story'), path: '/story', icon: BookOpen },
    { name: t('nav.guide'), path: '/ai-guide', icon: Sparkles },
  ];

  if (profile?.role === 'PLATFORM_ADMIN' || profile?.role === 'CORE_ADMIN' || user?.email === 'vijaybalakrishnanshanmugam@gmail.com') {
    mainNavItems.push({ name: t('nav.admin'), path: '/admin', icon: ShieldCheck });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans flex flex-col">
      {/* 1. Universal Top Live Pulse Bar */}
      <GudalurLiveBar />

      {/* 2. Top Application Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-emerald-400 flex items-center justify-center shadow-md border border-slate-700/50 group-hover:scale-105 transition-transform">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-black tracking-tight text-lg sm:text-xl text-slate-900">ONE GUDALUR</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 hidden sm:inline-block">
                  Nilgiris
                </span>
              </div>
              <p className="text-[10px] text-slate-500 tracking-wide line-clamp-1 font-medium hidden md:block">
                {t('brand.tagline')}
              </p>
            </div>
          </Link>

          {/* Center/Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Report Button */}
            <button
              onClick={() => setReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs transition"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">{t('places.report_issue')}</span>
              <span className="sm:hidden">Report</span>
            </button>

            {/* Gudalur ID Badge Button */}
            <button
              onClick={() => setIdModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 transition"
            >
              <ShieldCheck size={15} className="text-emerald-400" />
              <span className="hidden md:inline">
                {profile ? profile.gudalurId : t('hero.join_btn')}
              </span>
              <span className="md:hidden">ID</span>
            </button>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {(['en', 'ta', 'ml', 'kn'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'px-2 py-1 rounded-lg text-[11px] font-bold transition-all',
                    lang === l
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {l === 'en' ? 'EN' : l === 'ta' ? 'தமிழ்' : l === 'ml' ? 'മല' : 'ಕನ್ನಡ'}
                </button>
              ))}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

        </div>
      </header>

      {/* 3. Main Navigation & Page Body Grid */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Desktop Left Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-200/80 p-4 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="space-y-1">
            {mainNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                    active
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-700/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Resident Profile Box */}
          <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">MY GUDALUR ID</span>
              <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.2 rounded">VERIFIED</span>
            </div>
            <p className="font-bold text-sm truncate">{profile?.name || 'Citizen Member'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{profile?.localityName || 'SS Nagar'}</p>
            <button
              onClick={() => setIdModalOpen(true)}
              className="w-full mt-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition"
            >
              View Digital Card
            </button>
          </div>
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
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
            className="fixed inset-0 z-50 bg-white lg:hidden flex flex-col"
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-emerald-600" />
                <span className="font-serif font-bold text-slate-900">ONE GUDALUR</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 p-4 overflow-y-auto space-y-1">
              {mainNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-semibold transition',
                    location.pathname === item.path
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.name}</span>
                </Link>
              ))}

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIdModalOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white font-bold text-sm shadow-md"
                >
                  {profile ? `My Gudalur ID (${profile.gudalurId})` : t('hero.join_btn')}
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Mobile Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-slate-200 bg-white/95 backdrop-blur-md px-3 py-2 lg:hidden flex items-center justify-around">
        <Link
          to="/"
          className={cn('flex flex-col items-center gap-0.5 text-[10px] font-bold', location.pathname === '/' ? 'text-rose-600' : 'text-slate-400')}
        >
          <Flame size={20} className={location.pathname === '/' ? 'text-rose-600' : 'text-slate-400'} />
          <span>{lang === 'ta' ? 'பிரகடனம்' : lang === 'kn' ? 'ಪ್ರಣಾಳಿಕೆ' : 'Voice'}</span>
        </Link>
        <Link
          to="/hub"
          className={cn('flex flex-col items-center gap-0.5 text-[10px] font-bold', location.pathname === '/hub' ? 'text-emerald-600' : 'text-slate-400')}
        >
          <Home size={20} />
          <span>Hub</span>
        </Link>
        <button
          onClick={() => setReportModalOpen(true)}
          className="flex flex-col items-center justify-center w-10 h-10 -mt-4 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-700/30"
        >
          <Plus size={22} />
        </button>
        <Link
          to="/places"
          className={cn('flex flex-col items-center gap-0.5 text-[10px] font-bold', location.pathname === '/places' ? 'text-emerald-600' : 'text-slate-400')}
        >
          <MapPin size={20} />
          <span>Places</span>
        </Link>
        <button
          onClick={() => setIdModalOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-900"
        >
          <ShieldCheck size={20} />
          <span>My ID</span>
        </button>
      </nav>

      {/* Universal Modals & Offline Helper */}
      <GudalurIdModal isOpen={idModalOpen} onClose={() => setIdModalOpen(false)} />
      <ReportIssueModal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} />
      <OfflineIndicator />
    </div>
  );
};
export default Shell;
