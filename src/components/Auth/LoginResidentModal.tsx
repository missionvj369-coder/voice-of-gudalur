import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, IdCard, LogIn, Loader2, ShieldCheck } from 'lucide-react';
import { SiGoogle, SiTelegram } from 'react-icons/si';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

interface LoginResidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** Opens the registration modal instead (for new residents). */
  onNeedRegister?: () => void;
}

/**
 * PASSWORDLESS LOGIN â€” residents sign in with their Phone Number + Gudalur ID number only.
 * No password is ever requested.
 */
export const LoginResidentModal: React.FC<LoginResidentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNeedRegister,
}) => {
  const { loginResident, loginWithGoogle, loginWithTelegram } = useAuth();
  const { lang } = useLanguage();

  const [phone, setPhone] = useState('');
  const [gudalurId, setGudalurId] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'telegram' | null>(null);
  const [providers, setProviders] = useState<{
    google: { available: boolean; reason: string | null };
    telegram: { available: boolean; botUsername: string | null; reason: string | null };
  } | null>(null);

  // Fetch which social providers are configured so we can show the Telegram
  // Login Widget only when it's actually wired up on the server.
  useEffect(() => {
    void authApi.providers().then(setProviders).catch(() => setProviders(null));
  }, []);

  // Telegram Login Widget â€” renders the widget script into the container div
  // when Telegram is configured. The widget callback fires onAuth with the
  // user data, which we forward to loginWithTelegram (AuthContext).
  useEffect(() => {
    if (!providers?.telegram.available || !providers.telegram.botUsername) return;

    const container = document.getElementById('vog-telegram-login-widget');
    if (!container || container.childElementCount > 0) return;

    // @ts-ignore â€” Telegram sets window.onTelegramAuth as a global callback
    window.onTelegramAuth = (user: Record<string, any>) => {
      void (async () => {
        setSocialBusy('telegram');
        try { sessionStorage.setItem('vog_user_active', '1'); } catch { /* ignore */ }
        try {
          await loginWithTelegram(user);
          toast.success('Welcome back!', { icon: '🪪', duration: 6000 });
          window.dispatchEvent(new Event('vog:authorization-updated'));
          onSuccess?.();
          onClose();
        } catch (err: any) {
          toast.error(err?.message || 'Telegram sign-in failed');
          setSocialBusy(null);
        } finally {
          try { sessionStorage.removeItem('vog_user_active'); } catch { /* ignore */ }
        }
      })();
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', providers.telegram.botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
    return () => {
      // @ts-ignore
      delete window.onTelegramAuth;
      container.innerHTML = '';
    };
  }, [providers, loginWithTelegram, onSuccess, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    // EITHER identifier is enough â€” no field is mandatory on its own.
    if (digits.length !== 10 && !gudalurId.trim()) {
      toast.error('Enter your mobile number OR your Gudalur ID â€” either one is enough to continue.');
      return;
    }
    if (phone.trim() && digits.length > 0 && digits.length < 10) {
      toast.error('Mobile number looks incomplete â€” enter all 10 digits, or clear it and use your Gudalur ID.');
      return;
    }
    setIsLoggingIn(true);
    // CRITICAL-FLOW GUARD: prevent version-poll auto-reload while we log in
    try { sessionStorage.setItem('vog_user_active', '1'); } catch { /* ignore */ }
    try {
      const resident = await loginResident(digits.length === 10 ? phone : '', gudalurId.trim().toUpperCase());
      toast.success(
        lang === 'ta' ? `à®µà®°à®µà¯‡à®±à¯à®ªà¯, ${resident.name}!` : `Welcome back, ${resident.name}!`,
        { icon: 'ðŸªª' }
      );
      setPhone('');
      setGudalurId('');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Login failed. Check your details and try again.');
    } finally {
      setIsLoggingIn(false);
      // Release the critical-flow guard
      try { sessionStorage.removeItem('vog_user_active'); } catch { /* ignore */ }
    }
  };

  const handleSocialGoogle = async () => {
    setSocialBusy('google');
    try { sessionStorage.setItem('vog_user_active', '1'); } catch { /* ignore */ }
    try {
      const res = await fetch('/api/auth/google/url');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Google sign-in is not available');
      }
      const data = await res.json() as { url: string };
      window.location.href = data.url;
    } catch (err: any) {
      const msg = err?.message || '';
      // NO_ACCOUNT = user must register first
      if (/NO_ACCOUNT/i.test(msg)) {
        toast.error(
          'This Google account is not linked to any resident. ' +
          'Please register with your mobile number first to get your Gudalur ID.',
          { duration: 7000 }
        );
        setSocialBusy(null);
        // Open registration modal after a short delay
        setTimeout(() => {
          onClose();
          onNeedRegister?.();
        }, 2000);
      } else {
        toast.error(msg || 'Google sign-in failed');
        setSocialBusy(null);
      }
      try { sessionStorage.removeItem('vog_user_active'); } catch { /* ignore */ }
    }
  };

  const handleSocialTelegram = async () => {
    setSocialBusy('telegram');
    try { sessionStorage.setItem('vog_user_active', '1'); } catch { /* ignore */ }
    try {
      toast('Telegram sign-in requires server configuration. Please use phone registration.', { icon: 'â„¹ï¸' });
      setSocialBusy(null);
    } catch (err: any) {
      toast.error(err?.message || 'Telegram sign-in failed');
      setSocialBusy(null);
    } finally {
      try { sessionStorage.removeItem('vog_user_active'); } catch { /* ignore */ }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        /* Scroll-safe overlay: heading + close button can NEVER be clipped,
           and the card is capped to the screen height so it always fits. */
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#0A3D0A]/80 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative my-auto flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]"
            >
              {/* Pinned header â€” heading + close button always visible */}
              <div className="relative shrink-0 border-b border-slate-100 px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute right-3 top-3 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>

                <div className="space-y-1.5 pr-10">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <ShieldCheck size={20} />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {lang === 'ta' ? 'à®•à¯à®Ÿà®¿à®®à®•à®©à¯ à®‰à®³à¯à®¨à¯à®´à¯ˆà®µà¯' : 'Resident Login'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {lang === 'ta'
                      ? 'à®‰à®™à¯à®•à®³à¯ à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯ à®…à®²à¯à®²à®¤à¯ à®•à¯‚à®Ÿà®²à¯‚à®°à¯ à®à®Ÿà®¿ à®Žà®£à¯ â€” à®‡à®µà®±à¯à®±à®¿à®²à¯ à®à®¤à¯‡à®©à¯à®®à¯ à®’à®©à¯à®±à¯ˆ à®®à®Ÿà¯à®Ÿà¯à®®à¯ à®ªà®¯à®©à¯à®ªà®Ÿà¯à®¤à¯à®¤à®µà¯à®®à¯ â€” à®•à®Ÿà®µà¯à®šà¯à®šà¯Šà®²à¯ à®¤à¯‡à®µà¯ˆà®¯à®¿à®²à¯à®²à¯ˆ.'
                      : 'Sign in with your mobile number OR your Gudalur ID â€” either one works. No password needed.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                {/* Scrollable form body â€” only the fields scroll, header/footer stay put */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <p className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                {lang === 'ta'
                  ? 'à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯ à®…à®²à¯à®²à®¤à¯ à®•à¯‚à®Ÿà®²à¯‚à®°à¯ à®à®Ÿà®¿ â€” à®‡à®°à®£à¯à®Ÿà®¿à®²à¯ à®’à®©à¯à®±à¯ˆ à®®à®Ÿà¯à®Ÿà¯à®®à¯ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯.'
                  : 'Enter your mobile number OR your Gudalur ID â€” either one is enough.'}
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'à®¤à¯Šà®²à¯ˆà®ªà¯‡à®šà®¿ à®Žà®£à¯' : 'Phone Number'}
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    maxLength={14}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {lang === 'ta' ? 'à®•à¯‚à®Ÿà®²à¯‚à®°à¯ à®à®Ÿà®¿ à®Žà®£à¯' : 'Gudalur ID Number'}
                </label>
                <div className="relative">
                  <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gudalurId}
                    onChange={(e) => setGudalurId(e.target.value)}
                    placeholder="GD-2025-000000"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-sm outline-none transition font-mono uppercase text-slate-900 bg-white placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {lang === 'ta'
                    ? 'à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®¯à¯à®®à¯ à®ªà¯‹à®¤à¯ à®ªà¯†à®±à¯à®± à®à®Ÿà®¿à®¯à¯ˆ à®‰à®³à¯à®³à®¿à®Ÿà®µà¯à®®à¯ (à®Ž.à®•à®¾. GD-2025-000001)'
                    : 'Enter the ID issued when you registered (e.g. GD-2025-000001)'}
                </p>
              </div>

                </div>

                {/* Pinned footer â€” Login + Register link always reachable, no scrolling needed */}
                <div className="shrink-0 space-y-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
                  <button
                    type="submit"
                    disabled={isLoggingIn || socialBusy !== null}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoggingIn ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <LogIn size={18} />
                        <span>{lang === 'ta' ? 'à®‰à®³à¯à®¨à¯à®´à¯ˆ' : 'Login to My Resident Card'}</span>
                      </>
                    )}
                  </button>
                  {/* Social sign-in: Google + Telegram */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest">or</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={socialBusy !== null || isLoggingIn} onClick={handleSocialGoogle}
                      className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50">
                      {socialBusy === 'google' ? <Loader2 size={16} className="animate-spin" /> : <SiGoogle size={16} className="text-blue-500" />} Google
                    </button>
                    {providers?.telegram.available ? (
                      <div className="col-span-2 flex justify-center">
                        <div id="vog-telegram-login-widget" className="flex justify-center py-1" />
                      </div>
                    ) : (
                      <button type="button" disabled={socialBusy !== null || isLoggingIn} onClick={handleSocialTelegram}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50">
                        {socialBusy === 'telegram' ? <Loader2 size={16} className="animate-spin" /> : <SiTelegram size={16} className="text-sky-500" />} Telegram
                      </button>
                    )}
                  </div>
                  {onNeedRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNeedRegister();
                      }}
                      className="w-full text-center text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                    >
                      {lang === 'ta'
                        ? 'à®‡à®©à¯à®©à¯à®®à¯ à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®¯à®µà®¿à®²à¯à®²à¯ˆà®¯à®¾? à®ªà¯à®¤à®¿à®¯ à®•à¯à®Ÿà®¿à®®à®•à¯à®•à®³à¯ à®…à®Ÿà¯à®Ÿà¯ˆ à®‰à®°à¯à®µà®¾à®•à¯à®•à¯à®•'
                        : 'Not registered yet? Create your Resident Card'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default LoginResidentModal;



