import type { SessionState } from '@bridge/contracts';

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
      return 'Implementation Gating';
    case 'quiz':
      return 'Architectural Why Quiz';
    case 'bug':
      return 'Spot the Bug Sabotage';
    case 'commit':
      return 'Commit Comprehension';
    default:
      return 'Challenge';
  }
}

// ─── SVG Icons ───────────────────────────────────────────────────────
const ICONS = {
  send: `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`,
  bulb: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`,
  learn: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"/></svg>`,
  chat: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,
  settings: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  logo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="logo-svg"><path d="M2 14h20"/><path d="M6 5v14"/><path d="M18 5v14"/><path d="M2 11l4-6 Q12 16 18 5l4 6"/><path d="M9 14v-4"/><path d="M12 14v-3"/><path d="M15 14v-4"/></svg>`
};

export function renderSidebarBody(state: SessionState | null, activeTab: string = 'LEARN'): string {
  const bottomNav = `
    <nav class="bottom-nav">
      <div class="nav-item ${activeTab === 'LEARN' ? 'active' : ''}" data-tab="LEARN">
        ${ICONS.learn}
        <span>LEARN</span>
      </div>
      <div class="nav-item ${activeTab === 'CHAT' ? 'active' : ''}" data-tab="CHAT">
        ${ICONS.chat}
        <span>CHAT</span>
      </div>
      <div class="nav-item ${activeTab === 'SETTINGS' ? 'active' : ''}" data-tab="SETTINGS">
        ${ICONS.settings}
        <span>SETTINGS</span>
      </div>
    </nav>
  `;

  if (!state) {
    return `
      <div class="content-pad">
        <div class="header" style="border-radius: 8px; margin-bottom: 20px;">
          <div class="logo-text">${ICONS.logo}BRIDGE</div>
        </div>
        <div class="card card-dark">
          <p>No active session.</p>
          <button type="button" id="btn-start">Start session</button>
        </div>
      </div>
      ${bottomNav}
    `;
  }

  const locked = state.isLocked;
  const gate = state.activeGate;

  const header = `
    <div class="header">
      <div class="logo-text">${ICONS.logo}BRIDGE</div>
      <span class="status-badge ${locked ? 'status-locked' : 'status-unlocked'}">
        ${locked ? 'CLAUDE: LOCKED' : 'READY'}
      </span>
    </div>
  `;

  const learnContent = !locked
    ? `
      <div class="card card-dark">
        <div class="gate-title">No active gates</div>
        <p>Run <strong>Bridge: Analyze Current File</strong> when the backend is connected.</p>
      </div>
    `
    : renderGateSection(state);
  const chatContent = renderMentorSection(state);

  return `
    ${header}
    <div class="content-pad">
      <section data-panel="LEARN" class="${activeTab === 'LEARN' ? '' : 'hidden'}">
        ${learnContent}
      </section>
      <section data-panel="CHAT" class="${activeTab === 'CHAT' ? '' : 'hidden'}">
        ${chatContent}
      </section>
      <section data-panel="SETTINGS" class="${activeTab === 'SETTINGS' ? '' : 'hidden'}">
        <div class="card card-dark"><p>Settings coming soon.</p></div>
      </section>
    </div>
    ${bottomNav}
  `;
}

function renderMentorSection(state: SessionState): string {
  const attempts = state.currentAttempts;
  const gate = state.activeGate;
  const workflowCopy =
    gate && attempts === 0
      ? 'Try the gate once first. After a miss, use the Socratic Mentor for nudges. After repeated misses, use Resource Router for outside material.'
      : gate && attempts === 1
        ? 'This is the right moment for Socratic hints: stay in the problem, but get unstuck.'
        : gate && attempts >= 2
          ? 'You have hints and Resource Router available now. Use the router for docs, blogs, videos, repos, papers, and other live web sources.'
          : 'Use Mentor for conceptual nudges and Resource Router for outside references while you work.';

  return `
    <div class="mentor-header">
      ${ICONS.bulb} SOCRATIC MENTOR
    </div>

    <div id="mentor-thread" class="mentor-thread">
      <div class="mentor-box mentor-box-assistant">${esc(workflowCopy)}</div>
    </div>
    <div id="mentor-out" class="mentor-box mentor-box-assistant hidden"></div>
    <div id="study-out" class="mentor-box mentor-box-resource hidden" style="margin-top: 12px;"></div>

    <div class="chat-input-wrapper">
      <textarea id="mentor-input-answer" placeholder="Ask about architecture..."></textarea>
      <button type="button" class="chat-submit-icon" id="btn-mentor" title="Send Contextual Question">${ICONS.send}</button>
    </div>
    <button type="button" id="btn-study" style="margin-top: 12px;">Open Resource Router</button>
    <p style="font-size: 10px; color: var(--br-text-muted); margin-top: 8px; text-align: center;">${esc(workflowCopy)}</p>
  `;
}

function renderGateSection(state: SessionState): string {
  const gate = state.activeGate;
  if (!gate) return '';

  const title = gateTitle(gate);
  const metadata = state.pendingGates[0]?.metadata;

  switch (gate) {
    case 'blank':
      {
        const blank = metadata?.blanks?.[0];
        const blankHint = blank?.hint ?? 'Explain what the hidden logic is responsible for.';
        const blankRange = blank ? `Lines ${blank.startLine}-${blank.endLine}` : 'Current gated block';

      return `
        <div class="gate-title">${esc(title)}</div>
        <div class="card">
          <p>${esc(blankHint)}</p>
          <div class="card card-dark" style="margin-bottom: 16px; position:relative;">
            <div style="font-size:10px; color: var(--br-text-muted); margin-bottom: 8px; font-weight:700;">${esc(blankRange)}</div>
            <div class="code-block" style="border-left: 2px solid var(--br-primary); margin: 0; padding-left: 12px; font-size: 13px;">
              Explain what this hidden block does and why it matters before the file can unlock.
            </div>
          </div>

          <div style="font-size:10px; color: var(--br-text-muted); text-transform:uppercase; font-weight:700; margin-bottom: 8px;">EXPLANATION REQUIRED</div>
          <textarea id="input-answer" placeholder="Type your explanation..." style="margin-bottom: 12px;"></textarea>
          <button type="button" id="btn-submit">Submit Explanation &nbsp; <span style="font-size: 15px;">➤</span></button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
      }
    case 'quiz': {
      const q = metadata?.questions?.[0];
      if (!q) {
        return `
          <div class="gate-title">${esc(title)}</div>
          <div class="card">
            <p>Quiz metadata is missing. Re-run analysis to regenerate this gate.</p>
          </div>
        `;
      }
      const questionId = q.questionId;
      const opts = (q.options || [])
        .map(
          (opt: string, i: number) => `
          <label class="option" data-index="${i}">
            <div class="custom-radio"></div>
            <input type="radio" name="quiz-opt" value="${i}" />
            <span>${esc(opt)}</span>
          </label>
        `
        )
        .join('');
      return `
        <div class="gate-title">${esc(title)}</div>
        
        <div class="card" data-question-id="${questionId}">
          <p style="font-size: 15px; font-weight: 500; margin-bottom: 16px;">${esc(q.question)}</p>
          <div id="quiz-options" style="margin-bottom: 16px;">${opts}</div>
          <button type="button" id="btn-submit-quiz" disabled>Submit Answer</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
    }
    case 'bug':
      {
        const sabotage = metadata?.sabotage;
        const originalContent = sabotage?.originalContent || 'Original line unavailable';
        const sabotagedContent = sabotage?.sabotagedContent || 'Sabotaged line unavailable';
        const bugType = sabotage?.bugType || 'logic';

      return `
        <div class="gate-title">${esc(title)}</div>
        
        <div class="card">
          <div class="badge-inserted">${ICONS.bulb} Bug injected: ${esc(bugType)}</div>
          <p>Bridge replaced one line in the editor. Fix the file, then enter the changed line and explain why it was wrong.</p>
          <div class="code-block" style="margin-bottom: 12px;">
            <span style="color:#ef4444">- ${esc(originalContent)}</span>\n<span style="color:#a6e22e">+ ${esc(sabotagedContent)}</span>
          </div>
          
          <input type="number" id="input-line" min="1" placeholder="Line number (e.g. 42)" style="margin-bottom: 8px;" />
          <textarea id="input-answer" placeholder="What is wrong and why?" style="margin-bottom: 12px;"></textarea>
          
          <button type="button" id="btn-submit-bug">Check My Fix 🚀</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
        
        <div class="card card-warning" style="margin-top: 16px;">
           <div class="warning-title">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             Heads up, Dev
           </div>
           <p class="warning-text">Memory leaks are common when loop boundaries exceed allocated buffer space.</p>
        </div>
      `;
      }
    case 'commit':
      {
        const diffSummary = metadata?.diffContext?.summary || 'No diff context available. Use Bridge: Commit And Verify to create a real commit gate.';
      return `
        <div class="gate-title">${esc(title)}</div>
        <div class="card">
          <p>Explain the selected diff in plain English.</p>
          <div class="code-block" style="border-left: 2px solid var(--br-text-muted);">
            ${esc(diffSummary)}
          </div>
          <textarea id="input-answer" placeholder="What does this change do, and why is it safe?" style="margin-bottom: 12px;"></textarea>
          <button type="button" id="btn-submit">Submit Explanation</button>
          <div id="feedback" class="feedback" style="display:none"></div>
        </div>
      `;
      }
    default:
      return '';
  }
}
