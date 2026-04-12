import { motion } from 'motion/react';
import { X, CheckCircle2, Clock } from 'lucide-react';
import { Word } from '../../types';
import { cn } from '../../lib/utils';

interface MemorizedWordsModalProps {
  words: Word[];
  onClose: () => void;
}

function getRelativeTime(dateString?: string) {
  if (!dateString) return '';
  const due = new Date(dateString).getTime();
  const now = Date.now();
  const diff = due - now;
  
  if (diff <= 0) return '지금 복습 필요';
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}분 뒤`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 뒤`;
  
  const days = Math.floor(hours / 24);
  return `${days}일 뒤`;
}

export function MemorizedWordsModal({ words, onClose }: MemorizedWordsModalProps) {
  const sortedWords = [...words].sort((a, b) => {
    const dueA = a.fsrs?.due ? new Date(a.fsrs.due).getTime() : Infinity;
    const dueB = b.fsrs?.due ? new Date(b.fsrs.due).getTime() : Infinity;
    return dueA - dueB;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h2 className="font-bold text-slate-800">외운 단어 ({words.length})</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {sortedWords.length === 0 ? (
            <p className="text-center text-slate-500 py-8">아직 외운 단어가 없습니다.</p>
          ) : (
            sortedWords.map(word => (
              <div key={word.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex justify-between items-center gap-4">
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-slate-800 text-lg truncate">{word.term}</span>
                  <span className="text-sm text-slate-500 truncate mb-1">
                    {word.meanings.map(m => m.definition).join(', ')}
                  </span>
                  {word.fsrs?.due && (
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{getRelativeTime(word.fsrs.due)}</span>
                    </div>
                  )}
                </div>
                {word.lastRating && (
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0",
                    word.lastRating === 'Easy' && "bg-emerald-50 text-emerald-600",
                    word.lastRating === 'Good' && "bg-blue-50 text-blue-600",
                    word.lastRating === 'Hard' && "bg-amber-50 text-amber-600",
                    word.lastRating === 'Again' && "bg-rose-50 text-rose-600"
                  )}>
                    {word.lastRating}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
