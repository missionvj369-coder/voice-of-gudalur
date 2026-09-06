import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage, type Language } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import { OpeningAnimation } from './components/OpeningAnimation';
import { LanguageGate } from './components/LanguageGate';

// Route-level code splitting — every page downloads only when first visited.
const SignPetitionPage = lazy(() => import('./pages/SignPetitionPage').then((m) => ({ default: m.SignPetitionPage })));
const Manifesto = lazy(() => import('./pages/Manifesto').then((m) => ({ default: m.Manifesto })));
const ClosedCorridorsPage = lazy(() => import('./pages/ClosedCorridorsPage').then((m) => ({ default: m.ClosedCorridorsPage })));
const VerifySignPage = lazy(() => import('./pages/VerifySignPage').then((m) => ({ default: m.VerifySignPage })));
const OfficialsPortalPage = lazy(() => import('./pages/OfficialsPortalPage').then((m) => ({ default: m.OfficialsPortalPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OfficialLoginPage = lazy(() => import('./pages/OfficialLoginPage').then((m) => ({ default: m.OfficialLoginPage })));
const SightingsPage = lazy(() => import('./pages/SightingsPage').then((m) => ({ default: m.SightingsPage })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
  </div>
);

const AdminRoutes: React.FC = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/admin" element={<AdminLoginPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/official/login" element={<OfficialLoginPage />} />
      <Route path="/official/set-password" element={<OfficialLoginPage />} />
    </Routes>
  </Suspense>
);

const AppContent: React.FC = () => {
  const { loading } = useAuth();
  const { setLang } = useLanguage();
  const { pathname } = useLocation();
  // First-visit language gate: shown BEFORE the front page. The chosen
  // language persists (VoiceOfGudalur_lang_chosen), so returning visitors go
  // straight into the app in their language.
  const [langChosen, setLangChosen] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('VoiceOfGudalur_lang_chosen');
    } catch {
      return true;
    }
  });
  const handleLanguageChosen = (lang: Language) => {
    try { localStorage.setItem('VoiceOfGudalur_lang_chosen', '1'); } catch { /* ignore */ }
    setLang(lang);
    setLangChosen(true);
  };
  // The opening animation plays on EVERY visit — every fresh load of the site
  // (new tab, new session, coming back later) starts with the animation.
  // Only users who prefer reduced motion skip it. Login state is unaffected:
  // the session/profile is restored underneath while the animation plays.
  const [introDone, setIntroDone] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return true;
    }
  });

  // WCAG 23.3 — honor the user's motion preference for page transitions too.
  const prefersReducedMotion = introDone;

  // Every navigation starts at the top of the page (no mid-page open; no
  // sticky scroll between routes). 100% of sessions start at the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  if (!langChosen) {
    return <LanguageGate onChoose={handleLanguageChosen} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1B5E20]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      {!introDone && <OpeningAnimation onFinish={() => setIntroDone(true)} />}
      <Shell>
        {/* Elegant low-latency page transitions — a light fade + lift that
            never blocks content (LCP-safe: the page paints on frame one). */}
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: 'easeOut' }}
          className="min-h-[50vh]"
        >
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Clean homepage — the Right to Life petition sign-in. */}
              <Route path="/" element={<SignPetitionPage />} />
              <Route path="/sign-petition" element={<SignPetitionPage />} />
              {/* Original home content lives as a topic inside the menu. */}
              <Route path="/about" element={<Manifesto />} />
              <Route path="/corridors" element={<ClosedCorridorsPage />} />
              <Route path="/sightings" element={<SightingsPage />} />
              <Route path="/verify-sign" element={<VerifySignPage />} />
              <Route path="/officials" element={<OfficialsPortalPage />} />
              <Route path="*" element={<SignPetitionPage />} />
            </Routes>
          </Suspense>
        </motion.div>
      </Shell>
    </>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AdminRoutes />
          <AppContent />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: '#1B5E20',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                padding: '10px 14px',
              },
            }}
          />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
