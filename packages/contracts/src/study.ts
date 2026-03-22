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

export const StudyResourceSchema = z.object({
  /** Human-readable title for the resource */
  title: z.string(),
  /** Direct URL to the resource */
  url: z.string().url(),
  /** Flexible source label, e.g. docs, video, repo, blog, forum, paper */
  sourceType: z.string(),
  /** Why this resource matters in the current code context */
  relevance: z.string(),
});

export type StudyResource = z.infer<typeof StudyResourceSchema>;

// ─── Study Recommendation Response ──────────────────────────────────
export const StudyRecommendationResponseSchema = z.object({
  /** The broad technical topic (e.g., 'LRU Cache', 'Debounce', 'Trie') */
  topic: z.string(),
  /** A concise first-stop recommendation */
  recommendation: z.string(),
  /** A concise explanation of why this concept applies to their code */
  reason: z.string(),
  /** Live web-backed resources the user can open next */
  resources: z.array(StudyResourceSchema).min(1),
});

export type StudyRecommendationResponse = z.infer<typeof StudyRecommendationResponseSchema>;
