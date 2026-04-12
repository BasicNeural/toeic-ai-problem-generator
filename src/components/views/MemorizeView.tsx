import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { FlashcardPhase } from './memorize/FlashcardPhase';
import { QuizPhase } from './memorize/QuizPhase';
import { ResultPhase } from './memorize/ResultPhase';

export function MemorizeView() {
  const navigate = useNavigate();
  const { memorize } = useAppContext();
  const { 
    phase, queue, quizQueue, quizzes, isGeneratingQuizzes, isComplete, sessionResults, 
    handleSwipe, handleQuizAnswer 
  } = memorize;

  const handleBack = () => {
    navigate('/');
  };

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
