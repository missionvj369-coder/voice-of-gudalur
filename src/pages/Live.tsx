// @ts-nocheck — legacy feature file (removed from focus app); kept for reference only.
import React, { useState, useEffect } from 'react';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Compass, 
  Moon, 
  AlertTriangle, 
  Radio, 
  ShieldCheck, 
  PhoneCall, 
  Car, 
  Activity,
  Calendar,
  Layers,
  MessageCircle,
  Share2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { WeatherSnapshot, UrgentAlert } from '../types';
import { fetchLiveWeather } from '../services/geminiService';
import { INITIAL_URGENT_ALERTS } from '../data/gudalurMasterData';
import { generateWhatsAppAlertText, shareToWhatsApp, shareViaWebShare } from '../utils/whatsappShare';
import toast from 'react-hot-toast';

export const Live: React.FC = () => {
  const { lang, t } = useLanguage();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [alerts, setAlerts] = useState<UrgentAlert[]>(INITIAL_URGENT_ALERTS);
  const [isNightBanActive, setIsNightBanActive] = useState(false);

  useEffect(() => {
    fetchLiveWeather().then(setWeather);
    const interval = setInterval(() => {
      fetchLiveWeather().then(setWeather);
    }, 1000 * 60 * 5);

    const checkNightBan = () => {
      const now = new Date();
      const hours = now.getHours();
      setIsNightBanActive(hours >= 21 || hours < 6);
    };
    checkNightBan();
    const banInterval = setInterval(checkNightBan, 1000 * 60);

    return () => {
      clearInterval(interval);
      clearInterval(banInterval);
    };
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>GUDALUR LIVE PULSE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          {t('live.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          {t('live.subtitle')}
        </p>
      </div>

      {/* 1. Environmental Telemetry Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        
        {/* Temperature Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t('live.weather_temp')}</span>
            <CloudSun size={20} className="text-amber-500" />
          </div>
          <p className="text-3xl sm:text-4xl font-mono font-bold text-slate-900">
            {weather ? `${weather.temp}°C` : '22.0°C'}
          </p>
          <p className="text-[11px] text-slate-500">Nilgiris Western Slopes (1,000m)</p>
        </div>

        {/* Air Quality AQI Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t('live.weather_air')}</span>
            <Wind size={20} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl sm:text-4xl font-mono font-bold text-emerald-600">
              {weather?.aqi || 24}
            </p>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Pristine
            </span>
          </div>
          <p className="text-[11px] text-slate-500">PM2.5 Mountain Standard</p>
        </div>

        {/* Rain Probability */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t('live.weather_rain')}</span>
            <Droplets size={20} className="text-cyan-500" />
          </div>
          <p className="text-3xl sm:text-4xl font-mono font-bold text-cyan-700">
            {weather ? `${weather.rainProbability}%` : '20%'}
          </p>
          <p className="text-[11px] text-slate-500">Humidity: {weather?.humidity || 78}%</p>
        </div>

        {/* Wind Speed */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">{t('live.weather_wind')}</span>
            <Compass size={20} className="text-indigo-500" />
          </div>
          <p className="text-3xl sm:text-4xl font-mono font-bold text-indigo-700">
            {weather ? `${weather.windSpeed} km/h` : '8.2 km/h'}
          </p>
          <p className="text-[11px] text-slate-500">Valley Breeze Direction: SW</p>
        </div>

      </div>

      {/* 2. Critical Mobility & Ghat Regulation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Mudumalai Tiger Reserve Night Traffic Regulation */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700 shadow-md space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                <Moon size={22} />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Mudumalai & Bandipur Night Rule</h3>
                <p className="text-xs text-slate-400">NH 181 / NH 766 Forest Highways</p>
              </div>
            </div>
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
              isNightBanActive 
                ? 'bg-rose-950 text-rose-300 border-rose-800 animate-pulse' 
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              {isNightBanActive ? 'CLOSED (9PM - 6AM)' : 'OPEN FOR TRAVEL'}
            </span>
          </div>

          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs space-y-2 text-slate-300 leading-relaxed">
            <p className="font-bold text-amber-300">Mandatory Highway Closure Timings:</p>
            <p>• <strong>Thorapalli Checkpost to Bandipur:</strong> Vehicles not permitted between <strong>9:00 PM and 6:00 AM</strong> to ensure undisturbed animal migration.</p>
            <p>• Emergency ambulances and state-approved medical evacuations are exempted upon physical verification at Thorapalli Forest Gate.</p>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-700/60">
            <span>Thorapalli Checkpost Desk:</span>
            <span className="font-mono text-emerald-400 font-bold">04262-261262</span>
          </div>
        </div>

        {/* Ghat Highway Road Conditions */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-100 text-cyan-800">
              <Car size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Ghat Roads & Safety Conditions</h3>
              <p className="text-xs text-slate-500">Ooty Ghat, Nadugani & Kerala Interstate Links</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Gudalur - Naduvattam - Ooty Road</p>
                <p className="text-slate-500">Dense fog warning past 2nd Mile during evening</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                FOGGY
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Gudalur - Nadugani - Nilambur Road</p>
                <p className="text-slate-500">Clear Ghat descent, smooth surface condition</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                CLEAR
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">Gudalur - Devala - Pandalur Road</p>
                <p className="text-slate-500">Normal daytime traffic flow</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                NORMAL
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Verified Emergency Alerts Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-slate-900">
            {t('nav.alerts')} {alerts.length > 0 ? `(${alerts.length})` : ''}
          </h2>
          <span className="text-xs text-slate-500">Verified by Forest Dept & Traffic Police</span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {lang === 'ta' ? 'தற்போது அவசர அபாய எச்சரிக்கைகள் எதுவும் இல்லை' : 'All Sectors Normal — No Active Emergency Alerts'}
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {lang === 'ta'
                    ? 'கூடலூர் மற்றும் பந்தலூர் வட்டாரங்களில் சாலைத் தடைகளோ அல்லது நேரடி ஆபத்து எச்சரிக்கைகளோ இல்லை.'
                    : 'Gudalur and Pandalur sectors report normal road conditions with regular forest patrol monitoring.'}
                </p>
              </div>
            </div>
            <div className="text-xs font-bold text-emerald-900 bg-white/80 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
              {lang === 'ta' ? 'அனைத்தும் சீராக உள்ளது' : 'All Clear Status'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="p-5 rounded-3xl bg-white border border-amber-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      {alert.severity} • {alert.category}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h4 className="font-bold text-base text-slate-900 leading-snug">
                  {lang === 'ta' ? alert.titleTa : alert.title}
                </h4>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {lang === 'ta' ? alert.descriptionTa : alert.description}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Source: <strong className="text-slate-800">{alert.source}</strong></span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {alert.verificationStatus}
                    </span>
                    <button
                      onClick={() => {
                        const text = generateWhatsAppAlertText({
                          title: alert.title,
                          titleTa: alert.titleTa,
                          category: alert.category,
                          severity: alert.severity,
                          location: alert.localityName || 'Gudalur',
                          description: alert.description,
                          source: alert.source,
                          verificationStatus: alert.verificationStatus,
                          timestamp: alert.createdAt
                        });
                        shareToWhatsApp(text);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-xs flex items-center gap-1 transition"
                      title="Broadcast alert to WhatsApp"
                    >
                      <MessageCircle size={13} />
                      <span>Broadcast</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
export default Live;
