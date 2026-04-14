import { useState, useEffect, useCallback, useRef } from 'react';
import { Problem, Word } from '../types';
import { GeminiService } from '../services/geminiService';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where, limit, getDocs } from 'firebase/firestore';

export function useSolve(
  updateGrammarStat: (grammar: string, isCorrect: boolean, difficulty: number) => void,
  grammarStats: { subject: string; A: number; fullMark: number }[]
) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<Problem | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Firestore에서 실시간으로 가져온 대기 중인 문제들
  const [prefetchedProblems, setPrefetchedProblems] = useState<Problem[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false); // 초기 로딩 확인
  const isPrefetching = useRef(false);
  const statsRef = useRef(grammarStats);

  useEffect(() => {
    statsRef.current = grammarStats;
  }, [grammarStats]);

  // 1. Firestore 큐 모니터링 (실시간)
  useEffect(() => {
    const q = query(
      collection(getDb(), 'users', USER_ID, 'problems'),
      where('status', '==', 'pending'),
      limit(10) // 여유있게 가져옴 (정렬은 메모리에서 수행하여 인덱스 에러 방지)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const problems: Problem[] = [];
      snapshot.forEach(doc => {
        problems.push({ ...doc.data(), id: doc.id } as Problem);
      });
      
      // 생성 시간순으로 메모리 정렬 (복합 인덱스 필요 없음)
      problems.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      
      setPrefetchedProblems(problems);
      setHasInitialized(true); // 데이터 수신 완료 (0개여도 완료로 간주)
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${USER_ID}/problems`);
      setHasInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // 2. 문제 생성 및 Firestore 저장 함수
  const fetchAndStoreProblem = useCallback(async () => {
    const currentStats = statsRef.current;

    // 암기된 단어 가져오기
    const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
    const qWords = query(wordsRef, where('memorized', '==', true), limit(30));
    const wordsSnap = await getDocs(qWords);
    const memorized = wordsSnap.docs.map(d => d.data() as Word);
    
    const selectedWords = memorized.length > 0 
      ? [...memorized].sort(() => Math.random() - 0.5).slice(0, 5).map(w => w.term)
      : [];

    const sortedStats = [...currentStats].sort((a, b) => a.A - b.A);
    const targetGrammarCategories = sortedStats.slice(0, 3).map(s => s.subject);

    // AI 문제 생성
    const { problem } = await GeminiService.runWorkflow(selectedWords, targetGrammarCategories, () => { });

    const problemId = `prob-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const problemWithMeta: Problem = {
      ...problem,
      id: problemId,
      status: 'pending',
      createdAt: Date.now()
    };

    try {
      // Firestore에 저장 (컬렉션이 없으면 여기서 자동 생성됨)
      await setDoc(doc(getDb(), 'users', USER_ID, 'problems', problemId), problemWithMeta);
      return problemWithMeta;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${USER_ID}/problems/${problemId}`);
      throw error;
    }
  }, []);

  // 3. 큐가 3개 미만일 때 자동으로 채워넣는 로직
  const refillQueue = useCallback(async () => {
    // 이미 생성 중이거나, 아직 초기 데이터 로딩 전이면 대기
    if (isPrefetching.current || !hasInitialized) return;
    
    const currentCount = prefetchedProblems.length;
    if (currentCount >= 3) return;

    isPrefetching.current = true;
    try {
      const needed = 3 - currentCount;
      // 부족한 개수만큼 루프를 돌며 생성
      for (let i = 0; i < needed; i++) {
        await fetchAndStoreProblem();
      }
    } catch (error) {
      console.error('Refill queue failed:', error);
    } finally {
      isPrefetching.current = false;
    }
  }, [hasInitialized, prefetchedProblems.length, fetchAndStoreProblem]);

  // 큐 상태가 변하거나 초기화되었을 때 리필 트리거
  useEffect(() => {
    refillQueue();
  }, [hasInitialized, prefetchedProblems.length, refillQueue]);

  const start = () => {
    if (!result) {
      generateNext();
    }
  };

  const generateNext = async () => {
    setResult(null);
    setSelectedOption(null);
    setShowExplanation(false);

    // 큐에 미리 생성된 문제가 있는 경우
    if (prefetchedProblems.length > 0) {
      const nextProb = prefetchedProblems[0];
      setResult(nextProb);

      // 사용한 문제는 즉시 Firestore에서 삭제 (백그라운드 리필 트리거됨)
      if (nextProb.id) {
        try {
          await deleteDoc(doc(getDb(), 'users', USER_ID, 'problems', nextProb.id));
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `users/${USER_ID}/problems/${nextProb.id}`);
        }
      }
    } else {
      // 큐가 비어있는 긴급 상황 (사용자가 너무 빨리 넘겼을 때)
      setIsLoading(true);
      try {
        const problem = await fetchAndStoreProblem();
        setResult(problem);
        // 즉시 삭제 (저장하자마자 사용하는 셈이므로)
        if (problem.id) {
          await deleteDoc(doc(getDb(), 'users', USER_ID, 'problems', problem.id));
        }
      } catch (error) {
        console.error('On-the-fly problem generation failed:', error);
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
    start, generate: generateNext, checkAnswer,
    prefetchedCount: prefetchedProblems.length
  };
}
