import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useVocabulary } from '../hooks/useVocabulary';
import { useGrammarStats } from '../hooks/useGrammarStats';
import { useMemorize } from '../hooks/useMemorize';
import { useSolve } from '../hooks/useSolve';
import { useVocabQuiz } from '../hooks/useVocabQuiz';

type AppContextType = {
  auth: ReturnType<typeof useAuth>;
  vocabulary: ReturnType<typeof useVocabulary>;
  grammarStats: ReturnType<typeof useGrammarStats>;
  memorize: ReturnType<typeof useMemorize>;
  solve: ReturnType<typeof useSolve>;
  vocabQuiz: ReturnType<typeof useVocabQuiz>;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const vocabulary = useVocabulary(auth.user, auth.isAuthReady);
  const grammarStats = useGrammarStats(auth.user);
  
  const memorize = useMemorize(vocabulary.words, auth.user);
  const solve = useSolve(vocabulary.words, grammarStats.updateStat, grammarStats.stats, auth.user);
  const vocabQuiz = useVocabQuiz(vocabulary.words, auth.user);

  return (
    <AppContext.Provider value={{ auth, vocabulary, grammarStats, memorize, solve, vocabQuiz }}>
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
