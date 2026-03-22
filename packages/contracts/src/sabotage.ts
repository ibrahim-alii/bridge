import { z } from 'zod';

// ─── Sabotage Bug Types ─────────────────────────────────────────────
export const BugTypeSchema = z.enum([
  'off_by_one',
  'wrong_operator',
  'wrong_variable',
  'missing_check',
  'wrong_return',
  'swapped_args',
  'boundary_error',
]);

export type BugType = z.infer<typeof BugTypeSchema>;

// ─── Sabotage Gate ──────────────────────────────────────────────────
export const SabotageGateSchema = z.object({
  /** Unique ID for this sabotage gate */
  bugId: z.string().uuid(),
  /** File path where the bug was injected */
  filePath: z.string(),
  /** Type of bug injected */
  bugType: BugTypeSchema,
  /** Hint shown to the user */
  hint: z.string(),
  /** Current status of this sabotage gate */
  status: z.enum(['active', 'fixed', 'failed']),
});

export type SabotageGate = z.infer<typeof SabotageGateSchema>;

// ─── Sabotage Inject Request ────────────────────────────────────────
export const SabotageRequestSchema = z.object({
  /** The original clean code to inject a bug into */
  code: z.string().min(1),
  /** Programming language */
  language: z.string().optional(),
  /** File path for context */
  filePath: z.string().optional(),
  /** Session ID */
  sessionId: z.string().uuid().optional(),
});

export type SabotageRequest = z.infer<typeof SabotageRequestSchema>;

// ─── Sabotage Inject Response ───────────────────────────────────────
export const SabotageResponseSchema = z.object({
  /** Unique bug ID for tracking */
  bugId: z.string().uuid(),
  /** The code with exactly one bug injected */
  sabotagedCode: z.string(),
  /** Line number of the original code that was changed (1-based) */
  originalLine: z.number(),
  /** The original line content before sabotage */
  originalContent: z.string(),
  /** The modified line content with the bug */
  sabotagedContent: z.string(),
  /** Type of bug injected */
  bugType: BugTypeSchema,
  /** What the bug does (hidden from user, used for evaluation) */
  explanation: z.string(),
  /** Difficulty level */
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export type SabotageResponse = z.infer<typeof SabotageResponseSchema>;

// ─── Sabotage Fix Request ───────────────────────────────────────────
export const SabotageFixRequestSchema = z.object({
  /** The bug ID being fixed */
  bugId: z.string(),
  /** Session ID */
  sessionId: z.string().uuid().optional(),
  /** The user's fixed code (full block) */
  fixedCode: z.string().min(1),
  /** The sabotaged code they were given */
  sabotagedCode: z.string(),
  /** The original clean code (for comparison) */
  originalCode: z.string(),
  /** The line number that was sabotaged */
  originalLine: z.number(),
  /** The original content of the sabotaged line */
  originalContent: z.string(),
  /** The sabotaged content */
  sabotagedContent: z.string(),
  /** Type of bug for evaluation context */
  bugType: BugTypeSchema,
});

export type SabotageFixRequest = z.infer<typeof SabotageFixRequestSchema>;

// ─── Sabotage Fix Response ──────────────────────────────────────────
export const SabotageFixResponseSchema = z.object({
  /** Whether the user successfully fixed the bug */
  passed: z.boolean(),
  /** Feedback on the fix */
  feedback: z.string(),
  /** Hint if the fix was wrong (one only, Socratic) */
  hint: z.string().optional(),
  /** Whether the user fixed the correct line */
  correctLineIdentified: z.boolean().optional(),
});

export type SabotageFixResponse = z.infer<typeof SabotageFixResponseSchema>;
