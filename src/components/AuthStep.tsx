"use client";

import { useState } from "react";

export function AuthStep({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/phone-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setRequestId(data.requestId);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!requestId) return;
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "phone_otp",
          phoneE164: phone,
          otp,
          requestId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      onAuthenticated();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5">
      <h2 className="mb-4 text-center text-lg font-semibold text-gray-900">
        Verify Your Identity
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        One mobile number = one signature. Your identity is verified securely.
      </p>

      {authError && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {authError}
        </div>
      )}

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-500">Phone verification</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {!requestId ? (
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleSendOtp}
            disabled={loading || !phone}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "..." : "Verify"}
          </button>
        </div>
      )}

      <p className="mt-3 text-center text-xs text-gray-500">
        Standard SMS rates apply. Your number is used only for verification.
      </p>
    </div>
  );
}
