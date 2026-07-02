import { Problem } from "../types";

export const PROMPTS = {
  generateSentenceTranslation: (difficulty: number) => `
Create one natural English sentence for Korean translation practice.

Target difficulty: ${difficulty}

Requirements:
1. The sentence must be realistic, TOEIC-friendly, and suitable for intermediate learners.
2. Provide a clear Korean model translation.
3. Provide every whitespace-separated token from the sentence, in order, with a Korean meaning for each token so the UI can reveal every word on tap.
4. Make the sentence self-contained and avoid obscure idioms.
5. The hint must be a short Korean hint.
6. Difficulty scale is fixed: 1 = very easy, 2 = easy, 3 = medium, 4 = hard, 5 = very hard.
7. The returned difficulty MUST be exactly ${difficulty}. Do not choose a different number.
8. Return JSON only.

The JSON shape must be:
{
  "sentence": string,
  "translation": string,
  "tokens": [{ "word": string, "meaning": string }],
  "difficulty": number,
  "hint": string
}
  `,

  verifySentenceTranslation: (sentence: string, modelAnswer: string, userAnswer: string) => `
You are evaluating a Korean translation for an English sentence.

English sentence: ${sentence}
Model answer: ${modelAnswer}
User answer: ${userAnswer}

Judge whether the user answer preserves the meaning of the sentence and is natural Korean.
Accept answers that are semantically equivalent even if wording differs.
Reject answers that miss key meaning, tense, subject/object roles, negation, or important modifiers.
Write feedback in Korean only.
Keep the model answer in Korean only.

Return JSON only with this shape:
{
  "isValid": boolean,
  "feedback": string,
  "modelAnswer": string
}
  `,

  generateMemorizeVocabQuizzes: (targetWords: string[]) => `
Generate an English vocabulary question sentence for each of the following target words:
TARGET WORDS: ${targetWords.join(', ')}

For each word, create a natural, TOEIC-style sentence with a blank (_______) where the target word should go.
Provide the Korean translation of the sentence (wrap the translated word for the blank in <u> tags).
Provide a brief Korean explanation of why the target word fits.
Include 2-4 key vocabulary words from the sentence with their Korean meanings in the 'vocabulary' field.
Provide the output as a JSON array.
  `,

  generateConjunctionQuizzes: (targetConjunctions: string[]) => `
Generate TOEIC Part 5 style CONJUNCTION questions for each of the following target conjunctions.
TARGET CONJUNCTIONS: ${targetConjunctions.join(', ')}

CRITICAL REQUIREMENTS:
1. Each question MUST be a realistic TOEIC Part 5 business context sentence with exactly one blank (_______) where the target conjunction fits perfectly.
2. Avoid trivial meaning-translation questions. Test grammatical function/logic (cause, contrast, condition, time, etc.).
3. Provide a Korean translation of the full sentence; the Korean phrase corresponding to the blank MUST be wrapped in <u> tags.
4. Provide a brief Korean explanation of why the target conjunction fits perfectly.
5. Include 2-4 key vocabulary words from the sentence with their Korean meanings in the 'vocabulary' field.

Output MUST be a JSON array.
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
