import React, { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, X, ShieldAlert, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../context/LanguageContext';
import { GudalurIdModal } from '../GudalurIdModal';

const NAV = [
  { to: '/safety', key: 'nav.safety' },
  { to: '/localities', key: 'nav.places' },
  { to: '/right-to-life', key: 'nav.manifesto' },
  { to: '/evidence', key: 'nav.evidence' },
  { to: '/government-action', key: 'nav.action' },
  { to: '/about', key: 'nav.about' },
];

export const Shell: React.FC = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [idOpen, setIdOpen] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const location = useLocation();

  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);
  useEffect(() => { setNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    const open = () => setIdOpen(true);
    window.addEventListener('vg-open-id', open);
    return () => window.removeEventListener('vg-open-id', open);
  }, []);
  useEffect(() => {
    const codes: Record<string, string> = { en: 'en-IN', ta: 'ta-IN', ml: 'ml-IN', kn: 'kn-IN' };
    document.documentElement.lang = codes[lang] || 'en-IN';
  }, [lang]);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Voice of Gudalur — home">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600" aria-hidden="true"><ShieldAlert size={17} /></span>
            <span>
              <span className="block text-sm font-bold leading-tight tracking-wide">VOICE OF GUDALUR</span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-emerald-300">Protect People · Protect Wildlife · Protect Gudalur</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <div className="hidden items-center rounded-lg bg-white/10 p-0.5 sm:flex" role="group" aria-label="Language">
              {(['en', 'ta', 'ml'] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={cn('rounded-md px-2 py-1 text-xs font-bold uppercase', lang === l ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white')}>
                  {l === 'en' ? 'EN' : l === 'ta' ? 'த' : 'മ'}
                </button>
              ))}
            </div>
            <Link to="/report" className="rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500">Report</Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link key={item.to} to={item.to}
                aria-current={location.pathname.startsWith(item.to) && item.to !== '/' ? 'page' : undefined}
                className={cn('rounded-lg px-3 py-2 text-sm font-semibold transition-colors hover:bg-emerald-50 hover:text-emerald-900',
                  location.pathname.startsWith(item.to) && item.to !== '/' ? 'bg-emerald-50 text-emerald-900' : 'text-slate-700')}>
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="flex flex-1 items-center justify-between gap-2 py-2 md:hidden">
            <button onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen} aria-label="Toggle navigation menu"
              className="rounded-lg border border-slate-300 p-2 text-slate-700">
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{t('brand.title')}</span>
            <button onClick={() => setIdOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-700">My ID</button>
          </div>
          <div className="hidden md:flex">
            <button onClick={() => setIdOpen(true)} className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50">Resident ID</button>
          </div>
        </div>
        {navOpen && (
          <nav aria-label="Mobile" className="border-t border-slate-200 bg-white md:hidden">
            <div className="mx-auto grid max-w-6xl gap-1 px-4 py-3">
              {NAV.map((item) => (
                <Link key={item.to} to={item.to}
                  className={cn('rounded-lg px-3 py-2.5 text-base font-semibold',
                    location.pathname.startsWith(item.to) && item.to !== '/' ? 'bg-emerald-50 text-emerald-900' : 'text-slate-800')}>
                  {t(item.key)}
                </Link>
              ))}
              <Link to="/report" className="mt-1 rounded-lg bg-emerald-700 px-3 py-2.5 text-center text-base font-bold uppercase tracking-wide text-white">Report a sighting</Link>
            </div>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <p className="text-base font-bold text-slate-900">Voice of Gudalur</p>
          <p className="mt-1 text-sm text-slate-600">Protect People. Protect Wildlife. Protect Gudalur.</p>
          <nav aria-label="Footer" className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              ['/safety', 'Safety'], ['/report', 'Report'], ['/localities', 'Localities'],
              ['/right-to-life', 'Right to Life'], ['/evidence', 'Evidence'],
              ['/government-action', 'Government Action'], ['/privacy', 'Privacy'], ['/terms', 'Terms'],
            ].map(([to, label]) => (
              <Link key={to} to={to} className="text-slate-600 underline-offset-4 hover:text-emerald-800 hover:underline">{label}</Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
            <p>
              A citizen-led civic safety and accountability platform. Community reports are always shown with their verification status and
              never presented as official records. This platform does not encourage harm to wildlife and does not publish precise animal locations.
            </p>
            <p className="mt-1"><FileText size={11} className="mr-1 inline" aria-hidden="true" />Gudalur, Nilgiris, Tamil Nadu · English · தமிழ் · മലയാളം</p>
          </div>
        </div>
      </footer>

      <GudalurIdModal isOpen={idOpen} onClose={() => setIdOpen(false)} />
    </div>
  );
};
