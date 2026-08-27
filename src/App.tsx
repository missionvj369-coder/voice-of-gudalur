import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Shell from './components/Layout/Shell';

// Core Focused Pages
import Manifesto from './pages/Manifesto';
import Petitions from './pages/Petitions';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-600 border-t-transparent"></div>
          <p className="text-xs font-serif tracking-widest uppercase text-red-400 font-bold">
            ONE GUDALUR • RIGHT TO LIFE
          </p>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <Routes>
        {/* 1. Right to Life Manifesto */}
        <Route path="/" element={<Manifesto />} />
        <Route path="/manifesto" element={<Manifesto />} />

        {/* 2. Act for Gudalur (Petitions, Demands & Solutions) */}
        <Route path="/act" element={<Petitions />} />
        <Route path="/petitions" element={<Petitions />} />

        {/* 3. Resident Citizen Card & Profile */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/id" element={<Profile />} />

        {/* 4. Admin (Moderation) */}
        <Route path="/admin" element={<Admin />} />

        {/* Fallback to Manifesto */}
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
