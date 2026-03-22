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

function deriveMentorTopic(request: MentorHintRequest): string {
  const question = request.question.trim();
  const loweredCode = request.code.toLowerCase();

  if (question) {
    return question;
  }
  if (loweredCode.includes('__name__') && loweredCode.includes('__main__')) {
    return 'how program entry points behave';
  }
  if (loweredCode.includes('useeffect') || loweredCode.includes('react')) {
    return 'how component state and effects interact';
  }
  if (loweredCode.includes('async') || loweredCode.includes('await')) {
    return 'how async control flow works';
  }

  return 'the core behavior of the current code';
}

function buildFallbackHints(request: MentorHintRequest): MentorHintResponse {
  const topic = deriveMentorTopic(request);

  return {
    hints: [
      {
        level: 1,
        hint: `Start by naming the single responsibility of this part of the code. What job is it supposed to do around ${topic}?`,
        focusArea: 'overall purpose',
      },
      {
        level: 2,
        hint: `Trace one small example from start to finish and watch where the program branches, updates state, or returns early.`,
        focusArea: 'control flow',
      },
      {
        level: 3,
        hint: `Compare what should happen with what actually happens at the key decision point. The mismatch usually sits right before the final behavior you are confused about.`,
        focusArea: 'decision point',
      },
    ],
    guidingQuestions: [
      `What input or runtime condition changes the behavior here?`,
      `Where does the code decide whether to continue, stop, or do something different?`,
    ],
    encouragement: 'You do not need the full answer at once. If you trace one concrete case carefully, the next step usually becomes much clearer.',
  };
}

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

    try {
      return await llm.complete(prompt, LLMMentorResponseSchema, {
        temperature: 0.5,
      });
    } catch (error) {
      logger.warn('mentorService: LLM hint generation failed, returning deterministic fallback', {
        error,
      });
      return buildFallbackHints(request);
    }
  },
};
