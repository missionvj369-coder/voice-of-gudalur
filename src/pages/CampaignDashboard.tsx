/**
 * Voice of Gudalur — Public Campaign Dashboard (view-only).
 *
 * This is the single public frontpage. It is INTENTIONALLY read-only:
 *   • No sign-up / login / registration forms
 *   • No media gallery (posters, videos)
 *   • No action buttons (signing lives in the new app)
 *   • No menus — the Shell renders a clean header only
 *
 * Live data is pulled from /stats.json every 15 seconds. The frontend NEVER
 * queries CockroachDB directly — it only reads the authoritative JSON served
 * by the backend from the maintained petition_stats aggregate.
 */
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { GrievanceTicket } from '../components/GrievanceTicket';
import { CorridorMap } from '../components/CorridorMap';
import { useNavigate } from 'react-router-dom';
import { Users, Globe, BarChart3, Activity, ScrollText, PenLine } from 'lucide-react';

interface DashboardStats {
  total: number;
  validations: number;
  communityReach: number;
  external: number;
  gudalur: number;
  outsideGudalur: number;
  places: Array<{ place: string; count: number }>;
  updatedAt: string;
}

/** Format a number with Indian-thousands separators. */
function fmt(n: number): string {
  return n.toLocaleString('en-IN');
}

/** Animated counter that ticks toward a target value (ease-out). */
function AnimatedCount({ value }: { value: number }) {
  const start = React.useRef<number | null>(null);
  const [display, setDisplay] = React.useState(value);
  React.useEffect(() => {
    if (value === display) return;
    const begin = display;
    const delta = value - begin;
    const animate = (t: number) => {
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(begin + delta * eased));
      if (t < 1) requestAnimationFrame(() => animate(t + 1 / 25));
    };
    requestAnimationFrame(() => animate(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{fmt(display)}</>;
}

export const CampaignDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const POLL_INTERVAL = 15_000; // 15 seconds per spec

  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval>;

    // Snapshot-first via petitionApi.signStats() (CDN-cached /data/stats.json),
    // then live /stats.json endpoint. On Netlify the SPA fallback would
    // otherwise intercept /stats.json and return HTML instead of JSON.
    const fetchStats = async () => {
      try {
        // 1) Snapshot-first: instant, always available, no DB hit. The snapshot
        //    already carries the full metric set (gudalur/outside split, reach).
        const snap = await petitionApi.signStats();
        if (alive && snap) {
          const next: DashboardStats = {
            total: Number(snap.total) || 0,
            validations: Number(snap.validations ?? snap.total) || 0,
            communityReach: Number(snap.communityReach ?? snap.total) || 0,
            external: Number(snap.external ?? 0) || 0,
            gudalur: Number(snap.gudalur ?? 0) || 0,
            outsideGudalur: Number(snap.outsideGudalur ?? 0) || 0,
            places: snap.places ?? [],
            updatedAt: snap.updatedAt || new Date().toISOString(),
          };
          // Monotonic counters: never let a partial source regress a good value.
          setStats((prev) => (prev && next.total < prev.total ? prev : next));
          setLoading(false);
          return;
        }
      } catch { /* snapshot unavailable — fall through to live */ }

      // 2) Live endpoint (serverless function, needs DB).
      try {
        const res = await fetch('/stats.json', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') ?? '';
        if (!ct.startsWith('application/json')) throw new Error('Not JSON');
        const data: DashboardStats = await res.json();
        if (alive) {
          // Monotonic: a live response may lag the snapshot — never regress.
          setStats((prev) => (prev && Number(data?.total) < prev.total ? prev : data));
          setLoading(false);
        }
      } catch {
        setLoading(false); // never flash to zero on network blip — keep last stats
      }
    };

    void fetchStats();
    timer = setInterval(fetchStats, POLL_INTERVAL);
    return () => { alive = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = stats?.total ?? 0;
  const gudalur = stats?.gudalur ?? 0;
  const outsideGudalur = stats?.outsideGudalur ?? 0;
  const validations = stats?.validations ?? 0;
  const communityReach = stats?.communityReach ?? 0;
  const external = stats?.external ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* ── Hero: live signature counter ── */}
      <div className="text-center space-y-6">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#9CA3AF]">
            {t('home.live').replace('{n}', fmt(total))}
          </p>
          <h1 className="text-5xl font-black text-[#E8F5E9] tracking-tighter leading-tight mt-1">
            <AnimatedCount value={total} />
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            {loading ? t('home.loading') : `${stats?.updatedAt || ''}`}
          </p>
        </div>

        {/* Pulse dot + "live" indicator */}
        <div className="flex justify-center items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-black text-[#9CA3AF] uppercase tracking-widest">
            LIVE — updates every 15s
          </span>
        </div>
      </div>

       {/* ── Metrics grid: live counters ── */}
       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
         <MetricCard
           icon={<BarChart3 size={22} className="text-[#AED581]" />}
           label={t('home.title')}
           value={total}
           sub={t('home.live').replace('{n}', '')}
         />
         <MetricCard
           icon={<Activity size={22} className="text-[#6EE7B7]" />}
           label="Validations"
           value={validations}
           sub="Verified signatures"
         />
         <MetricCard
           icon={<Globe size={22} className="text-[#34D399]" />}
           label="Community Reach"
           value={communityReach}
           sub="Total reach including external"
         />
         <MetricCard
           icon={<Users size={22} className="text-[#A7F3D0]" />}
           label="Gudalur"
           value={gudalur}
           sub="From the Nilgiris"
         />
         <MetricCard
           icon={<Users size={22} className="text-[#6EE7B7]" />}
           label="Outside Gudalur"
           value={outsideGudalur}
           sub="Across India"
         />
         <MetricCard
           icon={<Globe size={22} className="text-[#D1FAE5]" />}
           label="External Supporters"
           value={external}
           sub="Global reach"
         />
       </div>

       {/* ── About the Movement (from media/about — brought to front page) ── */}
       <section className="space-y-6">
         <div className="text-center">
           <h2 className="text-2xl font-serif font-bold text-[#E8F5E9]">
             {t('abt.title')}
           </h2>
           <p className="text-sm text-[#9CA3AF] mt-1">{t('abt.sub')}</p>
         </div>

         {/* Why Voice of Gudalur exists */}
         <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 space-y-4">
           <h3 className="text-xl font-serif font-bold text-[#F5F5F5]">
             {t('abt.why_title')}
           </h3>
           <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_1')}</p>
           <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_2')}</p>
           <p className="text-sm text-[#E6F7E6] leading-relaxed">{t('abt.why_3')}</p>
         </div>

         {/* Closed-corridor GIS map */}
         <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
           <h3 className="text-xl font-serif font-bold text-[#F5F5F5]">
             {t('abt.corr_title')}
           </h3>
           <p className="text-sm text-[#E6F7E6]">{t('abt.corr_sub')}</p>
           <CorridorMap />
         </div>

         {/* Grievance ALREADY SUBMITTED */}
         <GrievanceTicket />

         {/* Privacy note */}
         <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
           <p className="text-xs text-[#AED581]/80 leading-relaxed max-w-xl mx-auto">
             {t('abt.privacy')}
           </p>
         </div>

         {/* Support this grievance — sign petition CTA */}
         <div className="rounded-3xl border border-amber-200/40 bg-gradient-to-br from-amber-50/90 to-orange-50/80 p-6 text-center space-y-4">
           <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
             <ScrollText size={26} className="text-white" />
           </div>
           <h3 className="text-lg font-black text-slate-800">{t('abt.support_title')}</h3>
           <p className="text-sm text-slate-700 max-w-md mx-auto">{t('abt.support_sub')}</p>
           <p className="text-xs text-slate-500">{t('abt.grv_btn')}</p>
           <button
             type="button"
             onClick={() => navigate('/sign-petition')}
             className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95 cursor-pointer"
           >
             <PenLine size={16} /> {t('abt.sign_cta')}
           </button>
           <p className="text-xs text-slate-400">{t('abt.grv_note')}</p>
         </div>
       </section>
     </div>
  );
};

export default CampaignDashboard;

/** ── Metric card sub-component ── */
function MetricCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="text-2xl font-black text-[#E8F5E9] tracking-tight">
        {fmt(value)}
      </div>
      <p className="text-xs text-[#6B7280] mt-1">{sub}</p>
    </div>
  );
}

