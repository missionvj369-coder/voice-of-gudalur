import React, { useEffect, useState } from 'react';
import { CloudSun, Wind, AlertTriangle, Moon, ShieldCheck, MapPin, Radio, Compass } from 'lucide-react';
import { WeatherSnapshot, UrgentAlert } from '../types';
import { fetchLiveWeather } from '../services/aiService';
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
    <div id="gudalur-live-bar" className="w-full bg-[#1B5E20] text-[#F5F5F5] border-b border-[#AED581]/30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Weather & Environment */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-medium text-[#81C784]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#81C784] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#AED581]"></span>
            </span>
            <span className="font-semibold tracking-wide">LIVE PULSE</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#F5F5F5]/85">
            <CloudSun size={14} className="text-[#AED581]" />
            <span>{weather && typeof weather.temp === 'number' ? `${weather.temp}°C` : '21°C'}</span>
            <span className="text-[#AED581]/60 hidden sm:inline">•</span>
            <span className="text-[#F5F5F5]/70 hidden sm:inline">Western Plateau (1,000m)</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#F5F5F5]/85 hidden md:flex">
            <Wind size={14} className="text-[#AED581]" />
            <span>AQI <strong className="text-[#AED581]">{weather?.aqi || 24}</strong> (Clean Mountain Air)</span>
          </div>

          {profile && (
            <div className="hidden lg:flex items-center gap-1 text-[#F5F5F5]/85 bg-[#2E7D32]/80 px-2.5 py-0.5 rounded-full border border-[#AED581]/30">
              <MapPin size={12} className="text-[#AED581]" />
              <span>{profile.localityName || 'SS Nagar'}</span>
            </div>
          )}
        </div>

        {/* Center/Right: Mudumalai Night Closure & Urgent Alert */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mudumalai Night Travel Rule Status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-medium ${
            isNightBanActive 
              ? 'bg-[#2E7D32]/60 border-[#AED581]/40 text-[#AED581]' 
              : 'bg-[#1B5E20]/60 border-[#AED581]/40 text-[#AED581]'
          }`}>
            <Moon size={12} />
            <span className="hidden sm:inline">Mudumalai Ghat:</span>
            <span>{isNightBanActive ? 'Night Travel Closed (9PM-6AM)' : 'Ghat Open (Daylight)'}</span>
          </div>

          {/* Active Wildlife Alert Notice or Calm Normal Status */}
          {activeAlert ? (
            <div className="flex items-center gap-1.5 bg-[#2E7D32]/60 border border-[#AED581]/40 text-[#AED581] px-2.5 py-0.5 rounded-full max-w-xs sm:max-w-md truncate">
              <AlertTriangle size={12} className="shrink-0 text-[#AED581]" />
              <span className="font-semibold shrink-0">ALERT:</span>
              <span className="truncate">{lang === 'ta' ? activeAlert.titleTa : activeAlert.title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#1B5E20]/50 border border-[#AED581]/40 text-[#AED581] px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={12} className="text-[#81C784]" />
              <span className="hidden sm:inline">{lang === 'ta' ? 'அனைத்து வழித்தடங்களும் சீராக உள்ளன' : 'Sectors All Clear'}</span>
              <span className="sm:hidden">{lang === 'ta' ? 'சீராக உள்ளது' : 'All Clear'}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
