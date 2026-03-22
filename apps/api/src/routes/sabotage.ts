import { Router, Request, Response } from 'express';
import {
  SabotageRequestSchema,
  SabotageFixRequestSchema,
} from '@bridge/contracts';
import { sabotageService } from '../services/sabotageService';
import { sessionService } from '../services/session';
import { policyService } from '../services/policy';
import { validate } from '../validators/validate';

export const sabotageRouter = Router();

/**
 * POST /api/sabotage
 * Inject a single controlled bug into a code block.
 * Returns the sabotaged code + metadata for evaluation.
 */
sabotageRouter.post('/', validate(SabotageRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await sabotageService.injectBug(req.body);

    if (req.body.sessionId) {
      await sessionService.addPendingGate(req.body.sessionId, {
        scope: 'bug',
        analysisId: result.bugId,
        createdAt: new Date().toISOString(),
        metadata: {
          originalCode: req.body.code,
          bugLocation: {
            line: result.originalLine,
          },
          sabotage: result,
        },
      });
      await sessionService.updateSession(req.body.sessionId, {
        isLocked: true,
        activeGate: 'bug',
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Bug injection failed', details: String(err) });
  }
});

/**
 * POST /api/sabotage/fix
 * Evaluate the user's attempted fix of the injected bug.
 * Checks if the correct line was fixed and the fix is valid.
 */
sabotageRouter.post('/fix', validate(SabotageFixRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await sabotageService.evaluateFix(req.body);

    if (req.body.sessionId) {
      if (result.passed) {
        await sessionService.resetAttempts(req.body.sessionId);
        await sessionService.addApproval(
          req.body.sessionId,
          policyService.generateApproval(req.body.sessionId, 'bug'),
        );
        await sessionService.removePendingGate(req.body.sessionId, 'bug');
        await sessionService.updateSession(req.body.sessionId, {
          isLocked: false,
          activeGate: null,
        });
      } else {
        await sessionService.incrementAttempts(req.body.sessionId);
        await sessionService.updateSession(req.body.sessionId, {
          isLocked: true,
          activeGate: 'bug',
        });
      }
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Fix evaluation failed', details: String(err) });
  }
});
