import type { MentorHintRequest, MentorHintResponse } from '@bridge/contracts';
import { MentorHintSchema } from '@bridge/contracts';
import { logger } from '@bridge/shared-utils';
import { z } from 'zod';
import { llm } from './llm';
import { buildMentorHintPrompt } from '../prompts';

// Schema for the full LLM response
const LLMMentorResponseSchema = z.object({
  hints: z.array(MentorHintSchema).length(3),
  guidingQuestions: z.array(z.string()).min(1),
  encouragement: z.string(),
});

export const mentorService = {
  /**
   * Generate conceptual hints for a user struggling with code.
   *
   * HARD RULE: The response must NEVER contain working code.
   * Only conceptual hints, guiding questions, and tiny toy examples are allowed.
   */
  async getHint(request: MentorHintRequest): Promise<MentorHintResponse> {
    logger.info('mentorService: generating hints with LLM', {
      codeLength: request.code.length,
      attemptNumber: request.attemptNumber,
    });

    const prompt = buildMentorHintPrompt(
      request.code,
      request.question,
      request.previousHints,
    );

    const result = await llm.complete(prompt, LLMMentorResponseSchema, {
      temperature: 0.5,
    });

    return result;
  },
};
