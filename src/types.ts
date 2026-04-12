export interface Problem {
  id?: string;
  status?: 'pending' | 'solved';
  createdAt?: number;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  answer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  grammar: string;
  difficulty: number;
  vocabulary?: { word: string; meaning: string }[];
  comments?: string;
}

export enum Rating {
  Again = 0,
  Hard = 1,
  Good = 2,
  Easy = 3,
}

export interface Meaning {
  wordClass: string;
  definition: string;
}

export interface VocabQuiz {
  word: string;
  question: string;
  translation: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  answer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  vocabulary?: { word: string; meaning: string }[];
}

export interface FSRSState {
  due: string; // ISO string
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number; // 0: New, 1: Learning, 2: Review, 3: Relearning
  last_review?: string; // ISO string
}

export interface Word {
  id: string;
  term: string;
  meanings: Meaning[];
  memorized: boolean;
  fsrs?: FSRSState;
  introducedAt?: string;
  // Session tracking
  failCount?: number;
  lastRating?: string;
}

export interface AgentLog {
  id: string;
  agent: 'Generator' | 'Verifier' | 'Corrector';
  message: string;
  timestamp: number;
  status: 'success' | 'info' | 'warning' | 'error';
}

export interface WorkflowResult {
  problem: Problem;
  logs: AgentLog[];
  iterations: number;
}
