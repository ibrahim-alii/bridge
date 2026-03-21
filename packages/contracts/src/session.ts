import { z } from 'zod';

// ─── Gate Scope ─────────────────────────────────────────────────────
export const GateScopeSchema = z.enum(['blank', 'quiz', 'bug', 'commit']);
export type GateScope = z.infer<typeof GateScopeSchema>;

// ─── Bridge Approval Token ─────────────────────────────────────────
export const BridgeApprovalSchema = z.object({
  /** Unique approval token */
  token: z.string(),
  /** Session this approval belongs to */
  sessionId: z.string().uuid(),
  /** The type of gate that was passed */
  scope: GateScopeSchema,
  /** When this approval expires */
  expiresAt: z.string().datetime(),
  /** Human-readable reason this approval was granted */
  reason: z.string(),
});

export type BridgeApproval = z.infer<typeof BridgeApprovalSchema>;

// ─── Session State ──────────────────────────────────────────────────
export const SessionStateSchema = z.object({
  /** Unique session ID */
  sessionId: z.string().uuid(),
  /** Whether the user is currently locked */
  isLocked: z.boolean(),
  /** Current active gate scope, if locked */
  activeGate: GateScopeSchema.nullable(),
  /** Stack of pending gates to resolve */
  pendingGates: z.array(
    z.object({
      scope: GateScopeSchema,
      analysisId: z.string().uuid(),
      createdAt: z.string().datetime(),
    }),
  ),
  /** List of approval tokens earned this session */
  approvals: z.array(BridgeApprovalSchema),
  /** Number of failed attempts for the current gate */
  currentAttempts: z.number(),
  /** Maximum attempts before escalation */
  maxAttempts: z.number(),
  /** Session creation time */
  createdAt: z.string().datetime(),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

// ─── Session Create/Update ──────────────────────────────────────────
export const CreateSessionRequestSchema = z.object({
  /** Optional workspace identifier */
  workspaceId: z.string().optional(),
});

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;

export const CreateSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  state: SessionStateSchema,
});

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>;
