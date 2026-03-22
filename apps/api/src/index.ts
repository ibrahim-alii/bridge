import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '@bridge/shared-utils';
import { analyzeRouter } from './routes/analyze';
import { quizRouter } from './routes/quiz';
import { evaluateRouter } from './routes/evaluate';
import { sessionRouter } from './routes/session';
import { blankRouter } from './routes/blank';
import { sabotageRouter } from './routes/sabotage';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3727;

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

// ─── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`Bridge API running on http://localhost:${PORT}`, {
    mockMode: process.env.BRIDGE_MOCK_MODE === 'true',
  });
});

export default app;
