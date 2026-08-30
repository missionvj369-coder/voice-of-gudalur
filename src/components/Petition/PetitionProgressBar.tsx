import React from 'react';

interface PetitionProgressBarProps {
  /** Current real signature count (only genuine, DB-confirmed records). */
  current: number;
  /** Signature target needed for official submission. */
  target?: number;
  /** Optional highlight/label styling (light or dark). */
  tone?: 'light' | 'dark';
}

/**
 * Reusable movement progress bar — shows how many real signatures are needed
 * before the demand is formally submitted to the District Administration.
 */
export const PetitionProgressBar: React.FC<PetitionProgressBarProps> = ({
  current,
  target = 1000,
  tone = 'light'
}) => {
  const safeCurrent = Math.max(0, current);
  const safeTarget = Math.max(1, target);
  const pct = Math.min(100, Math.round((safeCurrent / safeTarget) * 100));

  const text = `${safeCurrent.toLocaleString()} of ${safeTarget.toLocaleString()} signatures needed to submit to District Collector`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[11px] font-bold ${tone === 'dark' ? 'text-emerald-200' : 'text-emerald-800'}`}>
          {pct}% to official submission
        </span>
        <span className={`text-[11px] font-mono font-bold ${tone === 'dark' ? 'text-white' : 'text-slate-700'}`}>
          {safeCurrent.toLocaleString()} / {safeTarget.toLocaleString()}
        </span>
      </div>
      <div className={`w-full h-2.5 rounded-full overflow-hidden ${tone === 'dark' ? 'bg-emerald-900' : 'bg-slate-100'}`}>
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[11px] leading-snug ${tone === 'dark' ? 'text-slate-300' : 'text-slate-500'}`}>
        {text}
      </p>
    </div>
  );
};

export default PetitionProgressBar;