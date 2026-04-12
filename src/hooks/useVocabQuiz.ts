import { useState } from 'react';
import { Word, VocabQuiz } from '../types';
import { schedule } from '../lib/fsrs';
import { Rating as FSRSRating } from 'fsrs.js';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { GeminiService } from '../services/geminiService';

export type VocabQuizPhase = 'idle' | 'loading' | 'quiz' | 'results';

export function useVocabQuiz(words: Word[]) {
  const [phase, setPhase] = useState<VocabQuizPhase>('idle');
  const [quizQueue, setQuizQueue] = useState<Word[]>([]);
  const [quizzes, setQuizzes] = useState<Record<string, VocabQuiz>>({});
  const [sessionResults, setSessionResults] = useState<Word[]>([]);

  const start = async () => {
    const memorizedWords = words.filter(w => w.memorized && w.lastRating !== 'Again');
    if (memorizedWords.length === 0) return;

    const selectedWords = [...memorizedWords].sort(() => Math.random() - 0.5).slice(0, 10);
    
    setQuizQueue(selectedWords);
    setSessionResults([]);
    setPhase('loading');
    setQuizzes({});

    try {
      const targetTerms = selectedWords.map(w => w.term);
      const knownTerms = memorizedWords.map(w => w.term);
      const quizList = await GeminiService.generateVocabQuizzes(targetTerms, knownTerms);
      
      const quizMap: Record<string, VocabQuiz> = {};
      quizList.forEach(q => {
        const word = selectedWords.find(w => w.term.toLowerCase() === q.word.toLowerCase());
        if (word) {
          quizMap[word.id] = q;
        }
      });
      setQuizzes(quizMap);
      setPhase('quiz');
    } catch (err) {
      console.error("Failed to generate quizzes", err);
      setPhase('idle');
    }
  };

  const handleQuizAnswer = async (wordId: string, isCorrect: boolean) => {
    const currentWord = quizQueue[0];
    if (!currentWord || currentWord.id !== wordId || !currentWord.fsrs) return;

    let finalRating = isCorrect ? FSRSRating.Good : FSRSRating.Again;
    let finalLabel = isCorrect ? 'Good' : 'Again';

    const updatedFsrs = schedule(currentWord.fsrs, finalRating as any);
    const updatedWord = { 
      ...currentWord, 
      fsrs: updatedFsrs,
      memorized: updatedFsrs.state > 0,
      lastRating: finalLabel
    };

    const wordDoc = doc(getDb(), 'users', USER_ID, 'words', currentWord.id);
    setDoc(wordDoc, updatedWord, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/words/${currentWord.id}`);
    });

    setSessionResults(prev => [...prev, updatedWord]);

    const nextQuizQueue = quizQueue.slice(1);
    setQuizQueue(nextQuizQueue);

    if (nextQuizQueue.length === 0) {
      setPhase('results');
    }
  };

  const reset = () => {
    setPhase('idle');
    setQuizQueue([]);
    setQuizzes({});
    setSessionResults([]);
  };

  return {
    phase,
    quizQueue,
    quizzes,
    sessionResults,
    start,
    handleQuizAnswer,
    reset
  };
}
