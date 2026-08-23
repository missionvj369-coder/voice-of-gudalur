import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, AlertTriangle, Moon, ShieldCheck, MapPin, Radio, Compass } from 'lucide-react';
import { WeatherSnapshot, UrgentAlert } from '../types';
import { fetchLiveWeather } from '../services/geminiService';
import { INITIAL_URGENT_ALERTS } from '../data/gudalurMasterData';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export const GudalurLiveBar: React.FC = () => {
  const { lang, t } = useLanguage();
  const { profile } = useAuth();
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [activeAlert] = useState<UrgentAlert | null>(INITIAL_URGENT_ALERTS.length > 0 ? INITIAL_URGENT_ALERTS[0] : null);
  const [isNightBanActive, setIsNightBanActive] = useState(false);

  useEffect(() => {
    fetchLiveWeather().then(setWeather);
    const interval = setInterval(() => {
      fetchLiveWeather().then(setWeather);
    }, 1000 * 60 * 10);

    // Check Mudumalai night travel closure (21:00 to 06:00 IST)
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
    <div id="gudalur-live-bar" className="w-full bg-slate-900 text-slate-100 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Weather & Environment */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-medium text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold tracking-wide">LIVE PULSE</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <CloudSun size={14} className="text-amber-400" />
            <span>{weather ? `${weather.temp}°C` : '22°C'}</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Western Plateau (1,000m)</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 hidden md:flex">
            <Wind size={14} className="text-cyan-400" />
            <span>AQI <strong className="text-emerald-400">{weather?.aqi || 24}</strong> (Clean Mountain Air)</span>
          </div>

          {profile && (
            <div className="hidden lg:flex items-center gap-1 text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-slate-700">
              <MapPin size={12} className="text-emerald-400" />
              <span>{profile.localityName || 'SS Nagar'}</span>
            </div>
          )}
        </div>

        {/* Center/Right: Mudumalai Night Closure & Urgent Alert */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mudumalai Night Travel Rule Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-medium ${
            isNightBanActive 
              ? 'bg-rose-950/60 border-rose-800 text-rose-300' 
              : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
          }`}>
            <Moon size={12} />
            <span className="hidden sm:inline">Mudumalai Ghat:</span>
            <span>{isNightBanActive ? 'Night Travel Closed (9PM-6AM)' : 'Ghat Open (Daylight)'}</span>
          </div>

          {/* Active Wildlife Alert Notice or Calm Normal Status */}
          {activeAlert ? (
            <div className="flex items-center gap-1.5 bg-amber-950/60 border border-amber-800 text-amber-300 px-2.5 py-0.5 rounded-full max-w-xs sm:max-w-md truncate">
              <AlertTriangle size={12} className="shrink-0 text-amber-400" />
              <span className="font-semibold shrink-0">ALERT:</span>
              <span className="truncate">{lang === 'ta' ? activeAlert.titleTa : activeAlert.title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span className="hidden sm:inline">{lang === 'ta' ? 'அனைத்து வழித்தடங்களும் சீராக உள்ளன' : 'Sectors All Clear'}</span>
              <span className="sm:hidden">{lang === 'ta' ? 'சீராக உள்ளது' : 'All Clear'}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
