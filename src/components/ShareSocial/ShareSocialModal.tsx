import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Copy, Check, Image as ImageIcon, Video, ExternalLink, MessageCircle, Send } from 'lucide-react';

interface Poster {
  id: string; title: string; description: string; imageUrl: string; createdAt: string;
}

interface VideoItem {
  id: string; title: string; description: string; videoUrl: string; thumbnailUrl?: string; createdAt: string;
}

interface ShareSocialModalProps {
  isOpen: boolean; onClose: () => void; posters: Poster[]; videos: VideoItem[];
  initialTab?: 'posters' | 'videos';
  activeItem?: { id: string; title: string; description?: string | null; imageUrl?: string; videoUrl?: string; createdAt: string; } | null;
}

const SITE_URL = 'https://voiceofgudalur.space';

function buildShareText(item?: { title: string; description?: string | null } | null): string {
  if (!item) return `Join the Voice of Gudalur Movement!\n${SITE_URL}`;
  return `${item.title}${item.description ? ' \u2014 ' + item.description : ''}\n\nJoin the Voice of Gudalur Movement!\n${SITE_URL}`;
}

function openShare(platform: string, text: string, url: string) {
  const encText = encodeURIComponent(text); const encUrl = encodeURIComponent(url);
  const map: Record<string, string> = {
    whatsapp: `https://wa.me/?text=${encText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${encText}`,
    snapchat: `https://www.snapchat.com/scan?attachmentUrl=${encUrl}`,
    sharechat: `https://sharechat.com/post?text=${encText}`,
    telegram: `https://t.me/share/url?url=${encUrl}&text=${encText}`,
  };
  if (map[platform]) window.open(map[platform], '_blank', 'noopener');
}

const ShareSocialModal: React.FC<ShareSocialModalProps> = ({ isOpen, onClose, posters, videos, initialTab = 'posters', activeItem }) => {
  const [activeTab, setActiveTab] = useState<'posters' | 'videos'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const shareText = buildShareText(activeItem);

  const copyLink = async (text?: string) => {
    try { await navigator.clipboard.writeText(text || SITE_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const shareToInstagram = () => { void copyLink(shareText); alert('Link copied! Open Instagram and paste it to share.'); };

  const downloadItem = async (url: string, filename: string) => {
    try { const r = await fetch(url); const blob = await r.blob(); const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u); }
    catch { window.open(url, '_blank'); }
  };

  if (!isOpen) return null;
  const items = activeTab === 'posters' ? posters : videos;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Share2 size={16} className="text-emerald-600" /> Share to Social Media</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="px-5 pt-3 shrink-0">
              <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setActiveTab('posters')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'posters' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}><ImageIcon size={12} className="inline mr-1" /> Posters ({posters.length})</button>
                <button onClick={() => setActiveTab('videos')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'videos' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}><Video size={12} className="inline mr-1" /> Videos ({videos.length})</button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No {activeTab} published yet. Admin can add them.</p>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isPoster = activeTab === 'posters';
                  const mediaUrl = isPoster ? (item as Poster).imageUrl : (item as VideoItem).videoUrl;
                  const itemText = buildShareText({ title: item.title, description: item.description });
                  return (
                    <div key={item.id} className="bg-slate-50 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 p-2">
                        {isPoster ? (
                          <img src={(item as Poster).imageUrl} alt={item.title} className="w-16 h-16 rounded-lg object-cover shrink-0" loading="lazy" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-black/80 flex items-center justify-center shrink-0 overflow-hidden">
                            {(item as VideoItem).thumbnailUrl ? <img src={(item as VideoItem).thumbnailUrl} alt={item.title} className="w-full h-full object-cover" /> : <Video size={20} className="text-white" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{item.description}</p>
                        </div>
                        <button onClick={() => setExpandedId(isExpanded ? null : item.id)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0" title="Share"><Share2 size={14} /></button>
                        <button onClick={() => downloadItem(mediaUrl, `vog-${activeTab}-${item.id}.${isPoster ? 'jpg' : 'mp4'}`)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 shrink-0" title="Download"><Download size={14} /></button>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-3 pb-3 pt-1 border-t border-slate-200">
                              <p className="text-[10px] font-bold text-slate-500 mb-2">Share to:</p>
                              <div className="grid grid-cols-5 gap-1.5">
                                <button onClick={() => openShare('whatsapp', itemText, SITE_URL)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition"><MessageCircle size={18} /><span className="text-[8px] font-bold">WhatsApp</span></button>
                                <button onClick={() => openShare('facebook', itemText, SITE_URL)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition"><span className="font-black text-sm">f</span><span className="text-[8px] font-bold">Facebook</span></button>
                                <button onClick={shareToInstagram} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#E4405F]/10 hover:bg-[#E4405F]/20 text-[#E4405F] transition"><span className="font-black text-sm">IG</span><span className="text-[8px] font-bold">Instagram</span></button>
                                <button onClick={() => openShare('snapchat', itemText, SITE_URL)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#FFFC00]/20 hover:bg-[#FFFC00]/30 text-[#C4A300] transition"><span className="font-black text-sm">👻</span><span className="text-[8px] font-bold">Snapchat</span></button>
                                <button onClick={() => openShare('sharechat', itemText, SITE_URL)} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#FF4D00]/10 hover:bg-[#FF4D00]/20 text-[#FF4D00] transition"><Send size={18} /><span className="text-[8px] font-bold">ShareChat</span></button>
                              </div>
                              <button onClick={() => copyLink(itemText)} className="w-full mt-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1">
                                {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy link</>}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-4 pb-4 shrink-0">
              <a href={SITE_URL} target="_blank" rel="noopener noreferrer" className="w-full py-2 rounded-lg border border-slate-200 text-sm flex items-center justify-center gap-2 text-emerald-700 font-bold"><ExternalLink size={14} /> voiceofgudalur.space</a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareSocialModal;
