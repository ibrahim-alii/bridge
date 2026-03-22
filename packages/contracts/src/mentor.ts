import { z } from 'zod';

// ─── Mentor Hint Request ────────────────────────────────────────────
export const MentorHintRequestSchema = z.object({
  /** The code the user is struggling with */
  code: z.string().min(1),
  /** What the user is asking about / struggling with */
  question: z.string().min(1),
  /** Programming language */
  language: z.string().optional(),
  /** Session ID */
  sessionId: z.string().uuid().optional(),
  /** Previous hints already given (to avoid repetition & escalate) */
  previousHints: z.array(z.string()).optional(),
  /** Which attempt this is (drives progressive hint escalation) */
  attemptNumber: z.number().min(1).default(1),
});

export type MentorHintRequest = z.infer<typeof MentorHintRequestSchema>;

// ─── Mentor Hint ────────────────────────────────────────────────────
export const MentorHintSchema = z.object({
  /** Escalation level: 1 = nudge, 2 = guide, 3 = near-explain */
  level: z.number().min(1).max(3),
  /** The hint text — must NEVER contain code */
  hint: z.string(),
  /** Which part of the code this hint relates to */
  focusArea: z.string(),
});

export type MentorHint = z.infer<typeof MentorHintSchema>;

// ─── Mentor Hint Response ───────────────────────────────────────────
export const MentorHintResponseSchema = z.object({
  /** Three escalating hints (levels 1, 2, 3) */
  hints: z.array(MentorHintSchema).length(3),
  /** Socratic guiding questions to prompt the user's thinking */
  guidingQuestions: z.array(z.string()).min(1),
  /** Encouraging message */
  encouragement: z.string(),
});

export type MentorHintResponse = z.infer<typeof MentorHintResponseSchema>;
