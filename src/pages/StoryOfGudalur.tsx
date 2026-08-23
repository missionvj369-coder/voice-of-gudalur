import React, { useState } from 'react';
import { BookOpen, Compass, Bookmark, Share2, Layers, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_CHAPTERS } from '../data/gudalurMasterData';
import { GudalurChapter } from '../types';

export const StoryOfGudalur: React.FC = () => {
  const { lang, t } = useLanguage();
  const [selectedChapter, setSelectedChapter] = useState<GudalurChapter>(GUDALUR_CHAPTERS[0]);

  const handleShare = (chapter: GudalurChapter) => {
    const text = encodeURIComponent(
      `📖 *The Story of Gudalur — Chapter ${chapter.number}: ${chapter.title}*\n` +
      `Read this living historical archive on ONE GUDALUR:\n` +
      `https://onegudalur.org/story`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <BookOpen size={14} />
          <span>LIVING HISTORICAL ARCHIVE & HERITAGE</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          {t('story.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
          {t('story.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Chapter Index Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Historical Chapters
          </h3>
          <div className="space-y-2">
            {GUDALUR_CHAPTERS.map((ch) => {
              const active = selectedChapter.id === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChapter(ch)}
                  className={`w-full text-left p-4 rounded-2xl border transition flex items-start gap-3 ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 mt-0.5 ${
                    active ? 'bg-emerald-500 text-slate-950' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {ch.number}
                  </span>
                  <div>
                    <h4 className="font-bold text-sm leading-snug">
                      {lang === 'ta' ? ch.titleTa : ch.title}
                    </h4>
                    <p className={`text-[11px] mt-0.5 ${active ? 'text-slate-300' : 'text-slate-400'}`}>
                      {ch.era}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Main Reading Frame */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
          
          <div className="border-b border-slate-100 pb-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Chapter {selectedChapter.number} • {selectedChapter.tag}
              </span>
              <button
                onClick={() => handleShare(selectedChapter)}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
              >
                <Share2 size={15} />
                <span>Share Chapter</span>
              </button>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 leading-tight">
              {lang === 'ta' ? selectedChapter.titleTa : selectedChapter.title}
            </h2>
            <p className="text-xs font-mono text-slate-400">{selectedChapter.era}</p>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed italic">
              "{lang === 'ta' ? selectedChapter.summaryTa : selectedChapter.summary}"
            </div>
          </div>

          {/* Narrative Content */}
          <div className="space-y-4 text-sm sm:text-base text-slate-700 leading-relaxed font-normal">
            {(lang === 'ta' ? selectedChapter.contentTa : selectedChapter.content).map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Documentary Sources & Citations */}
          <div className="pt-6 border-t border-slate-100 space-y-2 text-xs text-slate-500">
            <p className="font-bold text-slate-700">Archival References & Sources:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {selectedChapter.sources.map((src, idx) => (
                <li key={idx}>{src}</li>
              ))}
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
};
export default StoryOfGudalur;
