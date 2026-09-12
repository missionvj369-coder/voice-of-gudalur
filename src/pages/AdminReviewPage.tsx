/**
 * Admin Review Page
 * Protected by admin authentication.
 * Role-based access: VIEWER, REVIEWER, MODERATOR, SECURITY_ADMIN, SUPER_ADMIN
 */

"use client";

import { useState, useCallback } from "react";

type AdminRole = "VIEWER" | "REVIEWER" | "MODERATOR" | "SECURITY_ADMIN" | "SUPER_ADMIN";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: adminToken, totpCode: totpCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid admin credentials");
      setAuthenticated(true);
      setRole(data.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }, [adminToken, totpCode]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5">
          <h1 className="mb-4 text-center text-lg font-semibold text-gray-900">Admin Access</h1>
          <p className="mb-4 text-center text-xs text-gray-500">
            Restricted area. All actions are audited.
          </p>
          {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <input
            type="password"
            placeholder="Admin token"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="MFA code (6 digits, if enabled)"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            maxLength={6}
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleLogin}
            disabled={loading || !adminToken}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Review</h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              {role}
            </span>
            <button
              onClick={async () => {
                await fetch("/api/admin/session/logout", { method: "POST" });
                setAuthenticated(false);
                setRole(null);
              }}
              className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </header>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Review Queue</h2>
          <p className="text-sm text-gray-600">
            Pending reviews will appear here. Admin actions are audited and require a reason.
          </p>
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
            No pending reviews.
          </div>
        </div>
      </div>
    </div>
  );
}
