import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, setDoc, onSnapshot, query, where, limit } from 'firebase/firestore';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { GeminiService } from '../services/geminiService';
import { SentenceTranslationProblem, SentenceTranslationVerification, SentenceTranslateSession } from '../types';
import type { useSentenceTranslateStats } from './useSentenceTranslateStats';

export type SentenceTranslatePhase = 'idle' | 'loading' | 'answering' | 'verifying' | 'result';

const SESSION_DOC_ID = 'sentenceTranslate';
const CACHE_COLLECTION = 'sentenceTranslateProblems';
const MAX_PREFETCHED = 3;

type SentenceTranslateStatsDeps = Pick<ReturnType<typeof useSentenceTranslateStats>, 'getRandomDifficulty' | 'updateStat'>;

function createProblemId() {
    return `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useSentenceTranslate(sentenceTranslateStats?: SentenceTranslateStatsDeps) {
    const [phase, setPhase] = useState<SentenceTranslatePhase>('idle');
    const [problem, setProblem] = useState<SentenceTranslationProblem | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [result, setResult] = useState<SentenceTranslationVerification | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Firestore Prefetch queue
    const [prefetchedProblems, setPrefetchedProblems] = useState<SentenceTranslationProblem[]>([]);
    
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    const [hasInitialized, setHasInitialized] = useState(false);
    const isPrefetching = useRef(false);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const sessionDoc = await getDoc(doc(getDb(), 'users', USER_ID, 'sessions', SESSION_DOC_ID));
                if (sessionDoc.exists()) {
                    const sessionData = sessionDoc.data() as SentenceTranslateSession;
                    setPhase(sessionData.phase);
                    // sessionData.problemQueue 배열의 첫 번째 요소가 현재 문제입니다
                    setProblem(sessionData.problemQueue?.[0] ?? null);
                    setResult(sessionData.lastResult ?? null);
                    setUserAnswer(sessionData.lastUserAnswer ?? '');
                }
            } catch (err) {
                console.error('Failed to load sentence translation session', err);
            } finally {
                setIsLoadingSession(false);
            }
        };

        loadInitialData();
    }, []);

    // 1. Firestore 큐 모니터링 (실시간)
    useEffect(() => {
        const q = query(
            collection(getDb(), 'users', USER_ID, CACHE_COLLECTION),
            where('status', '==', 'pending'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const problems: SentenceTranslationProblem[] = [];
            snapshot.forEach(doc => {
                problems.push({ ...doc.data(), id: doc.id } as SentenceTranslationProblem);
            });
            
            problems.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
            setPrefetchedProblems(problems);
            setHasInitialized(true);
        }, (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${USER_ID}/${CACHE_COLLECTION}`);
            setHasInitialized(true);
        });

        return () => unsubscribe();
    }, []);

    const saveSession = useCallback(async (updates: Partial<SentenceTranslateSession>) => {
        try {
            await setDoc(doc(getDb(), 'users', USER_ID, 'sessions', SESSION_DOC_ID), {
                updatedAt: Date.now(),
                ...updates,
            }, { merge: true });
        } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/sessions/${SESSION_DOC_ID}`);
        }
    }, []);

    // 2. 문제 생성 및 Firestore 저장 함수
    const fetchAndStoreProblem = useCallback(async () => {
        const targetDifficulty = sentenceTranslateStats?.getRandomDifficulty() ?? (Math.floor(Math.random() * 5) + 1);
        const generated = await GeminiService.generateSentenceTranslation(targetDifficulty);
        const problemId = createProblemId();
        const problemWithId: SentenceTranslationProblem = {
            ...generated,
            id: problemId,
            status: 'pending',
            createdAt: Date.now()
        };

        try {
            await setDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, problemId), problemWithId);
            return problemWithId;
        } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${USER_ID}/${CACHE_COLLECTION}/${problemId}`);
            throw err;
        }
    }, [sentenceTranslateStats]);

    // 3. 큐 리필 로직
    const refillQueue = useCallback(async () => {
        if (!hasInitialized || isPrefetching.current) return;
        
        const currentCount = prefetchedProblems.length;
        if (currentCount >= MAX_PREFETCHED) return;

        isPrefetching.current = true;
        try {
            const needed = MAX_PREFETCHED - currentCount;
            for (let i = 0; i < needed; i++) {
                await fetchAndStoreProblem();
            }
        } catch (err) {
            console.error('Failed to refill sentence translation queue', err);
        } finally {
            isPrefetching.current = false;
        }
    }, [fetchAndStoreProblem, hasInitialized, prefetchedProblems.length]);

    useEffect(() => {
        void refillQueue();
    }, [hasInitialized, prefetchedProblems.length, refillQueue]);

    const generate = useCallback(async () => {
        setError(null);
        setResult(null);
        setUserAnswer('');

        try {
            let nextProblem: SentenceTranslationProblem;
            
            if (prefetchedProblems.length > 0) {
                nextProblem = prefetchedProblems[0];
                if (nextProblem.id) {
                    await deleteDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, nextProblem.id)).catch(err => {
                        handleFirestoreError(err, OperationType.DELETE, `users/${USER_ID}/${CACHE_COLLECTION}/${nextProblem.id}`);
                    });
                }
            } else {
                setPhase('loading');
                nextProblem = await fetchAndStoreProblem();
                if (nextProblem.id) {
                    await deleteDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, nextProblem.id)).catch(err => {
                        handleFirestoreError(err, OperationType.DELETE, `users/${USER_ID}/${CACHE_COLLECTION}/${nextProblem.id}`);
                    });
                }
            }

            setProblem(nextProblem);
            setPhase('answering');

            await saveSession({
                phase: 'answering',
                problemQueue: [nextProblem],
                lastResult: undefined,
                lastUserAnswer: undefined,
            });
        } catch (err) {
            console.error('Failed to generate sentence translation problem', err);
            setProblem(null);
            setPhase('idle');
            setError('문장을 생성하지 못했습니다. 다시 시도해 주세요.');
        }
    }, [fetchAndStoreProblem, prefetchedProblems, saveSession]);

    const submit = useCallback(async () => {
        if (!problem || !userAnswer.trim()) {
            setError('번역을 먼저 입력해 주세요.');
            return;
        }

        setPhase('verifying');
        setError(null);

        try {
            const verification = await GeminiService.verifySentenceTranslation(
                problem.sentence,
                problem.translation,
                userAnswer.trim()
            );

            sentenceTranslateStats?.updateStat(verification.isValid, problem.difficulty).catch((err) => {
                console.error('Failed to update sentence translation mastery stat', err);
            });

            setResult(verification);
            setPhase('result');

            await saveSession({
                phase: 'result',
                problemQueue: [problem],
                lastResult: verification,
                lastUserAnswer: userAnswer.trim(),
            });
        } catch (err) {
            console.error('Failed to verify sentence translation', err);
            setPhase('answering');
            setError('번역 검증에 실패했습니다. 다시 시도해 주세요.');
        }
    }, [problem, saveSession, sentenceTranslateStats, userAnswer]);

    const generateNext = useCallback(async () => {
        return generate(); 
    }, [generate]);

    const reset = useCallback(() => {
        setPhase('idle');
        setProblem(null);
        setUserAnswer('');
        setResult(null);
        setError(null);
        
        const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', SESSION_DOC_ID);
        deleteDoc(sessionDocRef).catch((err) => handleFirestoreError(err, OperationType.DELETE, `users/${USER_ID}/sessions/${SESSION_DOC_ID}`));
    }, []);

    return {
        phase,
        problem,
        userAnswer,
        setUserAnswer,
        result,
        error,
        isLoadingSession,
        problemQueue: prefetchedProblems,
        generate,
        generateNext,
        submit,
        reset,
    };
}