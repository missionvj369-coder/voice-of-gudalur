/**
 * MediaGallery â€” full media browser for "Support the Movement".
 *
 * Shows ALL uploaded posters + videos (not just the first 9) with two filter
 * tabs: Posters / Videos. Posters keep their native 4:5 aspect ratio so the
 * headline at the top is always visible (no object-cover cropping). Selected
 * media can be shared to social platforms.
 *
 * Post-migration note: media URLs now come straight from Storj (permanent
 * public links) â€” they pass straight through to <img>/<video> with no API hop.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, ImageIcon, Video, Eye } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { MediaItem } from '../../services/api';
import ShareSocialModal from './MediaViewer';
import { cardImgAttrs, retryUrl } from '../../utils/mediaAttrs';

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  media: MediaItem[];
  onShare: (item: MediaItem) => void;
  /** Total active media on the server — drives bounded pagination. */
  total?: number;
  /** Appends the next bounded window (the page implements it; gallery stays dumb). */
  onLoadMore?: () => Promise<void> | void;
  /** True while the parent fetches the next window. */
  loadingMore?: boolean;
}

type KindFilter = 'all' | 'poster' | 'video';

/**
 * One grid card with a fully isolated lifecycle: its own skeleton, its own
 * error state, its own retry. A slow or broken Storj object can never blank
 * or freeze the rest of the gallery — each card fails alone.
 *
 * Video cards are ZERO bytes until the user opens the viewer: a static play
 * tile replaces the old <video preload="metadata"> card, so opening a gallery
 * of 30 videos downloads nothing automatically.
 */
const MediaCard: React.FC<{
  m: MediaItem;
  idx: number;
  onOpen: (m: MediaItem) => void;
  onShare: (m: MediaItem, e?: React.MouseEvent) => void;
}> = ({ m, idx, onOpen, onShare }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [src, setSrc] = useState(m.url);
  const attrs = cardImgAttrs(idx);
  // Long lists skip painting offscreen cards entirely (smoother scrolling).
  const cv = idx > 5 ? ' [content-visibility:auto] [contain-intrinsic-size:auto_340px]' : '';
  return (
    <div className={`group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 text-left${cv}`}>
      <button type="button" className="w-full text-left" onClick={() => onOpen(m)}>
        {m.kind === 'poster' ? (
          <div className="w-full aspect-[4/5] bg-slate-100 overflow-hidden relative">
            {status === 'loading' && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" aria-hidden="true" />
            )}
            {status === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                <ImageIcon size={22} />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setSrc(retryUrl(m.url)); setStatus('loading'); }}
                  className="text-xl font-bold text-emerald-700 hover:text-emerald-500 cursor-pointer leading-none px-2"
                  title="Retry"
                >
                  ↻
                </span>
              </div>
            ) : (
              <img
                src={src}
                alt={m.title}
                loading={attrs.loading}
                decoding={attrs.decoding}
                fetchPriority={attrs.fetchPriority}
                onLoad={() => setStatus('ok')}
                onError={() => setStatus('error')}
                className="w-full h-full object-contain"
                draggable={false}
              />
            )}
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative flex items-center justify-center">
            <span className="h-12 w-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center" aria-hidden="true">
              <Video size={22} className="text-white/80 ml-0.5" />
            </span>
            <span className="absolute bottom-2 inset-x-0 text-center text-[10px] font-bold text-white/60">{t('media.video')}</span>
          </div>
        )}
      </button>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-10 pb-2 pointer-events-none">
        <p className="text-[11px] font-bold text-white truncate">{m.title}</p>
        {m.description && <p className="text-[10px] text-slate-300 line-clamp-1">{m.description}</p>}
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={() => onOpen(m)}
          className="p-1.5 rounded-lg bg-black/50 text-white backdrop-blur hover:bg-black/70 transition"
          title={t('home.view_media')}
          aria-label={t('home.view')}
        >
          <Eye size={12} />
        </button>
        <button
          type="button"
          onClick={(e) => onShare(m, e)}
          className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition"
          title={t('media.share')}
        >
          <Share2 size={12} />
        </button>
      </div>
    </div>
  );
};

export const MediaGallery: React.FC<MediaGalleryProps> = ({ isOpen, onClose, media, onShare, total, onLoadMore, loadingMore }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<KindFilter>('all');
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [viewingIdx, setViewingIdx] = useState(0);

  const filtered = media.filter((m) => (filter === 'all' ? true : m.kind === filter));
  const posterCount = media.filter((m) => m.kind === 'poster').length;
  const videoCount = media.filter((m) => m.kind === 'video').length;

  const openItem = (m: MediaItem) => {
    const idx = filtered.findIndex((f) => f.id === m.id);
    setViewingIdx(idx >= 0 ? idx : 0);
    setViewing(m);
  };
  const step = (dir: 1 | -1) => {
    if (filtered.length === 0) return;
    const next = (viewingIdx + dir + filtered.length) % filtered.length;
    setViewingIdx(next);
    setViewing(filtered[next]);
  };

  const handleShare = useCallback(
    (item: MediaItem, e?: React.MouseEvent) => {
      e?.stopPropagation();
      onShare(item);
    },
    [onShare],
  );

  if (!isOpen) return null;

  const TabBtn = ({ k, label, count }: { k: KindFilter; label: string; count?: number }) => (
    <button
      type="button"
      onClick={() => setFilter(k)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
        filter === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl max-h-[92dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <ImageIcon size={20} className="text-white" /> {t('home.support_title')}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition">
                <X size={20} />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              <TabBtn k="all" label={t('ssm.posters_videos')} count={media.length} />
              <TabBtn k="poster" label={t('ssm.tab_posters')} count={posterCount} />
              <TabBtn k="video" label={t('ssm.tab_videos')} count={videoCount} />
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-12">
                  {filter === 'poster' ? t('ssm.no_posters') : filter === 'video' ? t('ssm.no_videos') : 'â€”'}
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map((m) => (
                    <MediaCard
                      key={m.id}
                      m={m}
                      idx={filtered.indexOf(m)}
                      onOpen={openItem}
                      onShare={handleShare}
                    />
                  ))}
                  {typeof total === 'number' && media.length < total && onLoadMore && (
                    <button
                      type="button"
                      onClick={() => { void onLoadMore(); }}
                      disabled={loadingMore}
                      className="col-span-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-sm hover:border-emerald-400 hover:text-emerald-700 transition disabled:opacity-60"
                    >
                      <Eye size={16} />
                      {loadingMore ? '…' : `${t('home.see_all')} (+${Math.max((total ?? 0) - media.length, 0)})`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {viewing && (() => {
            const nextIdx = (viewingIdx + 1) % filtered.length;
            const nextUrl = filtered.length > 1 ? filtered[nextIdx].url : undefined;
            return (
              <ShareSocialModal
                isOpen={true}
                item={{
                  id: viewing.id,
                  kind: viewing.kind,
                  title: viewing.title,
                  description: viewing.description,
                  url: viewing.url,
                  mime: viewing.mime,
                  createdAt: viewing.createdAt,
                  sizeBytes: viewing.sizeBytes ?? null,
                }}
                currentIndex={viewingIdx}
                totalCount={filtered.length}
                onPrev={() => step(-1)}
                onNext={() => step(1)}
                onClose={() => setViewing(null)}
                nextUrl={nextUrl}
              />
            );
          })()}
        </div>
      )}
    </AnimatePresence>
  );
};

export default MediaGallery;
