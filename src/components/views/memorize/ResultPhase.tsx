import { motion } from 'motion/react';
import { Trophy, CheckCircle2, XCircle } from 'lucide-react';
import { Word } from '../../../types';
import { cn } from '../../../lib/utils';

interface ResultPhaseProps {
  sessionResults: Word[];
  onBack: () => void;
}

export function ResultPhase({ sessionResults, onBack }: ResultPhaseProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-md p-6 space-y-8 pt-12 flex flex-col items-center"
    >
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
        <Trophy className="w-10 h-10 text-emerald-600" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">학습 완료!</h2>
        <p className="text-slate-500">{sessionResults.length}개의 단어를 복습했습니다.</p>
      </div>

      <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/50 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">최종 결과</span>
        </div>
        <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
          {sessionResults.map((word, index) => (
            <div key={`${word.id}-${index}`} className="p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-medium text-slate-700">{word.term}</span>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider",
                  word.lastRating === 'Easy' && "text-emerald-500",
                  word.lastRating === 'Good' && "text-blue-500",
                  word.lastRating === 'Hard' && "text-amber-500",
                  word.lastRating === 'Again' && "text-rose-500"
                )}>
                  {word.lastRating}
                </span>
              </div>
              {word.lastRating === 'Again' ? (
                <XCircle className="w-4 h-4 text-rose-500" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={onBack}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
      >
        완료
      </button>
    </motion.div>
  );
}
