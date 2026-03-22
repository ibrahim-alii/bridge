import type { StudyRecommendationRequest, StudyRecommendationResponse } from '@bridge/contracts';
import { StudyRecommendationResponseSchema } from '@bridge/contracts';
import { logger } from '@bridge/shared-utils';
import { llm } from './llm';
import { buildStudyPrompt } from '../prompts';

export const studyService = {
  /**
   * Generates a single lightweight study recommendation mapping the user's code to a core pattern.
   */
  async getRecommendation(request: StudyRecommendationRequest): Promise<StudyRecommendationResponse> {
    logger.info('studyService: generating recommendation with LLM', {
      codeLength: request.code.length,
      language: request.language,
    });

    const prompt = buildStudyPrompt(request.code, request.language);

    const result = await llm.complete(prompt, StudyRecommendationResponseSchema, {
      temperature: 0.2, // Low temperature for consistent classification
    });

    return result;
  },
};
