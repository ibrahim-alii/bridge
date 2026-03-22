import * as vscode from 'vscode';
import { registerCommands } from './ui/commands';
import { BridgeStatusBar } from './ui/statusBar';
import { BridgeSidebarProvider } from './ui/sidebarProvider';
import { SessionManager } from './state/sessionState';
import { ClaudeCodeGateManager } from './integrations/claudeCodeGating';
import { logger } from '@bridge/shared-utils';

export function activate(context: vscode.ExtensionContext) {
  logger.info('Bridge extension activating...');

  const sessionManager = new SessionManager(context);
  context.subscriptions.push(sessionManager);

  const sidebarProvider = new BridgeSidebarProvider(context.extensionUri, sessionManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('bridge.sidebarView', sidebarProvider),
  );

  const statusBar = new BridgeStatusBar();
  context.subscriptions.push(statusBar);
  statusBar.sync(sessionManager.getState());

  // Initialize Claude Code gating manager
  const claudeGateManager = new ClaudeCodeGateManager(sessionManager);
  claudeGateManager.registerEditPrevention(context);
  context.subscriptions.push(claudeGateManager);

  registerCommands(context, sessionManager, sidebarProvider, statusBar, claudeGateManager);

  // Watch for file saves to trigger gating
  const watcher = vscode.workspace.onDidSaveTextDocument(async (doc) => {
    logger.debug('File saved', { file: doc.uri.fsPath });
    await claudeGateManager.handleFileSave(doc);
  });
  context.subscriptions.push(watcher);

  logger.info('Bridge extension activated');
}

export function deactivate() {
  logger.info('Bridge extension deactivated');
}
