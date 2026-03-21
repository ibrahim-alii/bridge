import type { AnalyzeRequest, AnalyzeResponse } from '@bridge/contracts';
import { AnalyzeResponseSchema } from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { llm } from './llm';
import { buildAnalyzePrompt } from '../prompts';

export const analyzeService = {
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    // ── Mock mode ──────────────────────────────────────────────────
    if (llm.isMockMode()) {
      logger.debug('analyzeService: mock mode, returning hardcoded data');
      return {
        analysisId: generateId(),
        complexity: 6,
        concepts: ['function declaration', 'conditional logic', 'array manipulation'],
        summary:
          'This code defines a function with conditional branching and array operations.',
        suggestedGate: 'quiz',
        gatedBlocks: [
          {
            startLine: 1,
            endLine: 15,
            reason:
              'Core logic block contains conditional branching that should be understood.',
          },
        ],
      };
    }

    // ── Live LLM mode ──────────────────────────────────────────────
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
