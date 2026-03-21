import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';
import { BridgeSidebarProvider } from '../ui/sidebarProvider';
import { logger } from '@bridge/shared-utils';

/**
 * Register all Bridge commands.
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  sidebarProvider: BridgeSidebarProvider,
) {
  // ─── Start Session ────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.startSession', async () => {
      try {
        await sessionManager.createSession();
        vscode.window.showInformationMessage('Bridge session started!');
        sidebarProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to start session: ${err}`);
      }
    }),
  );

  // ─── Submit Answer ────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.submitAnswer', async () => {
      const answer = await vscode.window.showInputBox({
        prompt: 'Explain the code in your own words',
        placeHolder: 'Type your explanation...',
      });

      if (answer) {
        try {
          const result = await sessionManager.submitAnswer(answer);
          if (result.passed) {
            vscode.window.showInformationMessage(`✅ ${result.feedback}`);
          } else {
            vscode.window.showWarningMessage(`❌ ${result.feedback}`);
          }
          sidebarProvider.refresh();
        } catch (err) {
          vscode.window.showErrorMessage(`Evaluation failed: ${err}`);
        }
      }
    }),
  );

  // ─── Analyze Current File ────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active file to analyze.');
        return;
      }

      const code = editor.document.getText();
      const filePath = editor.document.uri.fsPath;
      const language = editor.document.languageId;

      try {
        await sessionManager.analyzeCode(code, filePath, language);
        vscode.window.showInformationMessage('Code analyzed! Check Bridge panel for gates.');
        sidebarProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(`Analysis failed: ${err}`);
      }
    }),
  );

  // ─── Show Status ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.showStatus', () => {
      const state = sessionManager.getState();
      if (!state) {
        vscode.window.showInformationMessage('No active Bridge session.');
        return;
      }

      const locked = state.isLocked ? '🔒 LOCKED' : '🔓 Unlocked';
      const gates = state.pendingGates.length;
      const approvals = state.approvals.length;

      vscode.window.showInformationMessage(
        `Bridge: ${locked} | ${gates} pending gate(s) | ${approvals} approval(s)`,
      );
    }),
  );
}
