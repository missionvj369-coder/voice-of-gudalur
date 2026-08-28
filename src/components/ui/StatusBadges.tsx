import React from 'react';
import { cn } from '../../lib/utils';
import type { VerificationStatus } from '../../lib/api';

/** Visually-obvious verification badges — the platform's core trust signal. */
export const STATUS_STYLES: Record<VerificationStatus, { label: string; cls: string }> = {
  REPORTED:     { label: 'COMMUNITY REPORT', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  UNDER_REVIEW: { label: 'COMMUNITY REPORT — UNDER REVIEW', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  VERIFIED:     { label: 'VERIFIED', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  OFFICIAL:     { label: 'OFFICIAL RECORD', cls: 'bg-sky-50 text-sky-800 border-sky-300' },
  RESOLVED:     { label: 'RESOLVED', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  REJECTED:     { label: 'REJECTED', cls: 'bg-rose-50 text-rose-700 border-rose-300' },
  UNVERIFIED_REPORT: { label: 'UNVERIFIED REPORT', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
};

export const VerificationBadge: React.FC<{ status: VerificationStatus; className?: string }> = ({ status, className }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.REPORTED;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase',
        s.cls,
        className
      )}
    >
      {s.label}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: string; className?: string }> = ({ severity, className }) => {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-600 text-white border-rose-700',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-amber-50 text-amber-800 border-amber-300',
    LOW: 'bg-slate-100 text-slate-600 border-slate-300',
    INFO: 'bg-sky-50 text-sky-700 border-sky-300',
  };
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase', styles[severity] || styles.LOW, className)}>
      {severity}
    </span>
  );
};
