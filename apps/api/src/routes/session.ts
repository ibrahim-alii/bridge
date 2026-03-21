import { Router, Request, Response } from 'express';
import { CreateSessionRequestSchema } from '@bridge/contracts';
import { generateId } from '@bridge/shared-utils';
import { validate } from '../validators/validate';
import type { SessionState, CreateSessionResponse } from '@bridge/contracts';

export const sessionRouter = Router();

// In-memory session store (mock)
const sessions = new Map<string, SessionState>();

sessionRouter.post('/', validate(CreateSessionRequestSchema), (req: Request, res: Response) => {
  const sessionId = generateId();
  const now = new Date().toISOString();

  const state: SessionState = {
    sessionId,
    isLocked: false,
    activeGate: null,
    pendingGates: [],
    approvals: [],
    currentAttempts: 0,
    maxAttempts: 3,
    createdAt: now,
  };

  sessions.set(sessionId, state);

  const response: CreateSessionResponse = { sessionId, state };
  res.status(201).json(response);
});

sessionRouter.get('/:sessionId', (req: Request, res: Response) => {
  const state = sessions.get(req.params.sessionId);
  if (!state) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(state);
});
