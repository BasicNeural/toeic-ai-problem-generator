import React, { createContext, useContext, ReactNode } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useGrammarStats } from '../hooks/useGrammarStats';
import { useMemorize } from '../hooks/useMemorize';
import { useConjunctionMemorize } from '../hooks/useConjunctionMemorize';
import { useSolve } from '../hooks/useSolve';
import { useVocabQuiz } from '../hooks/useVocabQuiz';
import { useSentenceTranslate } from '../hooks/useSentenceTranslate';

type AppContextType = {
  vocabulary: ReturnType<typeof useVocabulary>;
  grammarStats: ReturnType<typeof useGrammarStats>;
  memorize: ReturnType<typeof useMemorize>;
  conjunctionMemorize: ReturnType<typeof useConjunctionMemorize>;
  solve: ReturnType<typeof useSolve>;
  vocabQuiz: ReturnType<typeof useVocabQuiz>;
  sentenceTranslate: ReturnType<typeof useSentenceTranslate>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const vocabulary = useVocabulary();
  const grammarStats = useGrammarStats();

  const memorize = useMemorize(vocabulary.stats);
  const conjunctionMemorize = useConjunctionMemorize();
  const solve = useSolve(grammarStats.updateStat, grammarStats.stats);
  const vocabQuiz = useVocabQuiz();
  const sentenceTranslate = useSentenceTranslate();

  return (
    <AppContext.Provider value={{ vocabulary, grammarStats, memorize, conjunctionMemorize, solve, vocabQuiz, sentenceTranslate }}>
      {children}
    </AppContext.Provider>
  );
}
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
