/**
 * Sidebar webview script (string). No imports — runs inside the webview.
 */
export const CLIENT_SCRIPT = `
(function () {
  const vscode = acquireVsCodeApi();
  const webviewState = vscode.getState && vscode.getState();
  let activeTab = webviewState && webviewState.activeTab ? webviewState.activeTab : 'LEARN';

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

  function showActionError(message) {
    var fb = document.getElementById('feedback');
    if (fb) {
      showFeedback(fb, false, String(message || 'Bridge action failed.'));
    }

    var mentorOut = document.getElementById('mentor-out');
    if (mentorOut) {
      mentorOut.hidden = false;
      mentorOut.classList.remove('hidden');
      mentorOut.textContent = 'Bridge error: ' + String(message || 'Action failed.');
    }

    clearPendingMentorMessage('Bridge error: ' + String(message || 'Action failed.'));
    setButtonBusy(document.getElementById('btn-submit'), false);
    setButtonBusy(document.getElementById('btn-submit-quiz'), false);
    setButtonBusy(document.getElementById('btn-submit-bug'), false);
    setButtonBusy(document.getElementById('btn-mentor'), false);
    setButtonBusy(document.getElementById('btn-study'), false);
  }

  function setActiveTab(tab) {
    activeTab = tab || 'LEARN';
    document.querySelectorAll('.nav-item').forEach(function (node) {
      var nodeTab = node.getAttribute('data-tab');
      node.classList.toggle('active', nodeTab === activeTab);
    });
    document.querySelectorAll('[data-panel]').forEach(function (panel) {
      var panelName = panel.getAttribute('data-panel');
      panel.classList.toggle('hidden', panelName !== activeTab);
    });
    if (vscode.setState) {
      vscode.setState({ activeTab: activeTab });
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

  function findActionTarget(target, selector) {
    if (target instanceof Element) {
      return target.closest(selector);
    }
    if (target && target.parentElement instanceof Element) {
      return target.parentElement.closest(selector);
    }
    return null;
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setButtonBusy(button, busy, busyLabel) {
    if (!button) return;
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.innerHTML;
    }
    button.disabled = !!busy;
    button.innerHTML = busy ? escapeHtml(busyLabel || 'Working...') : button.dataset.originalLabel;
  }

  function getMentorThread() {
    return document.getElementById('mentor-thread');
  }

  function appendMentorBubble(role, text, pendingId) {
    var thread = getMentorThread();
    if (!thread) return null;
    var bubble = document.createElement('div');
    bubble.className = 'mentor-box ' + (role === 'user' ? 'mentor-box-user' : 'mentor-box-assistant');
    if (pendingId) {
      bubble.setAttribute('data-pending-id', pendingId);
    }
    bubble.textContent = text;
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  }

  function clearPendingMentorMessage(replacementText) {
    var thread = getMentorThread();
    if (!thread) return;
    var pending = thread.querySelector('[data-pending-id="mentor-response"]');
    if (!pending) return;
    pending.removeAttribute('data-pending-id');
    pending.classList.remove('mentor-box-loading');
    if (replacementText) {
      pending.textContent = replacementText;
    }
  }

  function renderMentorStepper(container, msg) {
    if (!container) return;

    var hints = Array.isArray(msg.hints) ? msg.hints : [];
    var questions = Array.isArray(msg.guidingQuestions) ? msg.guidingQuestions : [];
    var encouragement = msg.encouragement ? String(msg.encouragement) : '';

    if (hints.length === 0 && questions.length === 0 && !encouragement) {
      container.textContent = 'No mentor guidance returned.';
      return;
    }

    var pages = [];
    hints.forEach(function (hint, index) {
      pages.push({
        label: 'Hint ' + String(index + 1),
        title: 'L' + String(hint.level || index + 1),
        body: String(hint.hint || ''),
        meta: hint.focusArea ? 'Focus: ' + String(hint.focusArea) : '',
      });
    });
    questions.forEach(function (question, index) {
      pages.push({
        label: 'Question ' + String(index + 1),
        title: 'Q' + String(index + 1),
        body: String(question || ''),
        meta: 'Reflect before revealing the next step.',
      });
    });
    if (encouragement) {
      pages.push({
        label: 'Wrap-up',
        title: 'Keep Going',
        body: encouragement,
        meta: '',
      });
    }

    var currentIndex = 0;
    container.textContent = '';
    container.classList.add('mentor-stepper');

    var header = document.createElement('div');
    header.className = 'mentor-stepper-header';

    var badge = document.createElement('div');
    badge.className = 'mentor-stepper-badge';

    var count = document.createElement('div');
    count.className = 'mentor-stepper-count';

    header.appendChild(badge);
    header.appendChild(count);

    var card = document.createElement('div');
    card.className = 'mentor-stepper-card';

    var title = document.createElement('div');
    title.className = 'mentor-stepper-title';

    var body = document.createElement('div');
    body.className = 'mentor-stepper-body';

    var meta = document.createElement('div');
    meta.className = 'mentor-stepper-meta';

    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(meta);

    var controls = document.createElement('div');
    controls.className = 'mentor-stepper-controls';

    var prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'mentor-stepper-btn mentor-stepper-btn-secondary';
    prev.textContent = 'Previous';

    var next = document.createElement('button');
    next.type = 'button';
    next.className = 'mentor-stepper-btn';
    next.textContent = 'Next';

    controls.appendChild(prev);
    controls.appendChild(next);

    function renderPage(index) {
      var page = pages[index];
      badge.textContent = page.label;
      count.textContent = String(index + 1) + ' / ' + String(pages.length);
      title.textContent = page.title;
      body.textContent = page.body;
      meta.textContent = page.meta || '';
      meta.style.display = page.meta ? 'block' : 'none';
      prev.disabled = index === 0;
      next.disabled = index === pages.length - 1;
      next.textContent = index === pages.length - 1 ? 'Done' : 'Next';
    }

    prev.addEventListener('click', function () {
      if (currentIndex === 0) return;
      currentIndex -= 1;
      renderPage(currentIndex);
    });

    next.addEventListener('click', function () {
      if (currentIndex >= pages.length - 1) return;
      currentIndex += 1;
      renderPage(currentIndex);
    });

    container.appendChild(header);
    container.appendChild(card);
    if (pages.length > 1) {
      container.appendChild(controls);
    }

    renderPage(currentIndex);
  }

  function showMentorResponse(msg) {
    clearPendingMentorMessage('Mentor guidance is ready below.');
    var mentorOut = document.getElementById('mentor-out');
    if (mentorOut) {
      mentorOut.hidden = true;
      mentorOut.textContent = '';
      renderMentorStepper(mentorOut, msg);
      mentorOut.classList.remove('hidden');
      mentorOut.hidden = false;
    }
  }

  function showStudyLoading() {
    var study = document.getElementById('study-out');
    if (!study) return;
    study.hidden = false;
    study.classList.remove('hidden');
    study.textContent = 'Searching live sources...';
    study.classList.add('mentor-box-loading');
  }

  function showStudyResponse(msg) {
    var study = document.getElementById('study-out');
    if (!study) return;
    study.hidden = false;
    study.classList.remove('hidden');
    study.classList.remove('mentor-box-loading');
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
            ']\\n' +
            String(resource.url || '') +
            '\\n' +
            String(resource.relevance || '')
        );
      });
    }
    study.textContent = lines.join('\\n');
  }

  document.addEventListener('click', function (e) {
    const submitButton = findActionTarget(e.target, '#btn-submit');
    const quizSubmitButton = findActionTarget(e.target, '#btn-submit-quiz');
    const bugSubmitButton = findActionTarget(e.target, '#btn-submit-bug');
    const mentorButton = findActionTarget(e.target, '#btn-mentor');
    const studyButton = findActionTarget(e.target, '#btn-study');
    const startButton = findActionTarget(e.target, '#btn-start');
    const quizOption = findActionTarget(e.target, '.option');
    const navItem = findActionTarget(e.target, '.nav-item');

    if (navItem) {
      const tab = navItem.getAttribute('data-tab');
      if (tab) {
        setActiveTab(tab);
        vscode.postMessage({ type: 'switchTab', tab: tab });
      }
      return;
    }

    if (quizOption) {
      const input = quizOption.querySelector('input[name="quiz-opt"]');
      const submit = document.getElementById('btn-submit-quiz');
      document.querySelectorAll('.option').forEach(function (option) {
        option.classList.remove('selected');
      });
      quizOption.classList.add('selected');
      if (input) input.checked = true;
      if (submit) submit.disabled = false;
      return;
    }

    if (startButton) {
      vscode.postMessage({ type: 'startSession' });
      return;
    }
    if (mentorButton) {
      const ta = document.getElementById('mentor-input-answer');
      const question = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (!question) {
        showActionError('Type a question for the Socratic Mentor first.');
        return;
      }
      setActiveTab('CHAT');
      appendMentorBubble('user', question);
      appendMentorBubble('assistant', 'Thinking through your code context...', 'mentor-response');
      setButtonBusy(mentorButton, true, 'Sending...');
      if (ta && 'value' in ta) ta.value = '';
      vscode.postMessage({ type: 'requestMentorHint', question: question });
      return;
    }
    if (studyButton) {
      setActiveTab('CHAT');
      setButtonBusy(studyButton, true, 'Loading...');
      showStudyLoading();
      vscode.postMessage({ type: 'requestStudyRecommendation' });
      return;
    }
    if (submitButton) {
      const ta = document.getElementById('input-answer');
      const v = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (!v) {
        showActionError('Enter an explanation before submitting.');
        return;
      }
      setButtonBusy(submitButton, true, 'Submitting...');
      vscode.postMessage({ type: 'submitAnswer', answer: v });
      return;
    }
    if (quizSubmitButton) {
      const sel = document.querySelector('input[name="quiz-opt"]:checked');
      const idx = sel ? parseInt(sel.value, 10) : -1;
      const card = document.querySelector('.card[data-question-id]');
      const qId = card ? card.getAttribute('data-question-id') : '00000000-0000-4000-8000-000000000001';
      if (idx >= 0) {
        setButtonBusy(quizSubmitButton, true, 'Submitting...');
        vscode.postMessage({
          type: 'submitQuiz',
          questionId: qId,
          selectedIndex: idx,
        });
      }
      return;
    }
    if (bugSubmitButton) {
      const line = document.getElementById('input-line');
      const ta = document.getElementById('input-answer');
      const lineNum = line && 'value' in line ? parseInt(String(line.value), 10) : NaN;
      const expl = ta && 'value' in ta ? String(ta.value || '').trim() : '';
      if (!Number.isFinite(lineNum) || !expl) {
        showActionError('Enter the fixed line number and a short explanation first.');
        return;
      }
      setButtonBusy(bugSubmitButton, true, 'Checking...');
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
      setButtonBusy(document.getElementById('btn-submit'), false);
      setButtonBusy(document.getElementById('btn-submit-quiz'), false);
      setButtonBusy(document.getElementById('btn-submit-bug'), false);
    }
    if (msg.type === 'mentorHint') {
      setActiveTab('CHAT');
      setButtonBusy(document.getElementById('btn-mentor'), false);
      showMentorResponse(msg);
    }
    if (msg.type === 'studyRecommendation') {
      setActiveTab('CHAT');
      setButtonBusy(document.getElementById('btn-study'), false);
      showStudyResponse(msg);
    }
    if (msg.type === 'actionError') {
      showActionError(msg.message);
    }
    if (msg.type === 'stateUpdate') {
      setActiveTab(activeTab);
    }
  });

  wireQuizRadios();
  setActiveTab(activeTab);
  vscode.postMessage({ type: 'requestState' });
})();
`;
