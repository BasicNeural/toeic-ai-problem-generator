import { useState, useEffect, useCallback, useRef } from 'react';
import { Problem, Word } from '../types';
import { GeminiService } from '../services/geminiService';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, limit } from 'firebase/firestore';

export function useSolve(
  words: Word[],
  updateGrammarStat: (grammar: string, isCorrect: boolean, difficulty: number) => void,
  grammarStats: { subject: string; A: number; fullMark: number }[]
) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const [prefetchedProblems, setPrefetchedProblems] = useState<Problem[]>([]);
  const isPrefetching = useRef(false);

  const wordsRef = useRef(words);
  const statsRef = useRef(grammarStats);

  useEffect(() => {
    wordsRef.current = words;
    statsRef.current = grammarStats;
  }, [words, grammarStats]);

  useEffect(() => {
    const q = query(
      collection(getDb(), 'users', USER_ID, 'problems'),
      where('status', '==', 'pending'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problems: Problem[] = [];
      snapshot.forEach(doc => {
        problems.push(doc.data() as Problem);
      });
      problems.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      setPrefetchedProblems(problems);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${USER_ID}/problems`);
    });

    return () => unsubscribe();
  }, []);

  const fetchProblem = useCallback(async () => {
    const currentWords = wordsRef.current;
    const currentStats = statsRef.current;

    const memorized = currentWords.filter(w => w.memorized && w.lastRating !== 'Again');
    const selectedWords = [...memorized].sort(() => Math.random() - 0.5).slice(0, 5).map(w => w.term);

    const sortedStats = [...currentStats].sort((a, b) => a.A - b.A);
    const targetGrammarCategories = sortedStats.slice(0, 3).map(s => s.subject);

    const { problem } = await GeminiService.runWorkflow(selectedWords, targetGrammarCategories, () => { });

    const problemWithMeta: Problem = {
      ...problem,
      id: `prob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: Date.now()
    };

    try {
      await setDoc(doc(getDb(), 'users', USER_ID, 'problems', problemWithMeta.id!), problemWithMeta);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${USER_ID}/problems/${problemWithMeta.id}`);
    }

    return problemWithMeta;
  }, []);

  const prefetch = useCallback(async () => {
    if (isPrefetching.current || prefetchedProblems.length >= 2) return;
    isPrefetching.current = true;
    try {
      await fetchProblem();
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      isPrefetching.current = false;
    }
  }, [prefetchedProblems.length, fetchProblem]);

  useEffect(() => {
    if (prefetchedProblems.length < 2) {
      prefetch();
    }
  }, [prefetchedProblems.length, prefetch]);

  const start = () => {
    if (!result) {
      generateNext();
    }
  };

  const generateNext = async () => {
    setResult(null);
    setSelectedOption(null);
    setShowExplanation(false);

    if (prefetchedProblems.length > 0) {
      const nextProb = prefetchedProblems[0];
      setResult(nextProb);

      if (nextProb.id) {
        try {
          await deleteDoc(doc(getDb(), 'users', USER_ID, 'problems', nextProb.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${USER_ID}/problems/${nextProb.id}`);
        }
      }
    } else {
      setIsLoading(true);
      try {
        const problem = await fetchProblem();
        setResult(problem);

        if (problem.id) {
          await deleteDoc(doc(getDb(), 'users', USER_ID, 'problems', problem.id));
        }
      } catch (error) {
        console.error('Workflow failed:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkAnswer = (option: string) => {
    if (!result || showExplanation) return;
    setSelectedOption(option);
    setShowExplanation(true);
    const isCorrect = option === result.answer;
    updateGrammarStat(result.grammar, isCorrect, result.difficulty);
  };

  return {
    isLoading, result, setResult,
    selectedOption, setSelectedOption,
    showExplanation, setShowExplanation,
    start, generate: generateNext, checkAnswer
  };
}
