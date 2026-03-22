/**
 * Barrel export for all prompt templates.
 *
 * Each prompt builder is a pure function: (context) → prompt string.
 * The LLM service wrapper (llm.ts) consumes these strings.
 */

export { buildAnalyzePrompt } from './analyze';
export { buildQuizPrompt } from './quiz';
export { buildBlankingPrompt } from './blanking';
export { buildSabotagePrompt } from './sabotage';
export { buildMentorHintPrompt } from './mentor';
export { buildStudyPrompt } from './study';
export { buildBountyChallengePrompt, buildBountyEvaluatePrompt } from './bounty';
