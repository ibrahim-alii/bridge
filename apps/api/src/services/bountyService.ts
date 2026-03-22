import type {
  BountyAnalyzeRequest,
  BountyAnalyzeResponse,
  BountyChallengeRequest,
  BountyChallengeResponse,
  BountyEvaluateRequest,
  BountyEvaluateResponse,
  SmellType,
} from '@bridge/contracts';
import {
  BountyChallengeResponseSchema,
  BountyEvaluateResponseSchema,
} from '@bridge/contracts';
import { logger } from '@bridge/shared-utils';
import { llm } from './llm';
import { buildBountyChallengePrompt, buildBountyEvaluatePrompt } from '../prompts';

// ─── Lightweight Heuristics ─────────────────────────────────────────
function detectSmells(code: string): SmellType | null {
  const normalized = code.replace(/\s+/g, ' ');

  // Nested Loops (O(N^2) indicator)
  if (/for.*\{.*for.*\{/i.test(normalized) || /while.*\{.*(for|while).*\{/i.test(normalized)) {
    return 'nested_loops';
  }

  // Repeated Lookups (Array matching inside Array map/filter)
  if (/\.(map|filter|forEach)\(.*=>.*\.(find|filter|indexOf|includes)\(/i.test(normalized)) {
    return 'repeated_lookups';
  }

  // Monolithic Class (> 100 lines rough estimate or many 'this.' bindings)
  const lines = code.split('\n');
  if (code.includes('class ') && lines.length > 80 && (code.match(/this\./g) || []).length > 20) {
    return 'monolithic_class';
  }

  return null;
}

export const bountyService = {
  /**
   * Fast, regex-based analysis to flag code smells. No LLM call here.
   */
  async analyze(request: BountyAnalyzeRequest): Promise<BountyAnalyzeResponse> {
    const smellType = detectSmells(request.code);
    const hasSmell = smellType !== null;

    logger.info('bountyService: completed fast analysis', {
      hasSmell,
      smellType,
      codeLength: request.code.length,
    });

    return { hasSmell, smellType };
  },

  /**
   * Generates a "Senior Engineer Challenge" using the LLM based on the flagged smell.
   */
  async generateChallenge(request: BountyChallengeRequest): Promise<BountyChallengeResponse> {
    logger.info('bountyService: generating challenge', { smellType: request.smellType });
    const prompt = buildBountyChallengePrompt(request.code, request.smellType);
    
    return await llm.complete(prompt, BountyChallengeResponseSchema, {
      temperature: 0.6,
    });
  },

  /**
   * Evaluates the submitted refactor to see if it fixed the code smell.
   */
  async evaluateRefactor(request: BountyEvaluateRequest): Promise<BountyEvaluateResponse> {
    logger.info('bountyService: evaluating refactor', { smellType: request.smellType });
    const prompt = buildBountyEvaluatePrompt(request.originalCode, request.refactoredCode, request.smellType);

    return await llm.complete(prompt, BountyEvaluateResponseSchema, {
      temperature: 0.2, // Low temp for more deterministic grading
    });
  },
};
