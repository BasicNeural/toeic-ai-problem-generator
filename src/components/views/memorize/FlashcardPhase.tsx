import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { Word } from '../../../types';
import { Flashcard } from '../../ui/Flashcard';

interface FlashcardPhaseProps {
  queue: Word[];
  onSwipe: (dir: 'left' | 'right') => void;
  onBack: () => void;
}

export function FlashcardPhase({ queue, onSwipe, onBack }: FlashcardPhaseProps) {
  const currentWord = queue[0];

  return (
    <div className="w-full max-w-md h-dvh flex flex-col p-6 overflow-hidden">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">단어 암기</span>
          <span className="text-sm font-bold text-slate-900">{queue.length}개 남음</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative flex items-center justify-center w-full">
        <AnimatePresence mode="popLayout">
          {currentWord && (
            <Flashcard 
              key={currentWord.id}
              word={currentWord}
              onSwipe={onSwipe}
            />
          )}
        </AnimatePresence>
      </div>

      <footer className="py-8 flex justify-center gap-12">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400">
            <ChevronLeft className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">모름</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-400">
            <ArrowRight className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">앎</span>
        </div>
      </footer>
    </div>
  );
}
