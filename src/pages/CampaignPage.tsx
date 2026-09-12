/**
 * Static Public Campaign Page (Product A)
 * URL: https://voiceofgudalur.space/
 * 
 * Responsibilities:
 * - Explain the movement
 * - Show evidence and campaign material
 * - Show cached public signature count
 * - Show masked public signature details
 * - Show QR code and link to signing app
 * - Provide social sharing links
 * 
 * Must NOT: connect directly to DB, handle auth, store sensitive data,
 * load heavy signing functionality, expose API secrets, query DB on every view.
 */

import Link from "next/link";

export const metadata = {
  title: "Voice of Gudalur — Petition for Our Community",
  description: "Join the movement. Sign the petition for Gudalur.",
};

export default function CampaignPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gradient-to-b from-green-50 to-white py-16 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Voice of Gudalur
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            A community petition for the people of Gudalur. Every signature counts.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/sign" className="inline-flex items-center justify-center rounded-full bg-green-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-green-700">
              Sign the Petition
            </Link>
            <a href="#about" className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50">
              Learn More
            </a>
          </div>
        </div>
      </header>

      <section id="about" className="py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">About This Campaign</h2>
          <div className="space-y-4 text-gray-600">
            <p>Voice of Gudalur is a community-driven petition to address the concerns of our region.</p>
            <p>Our petition system ensures that each signature comes from a unique, verified individual.</p>
            <h3 className="mt-8 text-lg font-semibold text-gray-900">How It Works</h3>
            <ol className="list-inside list-decimal space-y-2">
              <li>Verify your identity using your phone number</li>
              <li>Read and agree to our privacy policy</li>
              <li>Sign the petition</li>
              <li>Share the validation link with one trusted witness</li>
              <li>Your signature is counted once validated</li>
            </ol>
          </div>
        </div>
      </section>

      <StatsSection />
      <CTASection />
      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="mx-auto max-w-3xl text-center text-sm text-gray-500">
          <p>Voice of Gudalur — Open Source Petition System</p>
          <p className="mt-2">No personal data is publicly visible.</p>
        </div>
      </footer>
    </div>
  );
}

function StatsSection() {
  return (
    <section className="bg-gray-50 py-16 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-8 text-2xl font-bold text-gray-900">Campaign Progress</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <StatCard label="Total Signatures" value="—" hint="Updates every 60s" id="stat-total" />
          <StatCard label="Community Validated" value="—" hint="Verified by witnesses" id="stat-validated" />
          <StatCard label="Petition Goal" value="TBA" hint="To be announced" id="stat-goal" />
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-2xl font-bold text-gray-900">Ready to Sign?</h2>
        <p className="mb-8 text-gray-600">Your voice matters. Sign securely in under 2 minutes.</p>
        <Link href="/sign" className="inline-flex items-center justify-center rounded-full bg-green-600 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:bg-green-700">
          Sign Now — Secure &amp; Verified
        </Link>
        <div className="mt-8 flex items-center justify-center gap-4">
          <a href="https://wa.me/?text=Join%20the%20Voice%20of%20Gudalur%20petition:%20https://voiceofgudalur.space/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-600">
            Share on WhatsApp
          </a>
          <a href="https://t.me/share/url?url=https://voiceofgudalur.space/&text=Join%20the%20Voice%20of%20Gudalur%20petition" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-600">
            Share on Telegram
          </a>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, hint, id }: { label: string; value: string; hint: string; id: string }) {
  return (
    <div id={id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{hint}</p>
    </div>
  );
}
