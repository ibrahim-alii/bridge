// ─── Analyze ────────────────────────────────────────────────────────
export { AnalyzeRequestSchema, AnalyzeResponseSchema } from './analyze';
export type { AnalyzeRequest, AnalyzeResponse } from './analyze';

// ─── Quiz ───────────────────────────────────────────────────────────
export { QuizRequestSchema, QuizQuestionSchema, QuizResponseSchema } from './quiz';
export type { QuizRequest, QuizQuestion, QuizResponse } from './quiz';

// ─── Evaluate ───────────────────────────────────────────────────────
export { EvaluateRequestSchema, EvaluateResponseSchema } from './evaluate';
export type { EvaluateRequest, EvaluateResponse } from './evaluate';

// ─── Blank Gate ─────────────────────────────────────────────────────
export {
  BlankGateSchema,
  BlankRequestSchema,
  BlankItemSchema,
  BlankResponseSchema,
  BlankEvaluateRequestSchema,
  BlankEvaluateResponseSchema,
} from './blank';
export type {
  BlankGate,
  BlankRequest,
  BlankItem,
  BlankResponse,
  BlankEvaluateRequest,
  BlankEvaluateResponse,
} from './blank';

// ─── Sabotage Gate ──────────────────────────────────────────────────
export {
  BugTypeSchema,
  SabotageGateSchema,
  SabotageRequestSchema,
  SabotageResponseSchema,
  SabotageFixRequestSchema,
  SabotageFixResponseSchema,
} from './sabotage';
export type {
  BugType,
  SabotageGate,
  SabotageRequest,
  SabotageResponse,
  SabotageFixRequest,
  SabotageFixResponse,
} from './sabotage';

// ─── Mentor ─────────────────────────────────────────────────────────
export {
  MentorHintRequestSchema,
  MentorHintSchema,
  MentorHintResponseSchema,
} from './mentor';
export type {
  MentorHintRequest,
  MentorHint,
  MentorHintResponse,
} from './mentor';

// ─── Study ──────────────────────────────────────────────────────────
export {
  StudyRecommendationRequestSchema,
  StudyRecommendationResponseSchema,
} from './study';
export type {
  StudyRecommendationRequest,
  StudyRecommendationResponse,
} from './study';

// ─── Session ────────────────────────────────────────────────────────
export {
  GateScopeSchema,
  BridgeApprovalSchema,
  SessionStateSchema,
  CreateSessionRequestSchema,
  CreateSessionResponseSchema,
} from './session';
export type {
  GateScope,
  BridgeApproval,
  SessionState,
  CreateSessionRequest,
  CreateSessionResponse,
} from './session';

// ─── Events ─────────────────────────────────────────────────────────
export { BridgeEvents } from './events';
export type { BridgeEventName } from './events';
