import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Shell from './components/Layout/Shell';

// Pages
import Manifesto from './pages/Manifesto';
import Home from './pages/Home';
import Places from './pages/Places';
import Localities from './pages/Localities';
import Live from './pages/Live';
import Issues from './pages/Issues';
import WildlifeHub from './pages/WildlifeHub';
import Petitions from './pages/Petitions';
import Government from './pages/Government';
import GovtChannels from './pages/GovtChannels';
import BusTimings from './pages/BusTimings';
import Services from './pages/Services';
import StoryOfGudalur from './pages/StoryOfGudalur';
import History from './pages/History';
import AIGuide from './pages/AIGuide';
import Admin from './pages/Admin';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="text-xs font-serif tracking-widest uppercase text-emerald-400 font-bold">
            ONE GUDALUR
          </p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Manifesto />} />
        <Route path="/manifesto" element={<Manifesto />} />
        <Route path="/hub" element={<Home />} />
        <Route path="/home" element={<Navigate to="/hub" replace />} />
        <Route path="/places" element={<Places />} />
        <Route path="/localities" element={<Localities />} />
        <Route path="/live" element={<Live />} />
        <Route path="/issues" element={<Issues />} />
        <Route path="/wildlife" element={<WildlifeHub />} />
        <Route path="/act" element={<Petitions />} />
        <Route path="/government" element={<Government />} />
        <Route path="/govt-channels" element={<GovtChannels />} />
        <Route path="/bus-timings" element={<BusTimings />} />
        <Route path="/services" element={<Services />} />
        <Route path="/story" element={<StoryOfGudalur />} />
        <Route path="/history" element={<History />} />
        <Route path="/ai-guide" element={<AIGuide />} />
        <Route path="/admin" element={<Admin />} />
        
        {/* Fallback & Legacy Redirects */}
        <Route path="/reports" element={<Navigate to="/issues" replace />} />
        <Route path="/directory" element={<Navigate to="/services" replace />} />
        <Route path="/community" element={<Navigate to="/places" replace />} />
        <Route path="/market" element={<Navigate to="/services" replace />} />
        <Route path="/knowledge-hub" element={<Navigate to="/story" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster 
            position="top-center" 
            toastOptions={{
              style: {
                borderRadius: '16px',
                background: '#0f172a',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '600'
              }
            }}
          />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
