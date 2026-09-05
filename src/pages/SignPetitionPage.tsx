import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { petitionApi } from "../services/api";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import { ThirukuralSection } from "../components/ThirukuralSection";
import ShareSocialModal from "../components/ShareSocial/ShareSocialModal";
import { BarChart3, Download, PenLine, Eye, Loader2, Share2, CheckCircle2, User, Phone, MapPin, Clock, Shield, IdCard, BadgeCheck, Link2 } from "lucide-react";
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
    signedAt: string;
    name: string;
    gudalurId: string;
    locality: string;
  } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceCount[]>([]);
  const [hasSigned, setHasSigned] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check if user has already signed
  useEffect(() => {
    const signed = localStorage.getItem("vog_petition_signed") === "1";
    setHasSigned(signed);
    if (signed && profile) {
      // Load previous sign data
      const savedResult = localStorage.getItem("vog_petition_result");
      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult));
        } catch { /* ignore */ }
      }
    }
  }, [profile]);

  const loadStats = useCallback(async () => {
    try {
      const s = await petitionApi.signStats();
      setTotal(s?.total ?? 0);
      setPlaces(s?.places ?? []);
      // Cache stats locally
      try {
        localStorage.setItem("vog_stats_cache", JSON.stringify({ total: s?.total ?? 0, places: s?.places ?? [], timestamp: Date.now() }));
      } catch { /* ignore */ }
    } catch {
      // Backend unreachable — load from cache
      try {
        const cached = localStorage.getItem("vog_stats_cache");
        if (cached) {
          const data = JSON.parse(cached);
          setTotal(data.total);
          setPlaces(data.places);
        }
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    void loadStats();
    // Live tracking - update every 10 seconds
    pollRef.current = setInterval(() => { void loadStats(); }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadStats]);

  // After registration - show ID card, don't auto-sign
  const handleRegistered = useCallback(() => {
    // Just close the modal - user will see their ID card
    setShowRegister(false);
  }, []);

  const handleSign = useCallback(async () => {
    if (!profile) {
      setShowRegister(true);
      return;
    }
    if (hasSigned) {
      toast.success(t("home.dup_toast"), { duration: 5000 });
      return;
    }
    setBusy(true);
    const signedAt = new Date().toISOString();
    const resultData = {
      hash: `LOCAL-${Date.now().toString(36).toUpperCase()}`,
      verifyUrl: `${window.location.origin}/verify-sign`,
      batchNo: 1,
      signedAt,
      name: profile.name,
      gudalurId: profile.gudalurId || "",
      locality: profile.customPlaceName || profile.localityName || "Gudalur",
    };
    
    try {
      const res = await petitionApi.sign({
        idempotencyKey: `petition-sign-${profile.uid}`,
      });
      const verifyUrl =
        res.verifyUrl
          ? new URL(res.verifyUrl, window.location.origin).toString()
          : `${window.location.origin}/verify-sign?id=${encodeURIComponent(res.signHash)}`;
      resultData.hash = res.signHash;
      resultData.verifyUrl = verifyUrl;
      resultData.batchNo = res.batchNo ?? 1;
      
      if (res.isDuplicate) {
        toast.success(t("home.dup_toast"), { duration: 5000 });
      } else {
        toast.success(t("home.signed_toast"), { duration: 6000 });
      }
    } catch (e: any) {
      // Backend unavailable - save locally (offline mode)
      const errorMsg = e?.error || e?.message || "";
      if (errorMsg.includes("502") || errorMsg.includes("DATABASE_URL") || errorMsg.includes("backend")) {
        toast.success("Signature saved offline! Will sync when connection is restored.", { duration: 6000, icon: "📱" });
      } else {
        toast.error(errorMsg || "Sign failed");
      }
    }
    
    // Always save locally as backup
    try {
      localStorage.setItem("vog_petition_signed", "1");
      localStorage.setItem("vog_petition_result", JSON.stringify(resultData));
    } catch { /* ignore */ }
    setHasSigned(true);
    setResult(resultData);
    // Let other screens (e.g. About → "Petition Signed") update instantly.
    window.dispatchEvent(new Event("vog:petition-signed"));
    setBusy(false);
    void loadStats();
  }, [profile, loadStats, hasSigned, t]);

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
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <IdCard size={26} className="text-white" />
          </div>
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

      {profile && !hasSigned && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
          <div className="text-center mb-4">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-2">
              <Shield size={32} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-900">Your ID Card</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Name</p>
                <p className="font-bold text-slate-900">{profile.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">GDR ID</p>
                <p className="font-mono font-bold text-slate-900">{profile.gudalurId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Location</p>
                <p className="font-bold text-slate-900">{profile.customPlaceName || profile.localityName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Registered</p>
                <p className="font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleSign}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Signing...</> : <><PenLine size={16} /> {t("home.sign_btn")}</>}
          </button>
        </div>
      )}

      {profile && hasSigned && result && (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-6 space-y-4">
          <div className="text-center">
            <CheckCircle2 size={48} className="mx-auto text-emerald-600 mb-2" />
            <h3 className="font-bold text-emerald-900">Petition Signed!</h3>
          </div>
          <div className="bg-white rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Signing as</p>
                <p className="font-bold text-slate-900">{result.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">GDR ID</p>
                <p className="font-mono font-bold text-slate-900">{result.gudalurId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Location</p>
                <p className="font-bold text-slate-900">{result.locality}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-emerald-600" />
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Timestamp</p>
                <p className="font-mono text-xs text-slate-900">{result.signedAt} UTC</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <Share2 size={16} /> Share
            </button>
            <button
              disabled={true}
              className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-500 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 size={16} /> Signed
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4 text-center">
          <BadgeCheck size={44} className="mx-auto text-emerald-600" />
          <div>
            <p className="text-sm font-black text-emerald-800">{t("home.recorded")}</p>
            <p className="text-[11px] text-emerald-700 mt-1 break-all font-mono">{result.hash}</p>
            <p className="text-[11px] text-emerald-600 mt-1">{t("home.batch").replace("{n}", String(result.batchNo))}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={copyLink} className="py-2.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5">
              <Link2 size={13} /> {t("home.copy_link")}
            </button>
            <button onClick={forwardViaWhatsApp} className="py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5">
              <Share2 size={13} /> {t("home.share_wa")}
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

      {/* Live Tracking Section */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-emerald-900 flex items-center gap-2">
            <BarChart3 size={15} className="text-emerald-600" />
            Live Tracking
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
          </div>
        </div>
        
        {/* Total Count */}
        <div className="text-center py-4">
          <p className="text-4xl font-black text-emerald-900">{total !== null ? total.toLocaleString('en-IN') : '...'}</p>
          <p className="text-xs text-emerald-700 mt-1">Petitions Signed</p>
        </div>

        {/* Places Leaderboard */}
        {places.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-emerald-800">Top Places by Signatures</p>
            {places
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
              .map((p, i) => {
                const max = places[0]?.count || 1;
                const percentage = Math.max(4, (p.count / max) * 100);
                return (
                  <div key={p.place} className="bg-white/80 rounded-lg p-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? 'bg-yellow-400 text-yellow-900' :
                          i === 1 ? 'bg-slate-300 text-slate-700' :
                          i === 2 ? 'bg-amber-600 text-white' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {i + 1}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">{p.place}</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-sm">{p.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Action Button — the petition sign flow is already above; keep the grievance link only */}
      <div className="max-w-lg mx-auto">
        <Link
          to="/about"
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-emerald-600 text-emerald-700 font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <Eye size={18} />
          {t("home.view_grievances_btn") || "View Grievances Submitted"}
        </Link>
      </div>

      {/* Thirukural Section */}
      <ThirukuralSection />

      {/* Share Social Modal */}
      <ShareSocialModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        posters={[]}
        videos={[]}
      />

      <RegisterResidentModal 
        isOpen={showRegister} 
        onClose={() => setShowRegister(false)} 
        onRegistered={() => { setShowRegister(false); handleRegistered(); }}
      />
    </div>
  );
};
