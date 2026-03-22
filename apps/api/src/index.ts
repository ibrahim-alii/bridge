import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { logger } from '@bridge/shared-utils';
import { analyzeRouter } from './routes/analyze';
import { quizRouter } from './routes/quiz';
import { evaluateRouter } from './routes/evaluate';
import { sessionRouter } from './routes/session';
import { blankRouter } from './routes/blank';
import { sabotageRouter } from './routes/sabotage';
import { mentorRouter } from './routes/mentor';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3727;

async function isBridgeApiRunning(port: string | number): Promise<boolean> {
  const healthUrl = `http://127.0.0.1:${port}/api/health`;

  return new Promise((resolve) => {
    const req = http.get(healthUrl, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });

    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// ─── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mockMode: process.env.BRIDGE_MOCK_MODE === 'true',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/analyze', analyzeRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/session', sessionRouter);
app.use('/api/blank', blankRouter);
app.use('/api/sabotage', sabotageRouter);
app.use('/api/mentor', mentorRouter);

// ─── Start ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Bridge API running on http://localhost:${PORT}`, {
    mockMode: process.env.BRIDGE_MOCK_MODE === 'true',
  });
});

server.on('error', async (error: NodeJS.ErrnoException) => {
  if (error.code !== 'EADDRINUSE') {
    throw error;
  }

  const running = await isBridgeApiRunning(PORT);
  if (running) {
    logger.warn(
      `Port ${PORT} is already in use by an existing Bridge API instance. Reusing that instance.`,
    );
    process.exit(0);
  }

  throw error;
});

export default app;
