import { Router, Request, Response } from 'express';
import {
  BlankRequestSchema,
  BlankEvaluateRequestSchema,
} from '@bridge/contracts';
import { blankService } from '../services/blankService';
import { validate } from '../validators/validate';

export const blankRouter = Router();

/**
 * POST /api/blank
 * Generate blanks for a code block — identifies sections to hide for fill-in-the-blank.
 */
blankRouter.post('/', validate(BlankRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await blankService.generateBlanks(req.body);
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
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Blank evaluation failed', details: String(err) });
  }
});
