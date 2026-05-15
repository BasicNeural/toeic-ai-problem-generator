import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Sparkles, Send, RefreshCcw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { SentenceTokens } from '../ui/SentenceTokens';
import { cn } from '../../lib/utils';

export function SentenceTranslateView() {
    const navigate = useNavigate();
    const [showHint, setShowHint] = useState(false);
    const { sentenceTranslate } = useAppContext();
    const { phase, problem, userAnswer, setUserAnswer, result, error, isLoadingSession, generate, generateNext, submit, reset } = sentenceTranslate;

    useEffect(() => {
        setShowHint(false);
    }, [problem?.sentence]);

    const handleBack = () => {
        setShowHint(false);
        reset();
        navigate('/');
    };

    return (
        <div className="w-full max-w-md p-4 pb-12">
            {isLoadingSession ? (
                <div className="h-dvh flex flex-col items-center justify-center p-6 bg-white">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                    <p className="text-slate-500 font-medium">문장 세션을 불러오는 중...</p>
                </div>
            ) : (
                <>
                    <header className="flex items-center justify-between mb-8 pt-4">
                        <button onClick={handleBack} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                            <ChevronLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <span className="text-sm font-bold text-slate-900">문장 번역 공부</span>
                        <div className="w-10" />
                    </header>

                    <main className="space-y-6">
                        {!problem && phase === 'idle' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-5 text-center"
                            >
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-lg">번역할 문장을 만들어 드릴게요</h3>
                                <p className="text-sm text-slate-500 mb-6">
                                    영어 문장을 보고 한국어로 자연스럽게 번역해 보세요.
                                </p>
                                <button
                                    onClick={generate}
                                    className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    문장 생성하기
                                </button>
                            </motion.div>
                        )}

                        {phase === 'loading' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-32 space-y-4"
                            >
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-2" />
                                <h2 className="text-xl font-bold text-slate-900">예제 문장 생성 중...</h2>
                                <p className="text-slate-500 text-center text-sm leading-relaxed">
                                    AI가 번역 연습용 문장을 만들고 있습니다.
                                </p>
                            </motion.div>
                        )}

                        {problem && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">문장 번역</span>
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                            난이도 {problem.difficulty}
                                        </span>
                                    </div>

                                    <div className="p-6 space-y-5">
                                        <div className="space-y-3">
                                            <div className="rounded-2xl bg-slate-50/70 border border-slate-100 p-4">
                                                <SentenceTokens tokens={problem.tokens} />
                                            </div>
                                        </div>

                                        {problem.hint && (
                                            <div className="space-y-2">
                                                {!showHint ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowHint(true)}
                                                        className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                                                    >
                                                        힌트 보기
                                                    </button>
                                                ) : (
                                                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex gap-2">
                                                        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                                        <p className="text-[11px] text-amber-700 leading-relaxed italic">
                                                            힌트: {problem.hint}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">내 번역</label>
                                            <textarea
                                                value={userAnswer}
                                                onChange={(e) => setUserAnswer(e.target.value)}
                                                placeholder="한국어로 번역을 입력하세요"
                                                rows={5}
                                                disabled={phase === 'verifying' || phase === 'result'}
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                                            />
                                        </div>

                                        {error && (
                                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex gap-2">
                                                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                                                <p className="text-[12px] text-rose-700 leading-relaxed">{error}</p>
                                            </div>
                                        )}

                                        {!result ? (
                                            <button
                                                onClick={submit}
                                                disabled={!userAnswer.trim() || phase === 'verifying'}
                                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {phase === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                번역 확인
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {result && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className={cn(
                                                'bg-white rounded-3xl shadow-sm border overflow-hidden',
                                                result.isValid ? 'border-emerald-100' : 'border-amber-100'
                                            )}
                                        >
                                            <div className="p-6 space-y-4">
                                                <div className={cn('flex items-center gap-2', result.isValid ? 'text-emerald-600' : 'text-amber-600')}>
                                                    <Sparkles className="w-4 h-4" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        {result.isValid ? '검증 통과' : '검증 피드백'}
                                                    </span>
                                                </div>
                                                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
                                                    <Markdown>{result.feedback}</Markdown>
                                                </div>

                                                <div className="pt-3 border-t border-slate-100">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">모범 답안</div>
                                                    <p className="text-sm text-slate-700 leading-relaxed">{result.modelAnswer}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <button
                                    onClick={generateNext}
                                    className="w-full py-4 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                    다음 문장
                                </button>
                            </motion.div>
                        )}
                    </main>
                </>
            )}
        </div>
    );
}