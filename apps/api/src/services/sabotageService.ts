import type {
  SabotageRequest,
  SabotageResponse,
  SabotageFixRequest,
  SabotageFixResponse,
} from '@bridge/contracts';
import { generateId, logger } from '@bridge/shared-utils';
import { z } from 'zod';
import { llm } from './llm';
import { buildSabotagePrompt } from '../prompts';

// Schema for the LLM response (without bugId — we assign that server-side)
const LLMSabotageSchema = z.object({
  sabotagedCode: z.string(),
  originalLine: z.number(),
  originalContent: z.string(),
  sabotagedContent: z.string(),
  bugType: z.enum([
    'off_by_one',
    'wrong_operator',
    'wrong_variable',
    'missing_check',
    'wrong_return',
    'swapped_args',
    'boundary_error',
  ]),
  explanation: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function getLine(text: string, lineNumber: number): string {
  return text.split(/\r?\n/)[Math.max(0, lineNumber - 1)] ?? '';
}

function buildFallbackFixEvaluation(request: SabotageFixRequest): SabotageFixResponse {
  const normalizedFixed = normalize(request.fixedCode);
  const normalizedOriginal = normalize(request.originalCode);

  if (normalizedFixed === normalizedOriginal) {
    return {
      passed: true,
      feedback: 'Nice fix. You restored the code to the original intended behavior.',
      correctLineIdentified: true,
    };
  }

  const fixedLine = getLine(request.fixedCode, request.originalLine).trim();
  const restoredOriginalLine = fixedLine === request.originalContent.trim();
  const stillHasSabotagedLine = fixedLine === request.sabotagedContent.trim();

  if (restoredOriginalLine) {
    return {
      passed: true,
      feedback: 'Nice fix. You corrected the bugged line and brought the behavior back in line.',
      correctLineIdentified: true,
    };
  }

  return {
    passed: false,
    feedback: stillHasSabotagedLine
      ? 'The bugged line still appears unchanged.'
      : 'Your edit changed the code, but the original bug does not look fully resolved yet.',
    hint: `Focus on the line that was intentionally changed and think about the ${request.bugType.replace(/_/g, ' ')} behavior it introduced.`,
    correctLineIdentified: !stillHasSabotagedLine,
  };
}

export const sabotageService = {
  /**
   * Inject a single controlled bug into the given code.
   * The bug is subtle, compiles cleanly, and causes incorrect runtime behavior.
   */
  async injectBug(request: SabotageRequest): Promise<SabotageResponse> {
    logger.info('sabotageService: injecting bug with LLM', {
      codeLength: request.code.length,
      language: request.language,
    });

    const prompt = buildSabotagePrompt(request.code, request.language);

    const result = await llm.complete(prompt, LLMSabotageSchema, {
      temperature: 0.7, // Higher temp for creative bug injection
    });

    return {
      bugId: generateId(),
      ...result,
    };
  },

  /**
   * Evaluate the user's fix of the injected bug.
   *
   * Checks:
   * 1. Did the user change the correct line?
   * 2. Is the fix semantically correct?
   * 3. Did they introduce any new bugs?
   */
  async evaluateFix(request: SabotageFixRequest): Promise<SabotageFixResponse> {
    logger.info('sabotageService: evaluating fix with LLM', {
      bugId: request.bugId,
      bugType: request.bugType,
    });

    const prompt = `You are evaluating whether a user successfully found and fixed an intentionally injected bug in code.

## Original Clean Code:
\`\`\`
${request.originalCode}
\`\`\`

## Sabotaged Code (given to user):
\`\`\`
${request.sabotagedCode}
\`\`\`

## Bug Details:
- Line ${request.originalLine} was changed
- Original: \`${request.originalContent}\`
- Sabotaged to: \`${request.sabotagedContent}\`
- Bug type: ${request.bugType}

## User's Fixed Code:
\`\`\`
${request.fixedCode}
\`\`\`

## Evaluation Rules:
1. Check if the user changed the CORRECT line (line ${request.originalLine})
2. Check if their fix restores correct behavior (doesn't need to be identical to original — just functionally correct)
3. Check if they introduced any NEW bugs while fixing
4. If they fixed the wrong line or didn't actually fix the bug, give ONE Socratic hint
5. Do NOT reveal the exact answer — hint at the TYPE of error (${request.bugType})

Return a JSON object:
{
  "passed": <boolean>,
  "feedback": "<specific feedback>",
  "hint": "<if failed, one Socratic hint about where to look or what type of error it is — omit if passed>",
  "correctLineIdentified": <boolean — did they change the right line?>
}`;

    const responseSchema = z.object({
      passed: z.boolean(),
      feedback: z.string(),
      hint: z.string().optional(),
      correctLineIdentified: z.boolean().optional(),
    });

    try {
      return await llm.complete(prompt, responseSchema, {
        temperature: 0.2,
      });
    } catch (error) {
      logger.warn('sabotageService: LLM fix evaluation failed, returning deterministic fallback', {
        error,
        bugId: request.bugId,
      });
      return buildFallbackFixEvaluation(request);
    }
  },
};
