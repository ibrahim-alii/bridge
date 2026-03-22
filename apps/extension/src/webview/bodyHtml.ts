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

  const gateSection = renderGateSection(gate, state);
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

function renderGateSection(gate: SessionState['activeGate'], state: SessionState | null): string {
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
    case 'blank': {
      // Get gated block information from state
      let blockContext = '';
      if (state && state.pendingGates.length > 0) {
        const currentGate = state.pendingGates[0];
        const metadata = currentGate.metadata;

        if (metadata && metadata.gatedBlocks && metadata.gatedBlocks.length > 0) {
          const currentIndex = metadata.currentBlockIndex ?? 0;
          const totalBlocks = metadata.gatedBlocks.length;
          const currentBlock = metadata.gatedBlocks[currentIndex];

          if (currentBlock) {
            blockContext = `
              <div class="block-context" style="margin-bottom: 12px; padding: 8px; background: var(--vscode-inputValidation-infoBackground); border-left: 3px solid var(--vscode-inputValidation-infoBorder);">
                <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px;">
                  Block ${currentIndex + 1} of ${totalBlocks}
                </div>
                <div style="font-size: 11px; margin-bottom: 4px;">
                  <strong>Lines ${currentBlock.startLine}-${currentBlock.endLine}</strong>
                </div>
                <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                  ${esc(currentBlock.reason)}
                </div>
              </div>
            `;
          }
        }
      }

      return `
        <div class="card">
          <span class="placeholder-tag">Gate · ${esc(gate)}</span>
          <div class="gate-label">${esc(title)}</div>
          ${blockContext}
          <p>Explain what this code does and the core logic behind it.</p>
          <textarea id="input-answer" placeholder="Describe what this code block does and why it's designed this way."></textarea>
          <button type="button" id="btn-submit">Submit</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    }
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
