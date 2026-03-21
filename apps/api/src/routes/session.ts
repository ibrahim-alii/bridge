import { Router, Request, Response } from 'express';
import { CreateSessionRequestSchema } from '@bridge/contracts';
import type { CreateSessionRequest, CreateSessionResponse } from '@bridge/contracts';
import { sessionService } from '../services/session';
import { validate } from '../validators/validate';
import { logger } from '@bridge/shared-utils';

export const sessionRouter = Router();

sessionRouter.post('/', validate(CreateSessionRequestSchema), async (req: Request, res: Response) => {
  try {
    const request: CreateSessionRequest = req.body;

    // Create session using session service (backed by Supabase)
    const state = await sessionService.createSession(request.workspaceId);

    const response: CreateSessionResponse = {
      sessionId: state.sessionId,
      state,
    };

    logger.info('Session created', { sessionId: state.sessionId });
    res.status(201).json(response);
  } catch (err) {
    logger.error('Session creation failed', { error: err });
    res.status(500).json({ error: 'Session creation failed', details: String(err) });
  }
});

sessionRouter.get('/:sessionId', async (req: Request, res: Response) => {
  try {
    const state = await sessionService.getSession(req.params.sessionId);
    if (!state) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(state);
  } catch (err) {
    logger.error('Failed to get session', { error: err });
    res.status(500).json({ error: 'Failed to get session', details: String(err) });
  }
});
