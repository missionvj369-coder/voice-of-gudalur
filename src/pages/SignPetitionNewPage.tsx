"use client";

import { useState, useCallback } from "react";
import { AuthStep } from "./AuthStep";
import { ConsentStep } from "./ConsentStep";
import { SignForm } from "./SignForm";
import { DoneView } from "./DoneView";

type SignStep = "auth" | "consent" | "sign" | "done";

type SignatureStatus =
  | "READY"
  | "SUBMITTING"
  | "ACCEPTED"
  | "RETRY_REQUIRED"
  | "OFFLINE"
  | "REVIEW_REQUIRED"
  | "REJECTED";

/**
 * Get the CSRF token from cookies (double-submit pattern).
 * The auth session sets a non-httpOnly CSRF cookie that JS can read.
 */
function getCsrfToken(): string {
  const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) acc[key] = value;
    return acc;
  }, {});
  return cookies["vog_csrf"] || "";
}

export default function SignPage() {
  const [step, setStep] = useState<SignStep>("auth");
  const [status, setStatus] = useState<SignatureStatus>("READY");
  const [publicReference, setPublicReference] = useState<string | null>(null);
  const [validationToken, setValidationToken] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [area, setArea] = useState("");
  const [displayMode, setDisplayMode] = useState<"anonymous" | "name_and_area">("anonymous");
  const [error, setError] = useState<string | null>(null);

  const handleAuthenticated = useCallback(() => {
    setStep("consent");
  }, []);

  const handleConsent = useCallback(() => {
    setStep("sign");
  }, []);

  const handleSign = useCallback(async () => {
    setStatus("SUBMITTING");
    setError(null);

    try {
      const idempotencyKey = crypto.randomUUID();
      const csrfToken = getCsrfToken();
      const res = await fetch("/api/petition/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          idempotencyKey,
          displayMode,
          displayName: displayMode === "name_and_area" ? displayName : null,
          area: displayMode === "name_and_area" ? area : null,
          consentVersion: "1.0",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.includes("Already signed")) {
          setPublicReference(data.publicReference || null);
          setStatus("ACCEPTED");
          setStep("done");
          return;
        }
        throw new Error(data.error || "Signing failed");
      }

      setPublicReference(data.publicReference);
      setValidationToken(data.validationToken);
      setStatus("ACCEPTED");
      setStep("done");
    } catch (err) {
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setStatus("OFFLINE");
        setError("You appear to be offline. Your signature has not been submitted.");
      } else {
        setStatus("RETRY_REQUIRED");
        setError(err instanceof Error ? err.message : "Signing failed. Please try again.");
      }
    }
  }, [displayMode, displayName, area]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="mx-auto max-w-lg px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Voice of Gudalur</h1>
          <p className="mt-1 text-sm text-gray-600">Sign the petition</p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            {status === "RETRY_REQUIRED" && (
              <button onClick={handleSign} className="ml-2 font-medium text-red-800 underline">
                Retry
              </button>
            )}
          </div>
        )}

        {step === "auth" && <AuthStep onAuthenticated={handleAuthenticated} />}
        {step === "consent" && <ConsentStep onConsent={handleConsent} />}
        {step === "sign" && (
          <SignForm
            displayName={displayName}
            setDisplayName={setDisplayName}
            area={area}
            setArea={setArea}
            displayMode={displayMode}
            setDisplayMode={setDisplayMode}
            onSign={handleSign}
            status={status}
          />
        )}
        {step === "done" && (
          <DoneView
            publicReference={publicReference}
            validationToken={validationToken}
          />
        )}
      </div>
    </div>
  );
}
