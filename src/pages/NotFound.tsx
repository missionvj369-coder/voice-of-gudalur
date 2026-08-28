// ============================================================================
// NOT FOUND — 404
// ============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Section } from '../components/ui/Primitives';

const NotFound: React.FC = () => (
  <div>
    <PageHeader eyebrow="Not found" title="Page not found" subtitle="This page does not exist, or the link may have changed." back="/" />
    <Section title="Where to go" subtitle="">
      <div className="max-w-lg">
        <Link to="/" className="text-emerald-700 font-medium underline">Go to the homepage</Link>
        <p className="mt-4 text-sm text-slate-500">You can also use the navigation at the top of every page.</p>
      </div>
    </Section>
  </div>
);

export default NotFound;
