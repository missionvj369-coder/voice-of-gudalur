import React, { useState, useEffect } from 'react';
import { WifiOff, PhoneCall, ShieldCheck, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const OfflineIndicator: React.FC = () => {
  const { lang } = useLanguage();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-3xl shadow-2xl border border-slate-700 space-y-3 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <WifiOff size={18} />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-slate-100">
              {lang === 'ta' ? 'ஆஃப்லைன் பயன்முறை (மலைப்பாதை இணைப்பு துண்டிப்பு)' : 'Offline Mountain Mode Active'}
            </h4>
            <p className="text-[11px] text-slate-400">
              {lang === 'ta' ? 'அத்தியாவசிய எண்கள் & அட்டவணைகள் சேமிக்கப்பட்டுள்ளன' : 'Cached emergency helplines & transit schedules available'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X size={16} />
        </button>
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <a
          href="tel:18004256100"
          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
        >
          <PhoneCall size={12} />
          <span>Forest RRT: 1800 425 6100</span>
        </a>
        <a
          href="tel:108"
          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold"
        >
          <PhoneCall size={12} />
          <span>Ambulance: 108</span>
        </a>
      </div>
    </div>
  );
};
