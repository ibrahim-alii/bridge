import * as vscode from 'vscode';
import { registerCommands } from './commands/startSession';
import { BridgeStatusBar } from './ui/statusBar';
import { BridgeSidebarProvider } from './ui/sidebarProvider';
import { SessionManager } from './state/sessionState';
import { logger } from '@bridge/shared-utils';

let statusBar: BridgeStatusBar;

export function activate(context: vscode.ExtensionContext) {
  logger.info('Bridge extension activating...');

  // ─── Initialize State ───────────────────────────────────────
  const sessionManager = new SessionManager(context);

  // ─── Register Sidebar Webview ───────────────────────────────
  const sidebarProvider = new BridgeSidebarProvider(context.extensionUri, sessionManager);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('bridge.sidebarView', sidebarProvider),
  );

  // ─── Register Commands ──────────────────────────────────────
  registerCommands(context, sessionManager, sidebarProvider);

  // ─── Status Bar ─────────────────────────────────────────────
  statusBar = new BridgeStatusBar();
  context.subscriptions.push(statusBar);

  // ─── Watch for File Changes ─────────────────────────────────
  const watcher = vscode.workspace.onDidSaveTextDocument((doc) => {
    // Future: trigger analysis on save
    logger.debug('File saved, could trigger analysis', { file: doc.uri.fsPath });
  });
  context.subscriptions.push(watcher);

  logger.info('Bridge extension activated');
}

export function deactivate() {
  logger.info('Bridge extension deactivated');
}
