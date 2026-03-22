/**
 * Sidebar webview script (string). No imports — runs inside the webview.
 */
export const CLIENT_SCRIPT = `
(function () {
  const vscode = acquireVsCodeApi();

  function showFeedback(el, ok, text, hint) {
    if (!el) return;
    el.style.display = 'block';
    el.className = 'feedback ' + (ok ? 'ok' : 'err');
    el.textContent = text;
    if (hint) {
      const h = document.createElement('div');
      h.className = 'hint';
      h.textContent = hint;
      el.appendChild(h);
    }
  }

  function wireQuizRadios() {
    const opts = document.querySelectorAll('.option');
    const submit = document.getElementById('btn-submit-quiz');
    opts.forEach(function (o) {
      o.addEventListener('click', function () {
        opts.forEach(function (x) { x.classList.remove('selected'); });
        o.classList.add('selected');
        const input = o.querySelector('input');
        if (input) input.checked = true;
        if (submit) submit.disabled = false;
      });
    });
  }

  document.addEventListener('click', function (e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.id === 'btn-start') {
      vscode.postMessage({ type: 'startSession' });
      return;
    }
    if (t.id === 'btn-mentor') {
      vscode.postMessage({ type: 'requestMentorHint' });
      return;
    }
    if (t.id === 'btn-submit') {
      const ta = document.getElementById('input-answer');
      const v = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (v) vscode.postMessage({ type: 'submitAnswer', answer: v });
      return;
    }
    if (t.id === 'btn-submit-quiz') {
      const sel = document.querySelector('input[name="quiz-opt"]:checked');
      const idx = sel ? parseInt(sel.value, 10) : -1;
      if (idx >= 0) {
        vscode.postMessage({
          type: 'submitQuiz',
          questionId: '00000000-0000-4000-8000-000000000001',
          selectedIndex: idx,
        });
      }
      return;
    }
    if (t.id === 'btn-submit-bug') {
      const line = document.getElementById('input-line');
      const ta = document.getElementById('input-answer');
      const lineNum = line && 'value' in line ? parseInt(String(line.value), 10) : NaN;
      const expl = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (!Number.isFinite(lineNum) || !expl) return;
      vscode.postMessage({
        type: 'submitBug',
        identifiedLine: lineNum,
        explanation: expl,
      });
    }
  });

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'evaluationResult') {
      var fb = document.getElementById('feedback');
      showFeedback(fb, msg.passed, msg.feedback || '', msg.hint);
    }
    if (msg.type === 'mentorHint') {
      var out = document.getElementById('mentor-out');
      if (out) {
        out.hidden = false;
        out.textContent = msg.hint || '';
      }
    }
  });

  wireQuizRadios();
  vscode.postMessage({ type: 'requestState' });
})();
`;
