import { useState } from 'react';
import { Word, VocabQuiz } from '../types';
import { schedule, createInitialFSRS } from '../lib/fsrs';
import { Rating as FSRSRating } from 'fsrs.js';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GeminiService } from '../services/geminiService';
import { getDailyResetTime } from '../lib/time';

export type MemorizePhase = 'flashcards' | 'quiz' | 'results';

export function useMemorize(words: Word[]) {
  const [phase, setPhase] = useState<MemorizePhase>('flashcards');
  const [queue, setQueue] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [sessionResults, setSessionResults] = useState<Word[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(0);
  
  const [quizzes, setQuizzes] = useState<Record<string, VocabQuiz>>({});
  const [isGeneratingQuizzes, setIsGeneratingQuizzes] = useState(false);
  const [quizQueue, setQuizQueue] = useState<Word[]>([]);
  const [swipeRatings, setSwipeRatings] = useState<Record<string, { rating: FSRSRating, label: string }>>({});

  const start = () => {
    if (queue.length > 0 && !isComplete && phase !== 'results') {
      setCardStartTime(Date.now());
      return;
    }

    const resetTime = getDailyResetTime();
    const introducedTodayCount = words.filter(w => w.introducedAt && new Date(w.introducedAt).getTime() >= resetTime).length;
    const remainingNewWords = Math.max(0, 10 - introducedTodayCount);

    const newWords = words.filter(w => !w.fsrs).sort(() => Math.random() - 0.5);
    const dueWords = words.filter(w => w.fsrs && new Date(w.fsrs.due).getTime() <= Date.now())
      .sort((a, b) => new Date(a.fsrs!.due).getTime() - new Date(b.fsrs!.due).getTime());

    let availableNew = Math.min(newWords.length, remainingNewWords);
    
    let takeNew = Math.min(availableNew, 5);
    let takeDue = Math.min(dueWords.length, 10 - takeNew);

    if (takeNew + takeDue < 10 && availableNew > takeNew) {
      takeNew = Math.min(availableNew, 10 - takeDue);
    }
    
    if (takeNew + takeDue < 10 && dueWords.length > takeDue) {
      takeDue = Math.min(dueWords.length, 10 - takeNew);
    }

    let sessionWordsList = [
      ...newWords.slice(0, takeNew),
      ...dueWords.slice(0, takeDue)
    ];

    if (sessionWordsList.length === 0) {
      return;
    }

    const newSessionWords = sessionWordsList.sort(() => Math.random() - 0.5).map(w => ({
      ...w,
      failCount: 0
    }));
    
    setSessionWords(newSessionWords);
    setQueue(newSessionWords);
    setSessionResults([]);
    setIsComplete(false);
    setPhase('flashcards');
    setCardStartTime(Date.now());
    setQuizzes({});
    setSwipeRatings({});
    setIsGeneratingQuizzes(true);

    if (newSessionWords.length > 0) {
      const targetTerms = newSessionWords.map(w => w.term);
      const knownTerms = words.filter(w => w.memorized).map(w => w.term);
      GeminiService.generateVocabQuizzes(targetTerms, knownTerms)
        .then(quizList => {
          const quizMap: Record<string, VocabQuiz> = {};
          quizList.forEach(q => {
            const word = newSessionWords.find(w => w.term.toLowerCase() === q.word.toLowerCase());
            if (word) {
              quizMap[word.id] = q;
            }
          });
          setQuizzes(quizMap);
        })
        .catch(err => console.error("Failed to generate quizzes", err))
        .finally(() => setIsGeneratingQuizzes(false));
    } else {
      setIsGeneratingQuizzes(false);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentWord = queue[0];
    if (!currentWord) return;

    const elapsedSeconds = (Date.now() - cardStartTime) / 1000;
    const failCount = currentWord.failCount || 0;

    if (direction === 'right') {
      let rating: FSRSRating;
      let ratingLabel: string;

      if (failCount >= 2) {
        rating = FSRSRating.Again;
        ratingLabel = 'Again';
      } else if (failCount === 1 || elapsedSeconds > 30) {
        rating = FSRSRating.Hard;
        ratingLabel = 'Hard';
      } else if (elapsedSeconds <= 10) {
        rating = FSRSRating.Easy;
        ratingLabel = 'Easy';
      } else {
        rating = FSRSRating.Good;
        ratingLabel = 'Good';
      }

      setSwipeRatings(prev => ({
        ...prev,
        [currentWord.id]: { rating, label: ratingLabel }
      }));

      const nextQueue = queue.slice(1);
      setQueue(nextQueue);
      
      if (nextQueue.length === 0) {
        setQuizQueue([...sessionWords]);
        setPhase('quiz');
      } else {
        setCardStartTime(Date.now());
      }
    } else {
      const updatedWord = {
        ...currentWord,
        failCount: failCount + 1
      };

      const nextQueue = queue.slice(1);
      if (nextQueue.length === 0) {
        setQueue([updatedWord]);
      } else {
        const minIndex = 1;
        const maxIndex = nextQueue.length;
        const randomIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
        
        const newQueue = [...nextQueue];
        newQueue.splice(randomIndex, 0, updatedWord);
        setQueue(newQueue);
      }
      setCardStartTime(Date.now());
    }
  };

  const handleQuizAnswer = async (wordId: string, isCorrect: boolean) => {
    const currentWord = sessionWords.find(w => w.id === wordId);
    if (!currentWord) return;

    let finalRating = swipeRatings[wordId]?.rating ?? FSRSRating.Good;
    let finalLabel = swipeRatings[wordId]?.label ?? 'Good';

    if (!isCorrect) {
      finalRating = FSRSRating.Again;
      finalLabel = 'Again';
    }

    const currentFsrs = currentWord.fsrs || createInitialFSRS();
    const updatedFsrs = schedule(currentFsrs, finalRating as any);
    const updatedWord = { 
      ...currentWord, 
      fsrs: updatedFsrs,
      memorized: updatedFsrs.state > 0,
      lastRating: finalLabel,
      introducedAt: currentWord.introducedAt || new Date().toISOString()
    };

    const wordDoc = doc(getDb(), 'users', USER_ID, 'words', currentWord.id);
    setDoc(wordDoc, updatedWord, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/words/${currentWord.id}`);
    });

    setSessionResults(prev => {
      if (prev.some(w => w.id === updatedWord.id)) return prev;
      return [...prev, updatedWord];
    });

    const nextQuizQueue = quizQueue.slice(1);
    setQuizQueue(nextQuizQueue);

    if (nextQuizQueue.length === 0) {
      setIsComplete(true);
      setPhase('results');
    }
  };

  return { 
    phase, 
    queue, 
    quizQueue,
    quizzes,
    isGeneratingQuizzes,
    sessionResults, 
    isComplete, 
    start, 
    handleSwipe,
    handleQuizAnswer
  };
}
