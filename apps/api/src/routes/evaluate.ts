import { Router, Request, Response } from 'express';
import { EvaluateRequestSchema } from '@bridge/contracts';
import type { EvaluateRequest, EvaluateResponse } from '@bridge/contracts';
import { evaluatorService } from '../services/evaluator';
import { policyService } from '../services/policy';
import { sessionService } from '../services/session';
import { validate } from '../validators/validate';
import { logger } from '@bridge/shared-utils';

export const evaluateRouter = Router();

evaluateRouter.post('/', validate(EvaluateRequestSchema), async (req: Request, res: Response) => {
  try {
    const request: EvaluateRequest = req.body;

    // 1. Load session from Supabase
    const session = await sessionService.getSession(request.sessionId);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 2. Evaluate answer (may call Claude Haiku)
    const evalResult = await evaluatorService.evaluate(request, session);

    // 3. Apply policy rules (deterministic)
    const policyDecision = policyService.evaluatePolicy(evalResult, session, request.scope);

    // 4. Update session in Supabase
    if (policyDecision.shouldUnlock) {
      // Success: reset attempts and add approval
      await sessionService.resetAttempts(request.sessionId);
      if (policyDecision.approval) {
        await sessionService.addApproval(request.sessionId, policyDecision.approval);
      }
    } else if (policyDecision.incrementAttempts) {
      // Failure: increment attempts
      await sessionService.incrementAttempts(request.sessionId);
    }

    // Update lock state
    await sessionService.updateSession(request.sessionId, {
      isLocked: policyDecision.shouldLock,
      activeGate: policyDecision.shouldUnlock ? null : request.scope,
    });

    // 5. Return response
    const response: EvaluateResponse = {
      passed: evalResult.correct,
      feedback: policyDecision.feedback,
      hint: policyDecision.hint,
      attemptsRemaining: policyDecision.attemptsRemaining,
      showAnswer: policyDecision.showAnswer,
    };

    logger.info('Evaluation complete', {
      sessionId: request.sessionId,
      scope: request.scope,
      passed: response.passed,
      attemptsRemaining: response.attemptsRemaining,
    });

    res.json(response);
  } catch (err) {
    logger.error('Evaluation failed', { error: err });
    res.status(500).json({ error: 'Evaluation failed', details: String(err) });
  }
});
