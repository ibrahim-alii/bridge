/**
 * Event names shared between backend and extension.
 * Used for WebSocket messages and internal event bus.
 */
export const BridgeEvents = {
  // ─── Analysis ───────────────────────────────────────────────
  ANALYSIS_REQUESTED: 'bridge:analysis:requested',
  ANALYSIS_COMPLETE: 'bridge:analysis:complete',

  // ─── Gate Lifecycle ─────────────────────────────────────────
  GATE_CREATED: 'bridge:gate:created',
  GATE_ANSWERED: 'bridge:gate:answered',
  GATE_PASSED: 'bridge:gate:passed',
  GATE_FAILED: 'bridge:gate:failed',
  GATE_ESCALATED: 'bridge:gate:escalated',

  // ─── Session ────────────────────────────────────────────────
  SESSION_CREATED: 'bridge:session:created',
  SESSION_LOCKED: 'bridge:session:locked',
  SESSION_UNLOCKED: 'bridge:session:unlocked',

  // ─── UI ─────────────────────────────────────────────────────
  UI_SHOW_QUIZ: 'bridge:ui:show-quiz',
  UI_SHOW_BLANK: 'bridge:ui:show-blank',
  UI_SHOW_BUG: 'bridge:ui:show-bug',
  UI_SHOW_COMMIT: 'bridge:ui:show-commit',
  UI_SHOW_HINT: 'bridge:ui:show-hint',
  UI_DISMISS: 'bridge:ui:dismiss',

  // ─── Mentor ─────────────────────────────────────────────────
  MENTOR_HINT_REQUESTED: 'bridge:mentor:hint-requested',
  MENTOR_HINT_DELIVERED: 'bridge:mentor:hint-delivered',

  // ─── Resource Routing ───────────────────────────────────────
  RESOURCE_SUGGESTED: 'bridge:resource:suggested',
} as const;

export type BridgeEventName = (typeof BridgeEvents)[keyof typeof BridgeEvents];
