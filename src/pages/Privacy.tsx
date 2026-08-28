// ============================================================================
// PRIVACY — what we collect and why
// ============================================================================
import React from 'react';
import { PageHeader, Section } from '../components/ui/Primitives';

const Privacy: React.FC = () => (
  <div>
    <PageHeader eyebrow="Privacy" title="Privacy policy" subtitle="A short, honest statement — if something isn't here, we don't collect it." />
    <Section title="" subtitle="">
      <div className="prose prose-slate max-w-3xl">
        <p>We built Voice of Gudalur because Gudalur deserves a safe, evidence-based safety system. We keep that promise by collecting as little as possible and protecting what we do collect.</p>

        <h3>What we collect</h3>
        <ul>
          <li><strong>Reports you submit:</strong> incident type, species, locality, landmark, date/time, direction, description, and an optional photo/video uploaded to a private storage bucket. We do not ask for your name unless you give it.</li>
          <li><strong>Your mobile number (optional):</strong> only used to send safety alerts and to link you to your Gudalur Resident ID. It is never displayed publicly and is never shared with third parties for marketing.</li>
          <li><strong>Gudalur Resident ID:</strong> a unique community ID (for example GD-2024-123456) that links you to your locality for alert targeting. It is not a government identity document.</li>
        </ul>

        <h3>What we never collect</h3>
        <ul>
          <li><strong>Exact wildlife coordinates are restricted:</strong> precise animal locations are only visible to authorised responders/admins, never to the public map.</li>
          <li>We do not track your browsing. We do not use advertising pixels. We do not sell data.</li>
        </ul>

        <h3>Why we hold data</h3>
        <ul>
          <li>To verify reports, maintain the Evidence Room, and send you only the alerts you subscribed to.</li>
          <li>To protect residents, responders and wildlife from misinformation.</li>
        </ul>

        <h3>Your rights</h3>
        <p>You may ask for your data to be corrected or deleted at any time by contacting us through the <a href="/government-action">Government Action Tracker</a> or the Resident ID flow. Anonymised incident statistics may be retained for legal and research purposes once personal identifiers are removed.</p>

        <h3>Contact</h3>
        <p>All privacy questions go through the same accountable channel as everything else on this platform: use the Government Action Tracker and mark the topic "Privacy".</p>
      </div>
    </Section>
  </div>
);

export default Privacy;
