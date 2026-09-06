import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck, Clock, Copy, Download, Flame, Hash, IdCard, Link2,
  Loader2, Lock, MapPin, Phone, Search, Share2, ShieldCheck, ShieldX, User,
} from "lucide-react";
import toast from "react-hot-toast";
import { GrievanceTicket } from "../components/GrievanceTicket";
import { buildVerifiedSignatureReceipt } from "../utils/grievanceReceipt";

interface VerifyResult {
  valid: boolean;
  sign_hash?: string;
  gdr_id?: string;
  full_name?: string;
  village?: string;
  phone_last4?: string;
  aadhaar_last4?: string;
  batch_no?: number;
  created_at?: string;
  verified?: boolean;
}

const APP_NAME = "VOICE OF GUDALUR";
const APP_SHORT = "VoG";

/** "03 Sep 2026, 11:48 am" — professional local date + time. */
const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const VerifySignPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const hash = (params.get("id") || "").trim();
  const [data, setData] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualHash, setManualHash] = useState("");
  const verifiedAtRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!hash) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        // Public proof lookup — independent of the signing request.
        const res = await fetch(`/api/petitions/verify/${encodeURIComponent(hash)}`, {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (res.status === 404) {
          setData({ valid: false });
        } else if (!res.ok) {
          setData({ valid: false });
        } else {
          const json = (await res.json()) as VerifyResult;
          if (json.valid) verifiedAtRef.current = new Date().toISOString();
          setData(json);
        }
      } catch {
        if (!cancelled) setData({ valid: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash]);

  const verifyUrl = `${window.location.origin}/verify-sign?id=${encodeURIComponent(hash)}`;

  const copyHash = useCallback(async () => {
    if (!data?.sign_hash) return;
    try {
      await navigator.clipboard.writeText(data.sign_hash);
      toast.success("Signature hash copied");
    } catch {
      window.prompt("Copy this hash:", data.sign_hash);
    }
  }, [data]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success("Verification link copied");
    } catch {
      window.prompt("Copy this link:", verifyUrl);
    }
  }, [verifyUrl]);

  const shareProof = useCallback(async () => {
    const text = `${APP_NAME} (${APP_SHORT}) — Verified Petition Signature\n\nSignature hash: ${data?.sign_hash ?? hash}\nBatch #${data?.batch_no ?? 1}\n\nVerify it here:\n${verifyUrl}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${APP_NAME} — Verified Signature`, text, url: verifyUrl });
        return;
      } catch { /* user cancelled or share failed → fall through to WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }, [data, hash, verifyUrl]);

  /** Professional PDF receipt — the Mudhalvarin Mugavari grievance page + the signed details. */
  const downloadReceipt = useCallback(async () => {
    if (!data?.valid) return;
    try {
      await buildVerifiedSignatureReceipt({
        signer: {
          name: data.full_name || "—",
          gdrId: data.gdr_id || "—",
          address: data.village || "—",
          phoneLast4: data.phone_last4 || undefined,
          aadhaarLast4: data.aadhaar_last4 || undefined,
        },
        batchNo: data.batch_no ?? 1,
        signHash: data.sign_hash ?? hash,
        signedAtUTC: data.created_at || new Date().toISOString(),
        verifiedAtUTC: verifiedAtRef.current || new Date().toISOString(),
        verifyUrl,
      });
    } catch {
      toast.error("Could not generate the receipt. Please try again.");
    }
  }, [data, hash, verifyUrl]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* App identity — full name + short name visible */}
      <div className="flex items-center justify-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-900/30 flex items-center justify-center shrink-0">
          <Flame size={22} className="text-white" />
        </div>
        <div className="text-left">
          <p className="text-base font-black tracking-wider text-white leading-tight">{APP_NAME}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#AED581]">
            {APP_SHORT} · Citizen Petition Verification
          </p>
        </div>
      </div>

      <h1 className="text-lg font-black text-white text-center flex items-center justify-center gap-2">
        <ShieldCheck size={20} className="text-emerald-400" />
        Verify a Signature
      </h1>

      {loading && (
        <div className="rounded-3xl bg-white border border-slate-200 p-8 flex items-center justify-center gap-3">
          <Loader2 size={18} className="animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-slate-600">Verifying…</p>
        </div>
      )}

      {!loading && !hash && (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <Search size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Paste a signature hash to confirm a petition signature, or open a verification link
            (<code className="text-slate-800 font-mono text-xs">/verify-sign?id=HASH</code>).
          </p>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualHash.trim()) navigate(`/verify-sign?id=${encodeURIComponent(manualHash.trim())}`);
            }}
          >
            <input
              value={manualHash}
              onChange={(e) => setManualHash(e.target.value)}
              placeholder="Paste signature hash…"
              className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs font-mono outline-none text-slate-900 bg-white"
            />
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:opacity-95 transition shrink-0"
            >
              Verify
            </button>
          </form>
        </div>
      )}

      {!loading && data?.valid && (
        <>
          {/* Verified proof card */}
          <div className="rounded-3xl bg-white border border-emerald-200 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center gap-3">
              <BadgeCheck size={30} className="text-white shrink-0" />
              <div>
                <p className="font-black text-white leading-tight">GENUINE — Verified Signature</p>
                <p className="text-[11px] text-emerald-100">Recorded on the public docket ledger.</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Signature hash — the full hash number */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Signature Hash</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                  <Hash size={14} className="text-emerald-600 shrink-0" />
                  <p className="flex-1 min-w-0 font-mono text-[11px] font-bold text-slate-900 break-all">{data.sign_hash}</p>
                  <button
                    type="button"
                    onClick={copyHash}
                    title="Copy hash"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition shrink-0"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {/* Verified time & date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1 mb-1">
                    <Clock size={11} /> Signed On
                  </p>
                  <p className="text-sm font-bold text-slate-900">{fmtDateTime(data.created_at)}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5 break-all">
                    {data.created_at ? new Date(data.created_at).toISOString() : "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-teal-50 border border-teal-100 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 flex items-center gap-1 mb-1">
                    <ShieldCheck size={11} /> Verified On
                  </p>
                  <p className="text-sm font-bold text-slate-900">{fmtDateTime(verifiedAtRef.current || new Date().toISOString())}</p>
                  <p className="text-[10px] text-teal-700 font-bold mt-0.5">Ledger proof confirmed</p>
                </div>
              </div>

              {/* Signer details — masked, privacy-first */}
              <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                <Row icon={<User size={14} />} label="Signed by" value={data.full_name} />
                <Row icon={<MapPin size={14} />} label="Place / Address" value={data.village || "—"} />
                <Row icon={<Phone size={14} />} label="Phone — blurred, never shown" value={`+91 ••••• ${data.phone_last4 ?? ""}`} mono blur />
                <Row icon={<IdCard size={14} />} label="Aadhaar" value={`••••${data.aadhaar_last4 ?? "—"}`} mono />
                <Row icon={<Hash size={14} />} label="Batch" value={`#${data.batch_no ?? 1}`} />
              </div>

              {/* Download receipt + share */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { void downloadReceipt(); }}
                  className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md hover:opacity-95 transition flex items-center justify-center gap-1.5"
                >
                  <Download size={14} /> Receipt
                </button>
                <button
                  type="button"
                  onClick={() => { void shareProof(); }}
                  className="py-3 rounded-xl bg-white border-2 border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition flex items-center justify-center gap-1.5"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  type="button"
                  onClick={copyLink}
                  className="py-3 rounded-xl bg-white border-2 border-emerald-600 text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition flex items-center justify-center gap-1.5"
                >
                  <Link2 size={14} /> Link
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center break-all">{verifyUrl}</p>
            </div>
          </div>

          {/* The submitted grievance — Mudhalvarin Mugavari (official saved page) */}
          <div className="rounded-3xl bg-[#12300F] border border-white/10 p-4 sm:p-6">
            <GrievanceTicket />
          </div>
        </>
      )}

      {!loading && data && !data.valid && (
        <div className="rounded-3xl bg-white border border-red-200 p-6 space-y-3 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
            <ShieldX size={26} className="text-red-600" />
          </div>
          <p className="text-sm font-black text-red-700">No verified signature found for this token.</p>
          <p className="text-[11px] text-slate-500">Check the hash in the verification link and try again.</p>
        </div>
      )}
    </div>
  );
};

/** Professional detail row used in the signer-details block. */
const Row: React.FC<{ icon: React.ReactNode; label: string; value?: string; mono?: boolean; blur?: boolean }> = ({ icon, label, value, mono, blur }) => (
  <div className="flex items-center gap-3 px-4 py-2.5">
    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">{icon}</span>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-slate-500 uppercase font-bold">{label}</p>
      {blur ? (
        <p className="flex items-center gap-2">
          {/* The raw number NEVER leaves the server — only masked digits are
              rendered, under a frosted blur so the privacy is visible. */}
          <span
            className="font-mono font-bold text-slate-900 text-sm tracking-widest blur-[3px] select-none pointer-events-none"
            aria-hidden="true"
          >
            {value}
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 uppercase tracking-wide shrink-0">
            <Lock size={9} /> Protected
          </span>
          <span className="sr-only">Phone number is hidden for privacy</span>
        </p>
      ) : (
        <p className={`font-bold text-slate-900 text-sm truncate ${mono ? "font-mono tracking-widest" : ""}`}>{value}</p>
      )}
    </div>
  </div>
);