import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BellRing, CheckCircle2, Landmark, Navigation,
  PawPrint, ShieldAlert, Users,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/**
 * ANIMAL SIGHTINGS — the community sighting feed is wired for launch.
 * The platform is READY to integrate with Government wildlife systems to
 * provide a safety early-announcement system: red-alert locations, the
 * user's location with nearest sighting distance, and public alert delivery.
 */

const INTEGRATION_PARTNERS = [
  'Tamil Nadu Forest Department — Gudalur Division',
  'Mudumalai Tiger Reserve — Rapid Response Team',
  'Nilgiris District Administration',
  'TN Police & Fire Control Rooms',
];

const FEATURES = [
  {
    icon: ShieldAlert,
    tone: 'bg-gradient-to-br from-red-500 to-rose-600',
    title: 'Red Alert Locations',
    body: 'Live red-alert zones where recent elephant, tiger or leopard movement is verified — mapped across Gudalur\u2019s 11 corridors, forest-fringe villages and night-closure stretches.',
  },
  {
    icon: Navigation,
    tone: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    title: 'Your Location & Nearest Sighting',
    body: 'Your GPS location is compared with every verified sighting, so you always know the nearest one — e.g. \u201cNearest elephant sighting: 2.4 km, O\u2019Valley fringe\u201D — with safer route hints.',
  },
  {
    icon: BellRing,
    tone: 'bg-gradient-to-br from-amber-500 to-orange-600',
    title: 'Early Warning Alert System',
    body: 'Automatic early announcements: red alerts are pushed instantly as app notifications and through the SMS emergency bridge — built to reach you even with no internet on ghat roads.',
  },
  {
    icon: Users,
    tone: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    title: 'Community Sightings, Verified',
    body: 'Residents report sightings in one tap. Forest officials verify before any public alert goes out — privacy-first: only the area is shared, never your personal details.',
  },
];

const ALERT_CHAIN = [
  'Sighting reported',
  'Forest Dept verifies',
  'Red alert published',
  'Residents warned',
];

export const SightingsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
          <PawPrint size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">{t('sght.title')}</h1>
        <p className="text-sm text-emerald-50/90 leading-relaxed max-w-xl mx-auto">{t('sght.sub')}</p>
      </div>

      {/* Government integration banner */}
      <div className="rounded-3xl bg-white border border-emerald-200 shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center gap-3">
          <Landmark size={26} className="text-white shrink-0" />
          <div>
            <p className="font-black text-white leading-tight">Government Integration Ready</p>
            <p className="text-[11px] text-emerald-100">Built to plug into official wildlife alert systems on day one.</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 border border-white/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
            <CheckCircle2 size={11} /> Ready
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Voice of Gudalur is <strong>ready to integrate with Government of Tamil Nadu wildlife
            systems</strong>. Once connected, verified animal-sighting data flows straight from official
            channels into this platform — and every resident gets a <strong>safety early-announcement
            system</strong> that works even on weak networks.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INTEGRATION_PARTNERS.map((p) => (
              <div key={p} className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-3xl bg-white border border-slate-200 p-5 space-y-2.5 shadow-sm">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow ${f.tone}`}>
              <f.icon size={20} className="text-white" />
            </div>
            <h3 className="text-sm font-black text-slate-900">{f.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>

      {/* How the alert chain works */}
      <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 mb-3 text-center">How the alert chain works</h3>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-bold">
          {ALERT_CHAIN.map((step, i) => (
            <React.Fragment key={step}>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800">{step}</span>
              {i < ALERT_CHAIN.length - 1 && <ArrowRight size={12} className="text-slate-400" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg hover:opacity-95 transition"
        >
          {t('sght.btn')} <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
};

export default SightingsPage;