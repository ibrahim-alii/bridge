import { z } from 'zod';

// ─── Evaluate Request ───────────────────────────────────────────────
export const EvaluateRequestSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid(),
  /** The gate scope being evaluated */
  scope: z.enum(['blank', 'quiz', 'bug', 'commit']),
  /** Quiz answer: selected option index */
  quizAnswer: z
    .object({
      questionId: z.string().uuid(),
      selectedIndex: z.number().min(0).max(3),
    })
    .optional(),
  /** Blank-fill answer: the user's implementation */
  blankAnswer: z
    .object({
      code: z.string(),
      blockId: z.string(),
    })
    .optional(),
  /** Commit explanation answer */
  commitAnswer: z
    .object({
      explanation: z.string().min(1),
      diffBlockId: z.string(),
    })
    .optional(),
  /** Bug-find answer: the line number the user identified */
  bugAnswer: z
    .object({
      identifiedLine: z.number(),
      explanation: z.string(),
    })
    .optional(),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;

// ─── Evaluate Response ──────────────────────────────────────────────
export const EvaluateResponseSchema = z.object({
  /** Whether the user passed the gate */
  passed: z.boolean(),
  /** Human-readable feedback */
  feedback: z.string(),
  /** Hint for the user if they failed (Socratic mentor) */
  hint: z.string().optional(),
  /** Number of attempts remaining before escalation */
  attemptsRemaining: z.number().optional(),
  /** Whether to show the correct answer (max attempts reached) */
  showAnswer: z.boolean().optional(),
});

export type EvaluateResponse = z.infer<typeof EvaluateResponseSchema>;
