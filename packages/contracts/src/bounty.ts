import { z } from 'zod';

// ─── Smell Types ───────────────────────────────────────────────────
export const SmellTypeSchema = z.enum([
  'nested_loops',
  'repeated_lookups',
  'monolithic_class',
  'heavy_coupling',
]);

export type SmellType = z.infer<typeof SmellTypeSchema>;

// ─── Analyze Request & Response ────────────────────────────────────
export const BountyAnalyzeRequestSchema = z.object({
  code: z.string().min(1),
  language: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

export type BountyAnalyzeRequest = z.infer<typeof BountyAnalyzeRequestSchema>;

export const BountyAnalyzeResponseSchema = z.object({
  /** True if a lightweight heuristic flagged this code */
  hasSmell: z.boolean(),
  /** The identified type of code smell, if any */
  smellType: SmellTypeSchema.nullable().optional(),
});

export type BountyAnalyzeResponse = z.infer<typeof BountyAnalyzeResponseSchema>;


// ─── Challenge Request & Response ──────────────────────────────────
export const BountyChallengeRequestSchema = z.object({
  code: z.string().min(1),
  smellType: SmellTypeSchema,
  language: z.string().optional(),
  sessionId: z.string().uuid().optional(),
});

export type BountyChallengeRequest = z.infer<typeof BountyChallengeRequestSchema>;

export const BountyChallengeResponseSchema = z.object({
  /** A fun, challenging explanation of the problem (no lectures!) */
  challenge: z.string(),
  /** A structural hint of how to fix it, WITHOUT providing the rewritten code */
  hint: z.string(),
});

export type BountyChallengeResponse = z.infer<typeof BountyChallengeResponseSchema>;


// ─── Evaluate Request & Response ───────────────────────────────────
export const BountyEvaluateRequestSchema = z.object({
  originalCode: z.string().min(1),
  refactoredCode: z.string().min(1),
  smellType: SmellTypeSchema,
  sessionId: z.string().uuid().optional(),
});

export type BountyEvaluateRequest = z.infer<typeof BountyEvaluateRequestSchema>;

export const BountyEvaluateResponseSchema = z.object({
  /** True if the user successfully refactored the code without breaking logic */
  passed: z.boolean(),
  /** Feedback on their approach */
  feedback: z.string(),
  /** A gentle hint if they failed */
  hint: z.string().optional(),
});

export type BountyEvaluateResponse = z.infer<typeof BountyEvaluateResponseSchema>;
