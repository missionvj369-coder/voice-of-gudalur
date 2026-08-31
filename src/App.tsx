import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import Manifesto from './pages/Manifesto';
import VerifyDocket from './pages/VerifyDocket';

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
    <Shell>
      <Routes>
        <Route path="/" element={<Manifesto />} />
        <Route path="/verify-docket" element={<VerifyDocket />} />
        <Route path="*" element={<Manifesto />} />
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
      </AuthProvider>
    </LanguageProvider>
  );
}