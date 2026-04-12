import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { HelpCircle, Volume2 } from 'lucide-react';
import { Word } from '../../types';

interface FlashcardProps {
  word: Word;
  onSwipe: (dir: 'left' | 'right') => void;
}

export function Flashcard({ word, onSwipe }: FlashcardProps) {
  const [showMeaning, setShowMeaning] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const knowOpacity = useTransform(x, [0, 100], [0, 1]);
  const dontKnowOpacity = useTransform(x, [0, -100], [0, 1]);

  const playAudio = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering other click events
    if (!window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word.term);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Slightly slower for clearer pronunciation
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ 
        x: exitDirection === 'right' ? 1000 : exitDirection === 'left' ? -1000 : 0,
        opacity: 0,
        scale: 0.8,
        rotate: exitDirection === 'right' ? 45 : exitDirection === 'left' ? -45 : 0,
        transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
      }}
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        const threshold = 100;
        const velocityThreshold = 500;
        if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
          setExitDirection('right');
          onSwipe('right');
        } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
          setExitDirection('left');
          onSwipe('left');
        }
      }}
      className="absolute w-full max-w-[320px] aspect-[3/4] bg-white rounded-[40px] shadow-xl border border-slate-100 flex flex-col overflow-hidden cursor-grab active:cursor-grabbing z-10 touch-none"
    >
      {/* Top: Word */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 overflow-hidden relative">
        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em]">Vocabulary</span>
        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">{word.term}</h2>
        <button 
          onClick={playAudio}
          className="mt-2 p-3 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-500 transition-colors"
          title="발음 듣기"
        >
          <Volume2 className={`w-6 h-6 ${isPlaying ? 'animate-pulse text-blue-500' : ''}`} />
        </button>
      </div>

      {/* Bottom: Meaning Reveal */}
      <div className="h-1/2 bg-slate-50 border-t border-slate-100 p-8 flex flex-col items-center justify-center relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!showMeaning ? (
            <motion.button
              key="reveal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => setShowMeaning(true)}
              className="flex flex-col items-center gap-3 text-slate-400 hover:text-blue-500 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                <HelpCircle className="w-8 h-8" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest">Tap to reveal</span>
            </motion.button>
          ) : (
            <motion.div
              key="meaning"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-4"
            >
              {word.meanings.map((m, i) => (
                <div key={i} className="text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">[{m.wordClass}]</span>
                  <p className="text-lg text-slate-700 leading-relaxed font-medium">
                    {m.definition}
                  </p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe Indicators */}
      <motion.div 
        style={{ opacity: knowOpacity }}
        className="absolute top-8 right-8 bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg"
      >
        Know
      </motion.div>
      <motion.div 
        style={{ opacity: dontKnowOpacity }}
        className="absolute top-8 left-8 bg-rose-500 text-white px-4 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg"
      >
        Don't Know
      </motion.div>
    </motion.div>
  );
}
