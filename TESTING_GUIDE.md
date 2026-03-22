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

This endpoint decides *which* blocks should be gated and what *type* of gate to use (quiz, blank, sabotage) on our complex caching function.

```bash
ANALYZE_JSON=$(curl -sS -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript",
    "sessionId": "462cc224-ce15-403c-b28d-9f291334cf40"
  }' | python3 -m json.tool
```

---

## 4. Quizzes (Architectural Comprehension)

```bash
QUIZ_JSON=$(curl -sS -X POST http://localhost:3727/api/quiz \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "analysisId": "c582a455-577a-4959-a240-e12e30b8f41f",
    "sessionId": "462cc224-ce15-403c-b28d-9f291334cf40"
  }' | python3 -m json.tool
```

*(You can test `/api/evaluate` by grabbing a `questionId` and the `correctIndex` from the JSON output of the above command)*

```bash
curl -s -X POST http://localhost:3727/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'"$SESSION_ID"'",
    "scope": "quiz",
    "quizAnswer": {
      "questionId": "YOUR_QUESTION_ID",
      "selectedIndex": 2,
      "correctIndex": 2
    }
  }' | python3 -m json.tool
```

---

## 5. Blank Gating (Pattern Implementation)

**Generate blanks:**
```bash
BLANK_JSON=$(curl -sS -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript"
  }')

*(You can test `/api/blank/evaluate` by plugging in the exact start and end lines of one of the blanks returned above)*

```bash
curl -s -X POST http://localhost:3727/api/blank/evaluate \
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

**Inject a bug into the cache logic:**
```bash
SABOTAGE_JSON=$(curl -sS -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d '{
    "code": "const cache = new Map();\n\nasync function fetchWithCache(url, options = {}) {\n  const cacheKey = url + JSON.stringify(options.body || {});\n  const ttl = options.ttl || 60000;\n\n  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < ttl) {\n    return cache.get(cacheKey).data;\n  }\n\n  try {\n    const response = await fetch(url, options);\n    if (response.status === 429) throw new Error(\"Rate limited\");\n    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);\n\n    const result = await response.json();\n    cache.set(cacheKey, { timestamp: Date.now(), data: result });\n    return result;\n  } catch (error) {\n    if (cache.has(cacheKey)) {\n      console.warn(\"Serving stale data due to fetch error:\", error.message);\n      return cache.get(cacheKey).data;\n    }\n    throw error;\n  }\n}",
    "language": "javascript"
  }')

echo "$SABOTAGE_JSON" | python3 -m json.tool

**Evaluate your fix:**

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
```
