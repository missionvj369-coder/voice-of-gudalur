// ============================================================================
// TERMS OF USE
// ============================================================================
import React from 'react';
import { PageHeader, Section } from '../components/ui/Primitives';

const Terms: React.FC = () => (
  <div>
    <PageHeader eyebrow="Terms" title="Terms of use" subtitle="This platform serves Gudalur. These terms keep it safe, legal and truthful." />
    <Section title="" subtitle="">
      <div className="prose prose-slate max-w-3xl">
        <h3>Use responsibly</h3>
        <p>You may report wildlife incidents, subscribe to alerts, submit lawful questions to authorities, and contribute documents to the Evidence Room. You may not use this platform to:</p>
        <ul>
          <li>Share precise live animal coordinates in a way that enables harm to wildlife.</li>
          <li>Make unverified accusations against government officials.</li>
          <li>Post rumours, copyrighted full articles, or AI-generated "facts".</li>
          <li>Encourage killing or harassing wildlife.</li>
        </ul>

        <h3>Your reports</h3>
        <p>Every report is treated as a community submission. It is stored as <strong>REPORTED</strong> and reviewed before it is ever shown as <strong>VERIFIED</strong>. Do not report anything you did not personally observe, and never approach wildlife to take photographs.</p>

        <h3>Lawful purpose</h3>
        <p>This is a citizen accountability platform operating within the Wildlife (Protection) Act, the Forest Rights Act, and the Constitution. Representations you generate are yours to send. We never send email or messages on your behalf.</p>

        <h3>No guarantees</h3>
        <p>We provide the platform in good faith, but we make no guarantees about the accuracy of contributed data, the response of any authority, or the availability of any feature. Where data is not yet available, we say so rather than guess.</p>

        <h3>Changes</h3>
        <p>We may update these terms. Material changes will be announced through the platform. Continued use after notice constitutes acceptance.</p>
      </div>
    </Section>
  </div>
);

export default Terms;
