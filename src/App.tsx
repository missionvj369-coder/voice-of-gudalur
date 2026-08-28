import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Shell } from './components/Layout/Shell';
import Manifesto from './pages/Manifesto';

const AppContent: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090D16]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Shell>
      <Manifesto />
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
