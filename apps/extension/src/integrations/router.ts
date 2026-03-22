import * as vscode from 'vscode';
import { WorkspaceManager } from './workspace';
import { GitManager } from './git';
import { SessionManager } from '../state/sessionState';
import { logger } from '@bridge/shared-utils';

export class EventRouter implements vscode.Disposable {
  private workspaceManager: WorkspaceManager;
  private gitManager: GitManager;
  private sessionManager: SessionManager;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(
    workspaceManager: WorkspaceManager,
    gitManager: GitManager,
    sessionManager: SessionManager
  ) {
    this.workspaceManager = workspaceManager;
    this.gitManager = gitManager;
    this.sessionManager = sessionManager;

    this.disposables.push(
      this.workspaceManager.onDidChangeFile((uri) => this.handleFileChange(uri))
    );
  }

  private handleFileChange(uri: vscode.Uri) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    const state = this.sessionManager.getState();
    if (state?.isLocked) {
      logger.debug('EventRouter: Ignoring file change because session is locked');
      return;
    }

    this.debounceTimer = setTimeout(() => this.processChange(uri), 2000);
  }

  private async processChange(uri: vscode.Uri) {
    try {
      logger.debug('EventRouter: Processing changes for', { file: uri.fsPath });
      
      let codeToAnalyze = '';
      let filePath = uri.fsPath;
      
      const unstagedDiff = await this.gitManager.getUnstagedDiff();
      const extracted = this.gitManager.extractTargetBlockFromDiff(unstagedDiff);
      
      if (extracted && extracted.block.trim().length > 0) {
         codeToAnalyze = extracted.block;
         if (vscode.workspace.workspaceFolders) {
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            filePath = vscode.Uri.joinPath(vscode.Uri.file(rootPath), extracted.filePath).fsPath;
         }
      } else {
         const fileContent = await this.workspaceManager.readFileContent(uri);
         if (!fileContent) return;
         codeToAnalyze = fileContent;
      }
      
      const parts = filePath.split('.');
      const language = parts.length > 1 ? parts[parts.length - 1] : 'text';

      logger.info('EventRouter: Routing code context to backend', { filePath, language });
      const analysisResult = await this.sessionManager.analyzeCode(codeToAnalyze, filePath, language);

      logger.info('EventRouter: Analysis result received', { suggestedGate: analysisResult.suggestedGate });
    } catch (err) {
      logger.error('EventRouter: Error processing change', { error: err });
    }
  }

  dispose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.disposables.forEach(d => d.dispose());
  }
}
