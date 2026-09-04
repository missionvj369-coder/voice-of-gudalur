import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { petitionApi } from "../services/api";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import { BarChart3, Download, PenLine } from "lucide-react";
import toast from "react-hot-toast";

interface PlaceCount {
  place: string;
  count: number;
}

/**
 * HOMEPAGE — clean, with only the Right to Life petition sign-in.
 * Live total counter, per-place leaderboard (highest first), WhatsApp share
 * and a machine-verifiable PDF receipt for the signed document.
 */
export const SignPetitionPage: React.FC = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    hash: string;
    verifyUrl: string;
    batchNo: number;
  } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceCount[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const s = await petitionApi.signStats();
      setTotal(s?.total ?? 0);
      setPlaces(s?.places ?? []);
    } catch {
      // Backend unreachable — keep the last known counters on screen.
    }
  }, []);

  useEffect(() => {
    void loadStats();
    pollRef.current = setInterval(() => { void loadStats(); }, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStats]);

  const handleSign = useCallback(async () => {
    if (!profile) {
      setShowRegister(true);
      return;
    }
    setBusy(true);
    try {
      const res = await petitionApi.sign({
        idempotencyKey: `petition-sign-${profile.uid}`,
      });
      const verifyUrl =
        res.verifyUrl
          ? new URL(res.verifyUrl, window.location.origin).toString()
          : `${window.location.origin}/verify-sign?id=${encodeURIComponent(res.signHash)}`;
      if (res.isDuplicate) {
        toast.success(t("home.dup_toast"), { duration: 5000 });
      } else {
        try { localStorage.setItem("vog_petition_signed", "1"); } catch { /* ignore */ }
        toast.success(t("home.signed_toast"), { duration: 6000 });
        void loadStats();
      }
      setResult({ hash: res.signHash, verifyUrl, batchNo: res.batchNo ?? 1 });
    } catch (e: any) {
      toast.error(e?.error ?? e?.message ?? "Sign failed");
    } finally {
      setBusy(false);
    }
  }, [profile, loadStats]);

  const forwardViaWhatsApp = useCallback(() => {
    if (!result) return;
    const msg =
      `📜 *Voice of Gudalur — Verified Signature*\n\n` +
      `I have digitally signed the Right to Life / Mudhalvan Mugavari Grievance Petition.\n\n` +
      `🔎 Verify my verified sign here:\n${result.verifyUrl}\n\n` +
      `Batch #${result.batchNo} · Verified Resident`;
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

  /** Signed-document download — a machine-verifiable PDF receipt. */
  const downloadReceipt = useCallback(async () => {
    if (!result || !profile) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("VOICE OF GUDALUR", 60, 70);
      doc.setFontSize(12);
      doc.text("Right to Life Petition — Signed Signature Receipt", 60, 92);
      doc.setDrawColor(27, 94, 32);
      doc.setLineWidth(1);
      doc.line(60, 104, 535, 104);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = [
        `Name: ${profile.name}`,
        `Gudalur ID: ${profile.gudalurId}`,
        `Place: ${profile.customPlaceName || profile.localityName || "Gudalur"}`,
        `Batch: #${result.batchNo}`,
        `Signature hash: ${result.hash}`,
        `Signed at (UTC): ${new Date().toISOString()}`,
        `Verify online: ${result.verifyUrl}`,
      ];
      lines.forEach((l, i) => doc.text(l, 60, 132 + i * 20));
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(
        "This receipt is machine-verifiable. Officials can verify the signature hash at the URL above.",
        60,
        132 + lines.length * 20 + 16,
      );
      doc.save(`vog-signature-${result.hash.slice(0, 12)}.pdf`);
    } catch {
      toast.error(t("home.pdf_fail"));
    }
  }, [result, profile]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Hero — petition + live counter */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 text-center space-y-3">
        <h1 className="text-2xl font-black text-slate-900">{t("home.title")}</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
          {t("home.subtitle")}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 border border-emerald-600/20 px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
          </span>
          <span className="text-xs font-black text-emerald-800">
            {total === null ? t("home.loading") : t("home.live").replace("{n}", total.toLocaleString("en-IN"))}
          </span>
        </div>
      </div>

      {!profile && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center space-y-4">
          <div className="text-4xl">🪪</div>
          <p className="text-sm text-slate-600">
            {t("home.need_register")}
          </p>
          <button
            onClick={() => setShowRegister(true)}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg"
          >
            {t("home.register_cta")}
          </button>
        </div>
      )}

      {profile && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">{t("home.signing_as")}</span>
              <span className="font-bold">{profile.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t("home.gdr")}</span>
              <span className="font-bold">{profile.gudalurId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t("home.location")}</span>
              <span className="font-bold text-right">{profile.customPlaceName || profile.localityName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t("home.timestamp")}</span>
              <span className="font-bold text-right">{new Date().toISOString()} UTC</span>
            </div>
          </div>
          <button
            onClick={handleSign}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? t("home.signing") : <><PenLine size={16} /> {t("home.sign_btn")}</>}
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4 text-center">
          <div className="text-4xl">✅</div>
          <div>
            <p className="text-sm font-black text-emerald-800">{t("home.recorded")}</p>
            <p className="text-[11px] text-emerald-700 mt-1 break-all font-mono">{result.hash}</p>
            <p className="text-[11px] text-emerald-600 mt-1">{t("home.batch").replace("{n}", String(result.batchNo))}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={copyLink} className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs">
              🔗 {t("home.copy_link")}
            </button>
            <button onClick={forwardViaWhatsApp} className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
              📤 {t("home.share_wa")}
            </button>
            <button
              onClick={() => { void downloadReceipt(); }}
              className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Download size={13} /> {t("home.download")}
            </button>
          </div>
          <p className="text-[10px] text-emerald-700 break-all">{result.verifyUrl}</p>
        </div>
      )}

      {total !== null && places.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BarChart3 size={15} className="text-emerald-600" />
            {t("home.by_place")}
          </h2>
          <div className="space-y-2.5">
            {places.map((p, i) => {
              const max = places[0]?.count || 1;
              return (
                <div key={p.place} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-bold text-slate-700">{i + 1}. {p.place}</span>
                    <span className="font-mono text-slate-500">{p.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                      style={{ width: `${Math.max(6, (p.count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <RegisterResidentModal isOpen={showRegister} onClose={() => setShowRegister(false)} />
    </div>
  );
};
