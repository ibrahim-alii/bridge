import * as vscode from 'vscode';
import { registerCommands } from './ui/commands';
import { BridgeStatusBar } from './ui/statusBar';
import { BridgeSidebarProvider } from './ui/sidebarProvider';
import { SessionManager } from './state/sessionState';
import { logger } from '@bridge/shared-utils';
import { WorkspaceManager } from './integrations/workspace';
import { GitManager } from './integrations/git';
import { EventRouter } from './integrations/router';
import { ClaudeCodeGateManager } from './integrations/claudeCodeGating';
import { registerPatternGating } from './integrations/editorDecorations';
import { registerGitIntegration } from './integrations/gitIntegration';
import { registerAlgoBridge } from './integrations/algoBridge';

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
  registerGitIntegration(context, sessionManager);
  registerAlgoBridge(context, sessionManager);

  context.subscriptions.push(
    vscode.commands.registerCommand('bridge.focusSidebar', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.bridge-sidebar');
    }),
  );

  const workspaceManager = new WorkspaceManager();
  const gitManager = new GitManager();
  const eventRouter = new EventRouter(workspaceManager, gitManager, sessionManager);

  context.subscriptions.push(workspaceManager, eventRouter);

  // Initialize and register the Claude Code gate manager
  const gateManager = new ClaudeCodeGateManager(sessionManager);
  gateManager.registerEditPrevention(context);
  
  // Register visual pattern gating (redaction)
  registerPatternGating(context);

  // Link workspace file saves to the gate manager
  context.subscriptions.push(
    workspaceManager.onDidChangeFile(async (uri) => {
      const document = await vscode.workspace.openTextDocument(uri);
      await gateManager.handleFileSave(document);
    })
  );

  context.subscriptions.push(
    sessionManager.onDidUnlockGate(() => {
      gateManager.unlockCurrentBlock();
    })
  );

  context.subscriptions.push(
    sessionManager.onDidChangeSession(() => {
      void gateManager.syncFromSession();
    }),
  );
  
  // Auto-start session if none exists
  const maybeStart = async () => {
    if (!sessionManager.getState()) {
      logger.info('Auto-starting Bridge session...');
      await sessionManager.createSession();
      statusBar.sync(sessionManager.getState());
      sidebarProvider.refresh();
    }
  };

  maybeStart();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      // Avoid starting sessions for non-file schemes or transient logs
      if (doc.uri.scheme === 'file' && !doc.isClosed) {
        maybeStart();
      }
    }),
  );

  logger.info('Bridge extension activated');
}

export function deactivate() {
  logger.info('Bridge extension deactivated');
}
