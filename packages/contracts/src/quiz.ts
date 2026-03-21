import { z } from 'zod';

// ─── Quiz Request ───────────────────────────────────────────────────
export const QuizRequestSchema = z.object({
  /** The analysis ID to generate quiz for */
  analysisId: z.string().uuid(),
  /** The code block to quiz the user on */
  code: z.string().min(1),
  /** Specific concepts to quiz on (optional) */
  concepts: z.array(z.string()).optional(),
  /** Session ID */
  sessionId: z.string().uuid(),
});

export type QuizRequest = z.infer<typeof QuizRequestSchema>;

// ─── Quiz Response ──────────────────────────────────────────────────
export const QuizQuestionSchema = z.object({
  /** Unique ID for this question */
  questionId: z.string().uuid(),
  /** The question text */
  question: z.string(),
  /** Exactly 4 multiple-choice options */
  options: z.array(z.string()).length(4),
  /** Index of the correct answer (0-3) */
  correctIndex: z.number().min(0).max(3),
  /** Explanation shown after answering */
  explanation: z.string(),
  /** Difficulty level */
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizResponseSchema = z.object({
  /** The quiz ID */
  quizId: z.string().uuid(),
  /** Array of quiz questions */
  questions: z.array(QuizQuestionSchema).min(1),
  /** Required passing score (fraction, e.g. 0.7) */
  passingScore: z.number().min(0).max(1),
});

export type QuizResponse = z.infer<typeof QuizResponseSchema>;
