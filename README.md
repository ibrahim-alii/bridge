# Bridge

> A verification layer that sits between AI generation and code acceptance — forcing comprehension before the next prompt, fix, or commit can proceed.

Bridge is a VS Code extension and local backend that enforces understanding before AI-generated code can be trusted. It is not a competing coding agent. Claude Code, Cursor, and Copilot still generate code. Bridge decides whether you've earned the right to keep moving.

---

## What Bridge does

When you generate code with an AI agent, Bridge intercepts the result and locks your next action behind a comprehension gate. You explain the logic, answer an architectural question, or find the injected bug. Pass the gate, unlock the next step. Fail it, and Bridge gives you a hint and tries again.

The goal is to make vibecoding honest: the AI can help you build, but you have to prove you understand what you're about to ship.

---

## Features

### P0 — Core enforcement loop

**Pattern Implementation Gating**
Bridge blanks out the core logic of a generated scaffold and asks you to explain it in plain English before the agent can continue. Not a fill-in-the-blank syntax exercise — a short-answer rubric check on whether you understand what the code should do.

**Architectural Why Quizzes**
When a meaningful design choice is made (using a Map instead of an Array, picking a particular algorithm, structuring a class a certain way), Bridge locks the prompt bar and asks one multiple-choice question about the *why*. Wrong answer shows the explanation and re-locks. Right answer unlocks the next generation step.

**Comprehension Commits / Git Gatekeeper**
When you try to commit a large block of AI-generated code, Bridge reads the staged diff, selects the most complex changed section, and asks you to explain it in plain English. A failed explanation blocks the commit. A passing one logs an approval and lets it through.

### P1 — Supporting loops

**Strict Socratic Mentor**
When you're stuck, Bridge gives hints and guiding questions — never raw code. Even if you ask for the answer directly, the mentor stays conceptual.

**Spot the Bug Sabotage**
Bridge injects one controlled, safe bug into the generated scaffold (a missing `await`, an off-by-one, a wrong conditional) and asks you to find and fix it. One hint on failure. No spoilers until you submit a fix.

**Algo-Bridge Resource Routing**
When Bridge detects a known concept in your code (debounce, caching, trie, consistent hashing), it surfaces a relevant study link, LeetCode problem, or system design reference in the sidebar.

### P2 — Senior-level checks

**Big O and Architecture Bounty**
Bridge flags slow or structurally poor implementations (nested loops, repeated lookups, heavy coupling) and challenges you to refactor before continuing. Uses lightweight heuristics, not a full static analyzer.

**Rubber Duck Block**
Bridge asks you to summarize a hidden code block in plain English before it's revealed to you. Useful for keeping your mental model honest.

### P3 — Optional / behind flags

**State Destruction**
After repeated gate failures, Bridge deletes the generated block and makes you start over. Controlled and reversible. Off by default — enable with `BRIDGE_ENABLE_STATE_DESTRUCTION=true`.

---

## How it works

```
User asks Claude Code / Cursor for a feature
        ↓
Agent generates code or scaffold
        ↓
Bridge inspects the result and creates a gate
(blank explanation, architectural quiz, bug fix, or commit review)
        ↓
User answers in the Bridge sidebar
        ↓
Backend evaluates against rubric
        ↓
Pass → BridgeApproval token emitted → next action unlocked
Fail → hint shown → gate remains locked
```

Bridge does not write code. It does not replace your agent. It owns the gate.

---

## Architecture

Bridge is a monorepo with two main surfaces and a shared contracts layer.

```
bridge/
├── apps/
│   ├── extension/          # VS Code extension (Person 3 + 4)
│   │   └── src/
│   │       ├── extension.ts
│   │       ├── commands/
│   │       ├── state/
│   │       ├── ui/
│   │       ├── integrations/
│   │       └── webview/
│   └── api/                # Local backend (Person 2)
│       └── src/
│           ├── routes/
│           ├── services/
│           ├── prompts/
│           └── validators/
└── packages/
    ├── contracts/          # Shared TypeScript types and schemas (Person 1)
    ├── shared-utils/
    ├── ui-kit/
    └── tree-sitter/
```

### Key design principles

- **The extension renders state, it never invents it.** All policy and lock decisions live in the backend or a single workspace state authority.
- **The contract is the interface.** All request/response shapes live in `packages/contracts`. Neither the extension nor the API duplicates them.
- **Mock mode ships first.** The extension UI is fully functional against a mock server before live model calls are wired in.
- **Approval tokens, not agent interception.** Bridge does not try to control Claude Code or Cursor internals. It writes a `BridgeApproval` token to session state, and the user uses that as the handoff point.

---

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/analyze` | Generate scaffold and gate metadata |
| `POST /api/quiz` | Generate a contextual multiple-choice question |
| `POST /api/evaluate` | Grade a short answer, blank fill-in, or code fix |
| `POST /api/mentor` | Return hint-only guidance (no raw code) |
| `POST /api/commit/review` | Review a staged diff for comprehension |

### Shared types (excerpt)

```typescript
export type BridgeSession = {
  sessionId: string;
  workspaceId: string;
  locked: boolean;
  lockedReason: "blank" | "quiz" | "bug" | "bounty" | "commit" | null;
  currentFile?: string;
  lastActionAt: string;
  approvalToken?: string;
};

export type QuizResponse = {
  question: string;
  options: string[]; // exactly 4
  correctIndex: number;
  explanation: string;
};

export type EvaluateResponse = {
  passed: boolean;
  feedback: string;
};

export type BridgeApproval = {
  token: string;
  sessionId: string;
  scope: "blank" | "quiz" | "bug" | "commit";
  expiresAt: string;
  reason: string;
};
```

---

## Getting started

### Prerequisites

- Node.js 18+
- pnpm
- VS Code

### Install

```bash
git clone https://github.com/your-org/bridge.git
cd bridge
pnpm install
cp .env.example .env
```

### Run locally

```bash
pnpm dev          # Start extension in dev mode + API server
pnpm start-api    # Start API server only
```

### Build

```bash
pnpm build              # Build all packages
pnpm typecheck          # Type check all packages
pnpm lint               # Lint all packages
pnpm test               # Run tests
pnpm package-extension  # Package the .vsix for distribution
```

---

## Configuration

```env
ANTHROPIC_API_KEY=
PORT=3001
BRIDGE_USE_MOCKS=true
BRIDGE_SESSION_STORAGE=workspace
BRIDGE_ENABLE_STATE_DESTRUCTION=false
BRIDGE_ENABLE_BUG_SABOTAGE=true
BRIDGE_ENABLE_BIG_O_BOUNTY=true
```

Set `BRIDGE_USE_MOCKS=true` during UI development and demo rehearsals. The full feature set works against mock responses before the model backend is wired in.

---

## Team and branch structure

| Branch | Owner | Responsibility |
|---|---|---|
| `chore/bootstrap-monorepo` | Person 1 | Repo scaffolding, shared contracts, CI, mock server |
| `feat/backend-policy-and-eval` | Person 2 | `/analyze`, `/quiz`, `/evaluate`, prompt templates, session policy |
| `feat/extension-shell-and-ui` | Person 3 | Sidebar, status bar, lock state UI, quiz/mentor views |
| `feat/editor-integrations-and-git` | Person 4 | Pattern gating, decorations, git interception, Tree-sitter, deploy |

**Merge rule:** Implementation branches never directly edit the same file. All cross-branch communication goes through `packages/contracts` or `packages/shared-utils`.

---

## Acceptance criteria

- [ ] Extension loads without crashing
- [ ] Status bar shows locked and unlocked states correctly
- [ ] A blanked scaffold can be approved and unlocked via short-answer submission
- [ ] A quiz can be generated, answered, graded, and retried
- [ ] A bug challenge can be displayed and cleared after a valid fix
- [ ] A commit can be blocked until the explanation passes evaluation
- [ ] Mentor mode never outputs raw code
- [ ] Algo-Bridge surfaces at least one contextual study suggestion
- [ ] Entire flow works in mock mode if the model backend is unavailable

---

## The pitch

AI agents can write your code. Bridge makes sure you understand it before it ships.

That is the entire story: the AI helps, but the human has to earn the next step.
