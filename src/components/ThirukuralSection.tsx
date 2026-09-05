import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { athirukural, footerQuote } from '../data/thirukural';

interface Cloud {
  id: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

const MagicText: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const [visibleWords, setVisibleWords] = useState(0);
  // Preserve exact spacing: split on spaces but keep track of original spacing
  const segments = text.split(/(\s+)/).filter(Boolean);
  const wordIndices = segments.reduce<number[]>((acc, seg, i) => {
    if (seg.trim()) acc.push(i);
    return acc;
  }, []);

  useEffect(() => {
    setVisibleWords(0);
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleWords((prev) => {
          if (prev >= wordIndices.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 420);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay, wordIndices.length]);

  let wordCount = 0;
  return (
    <span className="inline-block">
      {segments.map((segment, i) => {
        if (!segment.trim()) {
          // Preserve exact whitespace from original text
          return <span key={i}>{segment}</span>;
        }
        const currentWordIndex = wordCount;
        wordCount++;
        const isVisible = currentWordIndex < visibleWords;
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={
              isVisible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 10 }
            }
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="inline-block"
            style={{
              textShadow: isVisible ? '0 0 8px rgba(76, 175, 80, 0.4)' : 'none',
            }}
          >
            {segment}
          </motion.span>
        );
      })}
    </span>
  );
};

const FloatingCloud: React.FC<{ cloud: Cloud }> = ({ cloud }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${cloud.x}%`, top: `${cloud.y}%`, opacity: cloud.opacity }}
    animate={{ x: [0, 20, -10, 5, 0] }}
    transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg width={80 * cloud.scale} height={40 * cloud.scale} viewBox="0 0 120 60">
      <ellipse cx="60" cy="40" rx="50" ry="18" fill="white" fillOpacity="0.6" />
      <ellipse cx="40" cy="30" rx="30" ry="22" fill="white" fillOpacity="0.7" />
      <ellipse cx="75" cy="28" rx="28" ry="20" fill="white" fillOpacity="0.65" />
      <ellipse cx="55" cy="22" rx="25" ry="18" fill="white" fillOpacity="0.75" />
    </svg>
  </motion.div>
);

export const ThirukuralSection: React.FC = () => {
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const [clouds] = useState<Cloud[]>(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 40,
      scale: 0.4 + Math.random() * 0.5,
      opacity: 0.2 + Math.random() * 0.3,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLangIndex((prev) => (prev + 1) % athirukural.languages.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const currentKural = athirukural.languages[currentLangIndex];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(240,248,240,0.99) 50%, rgba(255,255,255,0.97) 100%)',
        minHeight: '100vh',
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {clouds.map((cloud) => (<FloatingCloud key={cloud.id} cloud={cloud} />))}
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center min-h-screen px-4 py-6 gap-6">
        <div className="flex-1 max-w-2xl w-full flex flex-col items-center justify-center text-center px-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="mb-3 px-4 py-1.5 rounded-full bg-green-100 border border-green-300">
            <span className="text-green-800 font-bold text-xs sm:text-sm">Thirukural #{athirukural.number} | {athirukural.chapter}</span>
          </motion.div>
          <div className="mb-3">
            <span className="inline-block px-3 py-1 rounded-full bg-green-600 text-white text-xs font-bold">{currentKural.language}</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={currentLangIndex} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.5 }} className="w-full">
              <p className="text-lg sm:text-xl md:text-2xl font-bold leading-relaxed mb-4 text-green-900">
                <MagicText text={currentKural.text} delay={440} />
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="flex gap-2 mt-2">
            {athirukural.languages.map((lang, i) => (
              <button key={i} onClick={() => setCurrentLangIndex(i)} title={lang.language} className={`w-3 h-3 rounded-full transition-all duration-300 ${i === currentLangIndex ? 'bg-green-600 scale-125 ring-2 ring-green-300' : 'bg-green-300 hover:bg-green-400'}`} />
            ))}
          </div>
        </div>
        <div className="flex-1 max-w-2xl w-full flex flex-col items-center justify-center px-4 gap-4">
          <AnimatePresence mode="wait">
            <motion.div key={`meaning-${currentLangIndex}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6, delay: 0.8 }} className="w-full p-4 sm:p-6 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(27, 94, 32, 0.06) 0%, rgba(46, 125, 50, 0.1) 100%)', border: '1px solid rgba(76, 175, 80, 0.15)' }}>
              <h4 className="text-sm font-bold text-green-700 mb-2 flex items-center gap-2">
                <span>📖</span> Meaning
              </h4>
              <p className="text-sm sm:text-base text-green-800 leading-relaxed">{currentKural.meaning}</p>
            </motion.div>
          </AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="w-full p-4 sm:p-6 rounded-2xl text-center" style={{ background: 'linear-gradient(135deg, rgba(27, 94, 32, 0.08) 0%, rgba(46, 125, 50, 0.12) 100%)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
            <div className="text-2xl mb-2">🌿</div>
            <p className="text-base sm:text-lg font-bold text-green-900 leading-relaxed whitespace-pre-line">{footerQuote.tamil}</p>
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs sm:text-sm text-green-700 italic">{footerQuote.english}</p>
            </div>
          </motion.div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
    </section>
  );
};

export default ThirukuralSection;
