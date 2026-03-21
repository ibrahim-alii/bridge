import { z } from 'zod';

// ─── Analyze Request ────────────────────────────────────────────────
export const AnalyzeRequestSchema = z.object({
  /** The source code to analyze */
  code: z.string().min(1),
  /** The file path for context */
  filePath: z.string().optional(),
  /** The programming language of the code */
  language: z.string().optional(),
  /** Session ID to associate the analysis with (optional for standalone testing) */
  sessionId: z.string().uuid().optional(),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ─── Analyze Response ───────────────────────────────────────────────
export const AnalyzeResponseSchema = z.object({
  /** Unique ID for this analysis result */
  analysisId: z.string().uuid(),
  /** Complexity rating of the analyzed code (1-10) */
  complexity: z.number().min(1).max(10),
  /** Key concepts found in the code */
  concepts: z.array(z.string()),
  /** Summary of what the code does */
  summary: z.string(),
  /** Suggested gate type based on complexity */
  suggestedGate: z.enum(['blank', 'quiz', 'bug', 'commit', 'none']),
  /** Specific code blocks that should be gated */
  gatedBlocks: z.array(
    z.object({
      startLine: z.number(),
      endLine: z.number(),
      reason: z.string(),
    }),
  ),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
