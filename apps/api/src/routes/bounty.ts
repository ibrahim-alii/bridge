import { Router, Request, Response } from 'express';
import {
  BountyAnalyzeRequestSchema,
  BountyChallengeRequestSchema,
  BountyEvaluateRequestSchema,
} from '@bridge/contracts';
import { bountyService } from '../services/bountyService';
import { validate } from '../validators/validate';

export const bountyRouter = Router();

/**
 * POST /api/bounty/analyze
 * Fast regex heuristic check for candidate code smells.
 */
bountyRouter.post('/analyze', validate(BountyAnalyzeRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await bountyService.analyze(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', details: String(err) });
  }
});

/**
 * POST /api/bounty/challenge
 * Generates an LLM-driven challenge and hint for the user based on the flagged smell.
 */
bountyRouter.post('/challenge', validate(BountyChallengeRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await bountyService.generateChallenge(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Challenge generation failed', details: String(err) });
  }
});

/**
 * POST /api/bounty/evaluate
 * Evaluates the user's refactored code to see if they resolved the smell.
 */
bountyRouter.post('/evaluate', validate(BountyEvaluateRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await bountyService.evaluateRefactor(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Evaluation failed', details: String(err) });
  }
});
