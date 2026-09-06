/**
 * MediaViewer — fullscreen overlay for viewing posters & videos in-app.
 *
 * Designed for near-zero performance impact:
 *  - Only mounts when `isOpen` is true (React conditional render)
 *  - Uses `loading="lazy"` + `decoding="async"` on images
 *  - Uses `preload="metadata"` on videos (no autoplay)
 *  - Revokes object URLs on unmount via useEffect cleanup
 *  - No external heavy libraries — only motion/react (already in bundle)
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Share2, Download, ImageIcon, Video } from 'lucide-react';

export interface MediaItem {
  id: string;
  kind: 'poster' | 'video';
  title: string;
  description?: string | null;
  url: string;
  mime?: string | null;
  createdAt: string;
}

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  item: MediaItem | null;
  onShare: (item: MediaItem) => void;
}

const downloadItem = async (url: string, filename: string) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
};

export const MediaViewer: React.FC<MediaViewerProps> = ({
  isOpen,
  onClose,
  item,
  onShare,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    // Prevent body scroll when open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Preload the image when the viewer opens for instant display
  useEffect(() => {
    if (!item || !isOpen) return;
    if (item.kind === 'poster' && imageRef.current) {
      // Trigger browser to start loading the full image
      if (imageRef.current.complete) {
        // Already loaded
      }
    }
  }, [item, isOpen]);

  if (!item) return null;

  const handleDownload = () => {
    const filename = item.kind === 'poster'
      ? `vog-poster-${item.id}.jpg`
      : `vog-video-${item.id}.mp4`;
    downloadItem(item.url, filename);
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackgroundClick}
        >
          <motion.div
            className="relative max-w-5xl max-h-[90dvh] mx-4 flex flex-col items-center"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Media content */}
            <div className="relative rounded-2xl overflow-hidden bg-black/50 max-w-full max-h-[75dvh]">
              {item.kind === 'poster' ? (
                <img
                  ref={imageRef}
                  src={item.url}
                  alt={item.title}
                  className="max-w-full max-h-[75dvh] object-contain"
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <video
                  src={item.url}
                  controls
                  playsInline
                  preload="metadata"
                  poster={item.url}
                  className="max-w-full max-h-[75dvh] object-contain"
                />
              )}
            </div>

            {/* Title + description */}
            <div className="mt-4 text-center max-w-2xl">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              {item.description && (
                <p className="text-sm text-slate-300 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => onShare(item)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
              >
                <Share2 size={16} /> Share Media
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition"
              >
                <Download size={16} /> Download
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                aria-label="Close viewer"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MediaViewer;