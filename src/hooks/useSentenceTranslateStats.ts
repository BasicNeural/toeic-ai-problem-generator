import { useEffect, useMemo, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { SentenceTranslateMastery } from '../types';

const INITIAL_SCORE = 50;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

function getBaseDifficulty(score: number) {
    if (score <= 20) return 1;
    if (score <= 40) return 2;
    if (score <= 60) return 3;
    if (score <= 80) return 4;
    return 5;
}

function pickWeightedDifficulty(baseDifficulty: number) {
    const weighted: Array<{ value: number; weight: number }> = [
        { value: clamp(baseDifficulty - 1, 1, 5), weight: 0.2 },
        { value: clamp(baseDifficulty, 1, 5), weight: 0.6 },
        { value: clamp(baseDifficulty + 1, 1, 5), weight: 0.2 },
    ];

    const mergedWeights = new Map<number, number>();
    weighted.forEach(({ value, weight }) => {
        mergedWeights.set(value, (mergedWeights.get(value) ?? 0) + weight);
    });

    const draw = Math.random();
    let cumulative = 0;
    for (const [value, weight] of mergedWeights.entries()) {
        cumulative += weight;
        if (draw <= cumulative) {
            return value;
        }
    }

    return baseDifficulty;
}

export function useSentenceTranslateStats() {
    const [score, setScore] = useState(INITIAL_SCORE);

    useEffect(() => {
        const docRef = doc(getDb(), 'users', USER_ID, 'sentenceTranslateStats', 'mastery');
        const unsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data() as Partial<SentenceTranslateMastery>;
                    setScore(clamp(data.score ?? INITIAL_SCORE, MIN_SCORE, MAX_SCORE));
                    return;
                }

                setDoc(docRef, { score: INITIAL_SCORE }).catch((err) => {
                    handleFirestoreError(err, OperationType.CREATE, `users/${USER_ID}/sentenceTranslateStats/mastery`);
                });
            },
            (err) => {
                handleFirestoreError(err, OperationType.GET, `users/${USER_ID}/sentenceTranslateStats/mastery`);
            }
        );

        return unsubscribe;
    }, []);

    const updateStat = async (isCorrect: boolean, difficulty: number) => {
        const currentScore = score;
        const safeDifficulty = clamp(Math.round(difficulty), 1, 5);
        const delta = isCorrect ? safeDifficulty * 2 : -((6 - safeDifficulty) * 2);
        const newScore = clamp(currentScore + delta, MIN_SCORE, MAX_SCORE);

        const docRef = doc(getDb(), 'users', USER_ID, 'sentenceTranslateStats', 'mastery');
        await setDoc(docRef, { score: newScore }, { merge: true }).catch((err) => {
            handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/sentenceTranslateStats/mastery`);
        });
    };

    const baseDifficulty = useMemo(() => getBaseDifficulty(score), [score]);

    const getRandomDifficulty = () => {
        return pickWeightedDifficulty(baseDifficulty);
    };

    return {
        score,
        baseDifficulty,
        getRandomDifficulty,
        updateStat,
    };
}
