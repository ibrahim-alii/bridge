import { Router, Request, Response } from 'express';
import { QuizRequestSchema } from '@bridge/contracts';
import type { QuizRequest, QuizResponse } from '@bridge/contracts';
import { quizService } from '../services/quizService';
import { sessionService } from '../services/session';
import { validate } from '../validators/validate';
import { logger } from '@bridge/shared-utils';

export const quizRouter = Router();

quizRouter.post('/', validate(QuizRequestSchema), async (req: Request, res: Response) => {
  try {
    const request: QuizRequest = req.body;

    // Generate quiz questions
    const result = await quizService.generateQuiz(request);

    // Store quiz metadata in Supabase for later evaluation
    await sessionService.addPendingGate(request.sessionId, {
      scope: 'quiz',
      analysisId: request.analysisId,
      createdAt: new Date().toISOString(),
      metadata: {
        questions: result.questions, // Consistent with frontend expectation
      },
    });

    // Sanitize response - remove correctIndex to prevent client from seeing the answer
    const sanitized: QuizResponse = {
      ...result,
      questions: result.questions.map(({ correctIndex, ...rest }) => ({
        ...rest,
        correctIndex: -1, // Placeholder - client should ignore this
      })),
    };

    logger.info('Quiz generated and metadata stored', {
      sessionId: request.sessionId,
      questionCount: result.questions.length,
    });

    res.json(sanitized);
  } catch (err) {
    logger.error('Quiz generation failed', { error: err });
    res.status(500).json({ error: 'Quiz generation failed', details: String(err) });
  }
});
