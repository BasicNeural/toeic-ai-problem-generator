import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Send, 
  Loader2, 
  AlertCircle, 
  Check, 
  Sparkles, 
  RefreshCcw,
  Star
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { useAppContext } from '../../contexts/AppContext';

export function SolveView() {
  const navigate = useNavigate();
  const { solve } = useAppContext();
  const { 
    isLoading, result, selectedOption, setSelectedOption, 
    showExplanation, generate, checkAnswer 
  } = solve;

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="w-full max-w-md p-4 pb-12">
      <header className="flex items-center justify-between mb-8 pt-4">
        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <span className="text-sm font-bold text-slate-900">문제 생성기</span>
        <div className="w-10" />
      </header>

      <main className="space-y-6">
        {!result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5 text-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">연습할 준비가 되셨나요?</h3>
            <p className="text-sm text-slate-500 mb-6">
              외운 단어를 활용하여 토익 파트 5 문제를 만들어 드릴게요.
            </p>
            <button
              onClick={generate}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              문제 생성하기
            </button>
          </motion.div>
        )}

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 space-y-4"
          >
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-2" />
            <h2 className="text-xl font-bold text-slate-900">맞춤형 문제 생성 중...</h2>
            <p className="text-slate-500 text-center text-sm leading-relaxed">
              AI가 취약한 문법을 분석하여<br/>새로운 문제를 출제하고 있습니다.
            </p>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    토익 파트 5
                  </span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3", i < result.difficulty ? "text-amber-400 fill-amber-400" : "text-slate-200")} />
                    ))}
                  </div>
                </div>
                {showExplanation && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {result.grammar}
                  </span>
                )}
              </div>

              <div className="p-6 space-y-6">
                {result.comments && (
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed italic">
                      참고: {result.comments}
                    </p>
                  </div>
                )}

                <div className="text-lg font-medium text-slate-800 leading-relaxed">
                  {result.question.split('_______').map((part: string, i: number, arr: string[]) => (
                    <span key={i}>
                      {part}
                      {i < arr.length - 1 && (
                        <span className="inline-block w-20 border-b-2 border-slate-300 mx-1 align-bottom h-6" />
                      )}
                    </span>
                  ))}
                </div>

                {result.vocabulary && result.vocabulary.length > 0 && (
                  <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2 border-t border-slate-50">
                    {result.vocabulary.map((vocab, idx) => (
                      <div key={idx} className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500">{vocab.word}</span>
                        <span className="text-[10px] text-slate-400">{vocab.meaning}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  {Object.entries(result.options).map(([key, value]: [string, any]) => (
                    <button
                      key={key}
                      onClick={() => !showExplanation && setSelectedOption(key)}
                      disabled={showExplanation}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                        selectedOption === key 
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-200" 
                          : "bg-white border-slate-100 hover:border-blue-100 hover:bg-slate-50",
                        showExplanation && key === result.answer && "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200",
                        showExplanation && selectedOption === key && key !== result.answer && "bg-rose-50 border-rose-200 ring-1 ring-rose-200"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                        selectedOption === key 
                          ? "bg-blue-600 text-white" 
                          : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600",
                        showExplanation && key === result.answer && "bg-emerald-600 text-white",
                        showExplanation && selectedOption === key && key !== result.answer && "bg-rose-600 text-white"
                      )}>
                        {key.toUpperCase()}
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        selectedOption === key ? "text-blue-900" : "text-slate-600",
                        showExplanation && key === result.answer && "text-emerald-900",
                        showExplanation && selectedOption === key && key !== result.answer && "text-rose-900"
                      )}>
                        {value}
                      </span>
                      {showExplanation && key === result.answer && (
                        <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>

                {!showExplanation && (
                  <button
                    onClick={() => checkAnswer(selectedOption!)}
                    disabled={!selectedOption}
                    className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all"
                  >
                    정답 확인
                  </button>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">해설</span>
                    </div>
                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                      <Markdown>{result.explanation}</Markdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={generate}
              className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              다음 문제
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
