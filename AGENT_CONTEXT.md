# Bridge — Agent Context Document

> Feed this file to your coding agent to give it full context on the Bridge monorepo.
> It covers project structure, shared contracts, build output shapes, and conventions
> that may be hidden by `.gitignore` (node_modules, dist/, .env, etc.).

---

## 1. Project Overview

Bridge is a VS Code extension + local Express backend that enforces comprehension before AI-generated code can be trusted. It is a **control layer** — the user's existing coding agent (Claude Code, Cursor, etc.) generates code, and Bridge gates the next step until the user demonstrates understanding.

**Architecture:**
```
User → Coding Agent (generates code) → Bridge API (analyzes) → Bridge Extension (creates gate)
                                                                       ↓
                                                               User answers gate
                                                                       ↓
                                                              Approval token issued
                                                                       ↓
                                                               User continues work
```

---

## 2. Monorepo Structure

This is a **pnpm workspace** monorepo managed by **Turborepo**.

```
bridge/
├── apps/
│   ├── api/                    # Express backend (port 3727)
│   │   ├── src/
│   │   │   ├── index.ts        # App entrypoint, mounts routes, CORS, JSON parser
│   │   │   ├── routes/
│   │   │   │   ├── analyze.ts  # POST /api/analyze
│   │   │   │   ├── quiz.ts     # POST /api/quiz
│   │   │   │   ├── evaluate.ts # POST /api/evaluate
│   │   │   │   └── session.ts  # POST /api/session, GET /api/session/:id
│   │   │   ├── services/
│   │   │   │   ├── analyzeService.ts   # Mock: returns hardcoded analysis
│   │   │   │   ├── quizService.ts      # Mock: returns hardcoded quiz question
│   │   │   │   └── evaluateService.ts  # Mock: quiz idx 2 is correct, others pass
│   │   │   ├── prompts/
│   │   │   │   └── index.ts    # LLM prompt templates (unused in mock mode)
│   │   │   └── validators/
│   │   │       └── validate.ts # Generic Zod validation middleware
│   │   ├── mock/
│   │   │   └── fixtures.json   # Static JSON fixtures for all endpoints
│   │   ├── package.json
│   │   └── tsconfig.json       # declaration: false (app, not library)
│   │
│   └── extension/              # VS Code extension
│       ├── src/
│       │   ├── extension.ts    # activate/deactivate, registers everything
│       │   ├── commands/
│       │   │   └── startSession.ts  # bridge.startSession, submitAnswer, analyzeFile, showStatus
│       │   ├── state/
│       │   │   └── sessionState.ts  # SessionManager: API calls + mock fallback
│       │   ├── ui/
│       │   │   ├── statusBar.ts       # Lock/unlock status in VS Code footer
│       │   │   └── sidebarProvider.ts # WebviewViewProvider with gate UI
│       │   └── integrations/
│       │       ├── index.ts             # Barrel export
│       │       ├── gitIntegration.ts    # Pre-commit hook stubs
│       │       ├── editorDecorations.ts # Gated/blanked block decorations
│       │       └── patternGating.ts     # Regex-based function body detection
│       ├── resources/
│       │   └── bridge-icon.svg
│       ├── package.json        # VS Code extension manifest (contributes, commands, views)
│       └── tsconfig.json       # declaration: false (app, not library)
│
├── packages/
│   ├── contracts/              # ★ SINGLE SOURCE OF TRUTH for all types
│   │   ├── src/
│   │   │   ├── index.ts        # Barrel re-export of everything below
│   │   │   ├── analyze.ts      # AnalyzeRequest/Response schemas
│   │   │   ├── quiz.ts         # QuizRequest/Response/Question schemas
│   │   │   ├── evaluate.ts     # EvaluateRequest/Response schemas
│   │   │   ├── session.ts      # BridgeApproval, SessionState, GateScope schemas
│   │   │   └── events.ts       # BridgeEvents constant map + BridgeEventName type
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── shared-utils/           # Logger, generateId(), expiresIn()
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui-kit/                 # Placeholder — webview UI helpers
│   │   ├── src/index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── tree-sitter/            # Placeholder — AST parsing
│       ├── src/index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── infra/
│   ├── docker/Dockerfile.api
│   └── scripts/dev.sh
├── .github/workflows/ci.yml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .prettierrc
├── .env.example
└── README.md
```

---

## 3. Shared Contract Types (from `@bridge/contracts`)

These are the **exact** Zod schemas and TypeScript types shared across the entire project. Import them from `@bridge/contracts`. **Never** duplicate these shapes — always import.

### GateScope
```typescript
type GateScope = 'blank' | 'quiz' | 'bug' | 'commit';
```

### AnalyzeRequest / AnalyzeResponse
```typescript
type AnalyzeRequest = {
  code: string;              // min 1 char
  filePath?: string;
  language?: string;
  sessionId: string;         // UUID
};

type AnalyzeResponse = {
  analysisId: string;        // UUID
  complexity: number;        // 1-10
  concepts: string[];
  summary: string;
  suggestedGate: 'blank' | 'quiz' | 'bug' | 'commit' | 'none';
  gatedBlocks: Array<{ startLine: number; endLine: number; reason: string }>;
};
```

### QuizRequest / QuizResponse
```typescript
type QuizRequest = {
  analysisId: string;        // UUID
  code: string;
  concepts?: string[];
  sessionId: string;         // UUID
};

type QuizQuestion = {
  questionId: string;        // UUID
  question: string;
  options: string[];         // exactly length 4
  correctIndex: number;      // 0-3
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type QuizResponse = {
  quizId: string;            // UUID
  questions: QuizQuestion[]; // min 1
  passingScore: number;      // 0-1
};
```

### EvaluateRequest / EvaluateResponse
```typescript
type EvaluateRequest = {
  sessionId: string;         // UUID
  scope: GateScope;
  quizAnswer?: { questionId: string; selectedIndex: number };
  blankAnswer?: { code: string; blockId: string };
  commitAnswer?: { explanation: string; diffBlockId: string };
  bugAnswer?: { identifiedLine: number; explanation: string };
};

type EvaluateResponse = {
  passed: boolean;
  feedback: string;
  hint?: string;
  attemptsRemaining?: number;
};
```

### BridgeApproval / SessionState
```typescript
type BridgeApproval = {
  token: string;
  sessionId: string;         // UUID
  scope: GateScope;
  expiresAt: string;         // ISO datetime
  reason: string;
};

type SessionState = {
  sessionId: string;         // UUID
  isLocked: boolean;
  activeGate: GateScope | null;
  pendingGates: Array<{
    scope: GateScope;
    analysisId: string;      // UUID
    createdAt: string;       // ISO datetime
  }>;
  approvals: BridgeApproval[];
  currentAttempts: number;
  maxAttempts: number;
  createdAt: string;         // ISO datetime
};
```

### Event Names (from `events.ts`)
```typescript
const BridgeEvents = {
  ANALYSIS_REQUESTED: 'bridge:analysis:requested',
  ANALYSIS_COMPLETE: 'bridge:analysis:complete',
  GATE_CREATED: 'bridge:gate:created',
  GATE_ANSWERED: 'bridge:gate:answered',
  GATE_PASSED: 'bridge:gate:passed',
  GATE_FAILED: 'bridge:gate:failed',
  GATE_ESCALATED: 'bridge:gate:escalated',
  SESSION_CREATED: 'bridge:session:created',
  SESSION_LOCKED: 'bridge:session:locked',
  SESSION_UNLOCKED: 'bridge:session:unlocked',
  UI_SHOW_QUIZ: 'bridge:ui:show-quiz',
  UI_SHOW_BLANK: 'bridge:ui:show-blank',
  UI_SHOW_BUG: 'bridge:ui:show-bug',
  UI_SHOW_COMMIT: 'bridge:ui:show-commit',
  UI_SHOW_HINT: 'bridge:ui:show-hint',
  UI_DISMISS: 'bridge:ui:dismiss',
  MENTOR_HINT_REQUESTED: 'bridge:mentor:hint-requested',
  MENTOR_HINT_DELIVERED: 'bridge:mentor:hint-delivered',
  RESOURCE_SUGGESTED: 'bridge:resource:suggested',
} as const;
```

---

## 4. Shared Utilities (from `@bridge/shared-utils`)

```typescript
import { generateId, expiresIn, logger } from '@bridge/shared-utils';

generateId()          // returns crypto.randomUUID()
expiresIn(3600)       // returns ISO string for "now + 3600 seconds"
logger.info(msg, data?)
logger.warn(msg, data?)
logger.error(msg, data?)
logger.debug(msg, data?)  // only logs when NODE_ENV=development
```

---

## 5. API Endpoints

Base URL: `http://localhost:3727`

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| GET | `/api/health` | — | `{ status, mockMode, timestamp }` |
| POST | `/api/analyze` | `AnalyzeRequest` | `AnalyzeResponse` |
| POST | `/api/quiz` | `QuizRequest` | `QuizResponse` |
| POST | `/api/evaluate` | `EvaluateRequest` | `EvaluateResponse` |
| POST | `/api/session` | `CreateSessionRequest` | `{ sessionId, state }` |
| GET | `/api/session/:sessionId` | — | `SessionState` |

All POST routes validate the body with Zod via the `validate()` middleware. On validation failure: `400 { error, issues: [{ path, message }] }`.

---

## 6. VS Code Extension Commands

| Command ID | Title | What it does |
|-----------|-------|-------------|
| `bridge.startSession` | Bridge: Start Session | Creates a new session (API or mock fallback) |
| `bridge.submitAnswer` | Bridge: Submit Answer | Opens input box, evaluates user's explanation |
| `bridge.analyzeFile` | Bridge: Analyze Current File | Sends active editor content to `/api/analyze` |
| `bridge.showStatus` | Bridge: Show Session Status | Shows locked/unlocked, pending gates, approvals |

The extension contributes a **sidebar webview** (`bridge.sidebarView`) in a custom activity bar container.

---

## 7. Build & Hidden Files

### Files hidden by `.gitignore` that exist at runtime:
- `node_modules/` — pnpm hoisted + workspace symlinks
- `packages/contracts/dist/` — compiled JS + `.d.ts` declaration files
- `packages/shared-utils/dist/` — compiled JS + `.d.ts`
- `apps/api/dist/` — compiled JS (no declarations)
- `apps/extension/dist/` — compiled JS (no declarations)
- `pnpm-lock.yaml` — dependency lock file
- `.env` — runtime environment variables (copy from `.env.example`)
- `.turbo/` — Turborepo cache

### Build order (dependency graph):
```
packages/contracts    → (no deps)
packages/shared-utils → (no deps)
packages/ui-kit       → (no deps)
packages/tree-sitter  → (no deps)
apps/api              → depends on contracts, shared-utils
apps/extension        → depends on contracts, shared-utils
```

### Key tsconfig notes:
- Base config: ES2022, strict, commonjs, sourceMap, declaration + declarationMap
- Apps override: `declaration: false, declarationMap: false` (prevents TS2742 portability errors with Express types)

---

## 8. Environment Variables

```bash
PORT=3727                    # API server port
NODE_ENV=development         # 'development' enables debug logging
OPENAI_API_KEY=              # For live LLM calls (not needed in mock mode)
ANTHROPIC_API_KEY=           # For live LLM calls (not needed in mock mode)
BRIDGE_MOCK_MODE=true        # 'true' = hardcoded responses, 'false' = real LLM
```

---

## 9. Monorepo Rules

1. **All types go in `@bridge/contracts`** — never duplicate request/response shapes
2. **No app-to-app imports** — only through contracts or shared-utils
3. **One branch per surface area** — minimize cross-file edits
4. **Contract changes require review** from the bootstrap branch owner
5. **Mock mode always works** — never break the UI by requiring a live backend

### Branch ownership:
| Branch | Owns |
|--------|------|
| `chore/bootstrap-monorepo` | Root config, contracts, shared-utils |
| `feat/backend-policy-and-eval` | `apps/api/src/routes/*`, `services/*`, `prompts/*` |
| `feat/extension-shell-and-ui` | `apps/extension/src/extension.ts`, `ui/*`, `state/*`, `commands/*`, webview |
| `feat/editor-integrations-and-git` | `apps/extension/src/integrations/*`, `packages/tree-sitter/*`, `infra/*` |

---

## 10. Quick Commands

```bash
# Install deps
npx pnpm install

# Build everything (shared packages must build first)
npx pnpm --filter @bridge/contracts build
npx pnpm --filter @bridge/shared-utils build
npx pnpm --filter @bridge/api build
npx pnpm --filter bridge build

# Start API dev server (hot reload)
npx pnpm --filter @bridge/api dev

# Type-check without emitting
npx pnpm --filter @bridge/api lint

# Format all files
npx pnpm format
```
