import type { AnalyzeRequest, AnalyzeResponse } from '@bridge/contracts';
import { AnalyzeResponseSchema } from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { llm } from './llm';
import { buildAnalyzePrompt } from '../prompts';

export const analyzeService = {
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    logger.info('analyzeService: analyzing code with LLM', {
      codeLength: request.code.length,
      language: request.language,
    });

    const prompt = buildAnalyzePrompt(request.code, request.language);

    // Schema without analysisId — we generate that server-side
    const partialSchema = AnalyzeResponseSchema.omit({ analysisId: true });

    const result = await llm.complete(prompt, partialSchema, {
      temperature: 0.3,
    });

    return {
      analysisId: generateId(),
      ...result,
    };
  },
};
