import { Problem } from "../types";

export const PROMPTS = {
  generateVocabQuizzes: (targetWords: string[], knownWordsList: string) => `
Generate a 4-option fill-in-the-blank English vocabulary question for each of the following target words:
TARGET WORDS: ${targetWords.join(', ')}

CRITICAL INSTRUCTION FOR OPTIONS:
To make the quiz challenging, the incorrect options (distractors) MUST be selected from the following list of words the user already knows:
KNOWN WORDS: ${knownWordsList}

The questions should test the meaning or usage of the target word in a sentence. Provide the output as a JSON array.
  `,

  generateGrammarProblem: (wordList: string, targetListStr: string) => `
Create a TOEIC Part 5 grammar problem. 
Try to use at least one of these words if possible: ${wordList}.

CRITICAL: You MUST pick a grammar point RANDOMLY from this specific list to focus on the user's weak points: ${targetListStr}. 
Do NOT use any other grammar category.

Output the exact Korean string in the 'grammar' field.
Also determine the difficulty of the problem from 1 to 5.
Include 2-4 key vocabulary words from the sentence with their Korean meanings in the 'vocabulary' field.
The problem must be challenging and realistic for TOEIC.
  `,

  verifyProblem: (problem: Problem) => `
Verify the following TOEIC Part 5 problem for accuracy, naturalness, and quality. 
Problem: ${JSON.stringify(problem)}
Check if:
1. The question is grammatically correct.
2. Only one option is correct.
3. The explanation is clear and accurate.
4. It follows TOEIC style.
  `,

  correctProblem: (problem: Problem, feedback: string) => `
Correct the following TOEIC Part 5 problem based on the feedback provided.
Original Problem: ${JSON.stringify(problem)}
Feedback: ${feedback}
  `
};
