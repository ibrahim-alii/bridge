import type { SessionState } from '@bridge/contracts';
import { PLACEHOLDER_QUIZ } from './placeholderQuiz';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function gateTitle(gate: string): string {
  switch (gate) {
    case 'blank':
      return 'Implementation blank';
    case 'quiz':
      return 'Architectural quiz';
    case 'bug':
      return 'Spot the bug';
    case 'commit':
      return 'Commit comprehension';
    default:
      return 'Gate';
  }
}

export function renderSidebarBody(state: SessionState | null): string {
  if (!state) {
    return `
      <div class="no-session">
        <h2>Bridge</h2>
        <p>No active session.</p>
        <button type="button" id="btn-start">Start session</button>
      </div>
    `;
  }

  const locked = state.isLocked;
  const gate = state.activeGate;

  const header = `
    <div class="header">
      <div class="row">
        <h2>Bridge</h2>
        <span class="status-badge ${locked ? 'status-locked' : 'status-unlocked'}">
          ${locked ? 'Locked' : 'Ready'}
        </span>
      </div>
    </div>
  `;

  if (!locked) {
    return `
      ${header}
      <div class="card">
        <span class="placeholder-tag">Status</span>
        <div class="gate-title">No active gates</div>
        <p>Run <strong>Bridge: Analyze Current File</strong> when the backend is connected, or use the UI preview below.</p>
      </div>
      <div class="stats">${state.approvals.length} approval(s) this session</div>
    `;
  }

  const gateSection = renderGateSection(gate);
  const mentor = `
    <div class="card card-muted">
      <span class="placeholder-tag">Mentor (hint-only)</span>
      <h3>Socratic guidance</h3>
      <p>Hints are conceptual — never full solutions. Responses are forwarded from the backend when available.</p>
      <button type="button" class="secondary" id="btn-mentor">Request a hint</button>
      <div id="mentor-out" class="mentor-box" hidden></div>
    </div>
  `;

  return `
    ${header}
    ${gateSection}
    ${mentor}
    <div class="stats">
      ${state.approvals.length} approval(s) · attempt ${state.currentAttempts + 1} of ${state.maxAttempts}
    </div>
  `;
}

function renderGateSection(gate: SessionState['activeGate']): string {
  if (!gate) {
    return `
      <div class="card">
        <div class="gate-title">Locked</div>
        <p>Waiting for gate scope from the session.</p>
      </div>
    `;
  }

  const title = gateTitle(gate);

  switch (gate) {
    case 'blank':
      return `
        <div class="card">
          <span class="placeholder-tag">Gate · ${esc(gate)}</span>
          <div class="gate-label">${esc(title)}</div>
          <p>Explain the missing logic in plain language (no code required for this preview).</p>
          <textarea id="input-answer" placeholder="Describe what belongs in the blank and why it fits the design."></textarea>
          <button type="button" id="btn-submit">Submit</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    case 'quiz': {
      const q = PLACEHOLDER_QUIZ;
      const opts = q.options
        .map(
          (opt: string, i: number) => `
          <label class="option" data-index="${i}">
            <input type="radio" name="quiz-opt" value="${i}" />
            <span>${esc(opt)}</span>
          </label>
        `,
        )
        .join('');
      return `
        <div class="card">
          <span class="placeholder-tag">Gate · quiz (placeholder question)</span>
          <div class="gate-label">${esc(title)}</div>
          <p><strong>${esc(q.question)}</strong></p>
          <div id="quiz-options">${opts}</div>
          <button type="button" id="btn-submit-quiz" disabled>Submit answer</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    }
    case 'bug':
      return `
        <div class="card">
          <span class="placeholder-tag">Gate · bug</span>
          <div class="gate-label">${esc(title)}</div>
          <p>One bug is present in the scaffold. Identify the line and describe the issue.</p>
          <input type="number" id="input-line" min="1" placeholder="Line number" />
          <textarea id="input-answer" placeholder="What is wrong and why?"></textarea>
          <button type="button" id="btn-submit-bug">Submit</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    case 'commit':
      return `
        <div class="card">
          <span class="placeholder-tag">Gate · commit</span>
          <div class="gate-label">${esc(title)}</div>
          <p>Explain the selected diff in plain English.</p>
          <div class="card card-muted" style="margin-bottom:8px;font-family:var(--vscode-editor-font-family);font-size:11px;max-height:96px;overflow:auto;">
            <span class="placeholder-tag">Diff preview</span>
            <pre style="margin:0;white-space:pre-wrap;">@@ placeholder @@\n+ const result = await fetch(url);\n- return result.json;</pre>
          </div>
          <textarea id="input-answer" placeholder="What does this change do, and why is it safe?"></textarea>
          <button type="button" id="btn-submit">Submit</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    default:
      return '';
  }
}
