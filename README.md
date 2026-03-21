# Bridge

> A trust and learning layer for AI-assisted development.

Bridge is a VS Code extension and local backend that enforces comprehension before AI-generated code can be trusted. It is a **control layer**, not a new coding agent — your existing tools (Claude Code, Cursor, etc.) stay the generator. Bridge stays the **verifier and enforcer**.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐
│   VS Code Extension │────▶│   Bridge API     │
│   (Gate UI, State)  │◀────│   (Analyze,      │
│                     │     │    Quiz, Eval)    │
└─────────────────────┘     └──────────────────┘
         │                          │
         ▼                          ▼
  ┌──────────────┐          ┌──────────────┐
  │  @bridge/    │          │  @bridge/    │
  │  contracts   │          │  shared-utils│
  └──────────────┘          └──────────────┘
```

## Quick Start

```bash
# Prerequisites: Node.js >= 18, pnpm
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start the API server (mock mode)
pnpm --filter @bridge/api dev

# Develop the extension
# Open apps/extension in VS Code, press F5
```

## Project Structure

```
bridge/
├── apps/
│   ├── api/                # Express backend — analysis, quiz, evaluation
│   └── extension/          # VS Code extension — gates, UI, state
├── packages/
│   ├── contracts/          # Shared Zod schemas & TypeScript types
│   ├── shared-utils/       # Logger, ID generation, time helpers
│   ├── ui-kit/             # Webview UI components (placeholder)
│   └── tree-sitter/        # AST parsing integration (placeholder)
├── infra/
│   ├── docker/             # Dockerfile for API
│   └── scripts/            # Dev startup scripts
├── .github/workflows/      # CI pipeline
├── pnpm-workspace.yaml     # Workspace config
├── turbo.json              # Turborepo pipeline
└── tsconfig.base.json      # Shared TypeScript config
```

## Branch Strategy

| Branch | Owner | Responsibility |
|--------|-------|---------------|
| `chore/bootstrap-monorepo` | Person 1 | Repo structure, contracts, build tooling |
| `feat/backend-policy-and-eval` | Person 2 | API routes, services, prompt templates |
| `feat/extension-shell-and-ui` | Person 3 | Extension shell, sidebar, UI, status bar |
| `feat/editor-integrations-and-git` | Person 4 | Pattern gating, decorations, git hooks |

## Core Concepts

- **Gate**: A comprehension check that blocks the next action until the user demonstrates understanding.
- **Gate Scopes**: `blank` (fill in code), `quiz` (answer MCQ), `bug` (find injected bug), `commit` (explain diff).
- **Approval Token**: Issued when a gate is passed — expires after 1 hour.
- **Session**: Tracks all gates, approvals, and attempts for a workspace session.

## Monorepo Rules

1. All request/response types live in `@bridge/contracts`
2. No direct imports between apps — everything goes through contracts or shared-utils
3. One branch per surface area, minimal cross-editing
4. API shape changes require contract package owner review

## License

MIT
