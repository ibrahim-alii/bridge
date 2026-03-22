#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const apiRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.BRIDGE_TEST_BASE_URL ?? 'http://localhost:3727';

const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

const results = [];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
      shell: isWin,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function request(method, route, body, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const raw = await res.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timeout);
  }
}

function addResult(name, status, details = '') {
  results.push({ name, status, details });
}

function printStep(name, outcome) {
  log(`\n[${name}] ${outcome.status}`);
  if (outcome.details) log(outcome.details);
}

async function waitForHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const health = await request('GET', '/api/health');
      if (health.ok) return health;
    } catch {
      // keep waiting
    }
    await sleep(500);
  }
  throw new Error('API did not become healthy within 20s.');
}

async function main() {
  log('Building contracts and API...');
  await runCommand(pnpmCmd, ['--filter', '@bridge/contracts', 'build'], repoRoot);
  await runCommand(pnpmCmd, ['--filter', '@bridge/api', 'build'], repoRoot);

  log('Starting API server from dist...');
  const server = spawn('node', ['dist/index.js'], {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });

  let sessionId = null;
  let analysisId = null;
  let questionId = null;
  let blankPayload = null;
  let sabotagePayload = null;

  try {
    const health = await waitForHealth();
    addResult('health', health.ok ? 'PASS' : 'FAIL', JSON.stringify(health.data));
    printStep('health', results.at(-1));

    const session = await request('POST', '/api/session', {});
    if (session.ok && session.data?.sessionId) {
      sessionId = session.data.sessionId;
      addResult('session.create', 'PASS', `sessionId=${sessionId}`);
    } else {
      addResult(
        'session.create',
        'FAIL',
        `status=${session.status} body=${JSON.stringify(session.data)}`,
      );
    }
    printStep('session.create', results.at(-1));

    if (sessionId) {
      const analyze = await request('POST', '/api/analyze', {
        code: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        language: 'javascript',
        sessionId,
      });
      if (analyze.ok && analyze.data?.analysisId) {
        analysisId = analyze.data.analysisId;
        addResult('analyze', 'PASS', `analysisId=${analysisId}`);
      } else {
        addResult('analyze', 'FAIL', `status=${analyze.status} body=${JSON.stringify(analyze.data)}`);
      }
      printStep('analyze', results.at(-1));
    } else {
      addResult('analyze', 'SKIP', 'No sessionId from previous step');
      printStep('analyze', results.at(-1));
    }

    if (sessionId && analysisId) {
      const quiz = await request('POST', '/api/quiz', {
        code: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        analysisId,
        sessionId,
      });
      if (quiz.ok && Array.isArray(quiz.data?.questions) && quiz.data.questions.length > 0) {
        questionId = quiz.data.questions[0].questionId;
        addResult('quiz.generate', 'PASS', `questionId=${questionId}`);
      } else {
        addResult(
          'quiz.generate',
          'FAIL',
          `status=${quiz.status} body=${JSON.stringify(quiz.data)}`,
        );
      }
      printStep('quiz.generate', results.at(-1));
    } else {
      addResult('quiz.generate', 'SKIP', 'Missing sessionId or analysisId');
      printStep('quiz.generate', results.at(-1));
    }

    if (sessionId && questionId) {
      let evalPass = null;
      for (let i = 0; i < 4; i += 1) {
        const evalResp = await request('POST', '/api/evaluate', {
          sessionId,
          scope: 'quiz',
          quizAnswer: { questionId, selectedIndex: i },
        });
        if (!evalResp.ok) {
          addResult(
            'quiz.evaluate',
            'FAIL',
            `status=${evalResp.status} body=${JSON.stringify(evalResp.data)}`,
          );
          evalPass = false;
          break;
        }
        if (evalResp.data?.passed === true) {
          addResult('quiz.evaluate', 'PASS', `passed with selectedIndex=${i}`);
          evalPass = true;
          break;
        }
      }
      if (evalPass === null) {
        addResult('quiz.evaluate', 'FAIL', 'No answer index 0-3 passed');
      }
      printStep('quiz.evaluate', results.at(-1));
    } else {
      addResult('quiz.evaluate', 'SKIP', 'Missing sessionId or questionId');
      printStep('quiz.evaluate', results.at(-1));
    }

    const blank = await request('POST', '/api/blank', {
      code: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
      language: 'javascript',
    });
    if (blank.ok && Array.isArray(blank.data?.blanks) && blank.data.blanks.length > 0) {
      blankPayload = blank.data.blanks[0];
      addResult(
        'blank.generate',
        'PASS',
        `startLine=${blankPayload.startLine}, endLine=${blankPayload.endLine}`,
      );
    } else {
      addResult('blank.generate', 'FAIL', `status=${blank.status} body=${JSON.stringify(blank.data)}`);
    }
    printStep('blank.generate', results.at(-1));

    if (blankPayload) {
      const blankEval = await request('POST', '/api/blank/evaluate', {
        blankId: 'test-1',
        originalCode:
          'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        startLine: blankPayload.startLine,
        endLine: blankPayload.endLine,
        expectedPattern:
          blankPayload.expectedPattern ??
          'a base case check and recursive call combining the two previous fibonacci numbers',
        userExplanation:
          'It checks if n is 0 or 1 and returns n directly, otherwise it adds the results of calling itself with n-1 and n-2.',
      });
      if (blankEval.ok) {
        addResult('blank.evaluate', 'PASS', JSON.stringify(blankEval.data));
      } else {
        addResult(
          'blank.evaluate',
          'FAIL',
          `status=${blankEval.status} body=${JSON.stringify(blankEval.data)}`,
        );
      }
      printStep('blank.evaluate', results.at(-1));
    } else {
      addResult('blank.evaluate', 'SKIP', 'No generated blank payload');
      printStep('blank.evaluate', results.at(-1));
    }

    const sabotage = await request('POST', '/api/sabotage', {
      code: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
      language: 'javascript',
    });
    if (sabotage.ok && sabotage.data?.bugId && sabotage.data?.sabotagedCode) {
      sabotagePayload = sabotage.data;
      addResult(
        'sabotage.inject',
        'PASS',
        `bugId=${sabotagePayload.bugId} bugType=${sabotagePayload.bugType}`,
      );
    } else {
      addResult(
        'sabotage.inject',
        'FAIL',
        `status=${sabotage.status} body=${JSON.stringify(sabotage.data)}`,
      );
    }
    printStep('sabotage.inject', results.at(-1));

    if (sabotagePayload) {
      const sabotageFix = await request('POST', '/api/sabotage/fix', {
        bugId: sabotagePayload.bugId,
        originalCode:
          'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
        sabotagedCode: sabotagePayload.sabotagedCode,
        originalLine: sabotagePayload.originalLine,
        originalContent: sabotagePayload.originalContent,
        sabotagedContent: sabotagePayload.sabotagedContent,
        bugType: sabotagePayload.bugType,
        fixedCode:
          'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}',
      });
      if (sabotageFix.ok && sabotageFix.data?.passed === true) {
        addResult('sabotage.fix', 'PASS', JSON.stringify(sabotageFix.data));
      } else {
        addResult(
          'sabotage.fix',
          'FAIL',
          `status=${sabotageFix.status} body=${JSON.stringify(sabotageFix.data)}`,
        );
      }
    } else {
      addResult('sabotage.fix', 'SKIP', 'No sabotage payload from previous step');
    }
    printStep('sabotage.fix', results.at(-1));
  } finally {
    server.kill('SIGTERM');
  }

  log('\n=== Summary ===');
  for (const result of results) {
    log(`${result.status.padEnd(4)} ${result.name} ${result.details ? `- ${result.details}` : ''}`);
  }

  const failCount = results.filter((r) => r.status === 'FAIL').length;
  if (failCount > 0) {
    log(`\nTest run failed with ${failCount} failing step(s).`);
    process.exit(1);
  }
  log('\nAll steps passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
