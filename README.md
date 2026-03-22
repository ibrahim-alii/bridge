# Bridge

> A verification layer between AI generation and code acceptance — forcing comprehension before the next prompt, fix, or commit can proceed.

Bridge is a VS Code extension that enforces understanding of AI-generated code before you can keep building. Your agent (Claude Code, Cursor, Copilot) still generates. Bridge decides whether you've earned the right to continue.

---

## Install

**[→ Get Bridge on the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=bridge-team.bridge-for-learning)**

Or search `Bridge` in the VS Code Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`).

Requires VS Code 1.85+ and a running Bridge backend (see [Getting Started](#getting-started)).

---

## How it works

```
AI agent generates code
       ↓
Bridge inspects the output and locks your next action
(blank explanation · architectural quiz · bug fix · commit review)
       ↓
You answer in the Bridge sidebar
       ↓
Pass → next step unlocked    Fail → hint shown, gate stays locked
```

Bridge does not write code. It owns the gate.

---

## Features

| Priority | Feature | What it does |
|---|---|---|
| **Pattern Gating** | Blanks core logic — you explain it before the agent continues |
| **Why Quizzes** | Locks the prompt bar with a multiple-choice question about the design choice |
| **Commit Gatekeeper** | Blocks commits until you explain the diff in plain English |
| **Socratic Mentor** | Gives hints and questions only — never raw code |
| **Spot the Bug** | Injects one controlled bug and asks you to find it |
| **Algo-Bridge** | Surfaces a relevant study resource when you're blocked |
| **Big O Bounty** | Flags slow implementations and challenges you to refactor |
| **State Destruction** | Deletes the generated block after repeated failures *(off by default)* |

---

## Getting started

### Prerequisites
- Node.js 18+, pnpm, VS Code 1.85+

### Run locally

```bash
git clone https://github.com/your-org/bridge.git
cd bridge
pnpm install
cp .env.example .env
pnpm dev
```

### Key scripts

```bash
pnpm dev                 # Extension dev mode + API server
pnpm build               # Build all packages
pnpm typecheck           # Type check all packages
pnpm test                # Run tests
pnpm package-extension   # Package .vsix for distribution
```

### Configuration

```env
ANTHROPIC_API_KEY=
PORT=3001
BRIDGE_USE_MOCKS=true
BRIDGE_ENABLE_BUG_SABOTAGE=true
BRIDGE_ENABLE_BIG_O_BOUNTY=true
BRIDGE_ENABLE_STATE_DESTRUCTION=false
```

Set `BRIDGE_USE_MOCKS=true` to run the full extension against mock responses before the backend is wired in.

---

## Architecture

Monorepo with two surfaces and a shared contracts layer.

```
bridge/
├── apps/
│   ├── extension/       # VS Code extension
│   └── api/             # Local backend
└── packages/
    └── contracts/       # Shared TypeScript types and schemas
```

All request/response shapes live in `packages/contracts`. The extension renders session state — it never invents it. Policy and grading decisions belong to the backend.

**API endpoints:** `/api/analyze` · `/api/quiz` · `/api/evaluate` · `/api/mentor` · `/api/commit/review`

---

The AI can help you build. Bridge makes sure you understand what you're shipping.
