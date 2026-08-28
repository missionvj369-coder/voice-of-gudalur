// ============================================================================
// SHARED UI PRIMITIVES — calm, serious, accessible
// ============================================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

export const Section: React.FC<{
  eyebrow?: string; title: string; subtitle?: string;
  children: React.ReactNode; id?: string; className?: string;
}> = ({ eyebrow, title, subtitle, children, id, className }) => (
  <section id={id} className={cn('mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16', className)}>
    <header className="mb-8 max-w-3xl">
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-slate-600">{subtitle}</p>}
    </header>
    {children}
  </section>
);

export const PageHeader: React.FC<{
  eyebrow?: string; title: string; subtitle?: string; children?: React.ReactNode;
  back?: string;
}> = ({ eyebrow, title, subtitle, children, back }) => (
  <header className="border-b border-slate-200 bg-white">
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-12">
      {back && (
        <Link to={back} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          ← {back}
        </Link>
      )}
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
      {subtitle && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{subtitle}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  </header>
);

export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-xs', className)}>{children}</div>
);

export const Btn: React.FC<{
  href?: string; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost';
  className?: string; children: React.ReactNode; type?: 'button' | 'submit'; disabled?: boolean;
  external?: boolean; ariaLabel?: string;
}> = ({ href, onClick, variant = 'primary', className, children, type = 'button', disabled, external, ariaLabel }) => {
  const styles = {
    primary: 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-emerald-700 shadow-sm',
    secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
    ghost: 'text-emerald-800 hover:bg-emerald-50',
  }[variant];
  const cls = cn(
    'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50',
    styles, className
  );
  if (href) {
    return (
      <a href={href} className={cls} aria-label={ariaLabel} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} aria-label={ariaLabel}>
      {children}
    </button>
  );
};

/** Honest empty state — used everywhere data is not yet available. */
export const DataUnavailable: React.FC<{ what: string; className?: string }> = ({ what, className }) => (
  <div className={cn('rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center', className)}>
    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Data not yet available</p>
    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
      {what} This platform publishes only verified records — numbers are never estimated or invented.
    </p>
  </div>
);

export const Loading: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-3 py-16 text-sm font-medium text-slate-500" role="status" aria-live="polite">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" aria-hidden="true" />
    {label}
  </div>
);

export const ErrorNote: React.FC<{ message?: string }> = ({ message }) => (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
    {message || 'This information could not be loaded. It will be restored shortly — nothing is hidden.'}
  </div>
);
