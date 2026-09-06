import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth, readLocalSignature, isRealGudalurId } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { petitionApi, mediaApi, type MediaItem } from "../services/api";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import { ThirukuralSection } from "../components/ThirukuralSection";
import { buildVerifiedSignatureReceipt } from "../utils/grievanceReceipt";
import ShareSocialModal from "../components/ShareSocial/ShareSocialModal";
import MediaViewer from "../components/ShareSocial/MediaViewer";
import { BarChart3, Download, PenLine, Eye, Loader2, Share2, CheckCircle2, User, Phone, MapPin, Clock, Shield, IdCard, BadgeCheck, Link2, ImageIcon, Video, Sparkles, Hash } from "lucide-react";
import toast from "react-hot-toast";

interface PlaceCount {
  place: string;
  count: number;
}

/**
 * HOMEPAGE â€” clean, with only the Right to Life petition sign-in.
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
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MediaItem | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [places, setPlaces] = useState<PlaceCount[]>([]);
  const [hasSigned, setHasSigned] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [shareActive, setShareActive] = useState<{ id: string; title: string; description: string; imageUrl?: string; videoUrl?: string; createdAt: string } | null>(null);
  const [ledger, setLedger] = useState<Array<{ hash: string; name: string; village: string; phoneLast4: string | null; batchNo: number; signedAt: string; verifyUrl: string }>>([]);
  const [ledgerTotal, setLedgerTotal] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load admin-published movement media (posters + videos) for the Support the Movement section.
  useEffect(() => {
    let alive = true;
    mediaApi.list().then((items) => { if (alive) setMediaItems(items); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // Check if user has already signed â€” only a server-issued (VG-*) sign hash
  // counts as real; synthetic local placeholders are purged by the helper.
  useEffect(() => {
    const { signed, result } = readLocalSignature();
    setHasSigned(signed);
    if (signed && profile && result) {
      setResult(result);
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
      // Backend unreachable â€” load from cache
      try {
        const cached = localStorage.getItem("vog_stats_cache");
        if (cached) {
          const data = JSON.parse(cached);
          setTotal(data.total);
          setPlaces(data.places);
        }
      } catch { /* ignore */ }
    }
    // Live hash ledger â€” public, updates with the same 10s heartbeat.
    try {
      const l = await petitionApi.ledger();
      setLedger(l?.signs ?? []);
      setLedgerTotal(l?.total ?? 0);
    } catch { /* ledger stays as-is offline */ }
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
    // Signing requires a REAL Gudalur ID issued online by the server. A local
    // / synthetic card (OFFLINE-*) must never reach the petition ledger.
    if (!profile || !isRealGudalurId(profile.gudalurId)) {
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
      hash: "",
      verifyUrl: `${window.location.origin}/verify-sign`,
      batchNo: 1,
      signedAt,
      name: profile.name,
      gudalurId: profile.gudalurId || "",
      locality: profile.customPlaceName || profile.localityName || "",
    };
    
                        try {
      const res = await petitionApi.sign({
        idempotencyKey: `petition-sign-${profile.uid}`,
        // The supporter's own typed address + real GPS coords are recorded â€”
        // the server never substitutes a preset Gudalur place.
        address: profile.customPlaceName || profile.localityName || "",
        lat: profile.lat,
        lng: profile.lng,
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

      // Save locally only after the backend successfully records the signature
      try {
        localStorage.setItem("vog_petition_signed", "1");
        localStorage.setItem("vog_petition_result", JSON.stringify(resultData));
      } catch { /* ignore */ }
      setHasSigned(true);
      setResult(resultData);
    } catch (e: any) {
      // Backend unavailable - show accurate error (no misleading "offline" message)
      const errorMsg = e?.error || e?.message || "";
      if (errorMsg.includes("502") || errorMsg.includes("DATABASE_URL") || errorMsg.includes("backend")) {
        toast.error(t("home.err_unavailable"), {
          duration: 6000,
          icon: "⚠",
        });
      } else {
        toast.error(errorMsg || t("home.err_sign"));
      }
    }
    // Let other screens (e.g. About â†’ "Petition Signed") update instantly.
    window.dispatchEvent(new Event("vog:petition-signed"));
    setBusy(false);
    void loadStats();
  }, [profile, loadStats, hasSigned, t]);

  const forwardViaWhatsApp = useCallback(() => {
    if (!result) return;
    const msg =
      `ðŸ“œ *Voice of Gudalur â€” Verified Signature*\n\n` +
      `I have digitally signed the Right to Life / Mudhalvan Mugavari Grievance Petition.\n\n` +
      `ðŸ”Ž Verify my verified sign here:\n${result.verifyUrl}\n\n` +
      `Batch #${result.batchNo} Â· Verified Resident`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }, [result]);

  const copyLink = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.verifyUrl);
      toast.success(t("home.link_copied"));
    } catch {
      window.prompt(t("home.copy_prompt"), result.verifyUrl);
    }
  }, [result, t]);

  /** Official receipt â€” the Mudhalvarin Mugavari grievance page + this supporter's signed details. */
  const downloadReceipt = useCallback(async () => {
    if (!result || !profile) return;
    try {
      await buildVerifiedSignatureReceipt({
        signer: {
          name: profile.name,
          gdrId: profile.gudalurId,
          address: profile.customPlaceName || profile.localityName || "",
          phoneLast4: profile.phone ? profile.phone.slice(-4) : undefined,
        },
        batchNo: result.batchNo,
        signHash: result.hash,
        signedAtUTC: result.signedAt,
        verifyUrl: result.verifyUrl,
      });
    } catch {
      toast.error(t("home.pdf_fail"));
    }
  }, [result, profile, t]);

  return (
    <div className="max-w-2xl mx-auto px-3 py-3 sm:px-4 sm:py-8 space-y-3 sm:space-y-6">
      {/* Hero â€” petition + live counter */}
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 sm:p-6 text-center space-y-3">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">{t("home.title")}</h1>
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
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 text-center space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <IdCard size={24} className="text-white" />
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
        <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-6 space-y-4">
          <div className="text-center mb-3"><div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-2">
              <Shield size={24} className="text-white" />
            </div>
            <h3 className="font-bold text-slate-900">Your Digital Supporter ID</h3>
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
            {busy ? <><Loader2 size={16} className="animate-spin" /> {t("home.signing")}</> : <><PenLine size={16} /> {t("home.sign_btn")}</>}
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
          <p className="text-4xl font-black text-emerald-900">{ledgerTotal !== null ? ledgerTotal.toLocaleString('en-IN') : (total !== null ? total.toLocaleString('en-IN') : '...')}</p>
          <p className="text-xs text-emerald-700 mt-1">Petitions Signed</p>
        </div>

        {/* Live Signature Ledger â€” public: every sign is a clickable, verifiable hash */}
        <div className="rounded-2xl border border-emerald-200 bg-white/90 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <Hash size={13} /> Live Signature Ledger
            </p>
            <span className="text-[10px] font-bold text-emerald-100">
              {ledgerTotal !== null ? `${ledgerTotal.toLocaleString('en-IN')} hashes` : 'â€¦'}
            </span>
          </div>
          {ledger.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-5">
              No signatures yet â€” be the first. Every sign becomes a public, verifiable hash.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {ledger.map((s) => (
                <Link
                  key={s.hash}
                  to={`/verify-sign?id=${encodeURIComponent(s.hash)}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 transition group"
                >
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Hash size={13} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-mono text-[11px] font-bold text-slate-900 truncate group-hover:text-emerald-700">
                      {s.hash}
                    </span>
                    <span className="block text-[10px] text-slate-500">
                      {s.name} Â· {s.village || 'Not specified'} Â· Batch #{s.batchNo}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[10px] font-bold text-emerald-700">View</span>
                    <span className="block text-[9px] text-slate-400">
                      {new Date(s.signedAt).toLocaleDateString('en-IN')}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100">
            <p className="text-[9px] text-emerald-700 text-center leading-relaxed">
              ðŸ”’ Tap any hash to see the signer's details â€” phone numbers are blurred and never shown.
            </p>
          </div>
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

      {/* Action Button â€” the petition sign flow is already above; keep the grievance link only */}
      <div className="max-w-lg mx-auto">
        <Link
          to="/about"
          className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border-2 border-emerald-600 text-emerald-700 font-bold text-sm shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <Eye size={18} />
          {t("home.view_grievances_btn") || "View Grievances Submitted"}
        </Link>
      </div>

      {/* Support the Movement â€” posters & videos published by admin, shareable */}
      {(mediaItems.length > 0) && (
        <div className="rounded-3xl border border-[#AED581]/40 bg-white/95 p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1B5E20] flex items-center gap-2">
              <Sparkles size={15} className="text-emerald-600" /> {t("home.support_title")}
            </h2>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:opacity-90 transition"
            >
              <Share2 size={13} /> {t("home.share_all")}
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t("home.share_sub")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mediaItems.slice(0, 9).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setShareActive({
                    id: m.id,
                    title: m.title,
                    description: m.description || '',
                    imageUrl: m.kind === 'poster' ? m.url : undefined,
                    videoUrl: m.kind === 'video' ? m.url : undefined,
                    createdAt: m.createdAt,
                  });
                  setShowShareModal(true);
                }}
                className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {m.kind === 'poster' ? (
                  <img src={m.url} alt={m.title} loading="lazy" className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <video src={m.url} className="w-full h-32 sm:h-40 object-cover" muted playsInline preload="metadata" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2">
                  <p className="text-[11px] font-bold text-white truncate">{m.title}</p>
                  {m.description && <p className="text-[10px] text-slate-300 line-clamp-1">{m.description}</p>}
                </div>
                                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingMedia(m);
                      setShowMediaViewer(true);
                    }}
                    className="p-1.5 rounded-lg bg-black/50 text-white backdrop-blur hover:bg-black/70 transition"
                    title={t("home.view_media")}
                    aria-label={t("home.view")}
                  >
                    <Eye size={12} />
                  </button>
                  <span className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <Share2 size={12} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thirukural Section */}
      <ThirukuralSection />

      {/* Share Social Modal */}
      <ShareSocialModal
        isOpen={showShareModal}
        onClose={() => { setShowShareModal(false); setShareActive(null); }}
        activeItem={shareActive}
        onViewMedia={() => {
          if (shareActive) {
            const mediaItem = mediaItems.find((m) => m.id === shareActive.id);
            if (mediaItem) {
              setViewingMedia(mediaItem);
              setShowMediaViewer(true);
            }
          }
        }}
        posters={mediaItems
          .filter((m) => m.kind === 'poster')
          .map((m) => ({ id: m.id, title: m.title, description: m.description || '', imageUrl: m.url, createdAt: m.createdAt }))}
        videos={mediaItems
          .filter((m) => m.kind === 'video')
          .map((m) => ({ id: m.id, title: m.title, description: m.description || '', videoUrl: m.url, createdAt: m.createdAt }))}
      />

      {/* In-App Media Viewer */}
      <MediaViewer
        isOpen={showMediaViewer}
        onClose={() => { setShowMediaViewer(false); setViewingMedia(null); }}
        item={viewingMedia}
        onShare={(item) => {
          setShowMediaViewer(false);
          setViewingMedia(null);
          setShareActive({
            id: item.id,
            title: item.title,
            description: item.description || '',
            imageUrl: item.kind === 'poster' ? item.url : undefined,
            videoUrl: item.kind === 'video' ? item.url : undefined,
            createdAt: item.createdAt,
          });
          setShowShareModal(true);
        }}
      />

      <RegisterResidentModal 
        isOpen={showRegister} 
        onClose={() => setShowRegister(false)} 
        onRegistered={() => { setShowRegister(false); handleRegistered(); }}
      />
    </div>
  );
};


