import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share2, Copy, Check, Image, Video } from 'lucide-react';

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
}

const ShareSocialModal: React.FC<ShareSocialModalProps> = ({
  isOpen,
  onClose,
  posters,
  videos,
}) => {
  const [activeTab, setActiveTab] = useState<'posters' | 'videos'>('posters');
  const [copied, setCopied] = useState(false);
  const shareMessage = 'Join the Voice of Gudalur Movement!';
  const shareUrl = 'https://voiceofgudalur.space';

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

  const shareToWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage + ' ' + shareUrl)}`, '_blank', 'noopener');
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };

  const shareToInstagram = () => {
    copyLink();
    alert('Link copied! Open Instagram and paste.');
  };

  const shareToSnapchat = () => {
    window.open(`https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener');
  };

  const shareToTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage + ' ' + shareUrl)}`, '_blank', 'noopener');
  };

  const downloadImage = async (url: string, filename: string) => {
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
            <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Share2 size={20} />Share</h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20"><X size={20} /></button>
            </div>
            <div className="p-4 grid grid-cols-5 gap-2">
              <button onClick={shareToWhatsApp} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-50 hover:bg-green-100"><div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">W</div><span className="text-[9px]">WhatsApp</span></button>
              <button onClick={shareToFacebook} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-blue-50 hover:bg-blue-100"><div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">f</div><span className="text-[9px]">Facebook</span></button>
              <button onClick={shareToInstagram} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-pink-50 hover:bg-pink-100"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">I</div><span className="text-[9px]">Instagram</span></button>
              <button onClick={shareToSnapchat} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-yellow-50 hover:bg-yellow-100"><div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white text-xs font-bold">S</div><span className="text-[9px]">Snapchat</span></button>
              <button onClick={shareToTwitter} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-sky-50 hover:bg-sky-100"><div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold">X</div><span className="text-[9px]">Twitter</span></button>
            </div>
            <div className="px-4 pb-4">
              <button onClick={copyLink} className="w-full py-2 rounded-lg border border-slate-200 text-sm flex items-center justify-center gap-2">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}{copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ShareSocialModal;
