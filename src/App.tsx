import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProximityAlertProvider } from './context/ProximityAlertProvider';
import { LocationGate } from './components/LocationGate';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import { VoiceReportButton } from './components/VoiceReportButton';
import { NavBar } from './components/NavBar';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineIndicator } from './components/OfflineIndicator';

// ─── Route-level code splitting ─────────────────────────────────────────────
// Every page downloads only when first visited. The Manifesto (public landing)
// is the only eager import so the first paint stays minimal; map, AI, petition,
// and officials modules load on demand (their heavy deps stay out of the boot path).
const Manifesto = lazy(() => import('./pages/Manifesto').then((m) => ({ default: m.Manifesto })));
const VerifyDocket = lazy(() => import('./pages/VerifyDocket'));
const VoiceSoundboardPage = lazy(() => import('./pages/VoiceSoundboardPage').then((m) => ({ default: m.VoiceSoundboardPage })));
const LiveGisMapPage = lazy(() => import('./pages/LiveGisMapPage').then((m) => ({ default: m.LiveGisMapPage })));
const NewSightingPage = lazy(() => import('./pages/NewSightingPage').then((m) => ({ default: m.NewSightingPage })));
const SignPetitionPage = lazy(() => import('./pages/SignPetitionPage').then((m) => ({ default: m.SignPetitionPage })));
const VerifySignPage = lazy(() => import('./pages/VerifySignPage').then((m) => ({ default: m.VerifySignPage })));
const OfficialsPortalPage = lazy(() => import('./pages/OfficialsPortalPage').then((m) => ({ default: m.OfficialsPortalPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OfficialLoginPage = lazy(() => import('./pages/OfficialLoginPage').then((m) => ({ default: m.OfficialLoginPage })));

/** Shared, skeleton-light fallback shown while a route chunk streams in. */
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1B5E20]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <LocationGate>
      <Shell>
        <NavBar />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Manifesto />} />
            <Route path="/verify-docket" element={<VerifyDocket />} />
            <Route path="/voice-soundboard" element={<VoiceSoundboardPage />} />
            <Route path="/live-gis-map" element={<LiveGisMapPage />} />
            <Route path="/report-sighting" element={<NewSightingPage />} />
            <Route path="/sign-petition" element={<SignPetitionPage />} />
            <Route path="/verify-sign" element={<VerifySignPage />} />
            <Route path="/officials" element={<OfficialsPortalPage />} />
            <Route path="*" element={<Manifesto />} />
          </Routes>
        </Suspense>
        <VoiceReportButton />
        <PWAInstallPrompt />
        <OfflineIndicator />
      </Shell>
    </LocationGate>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProximityAlertProvider>
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
        </ProximityAlertProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
