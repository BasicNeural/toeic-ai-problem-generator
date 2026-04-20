import { useState, useEffect, useCallback, useRef } from 'react';
import { Word, VocabQuiz, MemorizeSession } from '../types';
import { schedule, createInitialFSRS } from '../lib/fsrs';
import { Rating as FSRSRating } from 'fsrs.js';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  query,
  where,
  limit,
  orderBy,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { TOEIC_CONJUNCTIONS } from '../data/conjunctions';
import { GeminiService } from '../services/geminiService';

export type ConjunctionMemorizePhase = 'flashcards' | 'quiz' | 'results';

function shuffle<T>(arr: T[]) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

function buildLocalQuizzes(sessionWords: Word[], pool: Word[]): Record<string, VocabQuiz> {
  const poolMeanings = pool
    .map(w => ({ id: w.id, term: w.term, meaning: w.meanings?.[0]?.definition ?? '' }))
    .filter(x => x.meaning.trim().length > 0);

  const quizMap: Record<string, VocabQuiz> = {};

  for (const w of sessionWords) {
    const correctMeaning = w.meanings?.[0]?.definition ?? '';
    const example = w.meanings?.[1]?.definition;

    const distractors = shuffle(poolMeanings)
      .filter(p => p.id !== w.id && p.meaning !== correctMeaning)
      .slice(0, 3)
      .map(p => p.meaning);

    const optionsList = shuffle([correctMeaning, ...distractors]).slice(0, 4);
    const options = {
      a: optionsList[0] ?? correctMeaning,
      b: optionsList[1] ?? distractors[0] ?? correctMeaning,
      c: optionsList[2] ?? distractors[1] ?? correctMeaning,
      d: optionsList[3] ?? distractors[2] ?? correctMeaning,
    } as const;

    const answer = (Object.entries(options) as Array<['a' | 'b' | 'c' | 'd', string]>)
      .find(([, v]) => v === correctMeaning)?.[0] ?? 'a';

    quizMap[w.id] = {
      word: w.term,
      question: `"${w.term}"의 의미로 가장 알맞은 것은?`,
      translation: `"${w.term}"는 <u>${correctMeaning}</u>라는 뜻입니다.`,
      options,
      answer,
      explanation: example ? `예문: ${example}` : '예문이 없습니다.',
    };
  }

  return quizMap;
}

function mergeQuizMapByTerm(sessionWords: Word[], quizList: VocabQuiz[]): Record<string, VocabQuiz> {
  const quizMap: Record<string, VocabQuiz> = {};
  quizList.forEach(q => {
    const matched = sessionWords.find(w => w.term.toLowerCase() === q.word.toLowerCase());
    if (matched) quizMap[matched.id] = q;
  });
  return quizMap;
}

export function useConjunctionMemorize() {
  const [phase, setPhase] = useState<ConjunctionMemorizePhase>('flashcards');
  const [queue, setQueue] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [sessionResults, setSessionResults] = useState<Word[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [cardStartTime, setCardStartTime] = useState<number>(0);

  const [quizzes, setQuizzes] = useState<Record<string, VocabQuiz>>({});
  const [isGeneratingQuizzes, setIsGeneratingQuizzes] = useState(false);
  const [quizQueue, setQuizQueue] = useState<Word[]>([]);
  const [swipeRatings, setSwipeRatings] = useState<Record<string, { rating: FSRSRating; label: string }>>({});
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const seededRef = useRef(false);

  const ensureSeeded = useCallback(async () => {
    if (seededRef.current) return;

    const conjRef = collection(getDb(), 'users', USER_ID, 'conjunctions');
    const existsSnap = await getDocs(query(conjRef, limit(1)));
    if (!existsSnap.empty) {
      seededRef.current = true;
      return;
    }

    const batch = writeBatch(getDb());
    const now = Timestamp.now();
    for (const item of TOEIC_CONJUNCTIONS) {
      batch.set(doc(getDb(), 'users', USER_ID, 'conjunctions', item.id), {
        ...item,
        userId: USER_ID,
        createdAt: now,
        fsrs: null,
        memorized: false,
      });
    }
    await batch.commit();
    seededRef.current = true;
  }, []);

  // Load session / cached quizzes on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const sessionDoc = await getDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'conjunctions'));
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

        const snapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'conjunctionQuizzes'));
        if (!snapshot.empty) {
          const cached: Record<string, VocabQuiz> = {};
          snapshot.forEach(d => {
            cached[d.id] = d.data() as VocabQuiz;
          });
          setQuizzes(cached);
        }
      } catch (err) {
        console.error('Failed to load conjunction session/cache', err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    loadInitialData();
  }, []);

  const saveSession = useCallback(async (updates: Partial<MemorizeSession>) => {
    try {
      await setDoc(
        doc(getDb(), 'users', USER_ID, 'sessions', 'conjunctions'),
        { updatedAt: Date.now(), ...updates },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to save conjunction session', err);
    }
  }, []);

  const start = async () => {
    // Resume active session if present
    if (queue.length > 0 && !isComplete) {
      setCardStartTime(Date.now());
      return;
    }

    try {
      await ensureSeeded();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${USER_ID}/conjunctions`);
      return;
    }

    const conjRef = collection(getDb(), 'users', USER_ID, 'conjunctions');
    let sessionWordsList: Word[] = [];

    // 신규 2개 + due 오름차순으로 나머지 채우기 (단어 암기 로직과 동일한 형태)
    const newSnap = await getDocs(query(conjRef, where('fsrs', '==', null), limit(2)));
    sessionWordsList.push(...newSnap.docs.map(d => d.data() as Word));

    if (sessionWordsList.length < 10) {
      const needed = 10 - sessionWordsList.length;
      const existingSnap = await getDocs(query(conjRef, orderBy('fsrs.due', 'asc'), limit(needed)));
      sessionWordsList.push(...existingSnap.docs.map(d => d.data() as Word));
    }

    if (sessionWordsList.length < 10) {
      const alreadySelectedIds = new Set(sessionWordsList.map(w => w.id));
      const needed = 10 - sessionWordsList.length;
      const moreNewSnap = await getDocs(query(conjRef, where('fsrs', '==', null), limit(needed + 2)));
      const moreNew = moreNewSnap.docs
        .map(d => d.data() as Word)
        .filter(w => !alreadySelectedIds.has(w.id))
        .slice(0, needed);
      sessionWordsList.push(...moreNew);
    }

    if (sessionWordsList.length === 0) return;

    const newSessionWords = shuffle(sessionWordsList).map(w => ({ ...w, failCount: 0 }));

    setSessionWords(newSessionWords);
    setQueue(newSessionWords);
    setQuizQueue([]);
    setSessionResults([]);
    setIsComplete(false);
    setPhase('flashcards');
    setCardStartTime(Date.now());
    setSwipeRatings({});

    await saveSession({
      phase: 'flashcards',
      sessionWords: newSessionWords,
      queue: newSessionWords,
      quizQueue: [],
      swipeRatings: {},
    });

    // Generate and cache TOEIC-style quizzes via Gemini.
    // Fallback to a simple local meaning quiz if Gemini fails.
    setIsGeneratingQuizzes(true);
    try {
      const cachedSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'conjunctionQuizzes'));
      if (!cachedSnapshot.empty) {
        const cached: Record<string, VocabQuiz> = {};
        cachedSnapshot.forEach(d => { cached[d.id] = d.data() as VocabQuiz; });
        const hasAll = newSessionWords.every(w => cached[w.id]);
        if (hasAll) {
          setQuizzes(cached);
          return;
        }
      }

      const targetTerms = newSessionWords.map(w => w.term);
      const quizList = await GeminiService.generateConjunctionQuizzes(targetTerms);
      const quizMap = mergeQuizMapByTerm(newSessionWords, quizList);

      // If Gemini returns incomplete mapping, fill missing with local fallback.
      const missing = newSessionWords.filter(w => !quizMap[w.id]);
      if (missing.length > 0) {
        const fallbackMap = buildLocalQuizzes(missing, TOEIC_CONJUNCTIONS);
        for (const [id, q] of Object.entries(fallbackMap)) {
          quizMap[id] = q;
        }
      }

      setQuizzes(quizMap);

      const batch = writeBatch(getDb());
      const oldSnapshot = await getDocs(collection(getDb(), 'users', USER_ID, 'conjunctionQuizzes'));
      oldSnapshot.forEach(d => batch.delete(d.ref));
      for (const [wordId, quiz] of Object.entries(quizMap)) {
        batch.set(doc(getDb(), 'users', USER_ID, 'conjunctionQuizzes', wordId), quiz);
      }
      await batch.commit();
    } catch (err) {
      console.error('Failed to generate/cache conjunction quizzes', err);
      const fallback = buildLocalQuizzes(newSessionWords, TOEIC_CONJUNCTIONS);
      setQuizzes(fallback);
    } finally {
      setIsGeneratingQuizzes(false);
    }
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
        [currentWord.id]: { rating, label: ratingLabel },
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
      const updatedWord = { ...currentWord, failCount: failCount + 1 };

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

    const currentFsrs = currentWord.fsrs ?? createInitialFSRS();
    const updatedFsrs = schedule(currentFsrs, finalRating as any);

    const updatedWord = {
      ...currentWord,
      fsrs: updatedFsrs,
      memorized: updatedFsrs.state > 0,
      lastRating: finalLabel,
      introducedAt: currentWord.introducedAt || new Date().toISOString(),
    };

    const batch = writeBatch(getDb());
    batch.set(doc(getDb(), 'users', USER_ID, 'conjunctions', currentWord.id), updatedWord, { merge: true });
    batch.delete(doc(getDb(), 'users', USER_ID, 'conjunctionQuizzes', wordId));

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/conjunctions/${currentWord.id}`);
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
      deleteDoc(doc(getDb(), 'users', USER_ID, 'sessions', 'conjunctions')).catch(() => {});
      getDocs(collection(getDb(), 'users', USER_ID, 'conjunctionQuizzes'))
        .then(snapshot => {
          if (snapshot.empty) return;
          const batch = writeBatch(getDb());
          snapshot.forEach(d => batch.delete(d.ref));
          return batch.commit();
        })
        .catch(() => {});
    } else {
      await saveSession({ quizQueue: nextQuizQueue });
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
    handleQuizAnswer,
  };
}
