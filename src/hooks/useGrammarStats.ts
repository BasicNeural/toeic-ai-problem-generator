import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType, FirebaseUser } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

export const DEFAULT_GRAMMAR_CATEGORIES = ['시제', '분사', '관계사', '접속사', '전치사', '수동태', '가정법', '동명사'];

export function useGrammarStats(user: FirebaseUser | null) {
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user) {
      setStats({});
      return;
    }
    const docRef = doc(db, 'users', user.uid, 'grammarStats', 'mastery');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as Record<string, number>);
      } else {
        // Initialize
        const initialStats: Record<string, number> = {};
        DEFAULT_GRAMMAR_CATEGORIES.forEach(cat => initialStats[cat] = 50);
        setDoc(docRef, initialStats).catch(err => console.error(err));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/grammarStats/mastery`);
    });
    return unsubscribe;
  }, [user]);

  const updateStat = async (grammar: string, isCorrect: boolean, difficulty: number) => {
    if (!user) return;
    
    // Ensure the grammar category is valid, otherwise fallback to a default or ignore
    const category = DEFAULT_GRAMMAR_CATEGORIES.includes(grammar) ? grammar : '기타';
    
    const currentScore = stats[category] || 50;
    let newScore = currentScore;

    if (isCorrect) {
      // Harder questions give more points
      newScore = Math.min(100, currentScore + (difficulty * 2));
    } else {
      // Easier questions give more penalty
      newScore = Math.max(0, currentScore - ((6 - difficulty) * 2));
    }

    const docRef = doc(db, 'users', user.uid, 'grammarStats', 'mastery');
    await setDoc(docRef, { [category]: newScore }, { merge: true }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/grammarStats/mastery`);
    });
  };

  const chartData = DEFAULT_GRAMMAR_CATEGORIES.map(subject => ({
    subject,
    A: stats[subject] || 50,
    fullMark: 100
  }));

  return { stats: chartData, updateStat };
}
