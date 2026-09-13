/**
 * Voice of Gudalur — User Profile Page.
 *
 * Shows the current user's profile information and signature validation summary.
 * Consumes:
 *   - GET /api/auth/me  — current user profile
 *   - GET /api/validation/my-validations — per-identity validation counts + recent links
 *
 * Accessible via /profile route (linked from the Shell header when authenticated).
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi, validationApi, type AuthUser } from '../services/api';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Link2, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface ValidationSummary {
  totalSignatures: number;
  validatedCount: number;
  reviewRequiredCount: number;
  pendingCount: number;
}

interface RecentValidation {
  linkId: string;
  tokenHash: string;
  status: string;
  createdAt: string;
  displayName: string;
  area: string;
  signatureStatus: string;
  petitionId: string;
  publicReference: string;
}

interface ValidationData {
  success: boolean;
  identityId: string;
  summary: ValidationSummary;
  activeLinkCount: number;
  recentValidations: RecentValidation[];
}

/** Format a date string for display. */
function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return s;
  }
}

/** Color + icon for a signature status badge. */
function statusBadge(status: string): { color: string; icon: React.ReactNode; label: string } {
  switch (status) {
    case 'COMMUNITY_VALIDATED':
      return { color: 'bg-green-100 text-green-800', icon: <ShieldCheck className="h-3.5 w-3.5" />, label: 'Validated' };
    case 'REVIEW_REQUIRED':
      return { color: 'bg-amber-100 text-amber-800', icon: <ShieldAlert className="h-3.5 w-3.5" />, label: 'Review Required' };
    case 'PENDING':
      return { color: 'bg-blue-100 text-blue-800', icon: <ShieldQuestion className="h-3.5 w-3.5" />, label: 'Pending' };
    default:
      return { color: 'bg-gray-100 text-gray-700', icon: <Shield className="h-3.5 w-3.5" />, label: status };
  }
}

/** Color + icon for a validation link status. */
function linkStatusBadge(status: string): { color: string; icon: React.ReactNode; label: string } {
  switch (status) {
    case 'active':
      return { color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Active' };
    case 'used':
      return { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Used' };
    case 'revoked':
      return { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3.5 w-3.5" />, label: 'Revoked' };
    default:
      return { color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3.5 w-3.5" />, label: status };
  }
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = React.useState<AuthUser | null>(null);
  const [validationData, setValidationData] = React.useState<ValidationData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [me, vals] = await Promise.all([
          authApi.me().catch(() => null),
          validationApi.myValidations().catch(() => null),
        ]);
        if (cancelled) return;
        setProfile(me);
        if (vals?.success) setValidationData(vals);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-label="Loading profile">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 rounded-2xl bg-red-50 border border-red-200 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-500" />
        <p className="text-sm text-red-700 font-medium">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const summary = validationData?.summary;
  const recent = validationData?.recentValidations ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
            <Shield className="h-7 w-7 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {profile?.name || 'User'}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {profile?.gudalurId || profile?.uid || ''}
            </p>
            {profile?.localityName && (
              <p className="text-xs text-gray-400 mt-0.5">{profile.localityName}</p>
            )}
          </div>
        </div>
      </div>
      {/* Validation Summary */}
      {summary && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Signature Validation Summary
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{summary.totalSignatures}</p>
              <p className="text-xs text-gray-500 mt-1">Total Signatures</p>
            </div>
            <div className="rounded-xl bg-green-50 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{summary.validatedCount}</p>
              <p className="text-xs text-green-600 mt-1">Validated</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{summary.reviewRequiredCount}</p>
              <p className="text-xs text-amber-600 mt-1">Review Required</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{summary.pendingCount}</p>
              <p className="text-xs text-blue-600 mt-1">Pending</p>
            </div>
          </div>
          {validationData && validationData.activeLinkCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              <Link2 className="h-4 w-4" />
              <span>{validationData.activeLinkCount} active validation link{validationData.activeLinkCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}


      {/* Recent Validations */}
      {recent.length > 0 && (
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Recent Validation Activity
          </h2>
          <div className="space-y-3">
            {recent.map((v) => {
              const sigBadge = statusBadge(v.signatureStatus);
              const linkBadge = linkStatusBadge(v.status);
              return (
                <div key={v.linkId} className="rounded-xl border border-gray-100 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {v.displayName || v.publicReference || 'Signature'}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${linkBadge.color}`}>
                      {linkBadge.icon}
                      {linkBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">
                      {v.area && <span>{v.area} · </span>}
                      {fmtDate(v.createdAt)}
                    </p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sigBadge.color}`}>
                      {sigBadge.icon}
                      {sigBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {summary && summary.totalSignatures === 0 && (
        <div className="rounded-2xl bg-gray-50 border border-gray-200 p-8 text-center">
          <ShieldQuestion className="h-10 w-10 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600">No signatures yet.</p>
          <button
            onClick={() => navigate('/sign-petition')}
            className="mt-4 px-5 py-2 rounded-full bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition"
          >
            Sign the Petition
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
