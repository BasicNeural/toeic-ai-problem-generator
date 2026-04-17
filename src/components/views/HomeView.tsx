import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Brain,
  Sparkles,
  Flame,
  Settings,
  Calendar as CalendarIcon
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { format, getDay } from 'date-fns';
import { cn, isToday } from '../../lib/utils';
import { useAppContext } from '../../contexts/AppContext';
import { useState, useEffect } from 'react';
import { getStudyDateKey } from '../../lib/time';

interface HomeViewProps {
  onOpenSettings: () => void;
  onOpenMemorizedList: () => void;
}

export function HomeView({ onOpenSettings, onOpenMemorizedList }: HomeViewProps) {
  const navigate = useNavigate();
  const { vocabulary, grammarStats, memorize, solve, vocabQuiz } = useAppContext();
  const { stats: summary, monthlyActivity, getDueTotal: getDueTotal } = vocabulary;
  const stats = grammarStats.stats;

  const [dueTotal, setDueTotal] = useState<number | null>(null);

  useEffect(() => {
    getDueTotal().then(setDueTotal);
  }, [summary.lastUpdated]);

  const todayKey = getStudyDateKey();
  const introducedToday = summary.newWordsToday?.[todayKey] || 0;
  const remainingNewAllowance = Math.max(0, 10 - introducedToday);

  const hasMemorizedWords = summary.memorizedCount > 0;
  const canStudy = summary.totalWords > 0;

  const getDescription = () => {
    if (memorize.queue.length > 0) return `현재 세션에 ${memorize.queue.length}단어 남음`;
    if (dueTotal === null) return '학습 데이터를 확인 중...';

    const availableNewwords = summary.totalWords - summary.memorizedCount;

    // 신규 학습 잔량이 있고 학습할 신규 단어가 있는 경우 최우선 표시
    if (remainingNewAllowance > 0 && availableNewwords > 0) {
      const displayCount = Math.min(availableNewwords, remainingNewAllowance);
      return `오늘 새로운 ${displayCount}개 단어 학습하기`;
    }
    if (dueTotal > 0)
      return '배운 단어 복습하기';
    return '새 단어와 복습을 함께 진행하기';
  };

  const handleStartMemorize = () => {
    memorize.start();
    navigate('/memorize');
  };

  const handleStartVocabQuiz = () => {
    vocabQuiz.start();
    navigate('/vocab-quiz');
  };

  const handleStartSolve = () => {
    solve.start();
    navigate('/solve');
  };

  const currentMonthStr = format(new Date(), 'yyyy년 M월');
  const firstDayOfMonth = monthlyActivity.length > 0 ? getDay(monthlyActivity[0].date) : 0;
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md p-6 space-y-6 pt-12"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 mb-2">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">토익 마스터</h1>
          <p className="text-slate-500 text-sm">AI 기반 단어 & 문법 학습</p>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all"
        >
          <Settings className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1 text-left">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Flame className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">학습일 합계</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary.totalLearningDays}일</div>
          <div className="text-xs text-slate-400">꾸준히 학습 중!</div>
        </div>
        <button
          onClick={onOpenMemorizedList}
          className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-1 text-left hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">외운 단어</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{summary.memorizedCount}</div>
          <div className="text-xs text-slate-400">'Again' 평가 제외</div>
        </button>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleStartMemorize}
          disabled={!canStudy}
          className={cn(
            "w-full group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all text-left flex items-center justify-between",
            canStudy ? "hover:shadow-md cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">
              {memorize.queue.length > 0
                ? '학습 이어서 하기'
                : '단어 암기하기'}
            </h3>
            <p className="text-sm text-slate-500">
              {getDescription()}
            </p>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
            canStudy ? "bg-blue-50 group-hover:bg-blue-600" : "bg-slate-100"
          )}>
            <Brain className={cn(
              "w-6 h-6 transition-colors",
              canStudy ? "text-blue-600 group-hover:text-white" : "text-slate-400"
            )} />
          </div>
        </button>

        <button
          onClick={handleStartVocabQuiz}
          disabled={!hasMemorizedWords}
          className={cn(
            "w-full group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all text-left flex items-center justify-between",
            hasMemorizedWords ? "hover:shadow-md cursor-pointer" : "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">단어 퀴즈</h3>
            <p className="text-sm text-slate-500">외운 단어 테스트하기</p>
          </div>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
            hasMemorizedWords ? "bg-indigo-50 group-hover:bg-indigo-600" : "bg-slate-100"
          )}>
            <Sparkles className={cn(
              "w-6 h-6 transition-colors",
              hasMemorizedWords ? "text-indigo-600 group-hover:text-white" : "text-slate-400"
            )} />
          </div>
        </button>

        <button
          onClick={handleStartSolve}
          className="w-full group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between"
        >
          <div className="space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">문제 풀기</h3>
            <p className="text-sm text-slate-500">외운 단어로 파트 5 문제 풀기</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
            <Sparkles className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
          </div>
        </button>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider">학습 달력</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{currentMonthStr}</span>
        </div>

        <div className="w-full">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-slate-400 py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map(i => (
              <div key={`empty-${i}`} className="aspect-square rounded-xl bg-transparent" />
            ))}
            {monthlyActivity.map((dayData, i) => {
              const hasActivity = dayData.count > 0;
              const today = isToday(dayData.date);
              return (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-xl relative transition-all",
                    hasActivity ? "bg-blue-50 border border-blue-100" : "bg-slate-50 border border-transparent",
                    today && "ring-2 ring-blue-400 ring-offset-1"
                  )}
                >
                  <span className={cn(
                    "absolute inset-0 flex items-center justify-center text-xs font-bold",
                    hasActivity ? "text-blue-700" : "text-slate-400"
                  )}>
                    {format(dayData.date, 'd')}
                  </span>
                  {hasActivity && (
                    <span className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] font-bold text-blue-500 leading-none">
                      {dayData.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900">
            <Brain className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider">문법 숙련도</span>
          </div>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Mastery" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
