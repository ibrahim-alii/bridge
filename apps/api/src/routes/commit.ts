import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sessionService } from '../services/session';
import { llmClient } from '../services/llmClient';
import { policyService } from '../services/policy';
import { validate } from '../validators/validate';

export const commitRouter = Router();

const CommitReviewRequestSchema = z.object({
  sessionId: z.string().uuid(),
  diff: z.string().min(1),
  explanation: z.string().min(1),
});

commitRouter.post(
  '/review',
  validate(CommitReviewRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const session = await sessionService.getSession(req.body.sessionId);
      if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      const existingMetadata = await sessionService.getGateMetadata(req.body.sessionId, 'commit');
      if (!existingMetadata?.diffContext) {
        await sessionService.addPendingGate(req.body.sessionId, {
          scope: 'commit',
          analysisId: req.body.sessionId,
          createdAt: new Date().toISOString(),
          metadata: {
            diffContext: {
              summary: req.body.diff,
            },
          },
        });
      }

      const evalResult = await llmClient.evaluateCommit(req.body.explanation, req.body.diff);
      const policyDecision = policyService.evaluatePolicy(evalResult, session, 'commit');

      if (policyDecision.shouldUnlock) {
        await sessionService.resetAttempts(req.body.sessionId);
        if (policyDecision.approval) {
          await sessionService.addApproval(req.body.sessionId, policyDecision.approval);
        }
        await sessionService.removePendingGate(req.body.sessionId, 'commit');
      } else if (policyDecision.incrementAttempts) {
        await sessionService.incrementAttempts(req.body.sessionId);
      }

      await sessionService.updateSession(req.body.sessionId, {
        isLocked: policyDecision.shouldLock,
        activeGate: policyDecision.shouldUnlock ? null : 'commit',
      });

      res.json({
        passed: evalResult.correct,
        feedback: policyDecision.feedback,
        hint: policyDecision.hint,
        attemptsRemaining: policyDecision.attemptsRemaining,
        showAnswer: policyDecision.showAnswer,
      });
    } catch (err) {
      res.status(500).json({ error: 'Commit review failed', details: String(err) });
    }
  },
);
