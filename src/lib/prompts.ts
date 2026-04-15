import { Problem } from "../types";

export const PROMPTS = {
  generateMemorizeVocabQuizzes: (targetWords: string[]) => `
Generate a 4-option fill-in-the-blank English vocabulary question for each of the following target words:
TARGET WORDS: ${targetWords.join(', ')}

CRITICAL INSTRUCTIONS FOR OPTIONS:
1. Each question's options MUST include the target word itself as exactly one of the four choices.
2. The other three incorrect options (distractors) MUST be selected from the TARGET WORDS list, so the quiz includes other presented target words in the options.
3. Across the full set of generated questions, distribute the correct answer positions as evenly as possible among a, b, c, and d. Avoid repeating the same answer key too often in a row.

The questions should test the meaning or usage of the target word in a sentence. Include 2-4 key vocabulary words from the sentence with their Korean meanings in the 'vocabulary' field. Provide the output as a JSON array.
  `,

  generateVocabQuizzes: (targetWords: string[], knownWords: string[]) => `
Generate a 4-option fill-in-the-blank English vocabulary question for each of the following target words:
TARGET WORDS: ${targetWords.join(', ')}
KNOWN WORDS: ${knownWords.join(', ')}

GENERAL QUIZ INSTRUCTIONS:
1. Make each question natural, challenging, and suitable for general TOEIC vocabulary practice.
2. The correct answer should be the target word that best fits the blank in the sentence.
3. For incorrect options (distractors), include confusable words from KNOWN WORDS when appropriate (e.g., similar meaning, nuance, usage, part of speech, spelling, or collocation).
4. If suitable words from KNOWN WORDS are not available, use plausible TOEIC-level distractors.
5. Distribute the correct answer positions as evenly as possible among a, b, c, and d across the full set.
6. Avoid repeating the same correct answer position too many times in a row.

The questions should test the meaning or usage of the target word in a sentence. Include 2-4 key vocabulary words from the sentence with their Korean meanings in the 'vocabulary' field. Provide the output as a JSON array.
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
