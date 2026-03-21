import type { QuizRequest, QuizResponse } from '@bridge/contracts';
import { generateId } from '@bridge/shared-utils';

export const quizService = {
  async generateQuiz(request: QuizRequest): Promise<QuizResponse> {
    // TODO: Replace with LLM-generated quiz questions
    // Mock returns a single question for development

    return {
      quizId: generateId(),
      questions: [
        {
          questionId: generateId(),
          question: 'What does this function return when the input array is empty?',
          options: [
            'undefined',
            'null',
            'An empty array',
            'It throws an error',
          ],
          correctIndex: 2,
          explanation:
            'The function initializes a result array and returns it. When the input is empty, no elements are pushed, so it returns an empty array.',
          difficulty: 'medium',
        },
      ],
      passingScore: 0.7,
    };
  },
};
