import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Loader2,
  BadgeCheck,
  XCircle,
  ArrowLeft,
  FileSearch,
  AlertTriangle,
} from 'lucide-react';
import { db, isSupabaseConfigured } from '../lib/supabase';
import { checkRateLimit } from '../lib/security';

// Public docket verification — officials & supporters confirm an official
// submission reference (e.g. VG-20260831-0042) against the movement's
// immutable proof ledger. Identity fields are partially masked for privacy.

/** Privacy: partially mask citizen identity fields on the public verification card. */
const maskName = (name: string | null | undefined): string => {
  if (!name) return '—';
  return name
    .split(/\s+/)
    .map((w) => (w.length > 1 ? `${w[0]}${'•'.repeat(Math.min(3, w.length - 1))}` : w[0]))
    .join(' ');
};

const maskId = (id: string | null | undefined): string => {
  if (!id) return '—';
  if (id.length <= 5) return `${id[0]}•••`;
  return `${id.slice(0, 3)}•••${id.slice(-2)}`;
};

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  ml: 'Malayalam',
  kn: 'Kannada',
  hi: 'Hindi',
};

interface DocketRecord {
  docket_ref: string;
  sender_name: string | null;
  gudalur_id: string | null;
  locality: string | null;
  subject: string | null;
  lang: string | null;
  created_at: string | null;
  source_url: string | null;
}

type VerifyState =
  | { kind: 'idle' }
  | { kind: 'verifying' }
  | { kind: 'found'; record: DocketRecord }
  | { kind: 'missing'; ref: string }
  | { kind: 'error'; message: string };

const VerifyDocket: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [ref, setRef] = useState<string>((searchParams.get('ref') || '').toUpperCase());
  const [state, setState] = useState<VerifyState>({ kind: 'idle' });
  const ledgerOnline = isSupabaseConfigured();

  const runVerify = async () => {
    const clean = ref.trim().toUpperCase();
    if (!clean) return;
    const rl = checkRateLimit('verify-docket', 5, 60_000);
    if (!rl.allowed) {
      setState({
        kind: 'error',
        message: `Too many lookups — please wait ${Math.ceil(rl.retryInMs / 1000)}s and try again.`,
      });
      return;
    }
    setState({ kind: 'verifying' });
    try {
      const { data, error } = await db.getSubmissionByDocket(clean);
      if (error) {
        setState({
          kind: 'error',
          message: 'The verification ledger could not be reached. Please try again shortly.',
        });
        return;
      }
      if (data) setState({ kind: 'found', record: data as DocketRecord });
      else setState({ kind: 'missing', ref: clean });
    } catch {
      setState({
        kind: 'error',
        message: 'The verification ledger could not be reached. Please try again shortly.',
      });
    }
  };

  // Auto-verify when deep-linked with ?ref=VG-...
  useEffect(() => {
    if (ledgerOnline && (searchParams.get('ref') || '').trim()) {
      runVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1310] via-[#121614] to-[#1B241E] px-3 py-8 sm:py-12">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/10">
            <ShieldCheck size={26} className="text-[#D4AF37]" />
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-black text-[#F4F1EA] tracking-tight">
            Docket Verification
          </h1>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            Public authenticity check for official submissions of the Voice of Gudalur movement.
            Enter a docket reference exactly as printed on a petition PDF or submission receipt.
          </p>
        </div>

        {/* Lookup card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (ledgerOnline) runVerify();
          }}
          className="rounded-3xl border border-white/[0.08] bg-[#12161A] p-4 sm:p-5 shadow-xl space-y-3"
        >
          <label
            htmlFor="docket-ref"
            className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]"
          >
            Official docket number
          </label>
          <input
            id="docket-ref"
            value={ref}
            onChange={(e) => setRef(e.target.value.toUpperCase())}
            placeholder="VG-20260831-0042"
            autoComplete="off"
            spellCheck={false}
            className="w-full min-h-[48px] rounded-xl border border-white/10 bg-black/30 px-4 font-mono text-sm font-bold text-[#F4F1EA] placeholder:text-stone-600 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40"
          />
          <button
            type="submit"
            disabled={!ledgerOnline || state.kind === 'verifying' || !ref.trim()}
            className="w-full min-h-[48px] rounded-xl bg-[#D4AF37] hover:bg-[#e0bd4c] disabled:opacity-40 disabled:cursor-not-allowed text-[#1a1a10] font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition"
          >
            {state.kind === 'verifying' ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Verifying…
              </>
            ) : (
              <>
                <Search size={16} /> Verify docket
              </>
            )}
          </button>
          <p className="text-[10px] text-stone-500 font-mono text-center">
            Format: VG-YYYYMMDD-NNNN · lookups are rate-limited
          </p>
        </form>

        {/* Ledger offline */}
        {!ledgerOnline && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">
              The verification ledger is not connected on this deployment yet. Once the cloud
              ledger goes live, every official docket can be verified here in real time.
            </p>
          </div>
        )}

        {/* Result: authentic */}
        {state.kind === 'found' && (
          <div className="rounded-3xl border border-emerald-500/30 bg-[#12161A] p-4 sm:p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <BadgeCheck size={20} className="text-emerald-400" />
              </span>
              <div>
                <p className="font-black text-sm text-emerald-300">Authentic — on official record</p>
                <p className="font-mono text-[11px] text-stone-400">{state.record.docket_ref}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] divide-y divide-white/[0.05] text-sm">
              {([
                ['Recorded on', state.record.created_at
                  ? new Date(state.record.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                  : '—'],
                ['Submitted by', maskName(state.record.sender_name)],
                ['Resident ID', maskId(state.record.gudalur_id)],
                ['Locality', state.record.locality || '—'],
                ['Subject', state.record.subject || '—'],
                ['Language', LANG_LABELS[state.record.lang || ''] || state.record.lang || '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-500 pt-0.5">{label}</span>
                  <span className="text-right font-semibold text-[#F4F1EA] text-xs leading-relaxed max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-stone-500 leading-relaxed">
              This docket is recorded in the immutable public proof ledger of the Voice of Gudalur
              movement. Personal details are partially masked for privacy; officials may request
              full records through the organizing committee.
            </p>
          </div>
        )}

        {/* Result: not found */}
        {state.kind === 'missing' && (
          <div className="rounded-3xl border border-red-500/30 bg-[#12161A] p-4 sm:p-5 shadow-xl space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15 border border-red-500/30">
                <XCircle size={20} className="text-red-400" />
              </span>
              <p className="font-black text-sm text-red-300">No docket found</p>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              No official submission is recorded under{' '}
              <span className="font-mono font-bold text-stone-300">{state.ref}</span>. Check the
              reference for typing errors — every character and digit must match the receipt. If
              the docket came from an unofficial source, treat the submission as unverified.
            </p>
          </div>
        )}

        {/* Result: error */}
        {state.kind === 'error' && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200 leading-relaxed">{state.message}</p>
          </div>
        )}

        {/* What is a docket? */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 flex items-start gap-3">
          <FileSearch size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
          <p className="text-[11px] text-stone-400 leading-relaxed">
            <span className="font-black text-stone-300">What is a docket?</span> Every resident who
            signs the Right to Life petition and dispatches the official email to the Hon'ble
            Chief Minister receives a unique, permanently recorded docket number — the movement's
            proof that a real citizen action took place on a real date.
          </p>
        </div>

        <div className="text-center pt-1">
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-[48px] px-4 text-xs font-bold text-[#D4AF37] hover:text-[#F4F1EA] transition"
          >
            <ArrowLeft size={14} /> Back to the Right to Life petition
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyDocket;