import React, { createContext, useContext, ReactNode } from 'react';
import { useVocabulary } from '../hooks/useVocabulary';
import { useGrammarStats } from '../hooks/useGrammarStats';
import { useMemorize } from '../hooks/useMemorize';
import { useSolve } from '../hooks/useSolve';
import { useVocabQuiz } from '../hooks/useVocabQuiz';

type AppContextType = {
  vocabulary: ReturnType<typeof useVocabulary>;
  grammarStats: ReturnType<typeof useGrammarStats>;
  memorize: ReturnType<typeof useMemorize>;
  solve: ReturnType<typeof useSolve>;
  vocabQuiz: ReturnType<typeof useVocabQuiz>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const vocabulary = useVocabulary();
  const grammarStats = useGrammarStats();
  
  const memorize = useMemorize(vocabulary.words);
  const solve = useSolve(vocabulary.words, grammarStats.updateStat, grammarStats.stats);
  const vocabQuiz = useVocabQuiz(vocabulary.words);

  return (
    <AppContext.Provider value={{ vocabulary, grammarStats, memorize, solve, vocabQuiz }}>
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
