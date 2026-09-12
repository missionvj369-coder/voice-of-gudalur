import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { petitionPublicApi, petitionApi } from '../services/api';
import { PlatformIcon } from '../components/ShareSocial/PlatformIcon';
import {
  PenLine, CheckCircle2, Loader2, Phone, User, Link2, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * PETITION-ONLY PRODUCTION PAGE (petition-only launch).
 *
 * The entire public frontend is this ONE experience:
 *   petition message → Name + Mobile → human verification → SIGN → receipt.
 *
 * One mobile number = one signature. The DATABASE is the only authority
 * (UNIQUE petition_id + mobile_identity_hash); localStorage here is a pure
 * UX convenience and is never trusted for the signed/unsigned decision.
 *
 * No AI, no media, no auth calls — the sign path touches nothing else, so
 * petition success never depends on another service (graceful degradation).
 */
interface SignResult {
  hash: string;
  verifyUrl: string;
  batchNo: number;
  signedAt: string;
  name: string;
  isDuplicate: boolean;
}

const LS_RESULT_KEY = 'vog_psign_result';      // UX memory only (not authoritative)
const LS_IDEM_KEY = 'vog_psign_idem_pending';  // retry-safe idempotency key
const CLIENT_MOBILE_RE = /^[6-9][0-9]{9}$/;    // display validation only — server re-normalizes

/** Light display canonicalization. ADVISORY ONLY: the raw input is sent to
 *  the server, which re-normalizes authoritatively before hashing. */
function displayMobile(raw: string): string {
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export const PetitionOnlyPage: React.FC = () => {
  const { t } = useLanguage();
  const [total, setTotal] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [human, setHuman] = useState(false);
  const [hp, setHp] = useState(''); // honeypot — must stay empty
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SignResult | null>(null);
  const pollRef = useRef<number | null>(null);
  const idemKeyRef = useRef<string | null>(null);

  // Restore the UX-only "already signed" memory (never authoritative).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RESULT_KEY);
      if (raw) setResult(JSON.parse(raw) as SignResult);
    } catch { /* ignore */ }
  }, []);

  // Pre-warm the CSRF cookie (POSTs need the double-submit token).
  useEffect(() => { void petitionPublicApi.ensureCsrf(); }, []);

  const refreshChallenge = useCallback(async () => {
    try { await petitionPublicApi.challenge(); } catch { /* surfaced on submit */ }
  }, []);

  const loadCount = useCallback(async () => {
    // Snapshot-first (CDN-cached /data/stats.json) for instant first paint,
    // then live /api/petition/count for subsequent polling.
    // A signature counter never goes DOWN — every setter below guards against
    // a failed live call (503 during a DB blip) regressing a good count to 0.
    try {
      const s = await petitionApi.signStats();
      if (s && Number(s.total) > 0) { setTotal((prev) => Math.max(prev ?? 0, Number(s.total))); return; }
    } catch { /* snapshot unavailable — fall through to live */ }
    try {
      const { count } = await petitionPublicApi.count();
      const n = Number(count ?? 0);
      if (n > 0) setTotal((prev) => Math.max(prev ?? 0, n));
    } catch {
      try {
        const s = await petitionApi.signStats();
        const n = Number(s?.total ?? 0);
        if (n > 0) setTotal((prev) => Math.max(prev ?? 0, n));
      } catch { /* keep the last value */ }
    }
  }, []);

  useEffect(() => {
    void loadCount();
    // Visibility-aware polling: a background tab never polls (Phase 24).
    const INTERVAL_MS = 20_000;
    pollRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadCount();
    }, INTERVAL_MS);
    const onVisibility = () => { if (document.visibilityState === 'visible') void loadCount(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadCount]);

  const shareWhatsApp = useCallback((r: SignResult) => {
    const msg =
      `📜 *Voice of Gudalur — Petition Signed*` +
      `\n\nI have signed the Right to Life petition.` +
      `\n\n🔍 Verify my signature here:\n${r.verifyUrl}` +
      `\n\nBatch #${r.batchNo}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  }, []);

  const copyLink = useCallback(async (r: SignResult) => {
    try {
      await navigator.clipboard.writeText(r.verifyUrl);
      toast.success(t('home.link_copied'));
    } catch {
      window.prompt(t('home.copy_prompt'), r.verifyUrl);
    }
  }, [t]);

  const persist = useCallback((r: SignResult | null) => {
    try {
      if (r) localStorage.setItem(LS_RESULT_KEY, JSON.stringify(r));
      else {
        localStorage.removeItem(LS_RESULT_KEY);
        localStorage.removeItem(LS_IDEM_KEY);
      }
    } catch { /* ignore */ }
  }, []);

  const handleSign = useCallback(async () => {
    if (busy) return;
    // Client-side validation is UX only — the server re-validates everything.
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (trimmedName.length < 2) { toast.error(t('psign.err_name')); return; }
    if (!CLIENT_MOBILE_RE.test(displayMobile(mobile))) { toast.error(t('psign.err_mobile')); return; }
    if (!human) { toast.error(t('psign.err_challenge')); return; }

    setBusy(true);
    try {
      // Fresh challenge per submission (challenges are single-use).
      const c = await petitionPublicApi.challenge();
      // One idempotency key per logical submission: created once and REUSED
      // across network retries/refreshes until a result is confirmed, so a
      // retried submit can never create a second signature.
      if (!idemKeyRef.current) {
        try { idemKeyRef.current = localStorage.getItem(LS_IDEM_KEY); } catch { /* ignore */ }
        if (!idemKeyRef.current) {
          idemKeyRef.current = crypto.randomUUID();
          try { localStorage.setItem(LS_IDEM_KEY, idemKeyRef.current); } catch { /* ignore */ }
        }
      }
      const res = await petitionPublicApi.sign({
        name: trimmedName,
        mobile, // RAW as typed — the server re-normalizes (authoritative)
        challenge: c.challenge,
        sig: c.sig,
        hp,
        idempotencyKey: idemKeyRef.current,
      });
      const verifyUrl = res.verifyUrl
        ? new URL(res.verifyUrl, window.location.origin).toString()
        : `${window.location.origin}/verify-sign?id=${encodeURIComponent(res.signHash)}`;
      const r: SignResult = {
        hash: res.signHash,
        verifyUrl,
        batchNo: res.batchNo ?? 1,
        // Server is authoritative: on a duplicate this is the ORIGINAL time.
        signedAt: res.signedAt,
        name: trimmedName,
        isDuplicate: !!res.isDuplicate,
      };
      setResult(r);
      persist(r);
      idemKeyRef.current = null;
      try { localStorage.removeItem(LS_IDEM_KEY); } catch { /* ignore */ }
      toast.success(res.isDuplicate ? t('home.dup_toast') : t('home.signed_toast'), { duration: 5000 });
      if (typeof res.count === 'number' && res.count > 0) setTotal(res.count);
      else void loadCount();
    } catch (e: any) {
      const msg = String(e?.error || e?.message || '');
      if (msg.includes('SERVICE_TEMPORARILY_BUSY')) {
        toast.error(t('home.err_unavailable'), { duration: 6000 });
      } else if (msg.includes('mobile')) {
        toast.error(t('psign.err_mobile'));
      } else if (msg.includes('full name')) {
        toast.error(t('psign.err_name'));
      } else if (msg.includes('Verification failed')) {
        toast.error(t('psign.err_challenge'));
      } else {
        toast.error(msg || t('home.err_sign'));
      }
    } finally {
      setBusy(false);
    }
  }, [busy, name, mobile, human, hp, t, loadCount, persist]);

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 sm:px-4 sm:py-8 space-y-3 sm:space-y-6">
      {/* Hero — petition purpose + live authoritative counter */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg">
          <PenLine size={24} className="text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t('home.title')}</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          {t('home.subtitle')}
        </p>
        <div
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 border border-emerald-600/20 px-4 py-1.5"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-xs font-black text-emerald-800">
            {total === null ? t('home.loading') : t('home.live').replace('{n}', total.toLocaleString('en-IN'))}
          </span>
        </div>
      </div>

      {/* Already-signed confirmation (server-verified state) */}
      {result && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4 text-center">
          <BadgeCheck size={44} className="mx-auto text-emerald-600" />
          <div>
            <p className="text-sm font-black text-emerald-800">
              {result.isDuplicate ? t('psign.already_title') : t('home.recorded')}
            </p>
            <p className="text-[11px] text-emerald-700 mt-1">{t('psign.already_sub')}</p>
            <p className="text-[11px] text-emerald-800 mt-2 break-all font-mono">{result.hash}</p>
            <p className="text-[11px] text-emerald-600 mt-1">{t('home.batch').replace('{n}', String(result.batchNo))}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => copyLink(result)}
              className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Link2 size={13} /> {t('home.copy_link')}
            </button>
            <button
              onClick={() => shareWhatsApp(result)}
              className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <PlatformIcon platform="whatsapp" size={14} className="brightness-0 invert" /> {t('home.share_wa')}
            </button>
            <Link
              to="/verify-sign"
              className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={13} /> Verify
            </Link>
          </div>
          <p className="text-[10px] text-emerald-700 break-all">{result.verifyUrl}</p>
          <p className="text-[10px] text-emerald-600 max-w-md mx-auto leading-relaxed">{t('psign.privacy_note')}</p>
        </div>
      )}

      {/* THE petition form — Name + Mobile + human verification */}
      {!result && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-black text-slate-900">{t('psign.form_title')}</h2>
            <p className="text-[11px] text-slate-500 leading-relaxed">{t('psign.form_sub')}</p>
          </div>

          {/* Honeypot — invisible to humans; bots that fill it are rejected */}
          <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
            <label htmlFor="psign-hp">Leave empty</label>
            <input
              id="psign-hp"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="psign-name" className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <User size={12} className="text-emerald-600" /> {t('psign.name_label')}
            </label>
            <input
              id="psign-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              autoComplete="name"
              placeholder={t('psign.name_placeholder')}
              className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm"
            />
          </div>

          <div>
            <label htmlFor="psign-mobile" className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Phone size={12} className="text-emerald-600" /> {t('psign.mobile_label')}
            </label>
            <input
              id="psign-mobile"
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              maxLength={14}
              autoComplete="tel"
              placeholder={t('psign.mobile_placeholder')}
              className="mt-1.5 w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-sm font-mono tracking-wide"
            />
          </div>

          {/* Human verification */}
          <label
            htmlFor="psign-human"
            className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-3 cursor-pointer"
          >
            <input
              id="psign-human"
              type="checkbox"
              checked={human}
              onChange={(e) => setHuman(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-[11px] font-bold text-emerald-900 leading-snug">{t('psign.verify_label')}</span>
          </label>

          <button
            onClick={() => { void handleSign(); }}
            disabled={busy}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-sm shadow-lg hover:from-emerald-700 hover:to-teal-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? (
              <><Loader2 size={16} className="animate-spin" /> {t('home.signing')}</>
            ) : (
              <><CheckCircle2 size={16} /> {t('home.sign_btn')}</>
            )}
          </button>

          <p className="text-[10px] text-slate-400 text-center leading-relaxed max-w-sm mx-auto">
            {t('psign.privacy_note')}
          </p>
        </div>
      )}
    </div>
  );
};

export default PetitionOnlyPage;
