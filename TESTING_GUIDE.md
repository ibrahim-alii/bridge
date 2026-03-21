# Bridge API Testing Guide

This guide contains all the `curl` commands needed to fully test the backend LLM features. 

> **Tip:** We use `python3 -m json.tool` to format the JSON output so it's readable in the terminal.

---

## 1. Start the Server

Before testing, make sure your contracts are built and the API server is running.

```bash
# In one terminal, build contracts to ensure types are up to date:
npx pnpm --filter @bridge/contracts build

# Then start the API dev server:
npx pnpm --filter @bridge/api dev
```

---

## 2. Health & Session

**Check if the server is running:**
```bash
curl -s http://localhost:3727/api/health | python3 -m json.tool
```

**Create a new session:**
```bash
curl -s -X POST http://localhost:3727/api/session \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

---

## 3. Analyze Code (Triage)

This endpoint decides *which* blocks should be gated and what *type* of gate to use (quiz, blank, sabotage). We are testing using an async data fetching function.

```bash
curl -s -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript",
    "sessionId": "00000000-0000-0000-0000-000000000001"
  }' | python3 -m json.tool
```

---

## 4. Quizzes (Architectural Comprehension)

**Generate a quiz:**
```bash
curl -s -X POST http://localhost:3727/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "analysisId": "00000000-0000-0000-0000-000000000001",
    "sessionId": "00000000-0000-0000-0000-000000000001"
  }' | python3 -m json.tool
```

**Evaluate a correct answer (index 2):**
```bash
curl -s -X POST http://localhost:3727/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "00000000-0000-0000-0000-000000000001",
    "scope": "quiz",
    "quizAnswer": {
      "questionId": "00000000-0000-0000-0000-000000000001",
      "selectedIndex": 2
    }
  }' | python3 -m json.tool
```

---

## 5. Blank Gating (Pattern Implementation)

**Generate blanks (identifies what to hide in the code):**
```bash
curl -s -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript"
  }' | python3 -m json.tool
```

*(You can also pass `gatedBlocks` from the analyze step above to enrich instead of re-scanning).*

**Evaluate a short-answer explanation of the blank:**
```bash
curl -s -X POST http://localhost:3727/api/blank/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "blankId": "test-1",
    "originalCode": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "startLine": 6,
    "endLine": 7,
    "expectedPattern": "a catch block that returns a fallback guest user object on failure",
    "userExplanation": "If the network request fails or returns a 404, it catches the error and returns a default guest profile instead of crashing the app."
  }' | python3 -m json.tool
```

---

## 6. Sabotage (Spot the Bug)

**Inject a bug into the code:**
```bash
curl -s -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript"
  }' | python3 -m json.tool
```

> *Note: The command above returns a JSON payload containing the `bugId`, `sabotagedCode`, `originalLine`, `originalContent`, `sabotagedContent`, and `bugType`. You must plug those values into the evaluation command below.*

**Evaluate a user's fix:**
Replace the capitalized placeholder strings below with the exact values returned from the bug injection command above.

```bash
curl -s -X POST http://localhost:3727/api/sabotage/fix \
  -H "Content-Type: application/json" \
  -d '{
    "bugId": "THE_BUG_ID_FROM_ABOVE",
    "originalCode": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "sabotagedCode": "THE_SABOTAGED_CODE_FROM_ABOVE",
    "originalLine": 4,
    "originalContent": "    if (!res.ok) throw new Error(\"Not found\");",
    "sabotagedContent": "THE_SABOTAGED_LINE_FROM_ABOVE",
    "bugType": "THE_BUG_TYPE_FROM_ABOVE",
    "fixedCode": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}"
  }' | python3 -m json.tool
```
