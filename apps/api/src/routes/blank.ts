import { Router, Request, Response } from 'express';
import {
  BlankRequestSchema,
  BlankEvaluateRequestSchema,
} from '@bridge/contracts';
import { blankService } from '../services/blankService';
import { sessionService } from '../services/session';
import { policyService } from '../services/policy';
import { validate } from '../validators/validate';

export const blankRouter = Router();

/**
 * POST /api/blank
 * Generate blanks for a code block — identifies sections to hide for fill-in-the-blank.
 */
blankRouter.post('/', validate(BlankRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await blankService.generateBlanks(req.body);

    if (req.body.sessionId) {
      await sessionService.addPendingGate(req.body.sessionId, {
        scope: 'blank',
        analysisId: req.body.sessionId,
        createdAt: new Date().toISOString(),
        metadata: {
          originalCode: req.body.code,
          blanks: result.blanks,
          blankReference: {
            code: req.body.code,
          },
        },
      });
      await sessionService.updateSession(req.body.sessionId, {
        isLocked: true,
        activeGate: 'blank',
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Blank generation failed', details: String(err) });
  }
});

/**
 * POST /api/blank/evaluate
 * Evaluate a user's short-answer explanation of a blanked code section.
 * Uses rubric-based LLM evaluation: required concept words, conceptual correctness,
 * no obvious contradictions.
 */
blankRouter.post('/evaluate', validate(BlankEvaluateRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await blankService.evaluateBlank(req.body);

    if (req.body.sessionId) {
      if (result.passed) {
        await sessionService.resetAttempts(req.body.sessionId);
        await sessionService.addApproval(
          req.body.sessionId,
          policyService.generateApproval(req.body.sessionId, 'blank'),
        );
        await sessionService.removePendingGate(req.body.sessionId, 'blank');
        await sessionService.updateSession(req.body.sessionId, {
          isLocked: false,
          activeGate: null,
        });
      } else {
        await sessionService.incrementAttempts(req.body.sessionId);
        await sessionService.updateSession(req.body.sessionId, {
          isLocked: true,
          activeGate: 'blank',
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Blank evaluation failed', details: String(err) });
  }
});
