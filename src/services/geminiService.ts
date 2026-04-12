import { GoogleGenAI, Type } from "@google/genai";
import { Problem, AgentLog, WorkflowResult, VocabQuiz } from "../types";
import { ApiKeyManager } from "../lib/apiKeyManager";
import { PROMPTS } from "../lib/prompts";

function getAIClient() {
  return new GoogleGenAI({ apiKey: ApiKeyManager.getCurrentKey() });
}

async function executeWithRetry<T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  const maxAttempts = Math.max(1, ApiKeyManager.getAllKeys().length);
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ai = getAIClient();
      const result = await operation(ai);
      ApiKeyManager.advance();
      return result;
    } catch (error: any) {
      lastError = error;
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn(`API Key rate limited. Rotating key... (Attempt ${attempt + 1}/${maxAttempts})`);
        ApiKeyManager.rotateKey();
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const problemSchema = {
  type: Type.OBJECT,
  properties: {
    question: { type: Type.STRING, description: "The TOEIC Part 5 question text with a blank (e.g., 'The manager _______ the report yesterday.')" },
    options: {
      type: Type.OBJECT,
      properties: {
        a: { type: Type.STRING },
        b: { type: Type.STRING },
        c: { type: Type.STRING },
        d: { type: Type.STRING },
      },
      required: ["a", "b", "c", "d"],
    },
    answer: { type: Type.STRING, enum: ["a", "b", "c", "d"], description: "The correct option key" },
    explanation: { type: Type.STRING, description: "Detailed explanation in Korean why the answer is correct" },
    grammar: { type: Type.STRING, description: "The specific grammar point used. MUST be one of: 시제, 분사, 관계사, 접속사, 전치사, 수동태, 가정법, 동명사" },
    difficulty: { type: Type.INTEGER, description: "Difficulty level of the problem from 1 (very easy) to 5 (very hard)" },
    vocabulary: {
      type: Type.ARRAY,
      description: "List of 2-4 key vocabulary words from the question and their Korean meanings",
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          meaning: { type: Type.STRING }
        },
        required: ["word", "meaning"]
      }
    }
  },
  required: ["question", "options", "answer", "explanation", "grammar", "difficulty", "vocabulary"],
};

const verificationSchema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN, description: "Whether the problem is high quality and accurate" },
    feedback: { type: Type.STRING, description: "Detailed feedback or improvement points in Korean if isValid is false" },
  },
  required: ["isValid", "feedback"],
};

const vocabQuizArraySchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING, description: "The target vocabulary word" },
      question: { type: Type.STRING, description: "A fill-in-the-blank sentence with '_______' for the target word" },
      translation: { type: Type.STRING, description: "Korean translation of the question sentence. The translated word that corresponds to the blank MUST be wrapped in <u> tags (e.g., '그는 어제 보고서를 <u>제출했다</u>.')" },
      options: {
        type: Type.OBJECT,
        properties: {
          a: { type: Type.STRING },
          b: { type: Type.STRING },
          c: { type: Type.STRING },
          d: { type: Type.STRING },
        },
        required: ["a", "b", "c", "d"],
      },
      answer: { type: Type.STRING, enum: ["a", "b", "c", "d"], description: "The correct option key" },
      explanation: { type: Type.STRING, description: "Brief explanation in Korean" },
      vocabulary: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING, description: "A key English word from the sentence" },
            meaning: { type: Type.STRING, description: "Korean meaning of the word" },
          },
          required: ["word", "meaning"],
        },
        description: "2-4 key vocabulary words from the sentence with Korean meanings",
      },
    },
    required: ["word", "question", "translation", "options", "answer", "explanation", "vocabulary"],
  }
};

export class GeminiService {
  static async generateVocabQuizzes(targetWords: string[], knownWords: string[]): Promise<VocabQuiz[]> {
    const knownWordsList = knownWords.length > 0 ? knownWords.join(', ') : 'any TOEIC vocabulary';
    const response = await executeWithRetry(ai => ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: PROMPTS.generateVocabQuizzes(targetWords, knownWordsList),
      config: {
        responseMimeType: "application/json",
        responseSchema: vocabQuizArraySchema,
      },
    }));
    return JSON.parse(response.text);
  }

  private static async generate(words: string[], targetGrammarCategories: string[]): Promise<Problem> {
    const wordList = words.length > 0 ? words.join(', ') : 'any TOEIC vocabulary';
    const targetListStr = targetGrammarCategories.length > 0 
      ? JSON.stringify(targetGrammarCategories) 
      : '["시제", "분사", "관계사", "접속사", "전치사", "수동태", "가정법", "동명사"]';

    const response = await executeWithRetry(ai => ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: PROMPTS.generateGrammarProblem(wordList, targetListStr),
      config: {
        responseMimeType: "application/json",
        responseSchema: problemSchema,
      },
    }));
    return JSON.parse(response.text);
  }

  private static async verify(problem: Problem): Promise<{ isValid: boolean; feedback: string }> {
    const response = await executeWithRetry(ai => ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: PROMPTS.verifyProblem(problem),
      config: {
        responseMimeType: "application/json",
        responseSchema: verificationSchema,
      },
    }));
    return JSON.parse(response.text);
  }

  private static async correct(problem: Problem, feedback: string): Promise<Problem> {
    const response = await executeWithRetry(ai => ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: PROMPTS.correctProblem(problem, feedback),
      config: {
        responseMimeType: "application/json",
        responseSchema: problemSchema,
      },
    }));
    return JSON.parse(response.text);
  }

  static async runWorkflow(
    words: string[], 
    targetGrammarCategories: string[],
    onLog: (log: AgentLog) => void
  ): Promise<WorkflowResult> {
    const logs: AgentLog[] = [];
    const addLog = (agent: AgentLog['agent'], message: string, status: AgentLog['status']) => {
      const log: AgentLog = { 
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
        agent, 
        message, 
        timestamp: Date.now(), 
        status 
      };
      logs.push(log);
      onLog(log);
    };

    addLog('Generator', `Generating initial problem focusing on weak points (${targetGrammarCategories.join(', ')})...`, 'info');
    let currentProblem = await this.generate(words, targetGrammarCategories);
    addLog('Generator', `Initial problem generated. Grammar focus: ${currentProblem.grammar}`, 'success');

    let iterations = 0;
    const maxIterations = 3;
    let finalComments = "";

    while (iterations < maxIterations) {
      iterations++;
      addLog('Verifier', `Verifying problem (Attempt ${iterations})...`, 'info');
      const verification = await this.verify(currentProblem);

      if (verification.isValid) {
        addLog('Verifier', 'Problem verified successfully!', 'success');
        break;
      } else {
        addLog('Verifier', `Verification failed: ${verification.feedback}`, 'warning');
        
        if (iterations < maxIterations) {
          addLog('Corrector', 'Correcting problem based on feedback...', 'info');
          currentProblem = await this.correct(currentProblem, verification.feedback);
          addLog('Corrector', 'Problem corrected.', 'success');
        } else {
          addLog('Verifier', 'Max iterations reached. Finalizing with comments.', 'error');
          finalComments = verification.feedback;
        }
      }
    }

    if (finalComments) {
      currentProblem.comments = finalComments;
    }

    return {
      problem: currentProblem,
      logs,
      iterations
    };
  }
}
