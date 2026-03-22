import { z } from 'zod';

// ─── Study Recommendation Request ───────────────────────────────────
export const StudyRecommendationRequestSchema = z.object({
  /** The code block the user is stuck on */
  code: z.string().min(1),
  /** Programming language */
  language: z.string().optional(),
  /** Session ID for tracking (optional) */
  sessionId: z.string().uuid().optional(),
});

export type StudyRecommendationRequest = z.infer<typeof StudyRecommendationRequestSchema>;

// ─── Study Recommendation Response ──────────────────────────────────
export const StudyRecommendationResponseSchema = z.object({
  /** The broad technical topic (e.g., 'LRU Cache', 'Debounce', 'Trie') */
  topic: z.string(),
  /** The single most relevant learning resource (URL or LeetCode problem #) */
  recommendation: z.string(),
  /** A concise explanation of why this concept applies to their code */
  reason: z.string(),
});

export type StudyRecommendationResponse = z.infer<typeof StudyRecommendationResponseSchema>;
