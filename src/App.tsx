import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage, type Language } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import { OpeningAnimation } from './components/OpeningAnimation';
import { PETITION_ONLY } from './config/productionMode';

const SignPetitionPage = lazy(() => import('./pages/SignPetitionPage').then((m) => ({ default: m.SignPetitionPage })));
const Manifesto = lazy(() => import('./pages/Manifesto').then((m) => ({ default: m.Manifesto })));
const ClosedCorridorsPage = lazy(() => import('./pages/ClosedCorridorsPage').then((m) => ({ default: m.ClosedCorridorsPage })));
const VerifySignPage = lazy(() => import('./pages/VerifySignPage').then((m) => ({ default: m.VerifySignPage })));
const OfficialsPortalPage = lazy(() => import('./pages/OfficialsPortalPage').then((m) => ({ default: m.OfficialsPortalPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const OfficialLoginPage = lazy(() => import('./pages/OfficialLoginPage').then((m) => ({ default: m.OfficialLoginPage })));
const SightingsPage = lazy(() => import('./pages/SightingsPage').then((m) => ({ default: m.SightingsPage })));
const PetitionOnlyPage = lazy(() => import('./pages/PetitionOnlyPage').then((m) => ({ default: m.PetitionOnlyPage })));
const TrustPage = lazy(() => import('./pages/TrustPage').then((m) => ({ default: m.TrustPage })));
const VoiceSoundboardPage = lazy(() => import('./pages/VoiceSoundboardPage').then((m) => ({ default: m.VoiceSoundboardPage })));

const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

const ValidatePage = lazy(() => import('./pages/ValidatePage').then((m) => ({ default: m.default })));

const RouteFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading page">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
  </div>
);

/**
 * Paths a SHARED link can point at. The intro overlay is `fixed inset-0
 * z-[100]`, so on these routes it covers the target screen — a witness who
 * just tapped a WhatsApp validation link would have to tap through four intro
 * screens (language -> concern -> intro -> cost) before reaching it.
 *
 * Skipping is safe: the language is still restored from localStorage and can
 * be changed any time from the menu.
 */
const DEEP_LINK_PREFIXES = ['/validate/', '/verify-sign'] as const;
const isDeepLink = (pathname: string): boolean =>
  DEEP_LINK_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const CampaignDashboard = lazy(() => import('./pages/CampaignDashboard').then((m) => ({ default: m.CampaignDashboard })));

const PetitionOnlyRoutes: React.FC = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/" element={<CampaignDashboard />} />
      <Route path="/sign-petition" element={<PetitionOnlyPage />} />
      <Route path="/verify-sign" element={<VerifySignPage />} />
      {/* Witness validation — MUST be routed here too, otherwise a shared
          /validate/<token> link falls through to "*" and drops the witness on
          the campaign frontpage instead of the validation screen. */}
      <Route path="/validate/:token" element={<ValidatePage />} />
      <Route path="/validate/done" element={<ValidatePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/trust" element={<TrustPage />} />
      <Route path="*" element={<CampaignDashboard />} />
    </Routes>
  </Suspense>
);

const AdminRoutes: React.FC = () => (
  <Routes>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
    <Route path="/official/login" element={<OfficialLoginPage />} />
  </Routes>
);

const AppContent: React.FC = () => {
  const { setLang } = useLanguage();
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [location.pathname]);
  // A shared deep link lands on its target screen immediately (see
  // DEEP_LINK_PREFIXES) — the intro overlay must never cover it.
  const deepLink = isDeepLink(location.pathname);
  const [showOpening, setShowOpening] = useState(() => !deepLink);
  useEffect(() => {
    // Mark this tab as "past the intro" so the service-worker update guard in
    // main.tsx cannot hard-reload the page out from under a witness who is
    // mid-registration on a shared validation link.
    if (deepLink) {
      try { localStorage.setItem('VoiceOfGudalur_lang_chosen', '1'); } catch { /* private mode */ }
    }
  }, [deepLink]);
  return (
    <>
      {/* The opening overlay MUST unmount when chosen — otherwise it keeps
          covering the whole app (fixed inset-0 z-[100]) and the "Open Voice of
          Gudalur" button appears dead. Applying the chosen language here also
          makes the intro selection stick app-wide. */}
      {showOpening && (
        <OpeningAnimation
          onChoose={(l: Language) => {
            try { localStorage.setItem('VoiceOfGudalur_lang_chosen', '1'); } catch { /* private mode */ }
            setLang(l);
            setShowOpening(false);
          }}
        />
      )}
      <Shell petitionOnly={PETITION_ONLY}>
        {PETITION_ONLY ? (
          <PetitionOnlyRoutes />
        ) : (
          <>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="min-h-[50vh]">
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<CampaignDashboard />} />
                  <Route path="/sign-petition" element={<SignPetitionPage />} />
                  <Route path="/petition" element={<PetitionOnlyPage />} />
                  <Route path="/about" element={<Manifesto />} />
                  <Route path="/corridors" element={<ClosedCorridorsPage />} />
                  <Route path="/sightings" element={<SightingsPage />} />
                  <Route path="/voices" element={<VoiceSoundboardPage />} />
                  <Route path="/verify-sign" element={<VerifySignPage />} />
                  <Route path="/officials" element={<OfficialsPortalPage />} />
                  <Route path="/trust" element={<TrustPage />} />
                  <Route path="/validate/:token" element={<ValidatePage />} />
                  <Route path="/validate/done" element={<ValidatePage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="*" element={<CampaignDashboard />} />
                </Routes>
              </Suspense>
            </motion.div>
          </>
        )}
      </Shell>
    </>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          {!PETITION_ONLY && <AdminRoutes />}
          <AppContent />
          <Toaster position="top-center" toastOptions={{ duration: Infinity, style: { borderRadius: '24px', background: '#9ACD32', color: '#FFFFFF', fontSize: '13px', fontWeight: '900', padding: '6px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }} />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

