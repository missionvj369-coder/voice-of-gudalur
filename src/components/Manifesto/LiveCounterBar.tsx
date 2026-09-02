import React, { useState, useEffect } from 'react';
import { Users, Route, FileCheck2, Radio } from 'lucide-react';
import { db, isSupabaseConfigured, getPendingLedgerCount, subscribeToManifestoStats } from '../../lib/supabase';
import { CORRIDORS } from '../../data/corridorData';

/**
 * Live movement metrics bar — sticky under the masthead.
 * Pulls real-time counts from the Supabase public ledger over a zero-latency
 * WebSocket channel (subscribeToManifestoStats) so every new signature or
 * official docket recorded anywhere in the world updates this bar instantly.
 */
export const LiveCounterBar: React.FC = () => {
  const [signatures, setSignatures] = useState<number | null>(null);
  const [dockets, setDockets] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Ledger offline — show locally-pending intent so the bar never reads zero-by-failure.
      setSignatures(getPendingLedgerCount());
      setDockets(null);
      return;
    }
    let cancelled = false;
    const refresh = () => {
      db.getManifestoSignatureCount().then(({ count }) => {
        if (!cancelled && typeof count === 'number') setSignatures(count);
      });
      db.getManifestoSubmissionCount().then(({ count }) => {
        if (!cancelled && typeof count === 'number') setDockets(count);
      });
    };
    refresh();
    // Zero-latency updates: any signature / docket insert anywhere fires this.
    const unsubscribe = subscribeToManifestoStats(() => {
      setLive(true);
      refresh();
    });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const metrics = [
    {
      icon: <Users size={13} className="text-[#D4AF37]" />,
      label: 'Citizens Signed',
      value: signatures === null ? '—' : signatures.toLocaleString('en-IN'),
    },
    {
      icon: <Route size={13} className="text-[#E67E22]" />,
      label: 'GIS Corridors Mapped',
      value: `${CORRIDORS.length}`,
    },
    {
      icon: <FileCheck2 size={13} className="text-[#D4AF37]" />,
      label: 'Docket Tracking',
      value: dockets === null ? 'Active' : `${dockets.toLocaleString('en-IN')} Active`,
    },
  ];

  return (
    <div className="sticky top-14 z-30 -mx-2 sm:mx-0 mb-2 rounded-none sm:rounded-2xl border-y sm:border border-white/[0.08] bg-[#12161A]/92 backdrop-blur-md shadow-lg shadow-black/30">
      <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5">
        {metrics.map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <div className="w-px self-stretch shrink-0 bg-white/[0.07]" />}
            <div className="flex flex-col items-start justify-center gap-1 min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] text-stone-500 max-w-full">
                <span className="shrink-0">{m.icon}</span>
                <span className="truncate">{m.label}</span>
              </span>
              <span className="font-mono font-black text-xs sm:text-base text-[#F4F1EA] leading-none whitespace-nowrap tabular-nums">
                {m.value}
              </span>
            </div>
          </React.Fragment>
        ))}
        {/* Live WebSocket indicator — lights up gold the moment any ledger change streams in */}
        <div className="flex flex-col items-end justify-center gap-1 pl-2 sm:pl-3 border-l border-white/[0.07] shrink-0">
          <span
            className={`flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] ${live ? 'text-[#D4AF37]' : 'text-emerald-400'}`}
            title={live ? 'Receiving live ledger updates over WebSocket' : 'Connected — listening for ledger updates'}
          >
            <Radio size={10} className={live ? 'animate-pulse text-[#D4AF37]' : 'animate-pulse text-emerald-400'} />
            Live
          </span>
          <span className="hidden sm:block text-[8px] font-mono text-stone-600 uppercase tracking-wider whitespace-nowrap">
            Realtime ledger
          </span>
        </div>
      </div>
    </div>
  );
};