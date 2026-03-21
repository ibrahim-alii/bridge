import { Router, Request, Response } from 'express';
import { QuizRequestSchema } from '@bridge/contracts';
import { quizService } from '../services/quizService';
import { validate } from '../validators/validate';

export const quizRouter = Router();

quizRouter.post('/', validate(QuizRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await quizService.generateQuiz(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Quiz generation failed', details: String(err) });
  }
});
