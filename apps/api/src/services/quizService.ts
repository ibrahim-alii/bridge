import type { QuizRequest, QuizResponse } from '@bridge/contracts';
import { QuizQuestionSchema } from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { z } from 'zod';
import { llm } from './llm';
import { buildQuizPrompt } from '../prompts';

export const quizService = {
  async generateQuiz(request: QuizRequest): Promise<QuizResponse> {
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
      temperature: 0.7,
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
