import React, { lazy, Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import { OpeningAnimation, INTRO_SEEN_KEY } from './components/OpeningAnimation';

// Route-level code splitting — every page downloads only when first visited.
const SignPetitionPage = lazy(() => import('./pages/SignPetitionPage').then((m) => ({ default: m.SignPetitionPage })));
const Manifesto = lazy(() => import('./pages/Manifesto').then((m) => ({ default: m.Manifesto })));
const ClosedCorridorsPage = lazy(() => import('./pages/ClosedCorridorsPage').then((m) => ({ default: m.ClosedCorridorsPage })));
const VerifySignPage = lazy(() => import('./pages/VerifySignPage').then((m) => ({ default: m.VerifySignPage })));
const OfficialsPortalPage = lazy(() => import('./pages/OfficialsPortalPage').then((m) => ({ default: m.OfficialsPortalPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OfficialLoginPage = lazy(() => import('./pages/OfficialLoginPage').then((m) => ({ default: m.OfficialLoginPage })));

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

/** Animal sightings open after the government system integration — launch placeholder. */
const SightingsSoonPage: React.FC = () => (
  <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
    <div className="text-5xl" aria-hidden>🐘</div>
    <h1 className="text-2xl font-black text-slate-900">Animal Sightings — Coming Soon</h1>
    <p className="text-sm text-slate-600 leading-relaxed">
      Sighting reports will open here once the government forest-department system is
      integrated with Voice of Gudalur. Until then, explore the closed corridors map
      and add your voice to the Right to Life petition.
    </p>
    <Link
      to="/"
      className="inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg"
    >
      Sign the Petition
    </Link>
  </div>
);

const AppContent: React.FC = () => {
  const { loading } = useAuth();
  // The opening animation plays once per session (skipped for reduced-motion users).
  const [introDone, setIntroDone] = useState<boolean>(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
      return sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      return true;
    }
  });

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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Clean homepage — the Right to Life petition sign-in. */}
          <Route path="/" element={<SignPetitionPage />} />
          <Route path="/sign-petition" element={<SignPetitionPage />} />
          {/* Original home content lives as a topic inside the menu. */}
          <Route path="/about" element={<Manifesto />} />
          <Route path="/corridors" element={<ClosedCorridorsPage />} />
          <Route path="/sightings" element={<SightingsSoonPage />} />
          <Route path="/verify-sign" element={<VerifySignPage />} />
          <Route path="/officials" element={<OfficialsPortalPage />} />
          <Route path="*" element={<SignPetitionPage />} />
        </Routes>
      </Suspense>
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
