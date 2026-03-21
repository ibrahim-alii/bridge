import * as vscode from 'vscode';
import { registerCommands } from './ui/commands';
import { BridgeStatusBar } from './ui/statusBar';
import { BridgeSidebarProvider } from './ui/sidebarProvider';
import { SessionManager } from './state/sessionState';
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

  registerCommands(context, sessionManager, sidebarProvider, statusBar);

  const watcher = vscode.workspace.onDidSaveTextDocument((doc) => {
    logger.debug('File saved', { file: doc.uri.fsPath });
  });
  context.subscriptions.push(watcher);

  logger.info('Bridge extension activated');
}

export function deactivate() {
  logger.info('Bridge extension deactivated');
}
