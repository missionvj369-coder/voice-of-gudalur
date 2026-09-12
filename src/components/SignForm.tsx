"use client";

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

export function SignForm({
  displayName,
  setDisplayName,
  area,
  setArea,
  displayMode,
  setDisplayMode,
  onSign,
  status,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  area: string;
  setArea: (v: string) => void;
  displayMode: "anonymous" | "name_and_area";
  setDisplayMode: (v: "anonymous" | "name_and_area") => void;
  onSign: () => void;
  status: SignatureStatus;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-900/5">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Sign the Petition
      </h2>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Display preference
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setDisplayMode("anonymous")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              displayMode === "anonymous"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            Anonymous
          </button>
          <button
            onClick={() => setDisplayMode("name_and_area")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              displayMode === "name_and_area"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-gray-200 text-gray-600"
            }`}
          >
            Show name & area
          </button>
        </div>
      </div>

      {displayMode === "name_and_area" && (
        <div className="mb-4 space-y-3">
          <input
            type="text"
            placeholder="Your name (will be partially masked)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
          <input
            type="text"
            placeholder="Area (e.g., Kasimvayal)"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            maxLength={100}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      )}

      <button
        onClick={onSign}
        disabled={status === "SUBMITTING"}
        className="w-full rounded-lg bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {status === "SUBMITTING" ? "Signing..." : "Sign Petition"}
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">
        By signing, you confirm you have read and agree to the privacy policy.
      </p>
    </div>
  );
}
