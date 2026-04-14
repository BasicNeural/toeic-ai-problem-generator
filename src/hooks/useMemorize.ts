import { useState, useEffect, useCallback } from 'react';
import { Word, VocabQuiz, StatsSummary, MemorizeSession } from '../types';
import { schedule, createInitialFSRS } from '../lib/fsrs';
import { Rating as FSRSRating } from 'fsrs.js';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, writeBatch, query, where, limit, orderBy, increment, getDoc, updateDoc } from 'firebase/firestore';
import { GeminiService } from '../services/geminiService';
import { getStudyDateKey } from '../lib/time';

export type MemorizePhase = 'flashcards' | 'quiz' | 'results';

export function useMemorize(stats: StatsSummary) {
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
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Load session or cache on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. Try to load active session
        const sessionDoc = await getDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'memorize'));
        if (sessionDoc.exists()) {
          const sessionData = sessionDoc.data() as MemorizeSession;
          setPhase(sessionData.phase);
          setQueue(sessionData.queue);
          setSessionWords(sessionData.sessionWords);
          setQuizQueue(sessionData.quizQueue);
          setSwipeRatings(sessionData.swipeRatings as any);
          setCardStartTime(Date.now());
          
          if (sessionData.phase === 'results') {
            setIsComplete(true);
          }
        }

        // 2. Load cached quizzes
        const snapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'memorizeQuizzes'));
        if (!snapshot.empty) {
          const cached: Record<string, VocabQuiz> = {};
          snapshot.forEach(d => { cached[d.id] = d.data() as VocabQuiz; });
          setQuizzes(cached);
        }
      } catch (err) {
        console.error("Failed to load session/cache", err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadInitialData();
  }, []);

  const saveSession = useCallback(async (updates: Partial<MemorizeSession>) => {
    try {
      await setDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'memorize'), {
        updatedAt: Date.now(),
        ...updates
      }, { merge: true });
    } catch (err) {
      console.error("Failed to save session", err);
    }
  }, []);

  const start = async () => {
    // If we have an active session, just resume (unless it's already complete)
    if (queue.length > 0 && !isComplete) {
      setCardStartTime(Date.now());
      return;
    }

    const todayKey = getStudyDateKey();
    const introducedToday = stats.newWordsToday[todayKey] || 0;
    const hasAllowance = introducedToday < 10;

    const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
    let sessionWordsList: Word[] = [];

    if (hasAllowance) {
      // 2.1. 신규 카드를 최대 2장 선택한다.
      const newSnap = await getDocs(query(wordsRef, where('fsrs', '==', null), limit(2)));
      sessionWordsList.push(...newSnap.docs.map(d => d.data() as Word));

      // 2.2. 기존 학습 단어에서 due가 낮은 순으로 나머지를 채운다.
      if (sessionWordsList.length < 10) {
        const needed = 10 - sessionWordsList.length;
        const existingSnap = await getDocs(query(
          wordsRef, 
          orderBy('fsrs.due', 'asc'),
          limit(needed)
        ));
        sessionWordsList.push(...existingSnap.docs.map(d => d.data() as Word));
      }

      // 2.3. 선택된 카드가 10장 미만일 경우 신규 카드로 나머지를 채운다.
      if (sessionWordsList.length < 10) {
        const alreadySelectedIds = new Set(sessionWordsList.map(w => w.id));
        const needed = 10 - sessionWordsList.length;
        const moreNewSnap = await getDocs(query(wordsRef, where('fsrs', '==', null), limit(needed + 2)));
        const moreNew = moreNewSnap.docs
          .map(d => d.data() as Word)
          .filter(w => !alreadySelectedIds.has(w.id))
          .slice(0, needed);
        sessionWordsList.push(...moreNew);
      }
    } else {
      // 3. 신규 학습 상한이 없는 경우
      const nowIso = new Date().toISOString();
      const overdueCheckSnap = await getDocs(query(
        wordsRef, 
        where('fsrs.due', '<=', nowIso), 
        limit(1)
      ));
      
      if (!overdueCheckSnap.empty) {
        // 3.1.1. 기존 학습 단어에서 due가 낮은 순으로 10장을 가져온다.
        const existingSnap = await getDocs(query(
          wordsRef, 
          orderBy('fsrs.due', 'asc'),
          limit(10)
        ));
        sessionWordsList.push(...existingSnap.docs.map(d => d.data() as Word));
      } else {
        // 3.2. 기존 학습 단어 중 due가 지난 것이 없는 경우
        // 3.2.1. 신규 카드를 최대 2장 선택한다.
        const newSnap = await getDocs(query(wordsRef, where('fsrs', '==', null), limit(2)));
        sessionWordsList.push(...newSnap.docs.map(d => d.data() as Word));

        // 3.2.2. 기존 학습 단어에서 due가 낮은 순으로 나머지를 채운다.
        if (sessionWordsList.length < 10) {
          const needed = 10 - sessionWordsList.length;
          const existingSnap = await getDocs(query(
            wordsRef, 
            orderBy('fsrs.due', 'asc'),
            limit(needed)
          ));
          sessionWordsList.push(...existingSnap.docs.map(d => d.data() as Word));
        }
      }
    }

    if (sessionWordsList.length === 0) return;

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

    // Save initial session
    await saveSession({
      phase: 'flashcards',
      sessionWords: newSessionWords,
      queue: newSessionWords,
      quizQueue: [],
      swipeRatings: {},
    });

    const cachedSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'memorizeQuizzes'));
    if (!cachedSnapshot.empty) {
      const cached: Record<string, VocabQuiz> = {};
      cachedSnapshot.forEach(d => { cached[d.id] = d.data() as VocabQuiz; });
      const hasAll = newSessionWords.every(w => cached[w.id]);
      if (hasAll) {
        setQuizzes(cached);
        return;
      }
    }

    setIsGeneratingQuizzes(true);
    const targetTerms = newSessionWords.map(w => w.term);
    GeminiService.generateVocabQuizzes(targetTerms, [])
      .then(async quizList => {
        const quizMap: Record<string, VocabQuiz> = {};
        quizList.forEach(q => {
          const word = newSessionWords.find(w => w.term.toLowerCase() === q.word.toLowerCase());
          if (word) {
            quizMap[word.id] = q;
          }
        });
        setQuizzes(quizMap);

        const batch = writeBatch(getDb());
        const oldSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'memorizeQuizzes'));
        oldSnapshot.forEach(d => batch.delete(d.ref));
        for (const [wordId, quiz] of Object.entries(quizMap)) {
          batch.set(doc(getDb(), 'users', USER_ID, 'memorizeQuizzes', wordId), quiz);
        }
        batch.commit().catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${USER_ID}/memorizeQuizzes`);
        });
      })
      .catch(err => console.error("Failed to generate quizzes", err))
      .finally(() => setIsGeneratingQuizzes(false));
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
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

      const nextSwipeRatings = {
        ...swipeRatings,
        [currentWord.id]: { rating, label: ratingLabel }
      };
      setSwipeRatings(nextSwipeRatings);

      const nextQueue = queue.slice(1);
      setQueue(nextQueue);
      
      if (nextQueue.length === 0) {
        setQuizQueue([...sessionWords]);
        setPhase('quiz');
        await saveSession({
          phase: 'quiz',
          queue: nextQueue,
          quizQueue: [...sessionWords],
          swipeRatings: nextSwipeRatings as any,
        });
      } else {
        setCardStartTime(Date.now());
        await saveSession({
          queue: nextQueue,
          swipeRatings: nextSwipeRatings as any,
        });
      }
    } else {
      const updatedWord = {
        ...currentWord,
        failCount: failCount + 1
      };

      const nextQueue = queue.slice(1);
      let newQueue: Word[];
      if (nextQueue.length === 0) {
        newQueue = [updatedWord];
      } else {
        const minIndex = 1;
        const maxIndex = nextQueue.length;
        const randomIndex = Math.floor(Math.random() * (maxIndex - minIndex + 1)) + minIndex;
        
        newQueue = [...nextQueue];
        newQueue.splice(randomIndex, 0, updatedWord);
      }
      setQueue(newQueue);
      setCardStartTime(Date.now());
      await saveSession({ queue: newQueue });
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
    const wasMemorizedBefore = currentWord.memorized;
    const isMemorizedNow = updatedFsrs.state > 0;
    const isNewlyIntroduced = !currentWord.introducedAt;

    const updatedWord = { 
      ...currentWord, 
      fsrs: updatedFsrs,
      memorized: updatedFsrs.state > 0,
      lastRating: finalLabel,
      introducedAt: currentWord.introducedAt || new Date().toISOString()
    };

    const batch = writeBatch(getDb());
    const wordDoc = doc(getDb(), 'users', USER_ID, 'words', currentWord.id);
    batch.set(wordDoc, updatedWord, { merge: true });

    const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
    const todayKey = getStudyDateKey();
    
    const statsUpdates: any = {
      lastUpdated: Date.now(),
      [`dailyActivity.${todayKey}`]: increment(1)
    };

    if (isNewlyIntroduced) {
      statsUpdates[`newWordsToday.${todayKey}`] = increment(1);
    }

    if (!wasMemorizedBefore && isMemorizedNow) {
      statsUpdates.memorizedCount = increment(1);
    } else if (wasMemorizedBefore && !isMemorizedNow) {
      statsUpdates.memorizedCount = increment(-1);
    }

    batch.update(statsRef, statsUpdates);
    batch.delete(doc(getDb(), 'users', USER_ID, 'memorizeQuizzes', wordId));

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/words/${currentWord.id}`);
    }

    setSessionResults(prev => {
      if (prev.some(w => w.id === updatedWord.id)) return prev;
      return [...prev, updatedWord];
    });

    const nextQuizQueue = quizQueue.slice(1);
    setQuizQueue(nextQuizQueue);

    if (nextQuizQueue.length === 0) {
      setIsComplete(true);
      setPhase('results');
      
      // Clear session and quizzes
      const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', 'memorize');
      deleteDoc(sessionDocRef).catch(err => console.error("Failed to delete session", err));

      getDocs(collection(getDb(), 'users', USER_ID, 'memorizeQuizzes'))
        .then(snapshot => {
          if (snapshot.empty) return;
          const batch = writeBatch(getDb());
          snapshot.forEach(d => batch.delete(d.ref));
          return batch.commit();
        })
        .catch(() => {});
    } else {
      await saveSession({
        quizQueue: nextQuizQueue
      });
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
    isLoadingSession,
    start, 
    handleSwipe,
    handleQuizAnswer
  };
}
