import React, { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { petitionApi } from "../services/api";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import toast from "react-hot-toast";

export const SignPetitionPage: React.FC = () => {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    hash: string;
    verifyUrl: string;
    batchNo: number;
  } | null>(null);
  const [showRegister, setShowRegister] = useState(false);

  const handleSign = useCallback(async () => {
    if (!profile) {
      setShowRegister(true);
      return;
    }
    if (!profile.aadhaarVerified || !profile.aadhaarLast4) {
      toast.error("Your account must be Aadhaar-verified before signing.");
      return;
    }
    setBusy(true);
    try {
      // The server derives identity, Aadhaar metadata, hash and batch from the
      // authenticated session — the client sends nothing sensitive.
      const res = await petitionApi.sign({
        idempotencyKey: `petition-sign-${profile.uid}`,
      });
      const verifyUrl =
        res.verifyUrl
          ? new URL(res.verifyUrl, window.location.origin).toString()
          : `${window.location.origin}/verify-sign?id=${encodeURIComponent(res.signHash)}`;
      if (res.isDuplicate) {
        toast.error("You have already signed this petition.");
        setResult({ hash: res.signHash, verifyUrl, batchNo: res.batchNo ?? 1 });
        return;
      }
      setResult({ hash: res.signHash, verifyUrl, batchNo: res.batchNo ?? 1 });
      toast.success("Signature recorded. Thank you!");
    } catch (e: any) {
      toast.error(e?.error ?? e?.message ?? "Sign failed");
    } finally {
      setBusy(false);
    }
  }, [profile]);

  const forwardViaWhatsApp = useCallback(() => {
    if (!result) return;
    const msg =
      `📜 *Voice of Gudalur — Verified Signature*\n\n` +
      `I have digitally signed the Right to Life / Mudhalvan Mugavari Grievance Petition.\n\n` +
      `🔎 Verify my verified sign here:\n${result.verifyUrl}\n\n` +
      `Batch #${result.batchNo} · Verified Aadhaar`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }, [result]);

  const copyLink = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.verifyUrl);
      toast.success("Verification link copied");
    } catch {
      window.prompt("Copy this link:", result.verifyUrl);
    }
  }, [result]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Right to Life Petition</h1>
        <p className="text-xs text-slate-600 leading-relaxed">
          Sign the petition submitted as a grievance to <strong>Mudhalvan Mugavari</strong>.
          Your verified GDR ID + Aadhaar details + UTC timestamp are recorded as your digital
          signature — verifiable by officials at any time.
        </p>
      </div>

      {!profile && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-4">
          <div className="text-4xl">🪪</div>
          <p className="text-sm text-slate-600">
            You must register with your <strong>scanned Aadhaar</strong> (get a GDR ID) before signing.
          </p>
          <button
            onClick={() => setShowRegister(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg"
          >
            Scan Aadhaar &amp; Register (1 step)
          </button>
        </div>
      )}

      {profile && !profile.aadhaarVerified && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          This account is not Aadhaar-verified. Please complete verification before signing.
        </div>
      )}

      {profile?.aadhaarVerified && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Signing as</span>
              <span className="font-bold">{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GDR ID</span>
              <span className="font-bold">{profile.gudalurId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verified Aadhaar</span>
              <span className="font-bold tracking-widest">•••• {profile.aadhaarLast4}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location</span>
              <span className="font-bold text-right">{profile.customPlaceName || profile.localityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timestamp</span>
              <span className="font-bold text-right">{new Date().toISOString()} UTC</span>
            </div>
          </div>
          <button
            onClick={handleSign}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg disabled:opacity-60"
          >
            {busy ? "Recording your verified signature…" : "✍️ Sign with my Verified GDR ID"}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <div>
            <p className="text-sm font-black text-emerald-800">Signature recorded &amp; verifiable</p>
            <p className="text-[11px] text-emerald-700 mt-1 break-all font-mono">{result.hash}</p>
            <p className="text-[11px] text-emerald-600 mt-1">Batch #{result.batchNo}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={copyLink} className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs">
              🔗 Copy verify link
            </button>
            <button onClick={forwardViaWhatsApp} className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
              📤 Forward on WhatsApp
            </button>
          </div>
          <p className="text-[10px] text-emerald-700 break-all">{result.verifyUrl}</p>
        </div>
      )}

      <RegisterResidentModal open={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  );
};