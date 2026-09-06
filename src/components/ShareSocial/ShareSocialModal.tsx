/**
 * ShareSocialModal â€” media sharing modal with per-platform share buttons.
 *
 * Features:
 *  - Platform share buttons (Instagram, Facebook, WhatsApp, Snapchat, ShareChat, Telegram)
 *    with official brand SVG icons
 *  - Media-aware sharing: uses the Web Share API with files when supported
 *    (mobile Chrome, iOS Safari 16.4+); falls back to downloading the media
 *    file so users can share from their gallery / camera roll
 *  - In-app media viewer integration ("View Media" button opens a fullscreen
 *    overlay without leaving the app)
 *  - Performance: media is only fetched as a Blob when a share action is
 *    initiated (never on render); object URLs are revoked immediately
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Download, Share2, Copy, Check, Image as ImageIcon,
  Video, ExternalLink,
} from 'lucide-react';
import { PlatformIcon, PLATFORMS, type PlatformName } from './PlatformIcon';

interface Poster {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  createdAt: string;
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

interface ShareSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  posters: Poster[];
  videos: VideoItem[];
  /** Optional active item: when a specific poster/video is being shared. */
  activeItem?: {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string;
    videoUrl?: string;
    createdAt: string;
  } | null;
  /** Callback to open the in-app media viewer. */
  onViewMedia?: () => void;
}

const SHARE_URL = 'https://voiceofgudalur.space';

/** Convert any URL (http or data-URL) into a File for the Web Share API. */
async function urlToFile(url: string, filename: string, mime: string): Promise<File | null> {
  try {
    if (url.startsWith('data:')) {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type || mime });
    }
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type || mime });
  } catch {
    return null;
  }
}

const ShareSocialModal: React.FC<ShareSocialModalProps> = ({
  isOpen,
  onClose,
  posters,
  videos,
  activeItem,
  onViewMedia,
}) => {
  const [activeTab, setActiveTab] = useState<'posters' | 'videos'>('posters');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const activeMediaUrl = activeItem?.imageUrl ?? activeItem?.videoUrl ?? '';
  const activeKind = activeItem?.imageUrl ? 'poster' : activeItem?.videoUrl ? 'video' : null;
  const activeMime = activeKind === 'poster' ? 'image/jpeg' : activeKind === 'video' ? 'video/mp4' : 'application/octet-stream';

  const shareMessage = 'Join the Voice of Gudalur Movement!';
  const shareText = activeItem
    ? `${activeItem.title}${activeItem.description ? ' â€” ' + activeItem.description : ''}\n\n${shareMessage}\n${SHARE_URL}`
    : `${shareMessage}\n${SHARE_URL}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
    } catch { /* still show Copied toast */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const downloadItem = useCallback(async (url: string, filename: string, id: string) => {
    setDownloading(id);
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
          } finally {
      setDownloading(null);
    }
  }, []);

  /**
   * Share the active media item to a specific platform.
   * 1. Web Share API with files (best quality â€” shares the actual media)
   * 2. Deep-link URL scheme (opens native app on mobile)
   * 3. Web fallback URL
   * 4. Download the file + show instructions (last resort)
   */
  const shareMediaToPlatform = useCallback(async (platform: PlatformName) => {
    if (!activeItem || !activeMediaUrl) return;
    setSharing(platform);
    const filename = activeItem.id + (activeKind === 'poster' ? '.jpg' : '.mp4');
    const config = PLATFORMS[platform];

    // Step 1: Web Share API with files (mobile Chrome, iOS Safari 16.4+)
    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.canShare === 'function' &&
      typeof navigator.share === 'function' &&
      !!navigator.canShare({ files: [] });

    if (canShareFiles) {
      try {
        const file = await urlToFile(activeMediaUrl, filename, activeMime);
        if (file) {
          await navigator.share({
            title: activeItem.title,
            text: shareText,
            url: SHARE_URL,
            files: [file],
          });
          setSharing(null);
          return;
        }
      } catch { /* user cancelled or failed â€” fall through */ }
    }

    // Step 2: Platform URL scheme (opens native app on mobile)
    if (config.appScheme) {
      try {
        const encodedText = encodeURIComponent(shareText);
        const encodedUrl = encodeURIComponent(SHARE_URL);
        let schemeUrl: string;
        switch (platform) {
          case 'whatsapp':
            schemeUrl = `whatsapp://send?text=${encodedText}&url=${encodedUrl}`;
            break;
          case 'facebook':
            schemeUrl = `fb://sharer?title=${encodedText}&url=${encodedUrl}`;
            break;
          case 'instagram':
            void downloadItem(activeMediaUrl, filename, platform);
            schemeUrl = 'instagram://library';
            break;
          case 'snapchat':
            schemeUrl = `snapchat://add?text=${encodedText}`;
            break;
          case 'sharechat':
            schemeUrl = `sharechat://search?query=${encodedText}`;
            break;
          case 'telegram':
            schemeUrl = `tg://resolve?url=${encodedUrl}&text=${encodedText}`;
            break;
          default:
            schemeUrl = config.appScheme;
        }

        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = schemeUrl;
        document.body.appendChild(iframe);
        setTimeout(() => { document.body.removeChild(iframe); }, 200);

        setTimeout(() => {
          const webUrls: Record<PlatformName, string> = {
            instagram: 'https://www.instagram.com/',
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
            snapchat: 'https://www.snapchat.com/',
            sharechat: 'https://www.sharechat.com/',
            telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
          };
          window.open(webUrls[platform], '_blank', 'noopener,noreferrer');
        }, 300);

        setSharing(null);
        return;
      } catch { /* scheme failed â€” continue to fallback */ }
    }

    // Step 3: Fallback â€” download + show instructions
    try {
      await downloadItem(activeMediaUrl, filename, platform);
      const instr = platform === 'instagram'
        ? `The ${activeKind === 'poster' ? 'image' : 'video'} has been downloaded.\n\n` +
          `To share on Instagram:\n1. Open the Instagram app\n2. Tap the + (Create) button\n` +
          `3. Select the downloaded ${activeKind === 'poster' ? 'photo' : 'video'} from your gallery\n` +
          `4. Add your caption and share!`
        : `The ${activeKind === 'poster' ? 'image' : 'video'} has been downloaded. Open ${config.label} and share it from your gallery.`;
      alert(instr);
    } catch {
      await copyLink();
      alert(`Copied link. Open ${config.label} to share manually.`);
    }
    setSharing(null);
    }, [activeItem, activeMediaUrl, activeKind, activeMime, shareText, copyLink, downloadItem]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined'
    && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-lg max-h-[85dvh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* â”€â”€ Header â”€â”€ */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Share2 size={20} /> Share
              </h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
                <X size={20} />
              </button>
                        </div>

            {/* â”€â”€ Active Item: Media Preview + Platform Share Buttons â”€â”€ */}
            {activeItem && activeMediaUrl && (
              <div className="p-4 border-b border-slate-100 space-y-4">
                {/* Media preview thumbnail */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {activeKind === 'poster' ? (
                      <img src={activeItem.imageUrl} alt={activeItem.title}
                           className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-black/80 flex items-center justify-center">
                        <Video size={20} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{activeItem.title}</p>
                    {activeItem.description && (
                      <p className="text-xs text-slate-500 line-clamp-1">{activeItem.description}</p>
                    )}
                  </div>
                </div>

                {/* Platform share buttons grid with official brand icons */}
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(PLATFORMS).map((platform) => (
                    <button
                      key={platform.name}
                      onClick={() => shareMediaToPlatform(platform.name)}
                      disabled={!!sharing}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 transition text-slate-700 font-medium text-xs"
                      aria-label={`Share to ${platform.label}`}
                    >
                      {sharing === platform.name ? (
                        <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PlatformIcon platform={platform.name} size={24} />
                      )}
                      <span className="truncate">{platform.label}</span>
                    </button>
                  ))}
                </div>

                {/* Action buttons: View Media | Download | Copy Link */}
                <div className="flex items-center gap-2 pt-1">
                  {onViewMedia && (
                    <button
                      onClick={() => { onClose(); onViewMedia(); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s8-8 11-8 11 8 11 8-8 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>{/* eye */}</svg>
                      View Media
                    </button>
                  )}
                  <button
                    onClick={() => downloadItem(
                      activeMediaUrl,
                      activeItem.id + (activeKind === 'poster' ? '.jpg' : '.mp4'),
                      activeItem.id
                    )}
                    disabled={!!downloading}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                  >
                    {downloading ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : <Download size={14} />}
                    Download
                  </button>
                  <button
                    onClick={copyLink}
                    disabled={copied}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                    title="Copy link"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>

                {!isMobile && (
                  <p className="text-[10px] text-slate-400 text-center">
                    For the best experience, share from a mobile device. On desktop, the media will download.
                  </p>
                )}
                            </div>
            )}

            {/* â”€â”€ All Media: Tabs + Lists â”€â”€ */}
            <div className="p-4 border-b border-slate-100 shrink-0">
              <p className="text-xs font-bold text-slate-500 mb-2">
                {activeItem ? 'All Movement Media' : 'Posters & Videos'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('posters')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'posters' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <ImageIcon size={12} className="inline mr-1" />Posters ({posters.length})
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'videos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <Video size={12} className="inline mr-1" />Videos ({videos.length})
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-2">
              {activeTab === 'posters' && (posters.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No posters published yet.</p>
              ) : (
                posters.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                    <img src={p.imageUrl} alt={p.title} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{p.title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{p.description}</p>
                    </div>
                    <button
                      onClick={() => downloadItem(p.imageUrl, `vog-poster-${p.id}.jpg`, p.id)}
                      disabled={downloading === p.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0"
                      title="Download"
                    >
                      {downloading === p.id ? <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
                    </button>
                  </div>
                ))
              ))}
              {activeTab === 'videos' && (videos.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No videos published yet.</p>
              ) : (
                videos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                    <div className="w-14 h-14 rounded-lg bg-black/80 flex items-center justify-center shrink-0">
                      <Video size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{v.title}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{v.description}</p>
                    </div>
                    <button
                      onClick={() => downloadItem(v.videoUrl, `vog-video-${v.id}.mp4`, v.id)}
                      disabled={downloading === v.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0"
                      title="Download"
                    >
                      {downloading === v.id ? <div className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" /> : <Download size={14} />}
                    </button>
                  </div>
                ))
              ))}
            </div>

            {/* â”€â”€ Footer: Visit site â”€â”€ */}
            <div className="px-4 pb-4 shrink-0">
              <a
                href={SHARE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-lg border border-slate-200 text-sm flex items-center justify-center gap-2 text-emerald-700 font-bold"
              >
                <ExternalLink size={14} /> voiceofgudalur.space
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareSocialModal;
