import { useCallback, useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { getDb, USER_ID } from '../firebase';
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
    const [problemQueue, setProblemQueue] = useState<SentenceTranslationProblem[]>([]);
    const [problem, setProblem] = useState<SentenceTranslationProblem | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [result, setResult] = useState<SentenceTranslationVerification | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [cachedProblems, setCachedProblems] = useState<SentenceTranslationProblem[]>([]);
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
                    setProblemQueue(sessionData.problemQueue ?? []);
                    setProblem(sessionData.problemQueue?.[0] ?? null);
                    setResult(sessionData.lastResult ?? null);
                    setUserAnswer(sessionData.lastUserAnswer ?? '');
                }

                const snapshot = await getDocs(collection(getDb(), 'users', USER_ID, CACHE_COLLECTION));
                if (!snapshot.empty) {
                    const cached: SentenceTranslationProblem[] = [];
                    snapshot.forEach(d => cached.push({ id: d.id, ...(d.data() as SentenceTranslationProblem) }));
                    setCachedProblems(cached);
                }
            } catch (err) {
                console.error('Failed to load sentence translation session/cache', err);
            } finally {
                setHasInitialized(true);
                setIsLoadingSession(false);
            }
        };

        loadInitialData();
    }, []);

    const saveSession = useCallback(async (updates: Partial<SentenceTranslateSession>) => {
        try {
            await setDoc(doc(getDb(), 'users', USER_ID, 'sessions', SESSION_DOC_ID), {
                updatedAt: Date.now(),
                ...updates,
            }, { merge: true });
        } catch (err) {
            console.error('Failed to save sentence translation session', err);
        }
    }, []);

    const fetchAndStoreProblem = useCallback(async () => {
        if (cachedProblems.length > 0) {
            const [nextCached, ...remainingCached] = cachedProblems;
            setCachedProblems(remainingCached);

            if (nextCached.id) {
                deleteDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, nextCached.id)).catch((err) => {
                    console.error('Failed to delete cached sentence translation problem', err);
                });
            }

            return nextCached;
        }

        const targetDifficulty = sentenceTranslateStats?.getRandomDifficulty() ?? (Math.floor(Math.random() * 5) + 1);
        const generated = await GeminiService.generateSentenceTranslation(targetDifficulty);
        const problemId = createProblemId();
        const problemWithId: SentenceTranslationProblem = {
            ...generated,
            id: problemId,
        };

        await setDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, problemId), problemWithId);
        return problemWithId;
    }, [cachedProblems, sentenceTranslateStats]);

    const refillQueue = useCallback(async () => {
        if (!hasInitialized || isPrefetching.current) return;
        if (problemQueue.length >= MAX_PREFETCHED) return;

        isPrefetching.current = true;
        try {
            const nextQueue = [...problemQueue];
            const needed = MAX_PREFETCHED - nextQueue.length;

            for (let index = 0; index < needed; index++) {
                const nextProblem = await fetchAndStoreProblem();
                nextQueue.push(nextProblem);
            }

            setProblemQueue(nextQueue);

            if (!problem && nextQueue.length > 0) {
                setProblem(nextQueue[0]);
                setPhase('answering');
            }

            await saveSession({
                phase: problem ? phase : (nextQueue.length > 0 ? 'answering' : 'idle'),
                problemQueue: nextQueue,
                lastResult: result ?? undefined,
                lastUserAnswer: userAnswer || undefined,
            });
        } catch (err) {
            console.error('Failed to refill sentence translation queue', err);
        } finally {
            isPrefetching.current = false;
        }
    }, [fetchAndStoreProblem, hasInitialized, phase, problem, problemQueue, result, saveSession, userAnswer]);

    useEffect(() => {
        void refillQueue();
    }, [refillQueue]);

    const generate = useCallback(async () => {
        setError(null);
        setResult(null);
        setUserAnswer('');

        try {
            if (problemQueue.length > 0) {
                setProblem(problemQueue[0]);
                setPhase('answering');
                await saveSession({
                    phase: 'answering',
                    problemQueue,
                    lastResult: undefined,
                    lastUserAnswer: undefined,
                });
                void refillQueue();
                return;
            }

            setPhase('loading');
            const nextProblem = await fetchAndStoreProblem();
            const nextQueue = [nextProblem];
            setProblemQueue(nextQueue);
            setProblem(nextProblem);
            setPhase('answering');

            await saveSession({
                phase: 'answering',
                problemQueue: nextQueue,
            });

            void refillQueue();
        } catch (err) {
            console.error('Failed to generate sentence translation problem', err);
            setProblem(null);
            setPhase('idle');
            setError('문장을 생성하지 못했습니다. 다시 시도해 주세요.');
        }
    }, [fetchAndStoreProblem, problemQueue, refillQueue, saveSession]);

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
                problemQueue,
                lastResult: verification,
                lastUserAnswer: userAnswer.trim(),
            });
        } catch (err) {
            console.error('Failed to verify sentence translation', err);
            setPhase('answering');
            setError('번역 검증에 실패했습니다. 다시 시도해 주세요.');
        }
    }, [problem, problemQueue, saveSession, sentenceTranslateStats, userAnswer]);

    const generateNext = useCallback(async () => {
        setError(null);
        setResult(null);
        setUserAnswer('');

        try {
            if (problemQueue.length > 0) {
                const currentProblem = problemQueue[0];
                const nextQueue = problemQueue.slice(1);

                if (currentProblem?.id) {
                    deleteDoc(doc(getDb(), 'users', USER_ID, CACHE_COLLECTION, currentProblem.id)).catch((err) => {
                        console.error('Failed to delete consumed sentence translation problem', err);
                    });
                }

                if (nextQueue.length > 0) {
                    setProblemQueue(nextQueue);
                    setProblem(nextQueue[0]);
                    setPhase('answering');
                    await saveSession({
                        phase: 'answering',
                        problemQueue: nextQueue,
                        lastResult: undefined,
                        lastUserAnswer: undefined,
                    });
                    void refillQueue();
                    return;
                }

                setPhase('loading');
                const nextProblem = await fetchAndStoreProblem();
                const restoredQueue = [nextProblem];
                setProblemQueue(restoredQueue);
                setProblem(nextProblem);
                setPhase('answering');

                await saveSession({
                    phase: 'answering',
                    problemQueue: restoredQueue,
                    lastResult: undefined,
                    lastUserAnswer: undefined,
                });
                void refillQueue();
                return;
            }

            setPhase('loading');
            const nextProblem = await fetchAndStoreProblem();
            const restoredQueue = [nextProblem];
            setProblemQueue(restoredQueue);
            setProblem(nextProblem);
            setPhase('answering');

            await saveSession({
                phase: 'answering',
                problemQueue: restoredQueue,
            });
            void refillQueue();
        } catch (err) {
            console.error('Failed to advance sentence translation problem', err);
            setPhase('idle');
            setError('다음 문장을 준비하지 못했습니다. 다시 시도해 주세요.');
        }
    }, [fetchAndStoreProblem, problemQueue, refillQueue, saveSession]);

    const reset = useCallback(() => {
        setPhase('idle');
        setProblemQueue([]);
        setProblem(null);
        setUserAnswer('');
        setResult(null);
        setError(null);
        setCachedProblems([]);
        const sessionDocRef = doc(getDb(), 'users', USER_ID, 'sessions', SESSION_DOC_ID);
        deleteDoc(sessionDocRef).catch((err) => console.error('Failed to delete sentence translation session', err));
    }, []);

    return {
        phase,
        problem,
        userAnswer,
        setUserAnswer,
        result,
        error,
        isLoadingSession,
        problemQueue,
        generate,
        generateNext,
        submit,
        reset,
    };
}