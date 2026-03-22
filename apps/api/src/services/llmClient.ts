import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@bridge/shared-utils';
import type { EvaluationResult } from './policy';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const isMockMode = process.env.BRIDGE_MOCK_MODE === 'true';

export const llmClient = {
  /**
   * Evaluates a blank-fill answer by comparing user's code to reference code.
   * Uses Claude Haiku for token efficiency.
   */
  async evaluateBlank(userCode: string, referenceCode: string): Promise<EvaluationResult> {
    if (isMockMode) {
      return {
        correct: true,
        feedback: 'Mock mode: blank answer accepted',
      };
    }

    try {
      // Limit context size to reduce token usage
      const limitedUserCode = userCode.slice(0, 500);
      const limitedReferenceCode = referenceCode.slice(0, 500);

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4',
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
Focus on functional correctness, not style. Be encouraging if correct, provide a Socratic hint if incorrect.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = JSON.parse(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for blank-fill, using permissive fallback', { error: err });
      return {
        correct: true, // PERMISSIVE FALLBACK
        feedback: '⚠️ Automatic validation unavailable. Answer accepted with caution.',
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
    if (isMockMode) {
      return {
        correct: true,
        feedback: 'Mock mode: bug identification accepted',
      };
    }

    try {
      // Limit explanation length
      const limitedExplanation = explanation.slice(0, 500);

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4',
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
Award credit if the explanation shows understanding even if the line number is slightly off.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = JSON.parse(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for bug-hunt, using permissive fallback', { error: err });
      return {
        correct: true, // PERMISSIVE FALLBACK
        feedback: '⚠️ Automatic validation unavailable. Answer accepted with caution.',
      };
    }
  },

  /**
   * Evaluates a commit explanation by comparing it to the diff context.
   * Uses Claude Haiku to check for understanding.
   */
  async evaluateCommit(explanation: string, diffSummary: string): Promise<EvaluationResult> {
    if (isMockMode) {
      return {
        correct: true,
        feedback: 'Mock mode: commit explanation accepted',
      };
    }

    try {
      // Limit context sizes
      const limitedExplanation = explanation.slice(0, 500);
      const limitedDiff = diffSummary.slice(0, 500);

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4',
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
Award credit if they demonstrate understanding of what changed and why, even if not perfectly worded.`,
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const parsed = JSON.parse(responseText);

      return {
        correct: parsed.correct ?? false,
        feedback: parsed.feedback || 'Evaluation complete.',
        hint: parsed.hint,
      };
    } catch (err) {
      logger.warn('LLM evaluation failed for commit explanation, using permissive fallback', {
        error: err,
      });
      return {
        correct: true, // PERMISSIVE FALLBACK
        feedback: '⚠️ Automatic validation unavailable. Answer accepted with caution.',
      };
    }
  },
};
