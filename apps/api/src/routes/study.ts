import { Router, Request, Response } from 'express';
import { StudyRecommendationRequestSchema } from '@bridge/contracts';
import { studyService } from '../services/studyService';
import { validate } from '../validators/validate';

export const studyRouter = Router();

/**
 * POST /api/study/recommend
 * Generates a contextual study recommendation based on the user's current code pattern.
 */
studyRouter.post('/recommend', validate(StudyRecommendationRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await studyService.getRecommendation(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Study recommendation failed', details: String(err) });
  }
});
