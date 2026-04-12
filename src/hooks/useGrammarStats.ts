import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const DEFAULT_GRAMMAR_CATEGORIES = ['시제', '분사', '관계사', '접속사', '전치사', '수동태', '가정법', '동명사'];

export function useGrammarStats() {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    const docRef = doc(db, 'users', USER_ID, 'grammarStats', 'mastery');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as Record<string, number>);
      } else {
        const initialStats: Record<string, number> = {};
        DEFAULT_GRAMMAR_CATEGORIES.forEach(cat => initialStats[cat] = 50);
        setDoc(docRef, initialStats).catch(err => console.error(err));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${USER_ID}/grammarStats/mastery`);
    });
    return unsubscribe;
  }, []);

  const updateStat = async (grammar: string, isCorrect: boolean, difficulty: number) => {
    const category = DEFAULT_GRAMMAR_CATEGORIES.includes(grammar) ? grammar : '기타';
    
    const currentScore = stats[category] || 50;
    let newScore = currentScore;

    if (isCorrect) {
      newScore = Math.min(100, currentScore + (difficulty * 2));
    } else {
      newScore = Math.max(0, currentScore - ((6 - difficulty) * 2));
    }

    const docRef = doc(db, 'users', USER_ID, 'grammarStats', 'mastery');
    await setDoc(docRef, { [category]: newScore }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${USER_ID}/grammarStats/mastery`);
    });
  };

  const chartData = DEFAULT_GRAMMAR_CATEGORIES.map(subject => ({
    subject,
    A: stats[subject] || 50,
    fullMark: 100
  }));

  return { stats: chartData, updateStat };
}
