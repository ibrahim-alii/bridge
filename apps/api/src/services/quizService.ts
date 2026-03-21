import type { QuizRequest, QuizResponse } from '@bridge/contracts';
import { QuizQuestionSchema, QuizResponseSchema } from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { z } from 'zod';
import { llm } from './llm';
import { buildQuizPrompt } from '../prompts';

export const quizService = {
  async generateQuiz(request: QuizRequest): Promise<QuizResponse> {
    // ── Mock mode ──────────────────────────────────────────────────
    if (llm.isMockMode()) {
      logger.debug('quizService: mock mode, returning hardcoded quiz');
      return {
        quizId: generateId(),
        questions: [
          {
            questionId: generateId(),
            question:
              'What does this function return when the input array is empty?',
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
    }

    // ── Live LLM mode ──────────────────────────────────────────────
    logger.info('quizService: generating quiz with LLM', {
      analysisId: request.analysisId,
      codeLength: request.code.length,
    });

    const prompt = buildQuizPrompt(request.code, request.concepts);

    // Schema for LLM response — questions without questionId, no quizId
    const llmQuestionSchema = QuizQuestionSchema.omit({ questionId: true });
    const llmResponseSchema = z.object({
      questions: z.array(llmQuestionSchema).min(1),
      passingScore: z.number().min(0).max(1),
    });

    const result = await llm.complete(prompt, llmResponseSchema, {
      temperature: 0.7, // Higher creativity for quiz generation
    });

    // Assign server-generated IDs
    return {
      quizId: generateId(),
      questions: result.questions.map((q) => ({
        ...q,
        questionId: generateId(),
      })),
      passingScore: result.passingScore,
    };
  },
};
