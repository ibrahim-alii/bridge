#!/bin/bash
set -e
SESSION_JSON=$(curl -s -X POST http://localhost:3727/api/session -H "Content-Type: application/json" -d '{}')
SESSION_ID=$(echo "$SESSION_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")
echo "SESSION_ID: $SESSION_ID"

CODE='const cache = new Map();\nasync function fetchWithCache(url, opts = {}) {\n  const key = url + JSON.stringify(opts.body || {});\n  const ttl = opts.ttl || 60000;\n  if (cache.has(key) && Date.now() - cache.get(key).ts < ttl) return cache.get(key).data;\n  const res = await fetch(url, opts);\n  if (!res.ok) throw new Error(\"HTTP \" + res.status);\n  const data = await res.json();\n  cache.set(key, { ts: Date.now(), data });\n  return data;\n}'

ANALYZE_JSON=$(curl -s -X POST http://localhost:3727/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"language\":\"javascript\",\"sessionId\":\"$SESSION_ID\"}")
ANALYSIS_ID=$(echo "$ANALYZE_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('analysisId', 'ERROR'))")
echo "ANALYSIS_ID: $ANALYSIS_ID"
echo "ANALYZE_JSON: $ANALYZE_JSON"

if [ "$ANALYSIS_ID" != "ERROR" ] && [ -n "$ANALYSIS_ID" ]; then
  QUIZ_JSON=$(curl -s -X POST http://localhost:3727/api/quiz \
    -H "Content-Type: application/json" \
    -d "{\"code\":\"$CODE\",\"analysisId\":\"$ANALYSIS_ID\",\"sessionId\":\"$SESSION_ID\"}")
  QUESTION_ID=$(echo "$QUIZ_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('questions', [{}])[0].get('questionId', 'ERROR'))")
  echo "QUESTION_ID: $QUESTION_ID"
  echo "QUIZ_JSON: $QUIZ_JSON"

  if [ "$QUESTION_ID" != "ERROR" ]; then
    EVAL_JSON=$(curl -s -X POST http://localhost:3727/api/evaluate \
      -H "Content-Type: application/json" \
      -d "{\"sessionId\":\"$SESSION_ID\",\"scope\":\"quiz\",\"quizAnswer\":{\"questionId\":\"$QUESTION_ID\",\"selectedIndex\":2}}")
    echo "EVAL_JSON: $EVAL_JSON"
  fi
fi

BLANK_JSON=$(curl -s -X POST http://localhost:3727/api/blank \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"language\":\"javascript\",\"sessionId\":\"$SESSION_ID\"}")
echo "BLANK_JSON: $BLANK_JSON"

SABOTAGE_JSON=$(curl -s -X POST http://localhost:3727/api/sabotage \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"language\":\"javascript\",\"sessionId\":\"$SESSION_ID\"}")
echo "SABOTAGE_JSON: $SABOTAGE_JSON"

MENTOR_JSON=$(curl -s -X POST http://localhost:3727/api/mentor/hint \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"$CODE\",\"question\":\"How does the caching work and when does stale data get served?\",\"attemptNumber\":1,\"sessionId\":\"$SESSION_ID\"}")
echo "MENTOR_JSON: $MENTOR_JSON"
