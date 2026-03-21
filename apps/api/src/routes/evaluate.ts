import { Router, Request, Response } from 'express';
import { EvaluateRequestSchema } from '@bridge/contracts';
import { evaluateService } from '../services/evaluateService';
import { validate } from '../validators/validate';

export const evaluateRouter = Router();

evaluateRouter.post('/', validate(EvaluateRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await evaluateService.evaluate(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Evaluation failed', details: String(err) });
  }
});
