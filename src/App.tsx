import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProximityAlertProvider } from './context/ProximityAlertProvider';
import { LocationGate } from './components/LocationGate';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import Manifesto from './pages/Manifesto';
import VerifyDocket from './pages/VerifyDocket';
import { VoiceSoundboardPage } from './pages/VoiceSoundboardPage';
import { LiveGisMapPage } from './pages/LiveGisMapPage';
import { VoiceReportButton } from './components/VoiceReportButton';
import { NavBar } from './components/NavBar';
import { NewSightingPage } from './pages/NewSightingPage';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SignPetitionPage } from './pages/SignPetitionPage';
import { VerifySignPage } from './pages/VerifySignPage';
import { OfficialsPortalPage } from './pages/OfficialsPortalPage';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <LocationGate>
      <Shell>
        <NavBar />
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
          <AppContent />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: '12px',
                background: '#0f172a',
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
