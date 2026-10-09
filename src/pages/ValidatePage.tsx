import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { validationApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { RegisterResidentModal } from "../components/Auth/RegisterResidentModal";
import { LoginResidentModal } from "../components/Auth/LoginResidentModal";
import { WITNESS_REGISTER_EVENT, WITNESS_REGISTER_FLAG } from "./about_helpers";

const APP_NAME = "VOICE OF GUDALUR";

const fmtDateTime = (iso) =>
  (iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/** A signature whose validation count has reached its cap is fully witnessed —
 * no more witness action is possible or needed for it. Show a completion screen
 * that guides the visitor to register / sign their own petition instead of the
 * validate controls.
 *
 * This can be determined either from an active link (details.valid === true, with
 * validationCount/maxValidations returned by GET /verify) or from a dead link
 * (410 used / revoked / expired) whose error body now carries the same counts so
 * the UI can still recognise a fully-validated signature.
 */
const isSignatureFullyValidated = (details: any): boolean =>
  !!(details &&
      details.signature &&
      typeof details.validationCount === 'number' &&
      typeof details.maxValidations === 'number' &&
      details.validationCount >= details.maxValidations);

const ValidationCompleteScreen: React.FC<{
  token: string;
  navigate: (to: string, opts?: any) => void;
  profile: any;
}> = ({ token, navigate, profile }) => {
  const isRegistered = !!(profile && profile.gudalurId);
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md mx-4 rounded-3xl bg-white border border-emerald-200 p-8 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-4 text-lg font-bold text-gray-900">3 validations completed</h1>
        <p className="mt-2 text-sm text-gray-600">
          This signature has already been verified by enough witnesses. No further validation is needed.
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Token: {token}
        </p>
        <div className="mt-5 space-y-2">
          {isRegistered ? (
            <>
              <button
                onClick={() => navigate("/sign-petition")}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Sign the petition yourself
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-slate-50 transition shadow-sm"
              >
                View my profile
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("vog:open-register"))}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Register as a resident
              </button>
              <button
                onClick={() => navigate("/sign-petition")}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-slate-50 transition shadow-sm"
              >
                Sign the petition yourself
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ValidatePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
    const { profile, loading: authLoading } = useAuth();

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
      } catch (err) {
        // The API client throws an Error carrying the server's own message and
        // HTTP status. 404/410 are verdicts about the LINK (not found / used /
        // revoked / expired) — everything else is a load failure worth a retry.
        // Preserve any extra fields the server folded into the error body (e.g.
        // validationCount / maxValidations / signature for a dead link) so the
        // UI can still show a meaningful "3 validations completed" state.
        const e = err as { error?: string; message?: string; status?: number; responseData?: any };
        const rd = e?.responseData || {};
        if (!cancelled) setDetails({
          valid: false,
          status: e?.status,
          error: e?.error || e?.message || "Failed to load validation details",
          validationCount: typeof rd.validationCount === 'number' ? rd.validationCount : undefined,
          maxValidations: typeof rd.maxValidations === 'number' ? rd.maxValidations : undefined,
          signature: rd.signature || undefined,
          used: !!rd.used,
          revoked: !!rd.revoked,
          expired: !!rd.expired,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  /**
   * Refresh the link the moment a resident identity exists.
   *
   * A witness may register or log in through the Shell-level modal (the one the
   * intro hands brand-new visitors to) instead of the two buttons on this
   * screen, so `afterAuth` is not the only path to an account. Once the Gudalur
   * ID is known, the link is re-read under that identity and this screen flips
   * straight from "verify who you are" to "Confirm Signature" — no navigation,
   * no reload, nothing for the witness to tap.
   */
  const residentKey = profile?.gudalurId || profile?.phone || "";
  useEffect(() => {
    if (!token || !residentKey) return;
    let cancelled = false;
    validationApi
      .verify(token)
      .then((d) => { if (!cancelled) setDetails(d); })
      .catch(() => { /* keep whatever the anonymous read already showed */ });
    return () => { cancelled = true; };
  }, [token, residentKey]);

  /**
   * WITNESS FUNNEL — a stranger who tapped a shared link has just finished the
   * intro (App.tsx pushes WITNESS_REGISTER_EVENT). Open the registration form
   * for them instead of leaving a button to find: an account is the single step
   * between them and the signature they were asked to witness. Login stays one
   * tap away inside that modal ("Already registered? Log in") for a resident
   * opening the link on a fresh phone.
   */
  useEffect(() => {
    const openRegister = () => {
      try { sessionStorage.removeItem(WITNESS_REGISTER_FLAG); } catch { /* private mode */ }
      if (profile) return; // already identified — nothing to register
      setShowLogin(false);
      setShowRegister(true);
    };
    try {
      if (sessionStorage.getItem(WITNESS_REGISTER_FLAG) === '1') openRegister();
    } catch { /* private mode */ }
    window.addEventListener(WITNESS_REGISTER_EVENT, openRegister);
    return () => window.removeEventListener(WITNESS_REGISTER_EVENT, openRegister);
  }, [profile]);

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
      toast.success(
        "Validation accepted — thank you! This signature now has a witness. Add your own voice below.",
        { duration: 6000 },
      );
      /* Straight into the petition. A witness who has just vouched for a
         neighbour is the warmest supporter the campaign will ever get — do not
         strand them on a "done" card with nothing left to do. `replace` keeps
         the now-used token out of the back stack. */
      navigate("/sign-petition", { replace: true });
    } catch (err) {
      const msg = (err && (err.error || err.message)) || "Failed to accept";
      if (/already|used|revoked/i.test(msg)) {
        toast.success("This signature has already been validated. Add your own voice below.", { duration: 6000 });
        navigate("/sign-petition", { replace: true });
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
      toast.success(
        "Validation declined. The signature will need another witness.",
        { duration: 6000 },
      );
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
      toast.success("Link copied to clipboard", { duration: 6000 });
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

  // A signature that has already reached its validation cap is fully witnessed.
  // Do not show the validate controls — guide the visitor to register / sign
  // their own petition instead. This can happen for:
  //   • an active link whose signature already hit the cap (rare), or
  //   • a dead link (used / revoked / expired) whose signature has since been
  //     fully validated by enough witnesses.
  if (details && isSignatureFullyValidated(details)) {
    return <ValidationCompleteScreen token={token || ""} navigate={navigate} profile={profile} />;
  }

  /*
   * The link itself was refused — 410 (expired, already used, revoked) or 404
   * (unknown token). Each signature needs exactly one witness and links are
   * single-use, so this is the common case for a reopened WhatsApp message.
   * Offering Decline / Sign & Validate buttons that can only fail wastes a
   * witness's data; say what happened and point them at the next best step
   * (their own signature). A non-verdict failure (offline, 5xx) keeps a retry.
   */
  if (details && details.valid === false) {
    const dead = details.status === 410 || details.status === 404;
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-md mx-4 rounded-3xl bg-white border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className={"w-14 h-14 mx-auto rounded-2xl flex items-center justify-center " + (dead ? "bg-amber-50" : "bg-slate-50")}>
            <svg className={"w-7 h-7 " + (dead ? "text-amber-500" : "text-slate-500")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {dead ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9a8 8 0 00-13.7-3.3L4 8m16 8l-2.3 2.3A8 8 0 014 15" />
              )}
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {dead ? "This validation link is no longer active" : "Could not open this validation link"}
            </h1>
            <p className="mt-2 text-sm text-gray-600">{details.error}</p>
          </div>
          <div className="pt-1">
            {dead ? (
              <button
                onClick={() => navigate("/sign-petition")}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Sign the petition yourself
              </button>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 hover:bg-slate-50 transition shadow-sm"
              >
                Try again
              </button>
            )}
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

  // Auth session is still hydrating (httpOnly cookie restoration in progress).
  // Do NOT show the signup/login gate yet — the user may already be logged in,
  // we just haven't confirmed it. Showing the gate during this window causes the
  // "Authentication required" screen flicker you reported, and the SW
  // controllerchange reload (within first few seconds) bounces the user back
  // here before the session resolves. Wait for the auth state to settle.
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Checking your session…</p>
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
                  <p className="font-semibold text-gray-800">{details.signature.displayName || details.signature.publicReference}</p>
                  <p className="text-sm text-gray-500">{details.signature.area || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No signature details available.</p>
            )}


            <div className="mt-4 flex flex-col gap-2">

              {showRegister ? (
                <RegisterResidentModal
                  isOpen
                  onClose={() => { setShowRegister(false); setAuthSpin(false); }}
                  onSuccess={() => afterAuth()}
                  onNeedLogin={() => { setShowRegister(false); setShowLogin(true); }}
                />
              ) : showLogin ? (
                <LoginResidentModal
                  isOpen
                  onClose={() => { setShowLogin(false); setAuthSpin(false); }}
                  onSuccess={() => afterAuth()}
                  onNeedRegister={() => { setShowLogin(false); setShowRegister(true); }}
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

          {/* Logged-out witnesses only see the signup/login CTA above; Decline / Sign&Validate / Copy-link require an authenticated session. */}
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
                  Submitted {fmtDateTime(details.signature.signedAt)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">No signature details available.</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {showRegister ? (
              <RegisterResidentModal
                isOpen
                onClose={() => { setShowRegister(false); setAuthSpin(false); }}
                onSuccess={() => afterAuth()}
                onNeedLogin={() => { setShowRegister(false); setShowLogin(true); }}
              />
            ) : showLogin ? (
              <LoginResidentModal
                isOpen
                onClose={() => { setShowLogin(false); setAuthSpin(false); }}
                onSuccess={() => afterAuth()}
                onNeedRegister={() => { setShowLogin(false); setShowRegister(true); }}
              />
            ) : (
              <div className="hidden" />
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
