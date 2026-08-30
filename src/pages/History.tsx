import React, { useState } from 'react';
import { 
  BookOpen, 
  Compass, 
  MapPin, 
  Calendar, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  Landmark, 
  Trees, 
  ShieldCheck, 
  Layers
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { GUDALUR_HISTORY_CHAPTERS } from '../data/gudalurMasterData';
import { GudalurChapter } from '../types';

export const History: React.FC = () => {
  const { lang } = useLanguage();
  const [selectedChapter, setSelectedChapter] = useState<GudalurChapter>(GUDALUR_HISTORY_CHAPTERS[0]);

  return (
    <div className="space-y-8">
      
      {/* 1. HERO BANNER */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
            <BookOpen size={14} />
            <span>{lang === 'ta' ? 'கூடலூர் வரலாற்று களஞ்சியம்' : 'Official Historical Archive of Gudalur'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight">
            {lang === 'ta' ? 'கூடலூரின் ஆவணப்படுத்தப்பட்ட வரலாறு' : 'The Documented History & Ecological Heritage of Gudalur'}
          </h1>
          <p className="text-sm text-slate-600 mt-2">
            {lang === 'ta'
              ? 'பழங்குடியின மக்களின் பூர்வீக வாழ்வியல், 19-ஆம் நூற்றாண்டு தேவாலா தங்கச் சுரங்க வரலாறு, ஜன்மம் நில உரிமைகள் மற்றும் முதுமலை யானை வழித்தடங்களின் முழுமையான ஆவணம்.'
              : 'A scholarly, archival journey from indigenous forest stewardship and the Victorian gold rush to post-independence Janmam land settlements and international elephant conservation.'}
          </p>
        </div>
      </div>

      {/* 2. CHAPTER NAVIGATION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {GUDALUR_HISTORY_CHAPTERS.map((chap) => {
          const isSelected = selectedChapter.id === chap.id;

          return (
            <div
              key={chap.id}
              onClick={() => setSelectedChapter(chap)}
              className={`p-5 rounded-3xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    CH {chap.number}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                    {chap.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {lang === 'ta' ? chap.titleTa : chap.title}
                </h3>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-bold">
                <span className="text-[11px] text-slate-500 font-normal">{chap.era.split('•')[0]}</span>
                <ChevronRight size={14} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. DETAILED CHAPTER VIEW */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-slate-200">
        
        {/* Chapter Header */}
        <div className="pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
              Chapter {selectedChapter.number}
            </span>
            <span className="text-xs font-bold text-slate-500">
              {selectedChapter.era}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 mt-2">
            {lang === 'ta' ? selectedChapter.titleTa : selectedChapter.title}
          </h2>

          <p className="text-sm font-medium text-emerald-900 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 mt-4 leading-relaxed">
            {lang === 'ta' ? selectedChapter.summaryTa : selectedChapter.summary}
          </p>
        </div>

        {/* Chapter Paragraphs */}
        <div className="py-8 space-y-5 text-sm sm:text-base text-slate-800 leading-relaxed max-w-4xl">
          {(lang === 'ta' ? selectedChapter.contentTa : selectedChapter.content).map((p, idx) => (
            <p key={idx} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Archival Sources */}
        <div className="pt-6 border-t border-slate-100 bg-slate-50/70 p-6 rounded-2xl border border-slate-200">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Landmark size={14} />
            <span>{lang === 'ta' ? 'வரலாற்று ஆதாரங்கள் & ஆவணங்கள்' : 'Archival References & Primary Sources'}</span>
          </h4>
          <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
            {selectedChapter.sources.map((src, i) => (
              <li key={i}>{src}</li>
            ))}
          </ul>
        </div>

      </div>

    </div>
  );
};

export default History;

