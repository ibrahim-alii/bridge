import { Router, Request, Response } from 'express';
import { MentorHintRequestSchema } from '@bridge/contracts';
import { mentorService } from '../services/mentorService';
import { validate } from '../validators/validate';

export const mentorRouter = Router();

/**
 * POST /api/mentor/hint
 * Generate progressive, conceptual hints for a user struggling with code.
 * NEVER returns working code — only Socratic questions and conceptual guidance.
 */
mentorRouter.post('/hint', validate(MentorHintRequestSchema), async (req: Request, res: Response) => {
  try {
    const result = await mentorService.getHint(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Mentor hint generation failed', details: String(err) });
  }
});
