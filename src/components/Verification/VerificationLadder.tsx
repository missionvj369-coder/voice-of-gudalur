import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, CheckCircle2, Circle, Loader2, MinusCircle, ShieldCheck, Users } from 'lucide-react';
import { SiGoogle, SiTelegram } from 'react-icons/si';
import { useLanguage } from '../../context/LanguageContext';
import { authorizationApi, type AuthorizationStatus } from '../../services/api';
import { buildLadderRungs, ladderHeadline, type LadderRung } from '../../utils/verificationLadder';

declare global {
  interface Window {
    google?: any;
    onTelegramAuth?: (user: Record<string, any>) => void;
  }
}

let googleScriptPromise: Promise<void> | null = null;

/** Load the Google Identity Services script once per page session. */
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google_script_failed'));
    document.head.appendChild(script);
  });
  return googleScriptPromise;
}

/**
 * THE VERIFICATION LADDER â€” what a signature can become AFTER it is recorded.
 *
 * Registration never offers Google/Telegram (they cannot create a Gudalur ID â€”
 * see routes/auth.ts#findSocialResident). They live here, on the signed
 * petition, where they are exactly what they are: optional, post-signature
 * authentication. Google authenticates the person; Telegram validates the
 * mobile number (that is what it is FOR â€” the copy says so). Doing both plus one
 * witness validation yields the "Fully validated petition" badge, the top of the
 * public ranking; doing neither leaves a perfectly valid, perfectly counted
 * signature.
 */
export const VerificationLadder: React.FC<{
  signatureId?: string;
  signHash: string;
}> = ({ signatureId, signHash }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<AuthorizationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'google' | 'telegram' | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await authorizationApi.status({ signatureId, signHash });
      if (mounted.current) {
        setStatus(next);
        setError(null);
      }
    } catch (e: any) {
      if (mounted.current) {
        const msg = e?.message || t('authz.error');
        // Distinguish "not logged in" from other failures so we can guide the
        // user to the right next step instead of offering a Retry that cannot help.
        const isAuthRequired = /auth/i.test(msg) || /401/i.test(String(e?.status ?? ''));
        setError(isAuthRequired ? 'auth_required' : msg);
      }
    }
  }, [signatureId, signHash, t]);

    useEffect(() => {
    mounted.current = true;
    void refresh();
    // Auto-refresh every 15 seconds so the ladder reflects community
    // witness validations that complete in other tabs or contexts.
    const poll = window.setInterval(() => { void refresh(); }, 15000);
    // Also listen for explicit update events dispatched elsewhere.
    const onUpdate = () => { void refresh(); };
    window.addEventListener('vog:authorization-updated', onUpdate);
    window.addEventListener('vog:validation-updated', onUpdate);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      window.removeEventListener('vog:authorization-updated', onUpdate);
      window.removeEventListener('vog:validation-updated', onUpdate);
    };
  }, [refresh]);

  /** Google: One-Tap prompt â†’ ID token â†’ POST (the server verifies the token). */
  const authorizeGoogle = useCallback(async () => {
    const clientId = status?.providers.google.clientId;
    if (!clientId) return;
    setBusy('google');
    try {
      await loadGoogleScript();
      const credential = await new Promise<string>((resolve, reject) => {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: { credential?: string }) => {
              if (response?.credential) resolve(response.credential);
              else reject(new Error('no_credential'));
            },
          });
          window.google.accounts.id.prompt();
        } catch (err) {
          reject(err);
        }
      });
            await authorizationApi.google({ idToken: credential, signatureId, signHash });
      await refresh();
      window.dispatchEvent(new Event('vog:authorization-updated'));
    } catch (e: any) {
      if (mounted.current) setError(e?.message || t('authz.error'));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }, [status, signatureId, signHash, refresh, t]);

  /** Telegram: Login Widget callback â†’ POST (the server verifies the widget hash). */
  useEffect(() => {
    const botUsername = status?.providers.telegram.botUsername;
    if (!botUsername || !status?.providers.telegram.available) return;

    window.onTelegramAuth = (user: Record<string, any>) => {
      void (async () => {
        setBusy('telegram');
        try {
      await authorizationApi.telegram({ ...user, signatureId, signHash });
          await refresh();
          window.dispatchEvent(new Event('vog:authorization-updated'));
        } catch (e: any) {
          if (mounted.current) setError(e?.message || t('authz.error'));
        } finally {
          if (mounted.current) setBusy(null);
        }
      })();
    };

    const container = document.getElementById('vog-telegram-widget');
    if (!container || container.childElementCount > 0) return;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    container.appendChild(script);
    return () => { delete window.onTelegramAuth; };
  }, [status, signatureId, signHash, refresh, t]);

  if (error && !status) {
    // "Not authenticated" — guide the user to log in rather than retrying a
    // request that will keep returning 401 until they have a session.
    if (error === 'auth_required') {
      return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center">
            <ShieldCheck size={20} className="text-amber-500" />
          </div>
          <p className="text-xs text-slate-600">{t('authz.not_authenticated')}</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event('vog:open-login'))}
            className="text-xs font-bold text-emerald-700 hover:underline">
            {t('authz.login_to_continue')}
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center space-y-2">
        <ShieldCheck size={22} className="mx-auto text-slate-400" />
        <p className="text-xs text-slate-500">{error}</p>
        <button type="button" onClick={() => void refresh()}
          className="text-xs font-bold text-emerald-700 hover:underline">{t('authz.retry')}</button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 flex items-center justify-center gap-2 text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs font-semibold">{t('authz.loading')}</span>
      </div>
    );
  }

  const rungs = buildLadderRungs(status);
  const headline = ladderHeadline(status);
  const headlineText = headline === 'full' ? t('authz.badge.full') : t('authz.badge.base');

  const rungIcon = (rung: LadderRung) => {
    if (rung.state === 'done') return <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />;
    if (rung.state === 'partial') return <MinusCircle size={18} className="text-amber-500 shrink-0" />;
    return <Circle size={18} className="text-slate-300 shrink-0" />;
  };

  const rungLabel = (rung: LadderRung): string => {
    switch (rung.id) {
      case 'signature': return t('authz.rung.signature');
      case 'witness': return t('authz.rung.witness');
      case 'google': return rung.state === 'done' ? t('authz.done.google') : t('authz.rung.google');
      case 'telegram':
        if (rung.state === 'done') return t('authz.done.telegram');
        if (rung.state === 'partial') return t('authz.rung.telegram_partial');
        return t('authz.rung.telegram');
    }
  };

  const rungHint = (rung: LadderRung): string | null => {
    if (rung.state === 'unavailable') {
      return rung.id === 'google' ? status.providers.google.reason : status.providers.telegram.reason;
    }
    switch (rung.id) {
      case 'witness': return rung.state === 'done' ? null : t('authz.rung.witness_hint');
      case 'google': return rung.state === 'done' ? null : t('authz.rung.google_desc');
      case 'telegram':
        return rung.state === 'done' ? null
          : rung.state === 'partial' ? t('authz.rung.telegram_partial')
          : t('authz.rung.telegram_desc');
      default: return null;
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-5 sm:p-6 space-y-4"
      data-testid="verification-ladder">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          {status.fullyValidated
            ? <BadgeCheck size={20} className="text-emerald-700" />
            : <ShieldCheck size={20} className="text-emerald-600" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-emerald-900">{t('authz.title')}</h3>
          <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">{t('authz.subtitle')}</p>
        </div>
      </div>

      {/* The ladder itself */}
      <ul className="space-y-2" data-testid="verification-rungs">
        {rungs.map((rung) => (
          <li key={rung.id}
            data-rung={rung.id}
            data-state={rung.state}
            className={`rounded-2xl border px-3.5 py-2.5 ${
              rung.state === 'done'
                ? 'bg-white border-emerald-200'
                : rung.state === 'partial'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-white/70 border-slate-200'
            }`}>
            <div className="flex items-center gap-2.5">
              {rungIcon(rung)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${rung.state === 'done' ? 'text-emerald-900' : 'text-slate-700'}`}>
                    {rungLabel(rung)}
                  </span>
                  {rung.optional && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
                      {t('authz.optional')}
                    </span>
                  )}
                </div>
                {rungHint(rung) && (
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{rungHint(rung)}</p>
                )}
              </div>
            </div>

            {/* Optional actions â€” only on the provider rungs, only when configured */}
            {rung.id === 'google' && rung.state === 'todo' && status.providers.google.available && (
              <button type="button" onClick={() => void authorizeGoogle()} disabled={busy !== null}
                className="mt-2 ml-7 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs font-bold hover:bg-slate-50 transition disabled:opacity-50">
                {busy === 'google' ? <Loader2 size={14} className="animate-spin" /> : <SiGoogle size={14} className="text-blue-500" />}
                {t('authz.cta.google')}
              </button>
            )}
            {rung.id === 'telegram' && rung.state === 'todo' && status.providers.telegram.available && (
              <div id="vog-telegram-widget" className="mt-2 ml-7" />
            )}
            {rung.id === 'telegram' && rung.state === 'partial' && status.providers.telegram.available && (
              <p className="mt-1.5 ml-7 text-[10px] text-amber-700">{t('authz.cta.telegram_hint')}</p>
            )}
          </li>
        ))}
      </ul>

      {headline === 'full' ? (
        <div className="rounded-2xl bg-emerald-600 text-white px-4 py-3 flex items-center gap-2"
          data-testid="fully-validated-badge">
          <BadgeCheck size={18} />
          <span className="text-xs font-black">{headlineText}</span>
        </div>
      ) : (
        <p className="text-[10px] text-emerald-700/80 text-center leading-relaxed">
          {headlineText} Â· <Users size={10} className="inline -mt-0.5" /> {t('authz.witness_footnote')}
        </p>
      )}
    </div>
  );
};

export default VerificationLadder;
