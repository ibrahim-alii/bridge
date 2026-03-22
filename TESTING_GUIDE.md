# Bridge API Testing Guide

<<<<<<< HEAD
This guide contains all the `curl` commands needed to fully test the backend LLM features on a complex real-world implementation: **a fetch wrapper with an LRU-style stale-while-revalidate cache and rate limit handling**.
=======
This guide contains terminal commands to test the backend API end-to-end.
>>>>>>> main

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

<<<<<<< HEAD
This endpoint decides *which* blocks should be gated and what *type* of gate to use (quiz, blank, sabotage) on our complex caching function.

=======
>>>>>>> main
```bash
ANALYZE_JSON=$(curl -sS -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript",
<<<<<<< HEAD
    "sessionId": "462cc224-ce15-403c-b28d-9f291334cf40"
  }' | python3 -m json.tool
=======
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$ANALYZE_JSON" | python3 -m json.tool
ANALYSIS_ID=$(echo "$ANALYZE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['analysisId'])")
echo "ANALYSIS_ID=$ANALYSIS_ID"
>>>>>>> main
```

---

## 4. Quizzes (Architectural Comprehension)

```bash
QUIZ_JSON=$(curl -sS -X POST http://localhost:3727/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
<<<<<<< HEAD
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "analysisId": "c582a455-577a-4959-a240-e12e30b8f41f",
    "sessionId": "462cc224-ce15-403c-b28d-9f291334cf40"
  }' | python3 -m json.tool
```

*(You can test `/api/evaluate` by grabbing a `questionId` and the `correctIndex` from the JSON output of the above command)*

```bash
curl -s -X POST http://localhost:3727/api/evaluate \
=======
    "code": "async function fetchUser(userId) {\n  try {\n    const res = await fetch(`/api/users/${userId}`);\n    if (!res.ok) throw new Error(\"Not found\");\n    return await res.json();\n  } catch (err) {\n    return { id: userId, isGuest: true };\n  }\n}",
    "analysisId": "'"$ANALYSIS_ID"'",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$QUIZ_JSON" | python3 -m json.tool
QUESTION_ID=$(echo "$QUIZ_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['questions'][0]['questionId'])")
echo "QUESTION_ID=$QUESTION_ID"

curl -sS -X POST http://localhost:3727/api/evaluate \
>>>>>>> main
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "scope": "quiz",
    "quizAnswer": {
<<<<<<< HEAD
      "questionId": "YOUR_QUESTION_ID",
      "selectedIndex": 2,
      "correctIndex": 2
=======
      "questionId": "'"$QUESTION_ID"'",
      "selectedIndex": 2
>>>>>>> main
    }
  }' | python3 -m json.tool
```

---

## 5. Blank Gating (Pattern Implementation)

<<<<<<< HEAD
**Generate blanks:**
=======
>>>>>>> main
```bash
BLANK_JSON=$(curl -sS -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript"
  }')

<<<<<<< HEAD
*(You can test `/api/blank/evaluate` by plugging in the exact start and end lines of one of the blanks returned above)*

```bash
curl -s -X POST http://localhost:3727/api/blank/evaluate \
=======
echo "$BLANK_JSON" | python3 -m json.tool

curl -sS -X POST http://localhost:3727/api/blank/evaluate \
>>>>>>> main
  -H "Content-Type: application/json" \
  -d '{
    "blankId": "test-1",
    "originalCode": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "startLine": 18,
    "endLine": 21,
    "expectedPattern": "stale-while-revalidate fallback that returns expired cache data if the network request fails",
    "userExplanation": "If the network fetch fails completely (like rate limited or offline), it checks if we have any data in the cache at all. Even if its expired, it logs a warning and returns the stale cache data instead of completely crashing the request."
  }' | python3 -m json.tool
```

---

## 6. Sabotage (Spot the Bug)

<<<<<<< HEAD
**Inject a bug into the cache logic:**
=======
>>>>>>> main
```bash
SABOTAGE_JSON=$(curl -sS -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript"
  }')

echo "$SABOTAGE_JSON" | python3 -m json.tool

<<<<<<< HEAD
**Evaluate your fix:**
=======
BUG_ID=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['bugId'])")
BUG_TYPE=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['bugType'])")
ORIGINAL_LINE=$(echo "$SABOTAGE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['originalLine'])")
>>>>>>> main

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
  -d '{
    "bugId": "THE_BUG_ID_FROM_ABOVE",
    "originalCode": "THE_LONG_CODE_STRING",
    "sabotagedCode": "THE_SABOTAGED_CODE_FROM_ABOVE",
    "originalLine": 999,
    "originalContent": "ORIGINAL",
    "sabotagedContent": "SABOTAGED",
    "bugType": "THE_BUG_TYPE_FROM_ABOVE",
    "fixedCode": "THE_LONG_CODE_STRING"
  }' | python3 -m json.tool
  -d "$SABOTAGE_FIX_JSON" | python3 -m json.tool
```

---

## 7. Mentor (Conceptual Hints)

The mentor endpoint returns **conceptual guidance only — never code**. It provides escalating hints, Socratic guiding questions, and encouragement.

**Get hints for a code snippet:**
```bash
MENTOR_JSON=$(curl -sS -X POST http://localhost:3727/api/mentor/hint \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "question": "I dont understand how the caching logic works or when stale data gets served",
    "attemptNumber": 1
  }')

echo "$MENTOR_JSON" | python3 -m json.tool
```

**Expected response shape:**
- `hints` — 3 items with levels 1 (nudge), 2 (guide), 3 (near-explain). **None should contain code.**
- `guidingQuestions` — Socratic questions like *"What happens when the cache entry exists but is expired?"*
- `encouragement` — a brief motivational message

**Follow-up with escalation (pass previous hints):**
```bash
# Extract the first hint text for escalation
PREV_HINT=$(echo "$MENTOR_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['hints'][0]['hint'])")

curl -sS -X POST http://localhost:3727/api/mentor/hint \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "question": "I still dont get why stale data is returned instead of an error",
    "previousHints": ["'"$PREV_HINT"'"],
    "attemptNumber": 2
  }' | python3 -m json.tool
```

> **Verify:** Hints in the second request should be slightly more direct (since `attemptNumber` is 2 and `previousHints` is populated) but still **never contain code**.
