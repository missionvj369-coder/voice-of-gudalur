"use client";

import { useState } from "react";

export function DoneView({
  publicReference,
  validationToken,
}: {
  publicReference: string | null;
  validationToken: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const validationUrl = validationToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/validate/${validationToken}`
    : "";

  const handleCopyLink = async () => {
    if (validationUrl) {
      await navigator.clipboard.writeText(validationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = () => {
    const message = `I just signed the Voice of Gudalur petition! Please validate my signature: ${validationUrl}`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5">
      <div className="mb-4 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Signature Recorded!</h2>
        {publicReference && (
          <p className="mt-1 text-sm text-gray-600">Reference: {publicReference}</p>
        )}
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 p-4">
        <p className="mb-2 text-sm font-medium text-gray-700">
          Share this link for validation:
        </p>
        <p className="break-all text-xs text-gray-600">{validationUrl}</p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleCopyLink}
          className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleWhatsAppShare}
          className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          Share on WhatsApp
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-gray-500">
        Your signature needs one witness validation to be fully counted.
      </p>
    </div>
  );
}
