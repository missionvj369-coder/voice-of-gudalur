import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { validationApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import { LoginResidentModal } from "../components/Auth/LoginResidentModal";

const APP_NAME = "VOICE OF GUDALUR";

const fmtDateTime = (iso) =>
  (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function ValidatePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, setProfile } = useAuth();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [authSpin, setAuthSpin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const d = await validationApi.verify(token);
        if (!cancelled) setDetails(d);
      } catch (e) {
        if (!cancelled) setDetails({ valid: false, error: "Failed to load validation details" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const afterAuth = useCallback(() => {
    setShowRegister(false);
    setShowLogin(false);
    setAuthSpin(true);
    if (token) {
      validationApi.verify(token).then((d) => setDetails(d)).finally(() => setAuthSpin(false));
    } else {
      setAuthSpin(false);
    }
  }, [token]);

  const accept = useCallback(async () => {
    if (!token || !details?.signature) return;
    setActionLoading(true);
    try {
      const key = crypto.randomUUID();
      await validationApi.accept({ validationToken: token, idempotencyKey: key });
      toast.success("Validation accepted! The signature has been verified.");
      navigate("/validate/done", { state: { token, action: "accepted" }, replace: true });
    } catch (err) {
      const msg = (err && (err.error || err.message)) || "Failed to accept";
      if (/already|used|revoked/i.test(msg)) {
        toast.success("This signature has already been validated.");
        navigate("/validate/done", { state: { token, action: "accepted" }, replace: true });
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  }, [token, details, navigate]);

  const reject = useCallback(async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      await validationApi.reject({ validationToken: token });
      toast.success("Validation declined. The signature will need another witness.");
      navigate("/validate/done", { state: { token, action: "rejected" }, replace: true });
    } catch (err) {
      toast.error((err && (err.error || err.message)) || "Failed to reject");
    } finally {
      setActionLoading(false);
    }
  }, [token, navigate]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch { window.prompt("Copy this link:", window.location.href); }
  }, []);

  const fromState = (location.state as any) || null;
  if (fromState && fromState.action && fromState.token) {
    const isAccepted = fromState.action === "accepted";
    const borderColor = isAccepted ? "border-emerald-200" : "border-slate-200";
    const bgColor = isAccepted ? "bg-emerald-50" : "bg-slate-50";
    const iconColor = isAccepted ? "text-emerald-500" : "text-slate-500";
    const iconPath = isAccepted ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12";
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className={"rounded-3xl bg-white " + borderColor + " p-8 max-w-md w-full mx-4 text-center space-y-4 shadow-sm"}>
          <div className={"w-14 h-14 mx-auto rounded-2xl " + bgColor + " flex items-center justify-center"}>
            <svg className={iconColor} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Validation {isAccepted ? "Accepted" : "Rejected"}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {isAccepted
                ? "The signature has been verified. The petition now has one more witness."
                : "The signature has been declined. The petition will need another witness to verify it."}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/validate/" + fromState.token)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-300 px-6 py-3 text-sm font-bold text-gray-700 hover:bg-slate-50 transition"
            >
              Review Signature
              </button>
            </div>
          </div>
        </div>
    );
  }



  // No token
  if (!token) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">No validation token provided.</p>
          <p className="text-sm text-gray-500 mt-1">Please use the full validation link shared with you.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading validation details…</p>
        </div>
      </div>
    );
  }

  // Auth gate — must be logged in
  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md mx-4">
          <div className="rounded-t-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-6 pt-6 pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <svg className="w-7 h-7 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7" />
              </svg>
              <span className="text-xs font-extrabold tracking-[0.3em] text-emerald-100 uppercase">{APP_NAME}</span>
            </div>
            <h1 className="text-xl font-bold text-white">Sign the Petition</h1>
            <p className="mt-1 text-sm text-emerald-100">Verify your identity to validate this signature</p>
          </div>

          <div className="rounded-b-3xl bg-white border-t border-gray-100 px-6 py-5 shadow-sm">
            {details?.signature ? (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Signature to validate</p>
                  <p className="font-semibold text-gray-800">{details.signature.name}</p>
                  <p className="text-sm text-gray-500">{details.signature.address}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No signature details available.</p>
            )}


            <div className="mt-4 flex flex-col gap-2">



              {showRegister ? (
                <RegisterResidentModal
                  onClose={() => { setShowRegister(false); setAuthSpin(false); }}
                  onSignUp={() => afterAuth()}
                  loading={authSpin}
                />
              ) : showLogin ? (
                <LoginResidentModal
                  onClose={() => { setShowLogin(false); setAuthSpin(false); }}
                  onLogin={() => afterAuth()}
                  loading={authSpin}
                />
              ) : (
                <>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                  >
                    Sign up as a resident
                  </button>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-50 transition shadow-sm"
                  >
                    Already a resident? Log in
                  </button>
                </>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={reject}
                disabled={actionLoading}
                className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-sm"
              >
                {actionLoading ? "Processing…" : "Decline"}
              </button>
              <button
                onClick={accept}
                disabled={actionLoading || !profile}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition shadow-sm"
              >
                {actionLoading ? "Validating…" : "Sign & Validate"}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
              <button
                onClick={copyLink}
                className="flex items-center gap-1 hover:text-gray-600 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy link
              </button>



            </div>
          </div>
        </div>
      </div>
    );
  }



  // Authenticated — show confirmation + action buttons
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        <div className="rounded-t-3xl bg-gradient-to-br from-emerald-600 to-emerald-500 px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <svg className="w-7 h-7 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7" />
            </svg>
            <span className="text-xs font-extrabold tracking-[0.3em] text-emerald-100 uppercase">{APP_NAME}</span>
          </div>
          <h1 className="text-xl font-bold text-white">Confirm Signature</h1>
          <p className="mt-1 text-sm text-emerald-100">You are logged in as {profile.name}</p>
        </div>

        <div className="rounded-b-3xl bg-white border-t border-gray-100 px-6 py-5 shadow-sm">
          {details?.signature ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Signature to validate</p>
                <p className="font-semibold text-gray-800">{details.signature.displayName || details.signature.publicReference}</p>
                <p className="text-sm text-gray-500">{details.signature.area || '—'}</p>
                <p className="mt-1 text-xs text-gray-400">
                  Submitted {fmtDateTime(details.signature.createdAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No signature details available.</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {showRegister ? (
              <RegisterResidentModal
                onClose={() => { setShowRegister(false); setAuthSpin(false); }}
                onSignUp={() => afterAuth()}
                loading={authSpin}
              />
            ) : showLogin ? (
              <LoginResidentModal
                onClose={() => { setShowLogin(false); setAuthSpin(false); }}
                onLogin={() => afterAuth()}
                loading={authSpin}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowRegister(true)}
                  className="w-full rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
                >
                  Sign up as a resident
                </button>
                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-50 transition shadow-sm"
                >
                  Already a resident? Log in
                </button>
              </>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              onClick={reject}
              disabled={actionLoading}
              className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition shadow-sm"
            >
              {actionLoading ? "Processing…" : "Decline"}
            </button>
            <button
              onClick={accept}
              disabled={actionLoading}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition shadow-sm"
            >
              {actionLoading ? "Validating…" : "Sign & Validate"}
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <button
              onClick={copyLink}
              className="flex items-center gap-1 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy link
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">Token: {token}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
