import React from 'react';
import { ShieldCheck, ShieldX, Lock, EyeOff, Hash, Server, Database, Users, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';

const APP_NAME = 'VOICE OF GUDALUR';

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="bg-white/95 rounded-2xl shadow-md border border-emerald-100 p-6 md:p-8 mb-6">
    <h2 className="text-xl md:text-2xl font-bold text-emerald-800 flex items-center gap-3 mb-4">
      <span className="text-emerald-600">{icon}</span>{title}
    </h2>
    <div className="text-gray-700 leading-relaxed space-y-3">{children}</div>
  </section>
);

const Claim: React.FC<{ ok: boolean; text: string }> = ({ ok, text }) => (
  <div className="flex items-start gap-3 py-2">
    {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" /> : <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />}
    <span>{text}</span>
  </div>
);

export const TrustPage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-amber-50 py-8 px-4">
    <div className="max-w-3xl mx-auto">
      <header className="text-center mb-8">
        <div className="inline-flex items-center gap-3 bg-emerald-700 text-white px-6 py-3 rounded-full mb-4">
          <ShieldCheck className="w-6 h-6" />
          <span className="text-lg font-bold tracking-wide">Trust &amp; Transparency</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-emerald-900 mb-2">{APP_NAME}</h1>
        <p className="text-gray-600 text-base md:text-lg">How we protect your privacy, prevent duplicates, and keep signature counts honest.</p>
      </header>

      <Section title="What We Verify" icon={<ShieldCheck className="w-6 h-6" />}>
        <p>When you sign our petition, we verify <strong>one thing</strong>: that the person signing has demonstrated control of the mobile number they entered.</p>
        <div className="pl-4 space-y-1">
          <Claim ok text="The signer confirmed control of a specific mobile number" />
          <Claim ok text="The same verified identity cannot sign the same petition twice" />
          <Claim ok={false} text="We do NOT claim one phone equals one human" />
          <Claim ok={false} text="We do NOT verify your name, address, or Aadhaar" />
        </div>
      </Section>
      <Section title="How Duplicates Are Prevented" icon={<Lock className="w-6 h-6" />}>
        <p>Each signature is protected by multiple independent safeguards:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Single-use verification.</strong> Each signing attempt creates a unique, one-time verification token. Once used, it cannot be reused.</li>
          <li><strong>Database uniqueness.</strong> Our database enforces a hard rule: one verified identity can produce exactly one signature per petition.</li>
          <li><strong>Concurrent safety.</strong> If two requests arrive at exactly the same instant, the database accepts exactly one.</li>
        </ol>
      </Section>

      <Section title="What Information We Store" icon={<Database className="w-6 h-6" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="border-b-2 border-emerald-200"><th className="text-left py-2 pr-3">Data</th><th className="text-left py-2 pr-3">Why</th><th className="text-left py-2">Who Can See</th></tr></thead>
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-2 pr-3 font-semibold">Your name</td><td className="py-2 pr-3">Display next to signature</td><td className="py-2">Public</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-3 font-semibold">Last 4 digits of mobile</td><td className="py-2 pr-3">Help you recognize your signature</td><td className="py-2">Public</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-3 font-semibold">Identity hash</td><td className="py-2 pr-3">Enforce one-signature-per-identity</td><td className="py-2 text-red-600 font-semibold">Never public</td></tr>
              <tr className="border-b border-gray-100"><td className="py-2 pr-3 font-semibold">Signature hash</td><td className="py-2 pr-3">Prove signature created by this server</td><td className="py-2 text-red-600 font-semibold">Never public</td></tr>
              <tr><td className="py-2 pr-3 font-semibold">Timestamp</td><td className="py-2 pr-3">When signature was created</td><td className="py-2">Public</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What We Do NOT Store" icon={<EyeOff className="w-6 h-6" />}>
        <div className="pl-4 space-y-2">
          <Claim ok text="Your full mobile number — never saved" />
          <Claim ok text="Your email address — not collected" />
          <Claim ok text="Your Aadhaar or any national ID — explicitly excluded" />
          <Claim ok text="Your IP address — not stored" />
        </div>
      </Section>

      <Section title="How Signature Counts Are Calculated" icon={<Hash className="w-6 h-6" />}>
        <p>The signature count is <strong>authoritative</strong> — maintained by the database itself via a trigger on every verified signature. Not an estimate, not a cache.</p>
      </Section>

      <Section title="Honest Limitations" icon={<AlertTriangle className="w-6 h-6" />}>
        <ul className="list-disc pl-6 space-y-2">
          <li>We cannot prove that one phone number equals one human person.</li>
          <li>We cannot prevent someone with multiple phones from signing multiple times.</li>
          <li>We rely on telecom operators for network verification — their limitations are our limitations.</li>
        </ul>
      </Section>

      <Section title="Technical Architecture" icon={<Server className="w-6 h-6" />}>
        <div className="bg-gray-900 text-green-400 rounded-xl p-4 font-mono text-xs overflow-x-auto">
          <pre>{`Signer -> Consent + Mobile\n  ->\nServer computes HMAC-SHA-256(secret, mobile)\n  ->\nProvider verification (CAMARA OR self-asserted)\n  ->\nSingle-use transaction: CREATED->VERIFIED->CONSUMED\n  ->\nAtomic: consume tx + INSERT (UNIQUE)\n  ->\nMaintained count incremented by DB trigger`}</pre>
        </div>
      </Section>

      <footer className="text-center text-sm text-gray-500 pt-4 pb-8">
        <p><strong>{APP_NAME}</strong> — Open Civic Signature Protocol v0.1</p>
      </footer>
    </div>
  </div>
);
export default TrustPage;

