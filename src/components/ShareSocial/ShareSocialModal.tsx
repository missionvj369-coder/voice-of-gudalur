import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Copy, Check, Image as ImageIcon, Video, ExternalLink } from 'lucide-react';

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
  /** Optional active item: when a specific poster/video is sharing. */
  activeItem?: {
    id: string;
    title: string;
    description?: string | null;
    imageUrl?: string;
    videoUrl?: string;
    createdAt: string;
  } | null;
}

const shareUrl = 'https://voiceofgudalur.space';

const ShareSocialModal: React.FC<ShareSocialModalProps> = ({
  isOpen,
  onClose,
  posters,
  videos,
  activeItem,
}) => {
  const [activeTab, setActiveTab] = useState<'posters' | 'videos'>('posters');
  const [copied, setCopied] = useState(false);
  const shareMessage = 'Join the Voice of Gudalur Movement!';
  const shareText = activeItem
    ? `${activeItem.title}${activeItem.description ? ' — ' + activeItem.description : ''}\n\n${shareMessage}\n${shareUrl}`
    : `${shareMessage}\n${shareUrl}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareTo = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'snapchat' | 'sharechat' | 'telegram') => {
    const encoded = encodeURIComponent(shareText);
    const urls: Record<typeof platform, string> = {
      whatsapp: `https://wa.me/?text=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encoded}`,
      twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
      snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`,
      sharechat: `https://www.sharechat.com/`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encoded}`,
    };
    window.open(urls[platform], '_blank', 'noopener');
  };

  const shareToInstagram = () => {
    copyLink();
    alert('Link copied! Open Instagram and paste it to share.');
  };

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
      window.open(url, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><Share2 size={20} />Share</h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20"><X size={20} /></button>
            </div>

            {activeItem && (
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
                <p className="text-xs font-bold text-slate-800">{activeItem.title}</p>
                {activeItem.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{activeItem.description}</p>}
              </div>
            )}

            <div className="p-4 grid grid-cols-4 gap-2 shrink-0">
              <button onClick={() => shareTo('whatsapp')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-50 hover:bg-green-100"><div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">W</div><span className="text-[9px]">WhatsApp</span></button>
              <button onClick={() => shareTo('facebook')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 hover:bg-blue-100"><div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">f</div><span className="text-[9px]">Facebook</span></button>
              <button onClick={shareToInstagram} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-pink-50 hover:bg-pink-100"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">IG</div><span className="text-[9px]">Instagram</span></button>
              <button onClick={() => shareTo('snapchat')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-yellow-50 hover:bg-yellow-100"><div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xs font-bold">S</div><span className="text-[9px]">Snapchat</span></button>
              <button onClick={() => shareTo('sharechat')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-50 hover:bg-orange-100"><div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">SC</div><span className="text-[9px]">ShareChat</span></button>
              <button onClick={() => shareTo('telegram')} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100"><div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white text-xs font-bold">T</div><span className="text-[9px]">Telegram</span></button>
              <button onClick={copyLink} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-slate-100"><div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white">{copied ? <Check size={14}/> : <Copy size={14}/>}</div><span className="text-[9px]">{copied ? 'Copied' : 'Copy'}</span></button>
            </div>

            {/* Library — posters & videos to share */}
            <div className="border-t border-slate-100 px-4 py-3 shrink-0 overflow-hidden flex flex-col min-h-0">
              <div className="flex gap-1 mb-2 shrink-0">
                <button
                  onClick={() => setActiveTab('posters')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'posters' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <ImageIcon size={12} className="inline mr-1"/>Posters ({posters.length})
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'videos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  <Video size={12} className="inline mr-1"/>Videos ({videos.length})
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto space-y-2">
                {activeTab === 'posters' && (posters.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No posters published yet. Admin can add them.</p>
                ) : (
                  posters.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                      <img src={p.imageUrl} alt={p.title} className="w-14 h-14 rounded-lg object-cover shrink-0" loading="lazy" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{p.description}</p>
                      </div>
                      <button onClick={() => downloadItem(p.imageUrl, `vog-poster-${p.id}.jpg`)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0" title="Download">
                        <Download size={14}/>
                      </button>
                    </div>
                  ))
                ))}
                {activeTab === 'videos' && (videos.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No videos published yet. Admin can add them.</p>
                ) : (
                  videos.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 bg-slate-50 rounded-xl p-2">
                      <div className="w-14 h-14 rounded-lg bg-black/80 flex items-center justify-center shrink-0">
                        <Video size={18} className="text-white"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{v.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{v.description}</p>
                      </div>
                      <button onClick={() => downloadItem(v.videoUrl, `vog-video-${v.id}.mp4`)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0" title="Download">
                        <Download size={14}/>
                      </button>
                    </div>
                  ))
                ))}
              </div>
            </div>

            <div className="px-4 pb-4 shrink-0">
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-lg border border-slate-200 text-sm flex items-center justify-center gap-2 text-emerald-700 font-bold"
              >
                <ExternalLink size={14}/> voiceofgudalur.space
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareSocialModal;
