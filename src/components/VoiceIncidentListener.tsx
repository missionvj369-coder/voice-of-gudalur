/**
 * VoiceIncidentListener.tsx
 * Background listener — renders nothing but registers the push subscription
 * and shows in-app toast notifications when a voice incident push arrives.
 *
 * Place this component once at the app root (inside <Router>).
 */
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { wildlifeApi } from '../services/api';
import { subscribeToPush } from '../services/voiceReportService';
import toast from 'react-hot-toast';
import { Bone } from 'lucide-react';

/** Push payload shape sent by the server inside `event.data`. */
interface VoicePushPayload {
  title: string;
  body: string;
  icon?: string;
  incident_id?: string;
  urgency?: string;
  locality?: string;
  url?: string;
}

export const VoiceIncidentListener: React.FC = () => {
  const navigate = useNavigate();

  // 1. On mount: ask for permission + register push subscription.
  useEffect(() => {
    subscribeToPush().then((sub) => {
      if (sub) console.log('[VoiceIncidentListener] Push subscribed:', sub.endpoint.slice(0, 50));
    });
  }, []);

  // 2. Foreground push via service-worker `message` events.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      const data: VoicePushPayload = event.data;
      if (!data?.title) return;

      toast.custom(
        ({ id }) => (
          <div
            className="max-w-sm rounded-xl bg-slate-800 border border-slate-700 p-3 shadow-xl flex items-start gap-3 cursor-pointer hover:bg-slate-700 transition"
            onClick={() => {
              toast.dismiss(id);
              if (data.url) navigate(data.url);
            }}
          >
            <Bone size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-black text-white">{data.title}</p>
              <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-2">{data.body}</p>
            </div>
          </div>
        ),
        { duration: 8000, position: 'top-right' },
      );
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

    // 3. New-incident toasts: poll the API (no WebSocket realtime needed).
  //    Wildlife incidents are infrequent; a 60s poll is the simplest reliable
  //    mechanism and needs no WebSocket infrastructure.
  const seenIncidentsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    let primed = false;
    const poll = async () => {
      try {
        const { incidents } = await wildlifeApi.incidents();
        if (cancelled || !incidents?.length) return;
        for (const inc of incidents as any[]) {
          if (!inc?.id) continue;
          if (!primed) {
            // First pass only records the baseline — no toast flood on load.
            seenIncidentsRef.current.add(inc.id);
            continue;
          }
          if (seenIncidentsRef.current.has(inc.id)) continue;
          seenIncidentsRef.current.add(inc.id);
          toast.custom(
            <div className="flex items-start gap-2 text-xs">
              <Bone size={16} className="text-amber-500 shrink-0" />
              <div>
                <span className="font-black text-white">{inc.type} incident reported</span>
                <p className="text-slate-300 mt-0.5 line-clamp-1">
                  {inc.behavior_notes || `${inc.type} in ${inc.locality_id || 'Gudalur'}`}
                </p>
              </div>
            </div>,
            { duration: 6000, position: 'top-right' },
          );
        }
        primed = true;
      } catch {
        /* offline — next poll retries */
      }
    };
    poll();
    const interval = setInterval(poll, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // This component renders nothing — it is purely a background listener.
  return null;
};