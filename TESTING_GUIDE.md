# Bridge API Testing Guide

This guide contains terminal commands to test the backend API end-to-end.

> Tip: We use `python3 -m json.tool` to pretty-print JSON.
> PowerShell users: prefer `node apps/api/scripts/run-guide-tests.mjs` or use `curl.exe` instead of `curl`.

---

## 1. Start the Server

```bash
# Build contracts first
npx pnpm --filter @bridge/contracts build

# Start API in another terminal
npx pnpm --filter @bridge/api dev
```

---

## 2. Health & Session

```bash
curl -sS http://localhost:3727/api/health | python3 -m json.tool

SESSION_JSON=$(curl -sS -X POST http://localhost:3727/api/session \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$SESSION_JSON" | python3 -m json.tool

SESSION_ID=$(echo "$SESSION_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
echo "SESSION_ID=$SESSION_ID"
```

---

## 3. Analyze Code (Triage)

```bash
ANALYZE_JSON=$(curl -sS -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$ANALYZE_JSON" | python3 -m json.tool
ANALYSIS_ID=$(echo "$ANALYZE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['analysisId'])")
echo "ANALYSIS_ID=$ANALYSIS_ID"
```

---

## 4. Quizzes (Architectural Comprehension)

```bash
QUIZ_JSON=$(curl -sS -X POST http://localhost:3727/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "analysisId": "'"$ANALYSIS_ID"'",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$QUIZ_JSON" | python3 -m json.tool
QUESTION_ID=$(echo "$QUIZ_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['questions'][0]['questionId'])")
echo "QUESTION_ID=$QUESTION_ID"

curl -sS -X POST http://localhost:3727/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "scope": "quiz",
    "quizAnswer": {
      "questionId": "'"$QUESTION_ID"'",
      "selectedIndex": 2
    }
  }' | python3 -m json.tool
```

---

## 5. Blank Gating (Pattern Implementation)

```bash
BLANK_JSON=$(curl -sS -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript"
  }')

echo "$BLANK_JSON" | python3 -m json.tool

curl -sS -X POST http://localhost:3727/api/blank/evaluate \
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

```bash
SABOTAGE_JSON=$(curl -sS -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d '{
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "language": "javascript"
  }')

echo "$SABOTAGE_JSON" | python3 -m json.tool

BUG_ID=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['bugId'])")
BUG_TYPE=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['bugType'])")
ORIGINAL_LINE=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['originalLine'])")

echo "BUG_ID=$BUG_ID BUG_TYPE=$BUG_TYPE ORIGINAL_LINE=$ORIGINAL_LINE"

SABOTAGE_FIX_JSON=$(python3 - <<'PY' "$SABOTAGE_JSON"
import sys, json
s = json.loads(sys.argv[1])
payload = {
  "bugId": s["bugId"],
  "originalCode": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
  "sabotagedCode": s["sabotagedCode"],
  "originalLine": s["originalLine"],
  "originalContent": s["originalContent"],
  "sabotagedContent": s["sabotagedContent"],
  "bugType": s["bugType"],
  "fixedCode": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
}
print(json.dumps(payload))
PY
)

curl -sS -X POST http://localhost:3727/api/sabotage/fix \
  -H "Content-Type: application/json" \
  -d "$SABOTAGE_FIX_JSON" | python3 -m json.tool
```
