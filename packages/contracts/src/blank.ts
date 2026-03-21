import { z } from 'zod';

// ─── Blank Gate ─────────────────────────────────────────────────────
export const BlankGateSchema = z.object({
  /** Unique ID for this blank gate */
  blankId: z.string().uuid(),
  /** File path where the blank was created */
  filePath: z.string(),
  /** Human-readable label for the concept being tested */
  conceptLabel: z.string(),
  /** Rubric keywords the user's explanation should touch on */
  expectedRubric: z.array(z.string()),
  /** Current status of this blank gate */
  status: z.enum(['open', 'pending', 'approved', 'rejected']),
});

export type BlankGate = z.infer<typeof BlankGateSchema>;

// ─── Blank Request ──────────────────────────────────────────────────
export const BlankRequestSchema = z.object({
  /** The source code to generate blanks for */
  code: z.string().min(1),
  /** The file path for context */
  filePath: z.string().optional(),
  /** Programming language */
  language: z.string().optional(),
  /** Session ID */
  sessionId: z.string().uuid().optional(),
  /** Pre-identified blocks from /api/analyze (avoids re-scanning) */
  gatedBlocks: z
    .array(
      z.object({
        startLine: z.number(),
        endLine: z.number(),
        reason: z.string(),
      }),
    )
    .optional(),
});

export type BlankRequest = z.infer<typeof BlankRequestSchema>;

// ─── Blank Response ─────────────────────────────────────────────────
export const BlankItemSchema = z.object({
  /** Start line of the blanked section (1-indexed) */
  startLine: z.number(),
  /** End line of the blanked section (1-indexed) */
  endLine: z.number(),
  /** Type of blank: function body, conditional, loop, etc. */
  blankType: z.enum(['function_body', 'conditional', 'loop_body', 'return_value', 'expression']),
  /** Subtle hint that guides without giving the answer */
  hint: z.string(),
  /** Description of what the correct answer should contain (not literal code) */
  expectedPattern: z.string(),
});

export type BlankItem = z.infer<typeof BlankItemSchema>;

export const BlankResponseSchema = z.object({
  /** Generated blank gates */
  blanks: z.array(BlankItemSchema).min(1),
  /** Number of blanks generated */
  totalBlanks: z.number(),
  /** Overall difficulty of the blanks */
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export type BlankResponse = z.infer<typeof BlankResponseSchema>;

// ─── Blank Evaluate Request ─────────────────────────────────────────
export const BlankEvaluateRequestSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid().optional(),
  /** The blank being answered */
  blankId: z.string(),
  /** The original code that was blanked */
  originalCode: z.string(),
  /** The start/end lines of the blanked section */
  startLine: z.number(),
  endLine: z.number(),
  /** The expected pattern description (from BlankResponse) */
  expectedPattern: z.string(),
  /** The user's short-answer explanation of what belongs in the blank */
  userExplanation: z.string().min(1),
});

export type BlankEvaluateRequest = z.infer<typeof BlankEvaluateRequestSchema>;

// ─── Blank Evaluate Response ────────────────────────────────────────
export const BlankEvaluateResponseSchema = z.object({
  /** Whether the user's explanation demonstrates understanding */
  passed: z.boolean(),
  /** Feedback on the user's explanation */
  feedback: z.string(),
  /** Socratic hint if the user failed */
  hint: z.string().optional(),
  /** Number of attempts remaining */
  attemptsRemaining: z.number().optional(),
  /** Confidence score of the evaluation (0-1) */
  confidence: z.number().min(0).max(1).optional(),
});

export type BlankEvaluateResponse = z.infer<typeof BlankEvaluateResponseSchema>;
