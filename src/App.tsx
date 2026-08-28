import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';

import Home from './pages/Home';
import Safety from './pages/Safety';
import Report from './pages/Report';
import Alerts from './pages/Alerts';
import SafetyMap from './pages/SafetyMap';
import Localities from './pages/Localities';
import LocalityDetail from './pages/Localities/LocalityDetail';
import Gudalur365 from './pages/Gudalur365';
import RightToLife from './pages/RightToLife';
import LawAndEvidence from './pages/LawAndEvidence';
import Evidence from './pages/Evidence';
import GovernmentAction from './pages/GovernmentAction';
import Act from './pages/Act';
import About from './pages/About';
import Admin from './pages/Admin';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAF9]" role="status" aria-live="polite">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" aria-hidden="true" />
        <span className="sr-only">Loading Voice of Gudalur…</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Home />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/report" element={<Report />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/safety-map" element={<SafetyMap />} />
        <Route path="/localities" element={<Localities />} />
        <Route path="/localities/:slug" element={<LocalityDetail />} />
        <Route path="/gudalur-365" element={<Gudalur365 />} />
        <Route path="/right-to-life" element={<RightToLife />} />
        <Route path="/law-and-evidence" element={<LawAndEvidence />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/government-action" element={<GovernmentAction />} />
        <Route path="/act" element={<Act />} />
        <Route path="/about" element={<About />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
            <OfflineIndicator />
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
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
