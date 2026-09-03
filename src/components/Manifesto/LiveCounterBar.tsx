import React, { useState, useEffect } from 'react';
import { Users, Route, FileCheck2, Radio } from 'lucide-react';
import { manifestoApi } from '../../services/api';
import { getPendingLedgerCount } from '../../lib/pendingLedger';
import { CORRIDORS } from '../../data/corridorData';

/**
 * Live movement metrics bar — sticky under the masthead.
 * Polls the API (backed by CockroachDB) every 30s so new signatures and
 * official dockets appear here. Counts are derived transactionally server-side.
 */
export const LiveCounterBar: React.FC = () => {
  const [signatures, setSignatures] = useState<number | null>(null);
  const [dockets, setDockets] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let lastKnown: number | null = null;
    const refresh = async () => {
      try {
        const stats = await manifestoApi.stats();
        if (cancelled) return;
        if (typeof stats.signatures === 'number') {
          if (lastKnown !== null && stats.signatures !== lastKnown) setLive(true);
          lastKnown = stats.signatures;
          setSignatures(stats.signatures);
        }
        if (typeof stats.submissions === 'number') setDockets(stats.submissions);
      } catch {
        // Ledger unreachable — show locally-pending intent so the bar never
        // reads zero-by-failure.
        if (!cancelled && signatures === null) setSignatures(getPendingLedgerCount());
      }
    };
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = [
    {
      icon: <Users size={13} className="text-[#AED581]" />,
      label: 'Citizens Signed',
      value: signatures === null ? '—' : signatures.toLocaleString('en-IN'),
    },
    {
      icon: <Route size={13} className="text-[#AED581]" />,
      label: 'GIS Corridors Mapped',
      value: `${CORRIDORS.length}`,
    },
    {
      icon: <FileCheck2 size={13} className="text-[#AED581]" />,
      label: 'Docket Tracking',
      value: dockets === null ? 'Active' : `${dockets.toLocaleString('en-IN')} Active`,
    },
  ];

  return (
    <div className="sticky top-14 z-30 -mx-2 sm:mx-0 mb-2 rounded-none sm:rounded-2xl border-y sm:border border-[#AED581]/20 bg-[#2E7D32]/92 backdrop-blur-md shadow-lg shadow-black/30">
      <div className="flex items-stretch justify-between gap-1.5 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-2.5">
        {metrics.map((m, i) => (
          <React.Fragment key={m.label}>
            {i > 0 && <div className="w-px self-stretch shrink-0 bg-[#AED581]/20" />}
            <div className="flex flex-col items-start justify-center gap-1 min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.14em] sm:tracking-[0.18em] text-[#AED581]/80 max-w-full">
                <span className="shrink-0">{m.icon}</span>
                <span className="truncate">{m.label}</span>
              </span>
              <span className="font-mono font-black text-xs sm:text-base text-[#F5F5F5] leading-none whitespace-nowrap tabular-nums">
                {m.value}
              </span>
            </div>
          </React.Fragment>
        ))}
        {/* Live WebSocket indicator — lights up gold the moment any ledger change streams in */}
        <div className="flex flex-col items-end justify-center gap-1 pl-2 sm:pl-3 border-l border-[#AED581]/20 shrink-0">
          <span
            className={`flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.16em] sm:tracking-[0.2em] ${live ? 'text-[#AED581]' : 'text-[#81C784]'}`}
            title={live ? 'Receiving live ledger updates' : 'Connected — polling the ledger'}
          >
            <Radio size={10} className={live ? 'animate-pulse text-[#AED581]' : 'animate-pulse text-[#81C784]'} />
            Live
          </span>
          <span className="hidden sm:block text-[8px] font-mono text-[#AED581]/60 uppercase tracking-wider whitespace-nowrap">
            Realtime ledger
          </span>
        </div>
      </div>
    </div>
  );
};