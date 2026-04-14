import { useState, useEffect, useCallback } from 'react';
import { Word, VocabQuiz, VocabQuizSession } from '../types';
import { schedule } from '../lib/fsrs';
import { Rating as FSRSRating } from 'fsrs.js';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { collection, doc, getDocs, writeBatch, query, where, limit, increment, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { GeminiService } from '../services/geminiService';
import { format } from 'date-fns';

export type VocabQuizPhase = 'idle' | 'loading' | 'quiz' | 'results';

export function useVocabQuiz() {
  const [phase, setPhase] = useState<VocabQuizPhase>('idle');
  const [quizQueue, setQuizQueue] = useState<Word[]>([]);
  const [quizzes, setQuizzes] = useState<Record<string, VocabQuiz>>({});
  const [sessionResults, setSessionResults] = useState<Word[]>([]);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. Try to load active session
        const sessionDoc = await getDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'vocabQuiz'));
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data() as VocabQuizSession;
          setPhase(sessionData.phase);
          setQuizQueue(sessionData.quizQueue);
          setSessionResults(sessionData.sessionResults);
        }

        // 2. Load cached quizzes
        const snapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'vocabQuizzes'));
        if (!snapshot.empty) {
          const cached: Record<string, VocabQuiz> = {};
          snapshot.forEach(d => { cached[d.id] = d.data() as VocabQuiz; });
          setQuizzes(cached);
        }
      } catch (err) {
        console.error("Failed to load vocab quiz session/cache", err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadInitialData();
  }, []);

  const saveSession = useCallback(async (updates: Partial<VocabQuizSession>) => {
    try {
      await setDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'vocabQuiz'), {
        updatedAt: Date.now(),
        ...updates
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save vocab quiz session", err);
    }
  }, []);

  const start = async () => {
    if (quizQueue.length > 0 && phase === 'quiz') return;

    setPhase('loading');
    setQuizzes({});

    const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
    const q = query(wordsRef, where('memorized', '==', true), limit(20));
    const snapshot = await getDocs(q);
    
    let memorizedWords = snapshot.docs.map(d => d.data() as Word).filter(w => w.lastRating !== 'Again');
    if (memorizedWords.length === 0) {
      setPhase('idle');
      return;
    }

    const selectedWords = memorizedWords.sort(() => Math.random() - 0.5).slice(0, 10);
    setQuizQueue(selectedWords);
    setSessionResults([]);

    // Save initial session
    await saveSession({
      phase: 'loading',
      quizQueue: selectedWords,
      sessionResults: [],
    });

    try {
      const cachedSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'vocabQuizzes'));
      if (!cachedSnapshot.empty) {
        const cached: Record<string, VocabQuiz> = {};
        cachedSnapshot.forEach(d => { cached[d.id] = d.data() as VocabQuiz; });
        const hasAll = selectedWords.every(w => cached[w.id]);
        if (hasAll) {
          setQuizzes(cached);
          setPhase('quiz');
          await saveSession({ phase: 'quiz' });
          return;
        }
      }

      const targetTerms = selectedWords.map(w => w.term);
      const quizList = await GeminiService.generateVocabQuizzes(targetTerms, []);
      
      const quizMap: Record<string, VocabQuiz> = {};
      quizList.forEach(q => {
        const word = selectedWords.find(w => w.term.toLowerCase() === q.word.toLowerCase());
        if (word) {
          quizMap[word.id] = q;
        }
      });
      setQuizzes(quizMap);
      setPhase('quiz');
      await saveSession({ phase: 'quiz' });

      const batch = writeBatch(getDb());
      const oldSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'vocabQuizzes'));
      oldSnapshot.forEach(d => batch.delete(d.ref));
      for (const [wordId, quiz] of Object.entries(quizMap)) {
        batch.set(doc(getDb(), 'users', USER_ID, 'vocabQuizzes', wordId), quiz);
      }
      batch.commit().catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${USER_ID}/vocabQuizzes`);
      });
    } catch (err) {
      console.error("Failed to generate quizzes", err);
      setPhase('idle');
      const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', 'vocabQuiz');
      deleteDoc(sessionDocRef).catch(() => {});
    }
  };

  const handleQuizAnswer = async (wordId: string, isCorrect: boolean) => {
    const currentWord = quizQueue[0];
    if (!currentWord || currentWord.id !== wordId || !currentWord.fsrs) return;

    let finalRating = isCorrect ? FSRSRating.Good : FSRSRating.Again;
    let finalLabel = isCorrect ? 'Good' : 'Again';

    const updatedFsrs = schedule(currentWord.fsrs, finalRating as any);
    const wasMemorizedBefore = currentWord.memorized;
    const isMemorizedNow = updatedFsrs.state > 0;

    const updatedWord = { 
      ...currentWord, 
      fsrs: updatedFsrs,
      memorized: updatedFsrs.state > 0,
      lastRating: finalLabel
    };

    const batch = writeBatch(getDb());
    const wordDoc = doc(getDb(), 'users', USER_ID, 'words', currentWord.id);
    batch.set(wordDoc, updatedWord, { merge: true });

    // Update stats
    const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const statsUpdates: any = {
      lastUpdated: Date.now(),
      [`dailyActivity.${todayKey}`]: increment(1)
    };

    if (wasMemorizedBefore && !isMemorizedNow) {
      statsUpdates.memorizedCount = increment(-1);
    }

    batch.update(statsRef, statsUpdates);
    batch.delete(doc(getDb(), 'users', USER_ID, 'vocabQuizzes', wordId));

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/words/${currentWord.id}`);
    }

    const nextResults = [...sessionResults, updatedWord];
    setSessionResults(nextResults);

    const nextQuizQueue = quizQueue.slice(1);
    setQuizQueue(nextQuizQueue);

    if (nextQuizQueue.length === 0) {
      setPhase('results');
      const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', 'vocabQuiz');
      deleteDoc(sessionDocRef).catch(err => console.error("Failed to delete vocab quiz session", err));
    } else {
      await saveSession({
        quizQueue: nextQuizQueue,
        sessionResults: nextResults
      });
    }
  };

  const reset = () => {
    setPhase('idle');
    setQuizQueue([]);
    setQuizzes({});
    setSessionResults([]);
    const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', 'vocabQuiz');
    deleteDoc(sessionDocRef).catch(err => console.error("Failed to delete vocab quiz session", err));
  };

  return {
    phase,
    quizQueue,
    quizzes,
    sessionResults,
    isLoadingSession,
    start,
    handleQuizAnswer,
    reset
  };
}
