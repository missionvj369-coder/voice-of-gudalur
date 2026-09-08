import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, ChevronLeft, ChevronRight, ImageIcon, Video } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PlatformIcon, PLATFORMS, type PlatformName } from './PlatformIcon';

export interface MediaItem {
  id: string; kind: 'poster' | 'video'; title: string; description: string | null;
  url: string; mime: string | null; createdAt: string; sizeBytes: number | null;
}
interface Props {
  isOpen: boolean; onClose: () => void; item: MediaItem | null;
  currentIndex?: number; totalCount?: number; onPrev?: () => void; onNext?: () => void;
}
const SHARE_URL = 'https://voiceofgudalur.space';
const downloadItem = async (url: string, fn: string) => {
  try {
    const r = await fetch(url); const b = await r.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = fn;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(u);
  } catch { window.open(url, '_blank'); }
};
const shareTo = (p: PlatformName, item: MediaItem) => {
  const txt = `${item.title}${item.description ? ' - ' + item.description : ''}\n\nJoin Voice of Gudalur!\n${SHARE_URL}`;
  const u: Record<PlatformName, string> = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(txt)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(txt)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    instagram: 'https://www.instagram.com/',
    snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(SHARE_URL)}`,
    sharechat: `https://sharechat.com/share?text=${encodeURIComponent(txt)}`,
  };
  window.open(u[p], '_blank');
};
export const MediaViewer: React.FC<Props> = ({ isOpen, onClose, item, currentIndex = 0, totalCount = 1, onPrev, onNext }) => {
  const { t } = useLanguage();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [isOpen, onClose, onPrev, onNext]);

  const onDl = useCallback(() => {
    if (!item) return;
    downloadItem(item.url, item.kind === 'poster' ? `vog-poster-${item.id}.jpg` : `vog-video-${item.id}.mp4`);
  }, [item]);

  const onShareClick = useCallback(async () => {
    if (!item) return;
    const txt = `${item.title}${item.description ? ' - ' + item.description : ''}\n\nJoin Voice of Gudalur!\n${SHARE_URL}`;
    // Native share sheet when available (mobile); otherwise the social icon row below is the share UI.
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: item.title, text: txt, url: SHARE_URL }); return; }
      catch { /* user cancelled - fall through to icons */ }
    }
  }, [item]);

  if (!item) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          {totalCount > 1 && onPrev && onNext && (
            <>
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition" aria-label="Previous"><ChevronLeft size={24} /></button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-10 h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition" aria-label="Next"><ChevronRight size={24} /></button>
            </>
          )}
          <motion.div className="relative max-w-5xl w-full mx-12 sm:mx-16 flex flex-col items-center" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <div className="relative rounded-2xl overflow-hidden bg-black/50 max-w-full">
              {item.kind === 'poster'
                ? <img ref={imgRef} src={item.url} alt={item.title} className="max-w-full max-h-[58dvh] object-contain" loading="eager" decoding="async" draggable={false} />
                : <video src={item.url} controls playsInline preload="metadata" className="max-w-full max-h-[58dvh] object-contain" />}
            </div>
            <div className="mt-4 text-center max-w-2xl px-2">
              <h3 className="text-base sm:text-lg font-bold text-white">{item.title}</h3>
              {item.description && <p className="text-xs sm:text-sm text-slate-300 mt-1">{item.description}</p>}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
              {item.kind === 'poster' ? <ImageIcon size={14} /> : <Video size={14} />}
              <span>{item.kind === 'poster' ? t('media.poster') : t('media.video')} {currentIndex + 1} {t('media.of')} {totalCount}</span>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={onShareClick} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold text-sm transition"><Share2 size={16} /> {t('media.share')}</button>
              <button onClick={onDl} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B5E20] hover:bg-[#2E7D32] text-white font-semibold text-sm transition"><Download size={16} /> {t('media.download')}</button>
              <button onClick={onClose} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition" aria-label={t('mv.close')}><X size={20} /></button>
            </div>
            <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
              {(Object.keys(PLATFORMS) as PlatformName[]).slice(0, 5).map((p) => (
                <button key={p} onClick={() => shareTo(p, item)} className="h-10 w-10 rounded-full flex items-center justify-center transition hover:scale-110" style={{ backgroundColor: `#${PLATFORMS[p].color}` }} aria-label={PLATFORMS[p].label}>
                  <PlatformIcon platform={p} size={20} />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewer;