// Voice of Gudalur — PWA Install Prompt
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { lang } = useLanguage();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => { setShowBanner(false); setDismissed(true); };
  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
      <div className="rounded-2xl shadow-lg border border-emerald-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700"><Download size={20} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800">{lang === 'ta' ? 'ஆப்ஸை நிறுவுங்கள்' : 'Install App'}</p>
            <p className="text-xs text-slate-600 mt-1">{lang === 'ta' ? 'ஆஃப்லைனிலும் அறிக்கைகளை சமர்ப்பிக்கவும்' : 'Install for offline reporting and quick access'}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={handleInstall} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition">{lang === 'ta' ? 'நிறுவு' : 'Install'}</button>
              <button onClick={handleDismiss} className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition">{lang === 'ta' ? 'பின்னர்' : 'Later'}</button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
      </div>
    </div>
  );
};

