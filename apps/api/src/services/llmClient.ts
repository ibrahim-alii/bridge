import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@bridge/shared-utils';
import type { EvaluationResult } from './policy';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const EVALUATION_MODEL = 'claude-sonnet-4-20250514';

function parseEvaluationPayload(responseText: string): {
  correct?: boolean;
  feedback?: string;
  hint?: string;
} {
  const trimmed = responseText.trim();

  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const normalized = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(normalized) as {
      correct?: boolean;
      feedback?: string;
      hint?: string;
    };
  } catch (error) {
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]) as {
        correct?: boolean;
        feedback?: string;
        hint?: string;
      };
    }

    throw error;
  }
}

export const llmClient = {
  /**
   * Evaluates a blank-fill answer by comparing user's code to reference code.
   * Uses Claude for token-efficient grading.
   */
  async evaluateBlank(userCode: string, referenceCode: string): Promise<EvaluationResult> {
    try {
      // Limit context size to reduce token usage
      const limitedUserCode = userCode.slice(0, 500);
      const limitedReferenceCode = referenceCode.slice(0, 500);

      const message = await anthropic.messages.create({
        model: EVALUATION_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Compare the user's code to the reference implementation. Is it functionally correct?

REFERENCE IMPLEMENTATION:
\`\`\`
${limitedReferenceCode}
\`\`\`

USER'S CODE:
\`\`\`
${limitedUserCode}
\`\`\`

Reply in JSON format: {"correct": boolean, "feedback": "...", "hint": "..."}
Focus on functional correctness, not style.
Be slightly lenient: accept answers that capture the core behavior even if names, structure, or wording differ.
Keep feedback short: 1-2 sentences, max 35 words.
If incorrect, mention the biggest mismatch briefly and give a short hint without sounding harsh.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = parseEvaluationPayload(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for blank-fill', { error: err });
      return {
        correct: false,
        feedback: 'Automatic validation is currently unavailable. Please try again once the model backend is healthy.',
      };
    }
  },

  /**
   * Evaluates a bug-hunt answer by checking proximity and explanation quality.
   * Uses Claude Haiku to grade explanation if proximity check fails.
   */
  async evaluateBug(
    explanation: string,
    actualBugLine: number,
    identifiedLine: number
  ): Promise<EvaluationResult> {
    try {
      // Limit explanation length
      const limitedExplanation = explanation.slice(0, 500);

      const message = await anthropic.messages.create({
        model: EVALUATION_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Evaluate if the user's explanation demonstrates understanding of a bug.

ACTUAL BUG LOCATION: Line ${actualBugLine}
USER IDENTIFIED: Line ${identifiedLine}
USER'S EXPLANATION:
${limitedExplanation}

Reply in JSON format: {"correct": boolean, "feedback": "...", "hint": "..."}
Be slightly lenient: award credit if the explanation shows the core issue, even if the line number or wording is somewhat off.
Keep feedback short: 1-2 sentences, max 35 words.
If incorrect, briefly point to what they missed and provide a short hint.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = parseEvaluationPayload(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for bug-hunt', { error: err });
      return {
        correct: false,
        feedback: 'Automatic bug evaluation is currently unavailable. Please try again once the model backend is healthy.',
      };
    }
  },

  /**
   * Evaluates a commit explanation by comparing it to the diff context.
   * Uses Claude to check for understanding.
   */
  async evaluateCommit(explanation: string, diffSummary: string): Promise<EvaluationResult> {
    try {
      // Limit context sizes
      const limitedExplanation = explanation.slice(0, 500);
      const limitedDiff = diffSummary.slice(0, 500);

      const message = await anthropic.messages.create({
        model: EVALUATION_MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Evaluate if the user's explanation demonstrates understanding of a code change.

DIFF SUMMARY:
${limitedDiff}

USER'S EXPLANATION:
${limitedExplanation}

Reply in JSON format: {"correct": boolean, "feedback": "...", "hint": "..."}
Be slightly lenient: award credit if they explain the main change and purpose, even if details are incomplete or phrasing is imperfect.
Keep feedback short: 1-2 sentences, max 35 words.
If incorrect, name the main gap briefly and provide a short hint.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = parseEvaluationPayload(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for commit explanation', {
        error: err,
      });
      return {
        correct: false,
        feedback: 'Automatic commit review is currently unavailable. Please try again once the model backend is healthy.',
      };
    }
  },
};
