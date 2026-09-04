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
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setVisibleChars((prev) => {
          if (prev >= text.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 60);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [text, delay]);

  return (
    <span className="inline-block">
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={
            i < visibleChars
              ? { opacity: 1, y: 0, scale: 1 }
              : { opacity: 0, y: 20, scale: 0.5 }
          }
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="inline-block"
          style={{
            textShadow: i < visibleChars ? '0 0 20px rgba(76, 175, 80, 0.8)' : 'none',
          }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
};

const FloatingCloud: React.FC<{ cloud: Cloud }> = ({ cloud }) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: `${cloud.x}%`, top: `${cloud.y}%`, opacity: cloud.opacity }}
    animate={{ x: [0, 30, -20, 10, 0], y: [0, -10, 5, -5, 0] }}
    transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
  >
    <svg width={100 * cloud.scale} height={50 * cloud.scale} viewBox="0 0 120 60">
      <ellipse cx="60" cy="40" rx="50" ry="18" fill="white" fillOpacity="0.7" />
      <ellipse cx="40" cy="30" rx="30" ry="22" fill="white" fillOpacity="0.8" />
      <ellipse cx="75" cy="28" rx="28" ry="20" fill="white" fillOpacity="0.75" />
      <ellipse cx="55" cy="22" rx="25" ry="18" fill="white" fillOpacity="0.85" />
    </svg>
  </motion.div>
);

export const ThirukuralSection: React.FC = () => {
  const [currentLangIndex, setCurrentLangIndex] = useState(0);
  const [clouds] = useState<Cloud[]>(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 60,
      scale: 0.5 + Math.random() * 0.8,
      opacity: 0.3 + Math.random() * 0.4,
    }))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLangIndex((prev) => (prev + 1) % athirukural.languages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentKural = athirukural.languages[currentLangIndex];

  return (
    <section
      className="relative min-h-[500px] flex flex-col items-center justify-center overflow-hidden py-16 px-4"
      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,248,240,0.98) 50%, rgba(255,255,255,0.95) 100%)' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        {clouds.map((cloud) => (<FloatingCloud key={cloud.id} cloud={cloud} />))}
      </div>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.6 }} className="mb-6 px-4 py-2 rounded-full bg-green-100 border border-green-300">
        <span className="text-green-800 font-bold text-sm">Thirukural #{athirukural.number}</span>
      </motion.div>
      <motion.h3 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-lg md:text-xl font-bold text-green-700 mb-8 text-center">
        {athirukural.chapter}
      </motion.h3>
      <AnimatePresence mode="wait">
        <motion.div key={currentLangIndex} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center mb-8">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-green-600 text-white text-xs font-bold">{currentKural.language}</span>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold leading-relaxed mb-6 text-green-900">
            <MagicText text={currentKural.text} delay={500} />
          </p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 0.8 }} className="text-base md:text-lg text-green-800 leading-relaxed max-w-2xl mx-auto">
            {currentKural.meaning}
          </motion.p>
        </motion.div>
      </AnimatePresence>
      <div className="flex gap-2 mb-12">
        {athirukural.languages.map((_, i) => (
          <button key={i} onClick={() => setCurrentLangIndex(i)} className={`w-3 h-3 rounded-full transition-all duration-300 ${i === currentLangIndex ? 'bg-green-600 scale-125' : 'bg-green-300 hover:bg-green-400'}`} />
        ))}
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="max-w-2xl mx-auto text-center mt-8 p-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(27, 94, 32, 0.08) 0%, rgba(46, 125, 50, 0.12) 100%)', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
        <div className="text-4xl mb-4">🌿</div>
        <p className="text-lg md:text-xl font-bold text-green-900 leading-relaxed whitespace-pre-line">{footerQuote.tamil}</p>
        <div className="mt-4 pt-4 border-t border-green-200">
          <p className="text-sm text-green-700 italic">{footerQuote.english}</p>
        </div>
      </motion.div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
    </section>
  );
};

export default ThirukuralSection;
