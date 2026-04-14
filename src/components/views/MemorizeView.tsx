import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { FlashcardPhase } from './memorize/FlashcardPhase';
import { QuizPhase } from './memorize/QuizPhase';
import { ResultPhase } from './memorize/ResultPhase';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function MemorizeView() {
  const navigate = useNavigate();
  const { memorize } = useAppContext();
  const { 
    phase, queue, quizQueue, quizzes, isGeneratingQuizzes, isComplete, sessionResults, 
    handleSwipe, handleQuizAnswer, isLoadingSession
  } = memorize;

  const handleBack = () => {
    navigate('/');
  };

  if (isLoadingSession) {
    return (
      <div className="w-full max-w-md h-dvh flex flex-col items-center justify-center p-6 bg-white">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 font-medium">학습 세션을 불러오는 중...</p>
        </motion.div>
      </div>
    );
  }

  if (phase === 'results' || isComplete) {
    return <ResultPhase sessionResults={sessionResults} onBack={handleBack} />;
  }

  if (phase === 'quiz') {
    return (
      <QuizPhase 
        quizQueue={quizQueue}
        quizzes={quizzes}
        isGeneratingQuizzes={isGeneratingQuizzes}
        onQuizAnswer={handleQuizAnswer}
      />
    );
  }

  return (
    <FlashcardPhase 
      queue={queue}
      onSwipe={handleSwipe}
      onBack={handleBack}
    />
  );
}
