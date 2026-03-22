# Bridge API Testing Guide

This guide contains terminal commands to test the backend API end to end.

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

## 3. Analyze Code

This endpoint decides which blocks should be gated and what type of gate to use.

```bash
ANALYZE_JSON=$(curl -sS -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$ANALYZE_JSON" | python3 -m json.tool
ANALYSIS_ID=$(echo "$ANALYZE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['analysisId'])")
echo "ANALYSIS_ID=$ANALYSIS_ID"
```

---

## 4. Quiz Flow

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
      "selectedIndex": 0
    }
  }' | python3 -m json.tool
```

---

## 5. Blank Flow

```bash
BLANK_JSON=$(curl -sS -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$BLANK_JSON" | python3 -m json.tool

curl -sS -X POST http://localhost:3727/api/blank/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "blankId": "test-1",
    "originalCode": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "startLine": 18,
    "endLine": 21,
    "expectedPattern": "stale-while-revalidate fallback that returns expired cache data if the network request fails",
    "userExplanation": "If the fetch fails, the code checks whether any cached data exists and serves it as a stale fallback instead of failing immediately."
  }' | python3 -m json.tool
```

---

## 6. Sabotage Flow

```bash
SABOTAGE_JSON=$(curl -sS -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript",
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$SABOTAGE_JSON" | python3 -m json.tool

SABOTAGE_FIX_JSON=$(python3 - <<'PY' "$SABOTAGE_JSON"
import sys, json
s = json.loads(sys.argv[1])
payload = {
  "sessionId": sys.argv[2] if len(sys.argv) > 2 else None,
  "bugId": s["bugId"],
  "originalCode": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
  "sabotagedCode": s["sabotagedCode"],
  "originalLine": s["originalLine"],
  "originalContent": s["originalContent"],
  "sabotagedContent": s["sabotagedContent"],
  "bugType": s["bugType"],
  "fixedCode": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
}
print(json.dumps(payload))
PY
)

curl -sS -X POST http://localhost:3727/api/sabotage/fix \
  -H "Content-Type: application/json" \
  -d "$SABOTAGE_FIX_JSON" | python3 -m json.tool
```

---

## 7. Mentor Hints

```bash
MENTOR_JSON=$(curl -sS -X POST http://localhost:3727/api/mentor/hint \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "question": "I do not understand when stale data gets returned",
    "attemptNumber": 1,
    "sessionId": "'"$SESSION_ID"'"
  }')

echo "$MENTOR_JSON" | python3 -m json.tool
```

Verify that the response contains:
- `hints` with 3 escalating levels
- `guidingQuestions`
- `encouragement`
- no raw solution code

---

## 8. Study Recommendation

```bash
curl -sS -X POST http://localhost:3727/api/study/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map(); function getCached(key) { return cache.get(key); }",
    "language": "javascript",
    "sessionId": "'"$SESSION_ID"'"
  }' | python3 -m json.tool
```

---

## 9. Commit Review

```bash
curl -sS -X POST http://localhost:3727/api/commit/review \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "diff": "@@ -1,3 +1,7 @@\n- return fetch(url)\n+ const cached = cache.get(url)\n+ if (cached) return cached\n+ const response = await fetch(url)\n+ return response",
    "explanation": "This change reuses cached results first, then falls back to a real fetch when no cached value exists."
  }' | python3 -m json.tool
```
