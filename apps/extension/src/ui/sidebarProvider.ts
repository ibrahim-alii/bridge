import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';

/**
 * Webview provider for the Bridge sidebar panel.
 * Renders quiz, blank-fill, bug-find, and commit explanation UI.
 */
export class BridgeSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'bridge.sidebarView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sessionManager: SessionManager,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'submitAnswer': {
          const result = await this.sessionManager.submitAnswer(message.answer);
          webviewView.webview.postMessage({
            type: 'evaluationResult',
            ...result,
          });
          break;
        }
        case 'startSession': {
          await this.sessionManager.createSession();
          this.refresh();
          break;
        }
        case 'requestState': {
          const state = this.sessionManager.getState();
          webviewView.webview.postMessage({
            type: 'stateUpdate',
            state,
          });
          break;
        }
      }
    });
  }

  refresh(): void {
    if (this._view) {
      this._view.webview.html = this.getHtml();
    }
  }

  private getHtml(): string {
    const state = this.sessionManager.getState();
    const isLocked = state?.isLocked ?? false;
    const gate = state?.activeGate ?? 'none';
    const approvalCount = state?.approvals.length ?? 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bridge</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 16px;
      margin: 0;
    }
    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .header h2 {
      margin: 0;
      font-size: 16px;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .status-locked {
      background: var(--vscode-errorForeground);
      color: var(--vscode-editor-background);
    }
    .status-unlocked {
      background: var(--vscode-testing-iconPassed);
      color: var(--vscode-editor-background);
    }
    .gate-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .gate-card h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
    }
    .gate-card p {
      margin: 0 0 8px 0;
      font-size: 12px;
      opacity: 0.8;
    }
    textarea {
      width: 100%;
      min-height: 80px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      border-radius: 4px;
      padding: 8px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      resize: vertical;
      box-sizing: border-box;
    }
    button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 8px;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .stats {
      font-size: 11px;
      opacity: 0.7;
      margin-top: 16px;
    }
    .no-session {
      text-align: center;
      padding: 32px 16px;
    }
  </style>
</head>
<body>
  ${state ? this.getSessionHtml(isLocked, gate, approvalCount) : this.getNoSessionHtml()}

  <script>
    const vscode = acquireVsCodeApi();

    function submitAnswer() {
      const textarea = document.getElementById('answer-input');
      if (textarea && textarea.value.trim()) {
        vscode.postMessage({
          type: 'submitAnswer',
          answer: textarea.value.trim(),
        });
      }
    }

    function startSession() {
      vscode.postMessage({ type: 'startSession' });
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg.type === 'evaluationResult') {
        const result = document.getElementById('result');
        if (result) {
          result.innerHTML = msg.passed
            ? '<p style="color: var(--vscode-testing-iconPassed);">✅ ' + msg.feedback + '</p>'
            : '<p style="color: var(--vscode-errorForeground);">❌ ' + msg.feedback + '</p>';
        }
      }
    });
  </script>
</body>
</html>`;
  }

  private getSessionHtml(isLocked: boolean, gate: string, approvals: number): string {
    return `
      <div class="header">
        <h2>🌉 Bridge</h2>
        <span class="status-badge ${isLocked ? 'status-locked' : 'status-unlocked'}">
          ${isLocked ? '🔒 Locked' : '🔓 Ready'}
        </span>
      </div>

      ${
        isLocked
          ? `
        <div class="gate-card">
          <h3>Active Gate: ${gate.toUpperCase()}</h3>
          <p>Demonstrate your understanding to unlock this gate.</p>
          <textarea id="answer-input" placeholder="Explain the code in your own words..."></textarea>
          <button onclick="submitAnswer()">Submit Answer</button>
          <div id="result"></div>
        </div>
      `
          : `
        <div class="gate-card">
          <h3>No Active Gates</h3>
          <p>Use "Bridge: Analyze Current File" to analyze code and create comprehension gates.</p>
        </div>
      `
      }

      <div class="stats">
        ${approvals} approval(s) earned this session
      </div>
    `;
  }

  private getNoSessionHtml(): string {
    return `
      <div class="no-session">
        <h2>🌉 Bridge</h2>
        <p>No active session.</p>
        <button onclick="startSession()">Start Session</button>
      </div>
    `;
  }
}
