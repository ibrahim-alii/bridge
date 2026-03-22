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

  function wireTabs() {
    const tabs = document.querySelectorAll('.nav-item');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        const tab = t.getAttribute('data-tab');
        if (tab) {
          vscode.postMessage({ type: 'switchTab', tab: tab });
        }
      });
    });
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
      const ta = document.getElementById('mentor-input-answer');
      const question = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (question) {
        vscode.postMessage({ type: 'requestMentorHint', question: question });
      }
      return;
    }
    if (t.id === 'btn-study') {
      vscode.postMessage({ type: 'requestStudyRecommendation' });
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
      const card = document.querySelector('.card[data-question-id]');
      const qId = card ? card.getAttribute('data-question-id') : '00000000-0000-4000-8000-000000000001';
      if (idx >= 0) {
        vscode.postMessage({
          type: 'submitQuiz',
          questionId: qId,
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
        out.textContent = '';
        var hints = Array.isArray(msg.hints) ? msg.hints : [];
        var questions = Array.isArray(msg.guidingQuestions) ? msg.guidingQuestions : [];
        var parts = [];
        hints.forEach(function (hint) {
          parts.push('L' + String(hint.level || '?') + ': ' + String(hint.hint || ''));
        });
        questions.forEach(function (question) {
          parts.push('Q: ' + String(question));
        });
        if (msg.encouragement) {
          parts.push(String(msg.encouragement));
        }
        out.textContent = parts.join('\n\n');
      }
    }
    if (msg.type === 'studyRecommendation') {
      var study = document.getElementById('study-out');
      if (study) {
        study.hidden = false;
        var resources = Array.isArray(msg.resources) ? msg.resources : [];
        var lines = [
          String(msg.topic || ''),
          '',
          String(msg.reason || ''),
          '',
          'Start here: ' + String(msg.recommendation || ''),
        ];
        if (resources.length > 0) {
          lines.push('');
          lines.push('Resources:');
          resources.forEach(function (resource, index) {
            lines.push(
              String(index + 1) +
                '. ' +
                String(resource.title || '') +
                ' [' +
                String(resource.sourceType || 'source') +
                ']\n' +
                String(resource.url || '') +
                '\n' +
                String(resource.relevance || '')
            );
          });
        }
        study.textContent = lines.join('\n');
      }
    }
  });

  wireQuizRadios();
  wireTabs();
  vscode.postMessage({ type: 'requestState' });
})();
`;
