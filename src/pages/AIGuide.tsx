import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  MapPin, 
  Compass, 
  Coffee, 
  Landmark, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { chatWithGuideStream } from '../services/aiService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const AIGuide: React.FC = () => {
  const { profile } = useAuth();
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const civicSuggestions = [
    { text: "How do I log a TANGEDCO power failure with Minnal?", icon: Landmark },
    { text: "What are the Mudumalai & Bandipur night closure timings?", icon: AlertTriangle },
    { text: "How to safely report wild elephant sightings near residential areas?", icon: Compass },
    { text: "Explain the history of Section 17 Janmam Land in Gudalur.", icon: HelpCircle },
    { text: "How to manage blister blight in Nilgiris small tea estates?", icon: Coffee },
  ];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);
      
      let fullContent = '';
      const stream = chatWithGuideStream(text, [], lang);

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: fullContent } : m
        ));
      }
    } catch (err) {
      toast.error('AI Guide service temporarily unavailable. Please try again.');
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-6">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
          <Sparkles size={14} />
          <span>BILINGUAL PLACE INTELLIGENCE & CIVIC HELPER</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900">
          {t('guide.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          {t('guide.subtitle')}
        </p>
      </div>

      {/* Chat Frame */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-3xl bg-white border border-slate-200 shadow-xs relative">
        
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center space-y-6 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-emerald-400 flex items-center justify-center shadow-lg">
              <Bot size={32} />
            </div>

            <div className="max-w-md space-y-1">
              <h2 className="text-xl font-bold text-slate-900">
                {lang === 'ta' ? 'வணக்கம்! நான் கூடலூர் வழிகாட்டி AI' : 'Vanakkam! I am the Voice of Gudalur AI'}
              </h2>
              <p className="text-xs text-slate-500">
                {lang === 'ta' 
                  ? 'அரசு சேவைகள், யானைகள் பாதுகாப்பு, தேயிலை விவசாயம் மற்றும் கூடலூர் வரலாற்று சந்தேகங்களைக் கேளுங்கள்.'
                  : 'Ask anything about government grievance portals, wildlife safety, tea cultivation, bus timetables, or historical land rights.'}
              </p>
            </div>

            {/* Prompt suggestions */}
            <div className="grid w-full max-w-xl grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              {civicSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s.text)}
                  className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 text-xs font-semibold text-slate-700 transition"
                >
                  <s.icon size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span className="leading-snug">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-3 max-w-[90%] sm:max-w-[80%]",
                  m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold",
                  m.role === 'user' ? "bg-slate-900 text-white" : "bg-emerald-600 text-white"
                )}>
                  {m.role === 'user' ? (profile?.name ? profile.name.charAt(0) : 'U') : <Bot size={18} />}
                </div>

                <div className={cn(
                  "rounded-2xl p-4 text-xs sm:text-sm leading-relaxed",
                  m.role === 'user'
                    ? "bg-slate-900 text-white rounded-tr-none"
                    : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none whitespace-pre-wrap"
                )}>
                  {m.content || (
                    <div className="flex gap-1 py-1">
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-600 [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === 'ta' ? 'கூடலூர் பற்றிய கேள்விகளைக் கேளுங்கள்...' : 'Ask the Gudalur AI Assistant...'}
              className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
export default AIGuide;
