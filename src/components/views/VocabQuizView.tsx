import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CheckCircle2, ChevronLeft, Loader2, XCircle, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppContext } from '../../contexts/AppContext';

export function VocabQuizView() {
  const navigate = useNavigate();
  const { vocabQuiz } = useAppContext();
  const { 
    phase, quizQueue, quizzes, sessionResults, handleQuizAnswer, reset 
  } = vocabQuiz;

  const currentQuizWord = quizQueue[0];
  const currentQuiz = currentQuizWord ? quizzes[currentQuizWord.id] : null;

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleBack = () => {
    reset();
    navigate('/');
  };

  const handleOptionSelect = (optionKey: string) => {
    if (selectedOption || !currentQuiz) return;
    setSelectedOption(optionKey);
    setShowExplanation(true);
  };

  const handleNextQuiz = () => {
    if (!currentQuizWord || !currentQuiz || !selectedOption) return;
    const isCorrect = selectedOption === currentQuiz.answer;
    handleQuizAnswer(currentQuizWord.id, isCorrect);
    setSelectedOption(null);
    setShowExplanation(false);
  };

  if (phase === 'loading') {
    return (
      <div className="w-full max-w-md h-screen flex flex-col items-center justify-center p-6 bg-blue-600 text-white relative overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center z-10"
        >
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
            <Loader2 className="w-16 h-16 animate-spin relative z-10" />
            <Sparkles className="w-6 h-6 absolute -top-2 -right-2 text-yellow-300 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">AI가 문제를 만드는 중입니다</h2>
          <p className="text-blue-100 font-medium opacity-90">
            외운 단어들을 바탕으로<br/>맞춤형 퀴즈를 구성하고 있어요...
          </p>
        </motion.div>
        
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-20%] left-[20%] w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000" />
        </div>
      </div>
    );
  }

  if (phase === 'results') {
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
          <h2 className="text-2xl font-bold text-slate-900">퀴즈 완료!</h2>
          <p className="text-slate-500">{sessionResults.length}개의 단어를 테스트했습니다.</p>
        </div>

        <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/50 text-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">퀴즈 결과</span>
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
          onClick={handleBack}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          완료
        </button>
      </motion.div>
    );
  }

  if (phase === 'quiz') {
    if (!currentQuiz) {
      return (
        <div className="w-full max-w-md h-screen flex flex-col items-center justify-center p-6 space-y-6">
          <p className="text-slate-500">이 단어에 대한 퀴즈를 생성할 수 없습니다.</p>
          <button 
            onClick={() => handleQuizAnswer(currentQuizWord!.id, true)}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl"
          >
            건너뛰기
          </button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-md h-screen flex flex-col p-6 overflow-hidden">
        <header className="flex items-center justify-between mb-8">
          <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <ChevronLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">단어 퀴즈</span>
            <span className="text-sm font-bold text-slate-900">{quizQueue.length}개 남음</span>
          </div>
          <div className="w-10" />
        </header>

        <div className="flex-1 flex flex-col w-full max-w-sm mx-auto space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <p className="text-lg font-medium text-slate-800 leading-relaxed">
              {currentQuiz.question}
            </p>
            {currentQuiz.vocabulary && currentQuiz.vocabulary.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 mt-4 border-t border-slate-50">
                {currentQuiz.vocabulary.map((vocab, idx) => (
                  <div key={idx} className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">{vocab.word}</span>
                    <span className="text-[10px] text-slate-400">{vocab.meaning}</span>
                  </div>
                ))}
              </div>
            )}
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

  return null;
}
