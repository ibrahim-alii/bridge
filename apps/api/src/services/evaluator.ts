import { llmClient } from './llmClient';
import { sessionService } from './session';
import { logger } from '@bridge/shared-utils';
import type { EvaluateRequest } from '@bridge/contracts';
import type { SessionState } from '@bridge/contracts';
import type { EvaluationResult } from './policy';

export const evaluatorService = {
  /**
   * Main evaluation dispatcher - routes to appropriate gate-specific evaluator.
   */
  async evaluate(request: EvaluateRequest, session: SessionState): Promise<EvaluationResult> {
    logger.debug('Evaluating answer', { scope: request.scope, sessionId: request.sessionId });

    switch (request.scope) {
      case 'quiz':
        return this.evaluateQuiz(request, session);
      case 'blank':
        return this.evaluateBlank(request, session);
      case 'bug':
        return this.evaluateBug(request, session);
      case 'commit':
        return this.evaluateCommit(request, session);
      default:
        throw new Error(`Unknown gate scope: ${request.scope}`);
    }
  },

  /**
   * Evaluates a quiz answer (DETERMINISTIC - no LLM).
   */
  async evaluateQuiz(request: EvaluateRequest, session: SessionState): Promise<EvaluationResult> {
    if (!request.quizAnswer) {
      return {
        correct: false,
        feedback: 'Quiz answer not provided',
      };
    }

    // Retrieve quiz metadata from session
    const metadata = await sessionService.getGateMetadata(session.sessionId, 'quiz');

    if (!metadata || !metadata.quizQuestions) {
      logger.error('Quiz metadata not found', { sessionId: session.sessionId });
      return {
        correct: false,
        feedback: 'Quiz data not found. Please regenerate the quiz.',
      };
    }

    const quizQuestions = metadata.quizQuestions;
    const question = quizQuestions.find(
      (q: any) => q.questionId === request.quizAnswer!.questionId
    );

    if (!question) {
      logger.error('Quiz question not found', {
        sessionId: session.sessionId,
        questionId: request.quizAnswer.questionId,
      });
      return {
        correct: false,
        feedback: 'Quiz question not found.',
      };
    }

    // Check if answer is correct (deterministic)
    const isCorrect = request.quizAnswer.selectedIndex === question.correctIndex;

    if (isCorrect) {
      return {
        correct: true,
        feedback: question.explanation || 'Correct! Well done.',
      };
    } else {
      return {
        correct: false,
        feedback: 'Incorrect answer.',
        hint: 'Review the concept and try again. Consider re-reading the code carefully.',
      };
    }
  },

  /**
   * Evaluates a blank-fill answer (LLM-ASSISTED).
   */
  async evaluateBlank(request: EvaluateRequest, session: SessionState): Promise<EvaluationResult> {
    if (!request.blankAnswer) {
      return {
        correct: false,
        feedback: 'Blank-fill answer not provided',
      };
    }

    // Retrieve blank reference from metadata
    const metadata = await sessionService.getGateMetadata(session.sessionId, 'blank');

    if (!metadata || !metadata.blankReference) {
      logger.warn('Blank reference not found, using permissive fallback', {
        sessionId: session.sessionId,
      });
      return {
        correct: true,
        feedback: '⚠️ Reference code not available. Answer accepted.',
      };
    }

    const referenceCode = metadata.blankReference.code || '';

    // Use LLM to evaluate functional correctness
    return llmClient.evaluateBlank(request.blankAnswer.code, referenceCode);
  },

  /**
   * Evaluates a bug-hunt answer (HYBRID: proximity + LLM).
   */
  async evaluateBug(request: EvaluateRequest, session: SessionState): Promise<EvaluationResult> {
    if (!request.bugAnswer) {
      return {
        correct: false,
        feedback: 'Bug answer not provided',
      };
    }

    // Retrieve bug location from metadata
    const metadata = await sessionService.getGateMetadata(session.sessionId, 'bug');

    if (!metadata || !metadata.bugLocation) {
      logger.warn('Bug location not found, using permissive fallback', {
        sessionId: session.sessionId,
      });
      return {
        correct: true,
        feedback: '⚠️ Bug location reference not available. Answer accepted.',
      };
    }

    const actualBugLine = metadata.bugLocation.line;
    const identifiedLine = request.bugAnswer.identifiedLine;

    // First check: proximity match (within 2 lines)
    const proximityMatch = Math.abs(identifiedLine - actualBugLine) <= 2;

    if (proximityMatch) {
      return {
        correct: true,
        feedback: 'Bug location correctly identified! Good detective work.',
      };
    }

    // Second check: grade explanation quality via LLM
    logger.debug('Proximity check failed, evaluating explanation with LLM', {
      actualBugLine,
      identifiedLine,
    });

    return llmClient.evaluateBug(
      request.bugAnswer.explanation,
      actualBugLine,
      identifiedLine
    );
  },

  /**
   * Evaluates a commit explanation (LLM-ASSISTED).
   */
  async evaluateCommit(
    request: EvaluateRequest,
    session: SessionState
  ): Promise<EvaluationResult> {
    if (!request.commitAnswer) {
      return {
        correct: false,
        feedback: 'Commit explanation not provided',
      };
    }

    // Retrieve diff context from metadata
    const metadata = await sessionService.getGateMetadata(session.sessionId, 'commit');

    if (!metadata || !metadata.diffContext) {
      logger.warn('Diff context not found, using permissive fallback', {
        sessionId: session.sessionId,
      });
      return {
        correct: true,
        feedback: '⚠️ Diff context not available. Answer accepted.',
      };
    }

    const diffSummary = metadata.diffContext.summary || '';

    // Use LLM to evaluate explanation quality
    return llmClient.evaluateCommit(request.commitAnswer.explanation, diffSummary);
  },
};
