import type { QuizQuestion } from '@bridge/contracts';

/** Static quiz payload for UI development until `/quiz` is wired. */
export const PLACEHOLDER_QUIZ: QuizQuestion = {
  questionId: '00000000-0000-4000-8000-000000000001',
  question: 'Why might we prefer a Map over an array for frequent key lookups?',
  options: ['O(1) average lookup by key', 'Smaller bundle size', 'Fewer imports', 'Better CSS support'],
  correctIndex: 0,
  explanation: 'A Map gives direct key lookup without scanning entries.',
  difficulty: 'medium',
};
