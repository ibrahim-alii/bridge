import { Router, Request, Response } from 'express';
import { AnalyzeRequestSchema, type AnalyzeResponse } from '@bridge/contracts';
import { generateId } from '@bridge/shared-utils';
import { analyzeService } from '../services/analyzeService';
import { validate } from '../validators/validate';

export const analyzeRouter = Router();

analyzeRouter.post('/', validate(AnalyzeRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await analyzeService.analyze(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', details: String(err) });
  }
});
