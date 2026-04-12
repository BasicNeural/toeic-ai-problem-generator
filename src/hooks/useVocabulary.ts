import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError, OperationType, FirebaseUser } from '../firebase';
import { collection, onSnapshot, writeBatch, doc, getDocs, Timestamp } from 'firebase/firestore';
import { Word } from '../types';
import { parseCSV } from '../lib/wordParser';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, subDays } from 'date-fns';

export function useVocabulary(user: FirebaseUser | null, isAuthReady: boolean) {
  const [words, setWords] = useState<Word[]>([]);

  useEffect(() => {
    if (!user || !isAuthReady) {
      setWords([]);
      return;
    }

    const wordsRef = collection(db, 'users', user.uid, 'words');
    const unsubscribe = onSnapshot(wordsRef, (snapshot) => {
      const fetchedWords = snapshot.docs.map(doc => doc.data() as Word);
      setWords(fetchedWords);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}/words`);
    });

    return unsubscribe;
  }, [user, isAuthReady]);

  const memorizedCount = useMemo(() => {
    return words.filter(w => w.memorized && w.fsrs && w.fsrs.state > 0).length;
  }, [words]);

  const totalLearningDays = useMemo(() => {
    const days = new Set<string>();
    words.forEach(w => {
      if (w.fsrs?.last_review) {
        const dateStr = format(new Date(w.fsrs.last_review), 'yyyy-MM-dd');
        days.add(dateStr);
      }
    });
    return days.size;
  }, [words]);

  const monthlyActivity = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);
    const daysInMonth = eachDayOfInterval({ start, end });

    return daysInMonth.map(date => {
      const count = words.filter(w => {
        if (!w.fsrs?.last_review) return false;
        const reviewDate = new Date(w.fsrs.last_review);
        return isSameDay(reviewDate, date) && w.fsrs.state > 0 && w.lastRating !== 'Again';
      }).length;

      return {
        date,
        count
      };
    });
  }, [words]);

  const uploadCSV = async (file: File, onProgress: () => void, onSuccess: (count: number) => void, onError: () => void) => {
    if (!user) return;
    onProgress();

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target?.result as string;
      const parsedWords = parseCSV(csv);
      
      const batch = writeBatch(db);
      parsedWords.forEach(w => {
        const wordDoc = doc(db, 'users', user.uid, 'words', w.id);
        batch.set(wordDoc, { ...w, userId: user.uid, createdAt: Timestamp.now() });
      });
      
      try {
        await batch.commit();
        onSuccess(parsedWords.length);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/words`);
        onError();
      }
    };
    reader.onerror = () => onError();
    reader.readAsText(file);
  };

  const resetData = async (onProgress: () => void, onSuccess: () => void, onError: () => void) => {
    if (!user) return;
    onProgress();

    try {
      const batch = writeBatch(db);
      const wordsRef = collection(db, 'users', user.uid, 'words');
      const snapshot = await getDocs(wordsRef);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      onSuccess();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/words`);
      onError();
    }
  };

  return { words, memorizedCount, totalLearningDays, monthlyActivity, uploadCSV, resetData };
}
