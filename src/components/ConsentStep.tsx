"use client";

export function ConsentStep({ onConsent }: { onConsent: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Privacy & Consent
      </h2>
      <div className="mb-6 space-y-3 text-sm text-gray-600">
        <p>By signing, you agree to the following:</p>
        <ul className="list-inside list-disc space-y-2">
          <li>Your identity is verified through a trusted provider.</li>
          <li>One verified identity = one signature. No duplicates.</li>
          <li>Your phone number is never publicly visible.</li>
          <li>You may choose to display your name publicly or remain anonymous.</li>
          <li>Your data is stored securely and used only for this petition.</li>
        </ul>
        <p className="text-xs text-gray-500">
          Consent version 1.0 — You can revoke your signature at any time by contacting us.
        </p>
      </div>
      <button
        onClick={onConsent}
        className="w-full rounded-lg bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700"
      >
        I Agree — Continue to Sign
      </button>
    </div>
  );
}
