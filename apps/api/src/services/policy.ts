import { generateId, expiresIn } from '@bridge/shared-utils';
import type { SessionState, BridgeApproval, GateScope } from '@bridge/contracts';

export interface EvaluationResult {
  correct: boolean;
  feedback: string;
  hint?: string;
}

export interface PolicyDecision {
  shouldLock: boolean;
  shouldUnlock: boolean;
  approval?: BridgeApproval;
  incrementAttempts: boolean;
  escalate: boolean;
  showAnswer?: boolean;
  feedback: string;
  hint?: string;
  attemptsRemaining?: number;
}

export const policyService = {
  /**
   * Evaluates the policy based on evaluation result and session state.
   * This is 100% deterministic - no LLM calls.
   */
  evaluatePolicy(
    evalResult: EvaluationResult,
    session: SessionState,
    scope: GateScope
  ): PolicyDecision {
    // SUCCESS PATH - User passed the gate
    if (evalResult.correct) {
      return {
        shouldLock: false,
        shouldUnlock: true,
        approval: this.generateApproval(session.sessionId, scope),
        incrementAttempts: false,
        escalate: false,
        feedback: evalResult.feedback,
      };
    }

    // FAILURE PATH - User did not pass
    const newAttempts = session.currentAttempts + 1;
    const attemptsRemaining = session.maxAttempts - newAttempts;

    // Check for max attempts reached (Option B: unlock + show answer)
    if (newAttempts >= session.maxAttempts) {
      return {
        shouldLock: false,
        shouldUnlock: true,
        incrementAttempts: true,
        escalate: false,
        showAnswer: true,
        feedback: 'Maximum attempts reached. Review the correct answer below and continue coding.',
        attemptsRemaining: 0,
      };
    }

    // Still have attempts left
    return {
      shouldLock: true,
      shouldUnlock: false,
      incrementAttempts: true,
      escalate: false,
      feedback: evalResult.feedback,
      hint: evalResult.hint,
      attemptsRemaining,
    };
  },

  /**
   * Generates an approval token for a successful gate pass.
   */
  generateApproval(sessionId: string, scope: GateScope): BridgeApproval {
    return {
      token: generateId(),
      sessionId,
      scope,
      expiresAt: expiresIn(3600), // 1 hour expiration
      reason: `Passed ${scope} gate evaluation`,
    };
  },
};
