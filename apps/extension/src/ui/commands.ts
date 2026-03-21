import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';
import { BridgeSidebarProvider } from './sidebarProvider';
import { BridgeStatusBar } from './statusBar';
import { logger } from '@bridge/shared-utils';

/**
 * Command registration for the Bridge extension (owned by the UI layer).
 */
export function registerCommands(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
  sidebarProvider: BridgeSidebarProvider,
  statusBar: BridgeStatusBar,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.startSession', async () => {
      try {
        await sessionManager.createSession();
        vscode.window.showInformationMessage('Bridge session started.');
      } catch (err) {
        vscode.window.showErrorMessage(`Failed to start session: ${err}`);
      }
    }),
  );

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
            vscode.window.showInformationMessage(result.feedback);
          } else {
            vscode.window.showWarningMessage(result.feedback);
          }
        } catch (err) {
          vscode.window.showErrorMessage(`Evaluation failed: ${err}`);
        }
      }
    }),
  );

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
        vscode.window.showInformationMessage('Analysis complete — check the Bridge panel.');
      } catch (err) {
        vscode.window.showErrorMessage(`Analysis failed: ${err}`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.showStatus', () => {
      const state = sessionManager.getState();
      if (!state) {
        vscode.window.showInformationMessage('No active Bridge session.');
        return;
      }

      const locked = state.isLocked ? 'Locked' : 'Unlocked';
      const gates = state.pendingGates.length;
      const approvals = state.approvals.length;

      vscode.window.showInformationMessage(
        `Bridge: ${locked} | ${gates} pending gate(s) | ${approvals} approval(s)`,
      );
    }),
  );

  context.subscriptions.push(
    sessionManager.onDidChangeSession(() => {
      statusBar.sync(sessionManager.getState());
      sidebarProvider.refresh();
    }),
  );

  logger.debug('Bridge commands registered');
}
