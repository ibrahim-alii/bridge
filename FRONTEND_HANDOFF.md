# Algo-Bridge: Backend to Frontend Integration Guide

This document outlines all the available backend features (microservices) and provides guidance on the required UI components the extension needs to support them.

The backend is running locally at `http://localhost:3727`.

---

## 1. Core State & Analysis (The Base)

Before any interactive features run, you secure a session and analyze the code.

### `POST /api/session`
- **Purpose**: Creates a new stateful session.
- **Request**: `{}`
- **Response**: `{ "sessionId": "uuid" }`
- **UI Needs**: Hidden state. Save `sessionId` in the extension's local state.

### `POST /api/analyze`
- **Purpose**: Reads the user's code and generates an analysis baseline.
- **Request**: `{ "code": "...", "language": "javascript", "sessionId": "uuid" }`
- **Response**: `{ "analysisId": "uuid" }`
- **UI Needs**: Hidden state. Trigger this when the user opens a file or asks for help. Store `analysisId`.

---

## 2. Interactive Learning Gates (The Bounties)

These are the "gates" that block or challenge the user.

### `POST /api/quiz` (Multiple Choice Questions)
- **Purpose**: Generates MCQs about their code.
- **Request**: `{ "code": "...", "analysisId": "uuid", "sessionId": "uuid" }`
- **Response**: `{ "quizId": "uuid", "questions": [ { "question": "...", "options": ["A","B","C","D"], "questionId": "uuid" } ] }`
- **UI Needs**: **Space for MCQ questions**. Render the `question` and radio buttons/buttons for the `options`.

### `POST /api/blank` (Fill in the Blank)
- **Purpose**: Generates conceptual fill-in-the-blanks for their code.
- **Request**: `{ "code": "...", "language": "javascript", "sessionId": "uuid" }`
- **Response**: `{ "blanks": [ { "startLine": 10, "endLine": 12, "hint": "..." } ] }`
- **UI Needs**: Inline editor decorations or a sidebar block asking them to fill in a specific conceptual gap.

### `POST /api/sabotage` (Spot the Bug)
- **Purpose**: Injects a pedagogical bug into their code for them to find. 
- **Request**: `{ "code": "...", "language": "javascript", "sessionId": "uuid" }`
- **Response**: `{ "sabotagedCode": "...", "bugId": "...", "explanation": "..." }`
- **UI Needs**: A diff viewer or a temporary overlay showing the broken code, asking them what's wrong.

### `POST /api/evaluate` (Universal Grader)
- **Purpose**: Evaluates the user's answer to any of the above gates (quiz, blank, sabotage).
- **Request**: 
  ```json
  { 
    "sessionId": "uuid", 
    "scope": "quiz", 
    "quizAnswer": { "questionId": "uuid", "selectedIndex": 2 } 
  }
  ```
- **Response**: `{ "passed": true|false, "feedback": "...", "hint": "...", "attemptsRemaining": 2 }`
- **UI Needs**: A Submit button for the active gate, showing `feedback` (success/fail) afterwards.

---

## 3. Help & Study Layers (The "Stuck" Path)

When the user is blocked or fails a bounty, these activate.

### `POST /api/mentor/hint` (Socratic Mentor)
- **Purpose**: A strict no-code conceptual mentor. Gives hints, NEVER writes code.
- **Request**: `{ "code": "...", "question": "I'm stuck on caching", "attemptNumber": 1, "sessionId": "uuid" }`
- **Response**: `{ "hints": [ { "hint": "..." } ], "guidingQuestions": ["Why does...?", "What if...?"] }`
- **UI Needs**: **A textbox for the user to ask hints/questions.** Render the response in a chat-style interface, specifically displaying the `hints` and the `guidingQuestions` array.

### `POST /api/study/recommend` (Contextual Study Layer)
- **Purpose**: Scans code and maps it to a curated DSA topic, YouTube video, or industry blog.
- **Request**: `{ "code": "...", "language": "javascript", "sessionId": "uuid" }`
- **Response**: `{ "topic": "LRU Cache", "recommendation": "LeetCode 146", "reason": "You are using Maps..." }`
- **UI Needs**: **Space for resource recommendation.** A sidebar widget or toast showing: "💡 **Topic**: {topic}", followed by `{reason}` and a link/callout for `{recommendation}`.

---

## 4. Senior Engineer Checks (The Big O Bounty)

Heuristic-driven code review challenges.

### `POST /api/bounty/analyze` (Fast Heuristics)
- **Purpose**: Extremely fast (`O(ms)`) regex check for candidate code smells (nested loops, monolithic classes).
- **Request**: `{ "code": "...", "language": "javascript" }`
- **Response**: `{ "hasSmell": true, "smellType": "nested_loops" }`
- **UI Needs**: Background trigger on document save. If `hasSmell` is true, trigger `/challenge`.

### `POST /api/bounty/challenge` (Generate Challenge)
- **Purpose**: The LLM writes a fun "Senior Engineer Challenge" asking for a refactor without giving the answer.
- **Request**: `{ "code": "...", "smellType": "nested_loops" }`
- **Response**: `{ "challenge": "...", "hint": "..." }`
- **UI Needs**: A bounty popup/sidebar card showing the `challenge` text and a button to "Reveal Hint".

### `POST /api/bounty/evaluate` (Grade Refactor)
- **Purpose**: Evaluates if the user's new code removed the code smell while keeping the logic.
- **Request**: `{ "originalCode": "...", "refactoredCode": "...", "smellType": "nested_loops" }`
- **Response**: `{ "passed": true, "feedback": "..." }`
- **UI Needs**: A "Submit Refactor" button that sends their active editor code as `refactoredCode` and shows the `feedback`.
