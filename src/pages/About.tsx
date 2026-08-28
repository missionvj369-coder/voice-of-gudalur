// ============================================================================
// ABOUT — mission & identity
// ============================================================================
import React from 'react';
import { ShieldCheck, Eye, Database, Users } from 'lucide-react';
import { PageHeader, Section, Card } from '../components/ui/Primitives';

const About: React.FC = () => (
  <div>
    <PageHeader
      eyebrow="Identity"
      title="Voice of Gudalur"
      subtitle="Protect People. Protect Wildlife. Protect Gudalur."
    />

    <Section eyebrow="Mission" title="One Gudalur" subtitle="Human life must be protected. Wildlife must be protected. Gudalur needs a permanent, science-based human–wildlife safety system — and the law, rightly applied, supports this.">
      <div className="grid gap-6 md:grid-cols-3 max-w-4xl">
        <Card>
          <div className="flex flex-col items-center text-center">
            <ShieldCheck size={32} className="text-emerald-700 mb-2" />
            <h3 className="font-bold text-slate-900">Human safety</h3>
            <p className="mt-1 text-sm text-slate-600">Document what is observed, warn neighbours, and demand lawful protection.</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center text-center">
            <ShieldCheck size={32} className="text-emerald-700 mb-2" />
            <h3 className="font-bold text-slate-900">Wildlife protection</h3>
            <p className="mt-1 text-sm text-slate-600">We never encourage harm. We map corridors and support lawful conservation.</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center text-center">
            <Eye size={32} className="text-emerald-700 mb-2" />
            <h3 className="font-bold text-slate-900">Evidence</h3>
            <p className="mt-1 text-sm text-slate-600">Everything here is sourced, dated, and open to correction.</p>
          </div>
        </Card>
      </div>
    </Section>

    <Section eyebrow="What this is" title="A citizen platform, not a government service" subtitle="Voice of Gudalur is a volunteer-run civic intelligence platform for Gudalur, Nilgiris. It is not a government website, not an emergency service, and not a political organisation.">
      <div className="max-w-3xl space-y-4 text-slate-700 leading-relaxed">
        <p>We are residents building tools that Gudalur needs: a place to report wildlife incidents with a transparent verification workflow, a document room for official evidence, and a way to send professional representations to the authorities who hold responsibility.</p>
        <p>Every statistic on this platform is a real count from the database or is clearly labelled "Data not yet available". We do not invent numbers, fabricate documents, or present rumours as facts.</p>
        <p>The Gudalur Resident ID is a community platform ID — it is not a government identity document, and it stores no data beyond what you explicitly add.</p>
      </div>
    </Section>

    <Section eyebrow="Principles" title="Our principles" subtitle="The standards every page is measured against.">
      <ul className="max-w-2xl space-y-3 text-slate-700">
        <li><strong>Human life first — never wildlife harm.</strong> Every safety recommendation keeps people out of danger without encouraging anyone to hurt an animal.</li>
        <li><strong>Evidence over assertion.</strong> Claims point to documents; unverified things stay out of the public view until checked.</li>
        <li><strong>Legal &amp; lawful.</strong> We act within the Wildlife (Protection) Act, the Forest Rights Act, and the Constitution — never outside them.</li>
        <li><strong>Privacy by design.</strong> Reporter phone numbers and precise animal coordinates are never exposed publicly.</li>
        <li><strong>Calm over noise.</strong> No fake counters, no AI-generated filler, no decorative overload — just usable information when it matters.</li>
      </ul>
    </Section>
  </div>
);

export default About;
