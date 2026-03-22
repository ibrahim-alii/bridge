import type {
  BlankRequest,
  BlankResponse,
  BlankEvaluateRequest,
  BlankEvaluateResponse,
} from '@bridge/contracts';
import { BlankResponseSchema, BlankEvaluateResponseSchema } from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { z } from 'zod';
import { llm } from './llm';
import { buildBlankingPrompt } from '../prompts';

export const blankService = {
  /**
   * Generate blanks for a code block.
   *
   * If gatedBlocks are provided (from /api/analyze), enriches those specific
   * blocks with hints, expectedPatterns, and blankTypes — avoids re-scanning.
   * If no gatedBlocks, falls back to full code scan.
   */
  async generateBlanks(request: BlankRequest): Promise<BlankResponse> {
    logger.info('blankService: generating blanks with LLM', {
      codeLength: request.code.length,
      language: request.language,
      preIdentifiedBlocks: request.gatedBlocks?.length ?? 0,
    });

    let prompt: string;

    if (request.gatedBlocks && request.gatedBlocks.length > 0) {
      // Enrichment mode: analyze already identified the blocks, just add blank metadata
      const blocksDescription = request.gatedBlocks
        .map((b) => `Lines ${b.startLine}-${b.endLine}: ${b.reason}`)
        .join('\n');

      const lang = request.language ?? 'code';
      prompt = `The following ${lang} has already been analyzed and specific blocks have been identified for a fill-in-the-blank comprehension exercise.

Your job is to ENRICH these pre-identified blocks with blanking metadata. Do NOT identify new blocks — use the ones provided.

Pre-identified blocks:
${blocksDescription}

For each block, provide:
- startLine and endLine (use the exact lines given)
- blankType: one of "function_body", "conditional", "loop_body", "return_value", "expression"
- hint: a subtle hint about what belongs here, without giving the answer
- expectedPattern: a description of what the correct fill-in should contain (NOT the literal code)

Return a JSON object:
{
  "blanks": [{ "startLine": <number>, "endLine": <number>, "blankType": "<type>", "hint": "<hint>", "expectedPattern": "<pattern>" }],
  "totalBlanks": <number>,
  "difficulty": "<easy | medium | hard>"
}

Code:
\`\`\`${lang}
${request.code}
\`\`\``;
    } else {
      // Full scan mode: no pre-identified blocks
      prompt = buildBlankingPrompt(request.code, request.language);
    }

    const result = await llm.complete(prompt, BlankResponseSchema, {
      temperature: 0.3,
    });

    return result;
  },

  /**
   * Evaluate a user's short-answer explanation of blanked code.
   *
   * Uses rubric-based evaluation:
   * - Does the explanation mention required concept words?
   * - Is it conceptually correct?
   * - Are there obvious contradictions or nonsense?
   */
  async evaluateBlank(request: BlankEvaluateRequest): Promise<BlankEvaluateResponse> {
    logger.info('blankService: evaluating blank answer with LLM', {
      blankId: request.blankId,
      explanationLength: request.userExplanation.length,
    });

    // Extract the blanked code section
    const codeLines = request.originalCode.split('\n');
    const blankedSection = codeLines
      .slice(request.startLine - 1, request.endLine)
      .join('\n');

    const prompt = `You are evaluating whether a user understands a section of code that was hidden from them.

## The Original Code (hidden from user):
\`\`\`
${blankedSection}
\`\`\`

## Full Code Context:
\`\`\`
${request.originalCode}
\`\`\`

## Expected Pattern:
${request.expectedPattern}

## User's Explanation:
"${request.userExplanation}"

## Evaluation Rules:
1. The user does NOT need to write exact code — they need to explain what the hidden section DOES
2. Check for conceptual correctness: does the explanation match what the code actually does?
3. Check for required concepts: does the explanation mention the key operations/patterns?
4. Check for contradictions: does the explanation say anything obviously wrong?
5. Be slightly lenient — if the user shows the core idea, pass them even if some details are fuzzy
6. Keep feedback brief: 1-2 sentences, max 35 words
7. If they're close but missing something, give a helpful short hint without revealing the answer

Return a JSON object:
{
  "passed": <boolean>,
  "feedback": "<brief feedback on their explanation>",
  "hint": "<if failed, a Socratic hint that guides without giving the answer — omit if passed>",
  "confidence": <0-1 how confident you are in this evaluation>
}`;

    const responseSchema = z.object({
      passed: z.boolean(),
      feedback: z.string(),
      hint: z.string().optional(),
      confidence: z.number().min(0).max(1).optional(),
    });

    const result = await llm.complete(prompt, responseSchema, {
      temperature: 0.2, // Low temp for consistent evaluation
    });

    return result;
  },
};
