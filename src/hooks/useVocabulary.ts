import { useState, useEffect, useMemo } from 'react';
import { getDb, handleFirestoreError, OperationType, USER_ID } from '../firebase';
import { collection, onSnapshot, writeBatch, doc, getDocs, Timestamp, setDoc, increment, query, where, getCountFromServer } from 'firebase/firestore';
import { Word, StatsSummary } from '../types';
import { parseCSV } from '../lib/wordParser';
import { format } from 'date-fns';

const INITIAL_STATS: StatsSummary = {
  totalWords: 0,
  memorizedCount: 0,
  totalLearningDays: 0,
  dailyActivity: {},
  newWordsToday: {},
  lastUpdated: Date.now()
};

export function useVocabulary() {
  const [stats, setStats] = useState<StatsSummary>(INITIAL_STATS);

  useEffect(() => {
    const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
    const unsubscribe = onSnapshot(statsRef, (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data() as StatsSummary);
      } else {
        setDoc(statsRef, INITIAL_STATS).catch(err => console.error('Failed to init stats', err));
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${USER_ID}/stats/summary`);
    });

    return unsubscribe;
  }, []);

  const monthlyActivity = useMemo(() => {
    const days = [];
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= lastDay; i++) {
      const dayDate = new Date(year, month, i);
      const key = format(dayDate, 'yyyy-MM-dd');
      days.push({
        date: dayDate,
        count: stats.dailyActivity[key] || 0
      });
    }
    return days;
  }, [stats.dailyActivity]);

  const uploadCSV = async (file: File, onProgress: () => void, onSuccess: (count: number) => void, onError: () => void) => {
    onProgress();

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const parsedWords = parseCSV(csv);
      
      const batch = writeBatch(getDb());
      parsedWords.forEach(w => {
        const wordDoc = doc(getDb(), 'users', USER_ID, 'words', w.id);
        batch.set(wordDoc, { 
          ...w, 
          userId: USER_ID, 
          createdAt: Timestamp.now(),
          fsrs: null,
          memorized: false 
        });
      });

      const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
      batch.update(statsRef, {
        totalWords: increment(parsedWords.length),
        lastUpdated: Date.now()
      });
      
      try {
        await batch.commit();
        onSuccess(parsedWords.length);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${USER_ID}/words`);
        onError();
      }
    };
    reader.onerror = () => onError();
    reader.readAsText(file);
  };

  const resetData = async (onProgress: () => void, onSuccess: () => void, onError: () => void) => {
    onProgress();

    try {
      const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
      const snapshot = await getDocs(wordsRef);
      
      const batches = [];
      let currentBatch = writeBatch(getDb());
      let count = 0;

      snapshot.docs.forEach((d) => {
        currentBatch.delete(d.ref);
        count++;
        if (count >= 400) {
          batches.push(currentBatch.commit());
          currentBatch = writeBatch(getDb());
          count = 0;
        }
      });
      
      const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
      currentBatch.set(statsRef, INITIAL_STATS);
      batches.push(currentBatch.commit());

      await Promise.all(batches);
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${USER_ID}/words`);
      onError();
    }
  };

  const syncStatsFromScratch = async () => {
    const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
    const snapshot = await getDocs(wordsRef);
    
    const batch = writeBatch(getDb());
    const words = snapshot.docs.map(d => {
      const data = d.data() as Word;
      if (data.fsrs === undefined) {
        batch.update(d.ref, { fsrs: null });
      }
      return data;
    });
    
    const newStats: StatsSummary = {
      totalWords: words.length,
      memorizedCount: words.filter(w => w.memorized).length,
      totalLearningDays: 0,
      dailyActivity: {},
      newWordsToday: {},
      lastUpdated: Date.now()
    };

    const learningDays = new Set<string>();
    words.forEach(w => {
      if (w.fsrs?.last_review) {
        const key = format(new Date(w.fsrs.last_review), 'yyyy-MM-dd');
        learningDays.add(key);
        if (w.fsrs.state > 0) {
          newStats.dailyActivity[key] = (newStats.dailyActivity[key] || 0) + 1;
        }
      }
      if (w.introducedAt) {
        const key = format(new Date(w.introducedAt), 'yyyy-MM-dd');
        newStats.newWordsToday[key] = (newStats.newWordsToday[key] || 0) + 1;
      }
    });
    newStats.totalLearningDays = learningDays.size;

    const statsRef = doc(getDb(), 'users', USER_ID, 'stats', 'summary');
    batch.set(statsRef, newStats);
    await batch.commit();
  };

  return { 
    stats,
    monthlyActivity, 
    uploadCSV, 
    resetData, 
    syncStatsFromScratch,
    getStudyCounts: async () => {
      const wordsRef = collection(getDb(), 'users', USER_ID, 'words');
      const [newCountSnap, dueCountSnap] = await Promise.all([
        getCountFromServer(query(wordsRef, where('fsrs', '==', null))),
        getCountFromServer(query(wordsRef, where('fsrs.due', '<=', new Date().toISOString())))
      ]);
      return {
        newTotal: newCountSnap.data().count,
        dueTotal: dueCountSnap.data().count
      };
    }
  };
}
