import { useCallback, useState } from 'react';
import { GeminiService } from '../services/geminiService';
import { SentenceTranslationProblem, SentenceTranslationVerification } from '../types';

type SentenceTranslatePhase = 'idle' | 'loading' | 'answering' | 'verifying' | 'result';

export function useSentenceTranslate() {
    const [phase, setPhase] = useState<SentenceTranslatePhase>('idle');
    const [problem, setProblem] = useState<SentenceTranslationProblem | null>(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [result, setResult] = useState<SentenceTranslationVerification | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generate = useCallback(async () => {
        setPhase('loading');
        setError(null);
        setResult(null);
        setUserAnswer('');

        try {
            const nextProblem = await GeminiService.generateSentenceTranslation();
            setProblem(nextProblem);
            setPhase('answering');
        } catch (err) {
            console.error('Failed to generate sentence translation problem', err);
            setProblem(null);
            setPhase('idle');
            setError('문장을 생성하지 못했습니다. 다시 시도해 주세요.');
        }
    }, []);

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
            setResult(verification);
            setPhase('result');
        } catch (err) {
            console.error('Failed to verify sentence translation', err);
            setPhase('answering');
            setError('번역 검증에 실패했습니다. 다시 시도해 주세요.');
        }
    }, [problem, userAnswer]);

    const reset = useCallback(() => {
        setPhase('idle');
        setProblem(null);
        setUserAnswer('');
        setResult(null);
        setError(null);
    }, []);

    return {
        phase,
        problem,
        userAnswer,
        setUserAnswer,
        result,
        error,
        generate,
        submit,
        reset,
    };
}