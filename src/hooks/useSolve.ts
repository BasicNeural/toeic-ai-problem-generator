import { useState, useEffect, useCallback, useRef } from 'react';
import { Problem, Word } from '../types';
import { GeminiService } from '../services/geminiService';
import { db, handleFirestoreError, OperationType, FirebaseUser } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';

export function useSolve(
  words: Word[], 
  updateGrammarStat: (grammar: string, isCorrect: boolean, difficulty: number) => void,
  grammarStats: { subject: string; A: number; fullMark: number }[],
  user: FirebaseUser | null
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
    if (!user) return;
    
    const q = query(
      collection(db, 'users', user.uid, 'problems'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'asc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problems: Problem[] = [];
      snapshot.forEach(doc => {
        problems.push(doc.data() as Problem);
      });
      setPrefetchedProblems(problems);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/problems`);
    });

    return () => unsubscribe();
  }, [user]);

  const fetchProblem = useCallback(async () => {
    const currentWords = wordsRef.current;
    const currentStats = statsRef.current;

    const memorized = currentWords.filter(w => w.memorized && w.lastRating !== 'Again');
    const selectedWords = [...memorized].sort(() => Math.random() - 0.5).slice(0, 5).map(w => w.term);

    const sortedStats = [...currentStats].sort((a, b) => a.A - b.A);
    const targetGrammarCategories = sortedStats.slice(0, 3).map(s => s.subject);

    const { problem } = await GeminiService.runWorkflow(selectedWords, targetGrammarCategories, () => {});
    
    // Add ID and metadata
    const problemWithMeta: Problem = {
      ...problem,
      id: `prob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: Date.now()
    };

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'problems', problemWithMeta.id!), problemWithMeta);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/problems/${problemWithMeta.id}`);
      }
    }

    return problemWithMeta;
  }, [user]);

  const prefetch = useCallback(async () => {
    if (isPrefetching.current || prefetchedProblems.length >= 2 || !user) return;
    isPrefetching.current = true;
    try {
      await fetchProblem();
      // We don't need to manually update state here because onSnapshot will handle it
    } catch (error) {
      console.error('Prefetch failed:', error);
    } finally {
      isPrefetching.current = false;
    }
  }, [prefetchedProblems.length, fetchProblem, user]);

  useEffect(() => {
    if (user && prefetchedProblems.length < 2) {
      prefetch();
    }
  }, [prefetchedProblems.length, prefetch, user]);

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
      
      // Mark as solved in Firestore so it's removed from the pending queue
      if (user && nextProb.id) {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'problems', nextProb.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/problems/${nextProb.id}`);
        }
      }
    } else {
      setIsLoading(true);
      try {
        const problem = await fetchProblem();
        setResult(problem);
        
        // Immediately delete it since we are showing it right away
        if (user && problem.id) {
          await deleteDoc(doc(db, 'users', user.uid, 'problems', problem.id));
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
