import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Word, VocabQuiz } from '../../../types';
import { cn } from '../../../lib/utils';

interface QuizPhaseProps {
  quizQueue: Word[];
  quizzes: Record<string, VocabQuiz>;
  isGeneratingQuizzes: boolean;
  onQuizAnswer: (wordId: string, isCorrect: boolean) => void;
}

export function QuizPhase({ quizQueue, quizzes, isGeneratingQuizzes, onQuizAnswer }: QuizPhaseProps) {
  const currentQuizWord = quizQueue[0];
  const currentQuiz = currentQuizWord ? quizzes[currentQuizWord.id] : null;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionSelect = (optionKey: string) => {
    if (selectedOption || !currentQuiz) return;
    setSelectedOption(optionKey);
    setShowExplanation(true);
  };

  const handleNextQuiz = () => {
    if (!currentQuizWord || !currentQuiz || !selectedOption) return;
    const isCorrect = selectedOption === currentQuiz.answer;
    onQuizAnswer(currentQuizWord.id, isCorrect);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  if (isGeneratingQuizzes && !currentQuiz) {
    return (
      <div className="w-full max-w-md h-dvh flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-900">퀴즈 생성 중...</h2>
        <p className="text-slate-500 text-center mt-2">AI가 검증 퀴즈를 준비하고 있습니다.</p>
      </div>
    );
  }

  if (!currentQuiz) {
    // Fallback if quiz generation failed for this word
    return (
      <div className="w-full max-w-md h-dvh flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-slate-900">퀴즈를 생성할 수 없습니다</h2>
          <p className="text-slate-500 text-sm">
            AI 퀴즈 생성 한도를 초과했거나 네트워크 오류가 발생했습니다.<br/>
            이 단어는 퀴즈 없이 바로 복습 결과에 반영됩니다.
          </p>
        </div>
        <button 
          onClick={() => onQuizAnswer(currentQuizWord!.id, true)}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          결과 저장하고 넘어가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md h-dvh flex flex-col p-6 overflow-hidden">
      <header className="flex items-center justify-between mb-8">
        <div className="w-10" />
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">검증 퀴즈</span>
          <span className="text-sm font-bold text-slate-900">{quizQueue.length}개 남음</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col w-full max-w-sm mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <p className="text-lg font-medium text-slate-800 leading-relaxed">
            {currentQuiz.question}
          </p>
        </div>

        <div className="space-y-3">
          {(Object.entries(currentQuiz.options) as [string, string][]).map(([key, value]) => {
            const isSelected = selectedOption === key;
            const isCorrect = key === currentQuiz.answer;
            const showStatus = showExplanation;

            let buttonClass = "w-full p-4 rounded-2xl border-2 text-left font-medium transition-all ";
            
            if (!showStatus) {
              buttonClass += "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50 text-slate-700";
            } else {
              if (isCorrect) {
                buttonClass += "border-emerald-500 bg-emerald-50 text-emerald-700";
              } else if (isSelected && !isCorrect) {
                buttonClass += "border-rose-500 bg-rose-50 text-rose-700";
              } else {
                buttonClass += "border-slate-100 bg-white text-slate-400 opacity-50";
              }
            }

            return (
              <button
                key={key}
                disabled={showExplanation}
                onClick={() => handleOptionSelect(key)}
                className={buttonClass}
              >
                <span className="inline-block w-6 font-bold opacity-50 uppercase">{key}</span>
                {value}
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 space-y-6"
            >
              <div className={cn(
                "p-4 rounded-2xl text-sm font-medium",
                selectedOption === currentQuiz.answer 
                  ? "bg-emerald-50 text-emerald-800" 
                  : "bg-rose-50 text-rose-800"
              )}>
                {selectedOption === currentQuiz.answer ? '정답입니다! 🎉' : '틀렸습니다. 🥲'}
                <div className="mt-3 space-y-2">
                  <p className="text-slate-700 font-medium border-l-2 border-current pl-3 py-1">
                    {currentQuiz.translation.split(/(<u>.*?<\/u>)/g).map((part, i) => {
                      if (part.startsWith('<u>') && part.endsWith('</u>')) {
                        return <u key={i} className="underline decoration-2 underline-offset-2 decoration-blue-500">{part.slice(3, -4)}</u>;
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </p>
                  <p className="text-slate-600 font-normal">{currentQuiz.explanation}</p>
                </div>
              </div>

              <button
                onClick={handleNextQuiz}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-800 transition-all"
              >
                다음
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
