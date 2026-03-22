import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';
import { applyGateDecorations, clearGateDecorations, unlockSpecificBlock } from './editorDecorations';
import { logger } from '@bridge/shared-utils';

/**
 * Orchestrates the Claude Code gating flow:
 * - Detects when Claude Code writes code to files
 * - Automatically locks files and hides code blocks
 * - Prevents edits and saves while gates are active
 * - Coordinates progressive unlocking as user explains blocks
 */
export class ClaudeCodeGateManager {
  private lockedFiles = new Map<string, boolean>();
  private saveBlocker: vscode.Disposable | null = null;
  private editWarner: vscode.Disposable | null = null;

  constructor(private sessionManager: SessionManager) {}

  /**
   * Handle file save event - trigger analysis and gating if appropriate
   */
  async handleFileSave(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;

    // Check if file is already locked
    if (this.lockedFiles.get(filePath)) {
      logger.debug('File already locked, skipping re-analysis', { filePath });
      return;
    }

    // Check if session is active
    const state = this.sessionManager.getState();
    if (!state) {
      logger.debug('No active session, skipping gating', { filePath });
      return;
    }

    // Check if session already has a locked gate
    if (state.isLocked) {
      vscode.window.showWarningMessage(
        'Bridge: Another file is already gated. Complete the current gate first.'
      );
      return;
    }

    // Get file content and language
    const code = document.getText();
    const language = document.languageId;

    // Skip empty files
    if (code.trim().length === 0) {
      logger.debug('Empty file, skipping gating', { filePath });
      return;
    }

    logger.info('Analyzing file for gating', { filePath, language });

    try {
      // Send to backend for analysis
      const result = await this.sessionManager.analyzeCode(code, filePath, language);

      // Check if gating is needed
      if (result.suggestedGate === 'none' || !result.gatedBlocks || result.gatedBlocks.length === 0) {
        logger.info('No gating needed for this file', { filePath });
        vscode.window.showInformationMessage('Bridge: No complex blocks found, no gate required.');
        return;
      }

      // Lock the file
      this.lockedFiles.set(filePath, true);

      // Apply decorations to hide gated blocks
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.uri.fsPath === filePath) {
        applyGateDecorations(editor, result.gatedBlocks);
        logger.info('Applied gate decorations', {
          filePath,
          blockCount: result.gatedBlocks.length,
        });
      }

      // Show info message
      vscode.window.showInformationMessage(
        `Bridge: ${result.gatedBlocks.length} code block(s) gated. Explain each to unlock.`
      );
    } catch (error) {
      logger.error('Error analyzing file for gating', { filePath, error });
      vscode.window.showErrorMessage('Bridge: Failed to analyze file for gating.');
    }
  }

  /**
   * Register listeners to prevent file edits and saves while locked
   */
  registerEditPrevention(context: vscode.ExtensionContext): void {
    // Block saves on locked files
    this.saveBlocker = vscode.workspace.onWillSaveTextDocument((event) => {
      const filePath = event.document.uri.fsPath;

      if (this.lockedFiles.get(filePath)) {
        event.waitUntil(
          Promise.reject(new Error('Bridge: This file is locked. Complete the gate to unlock.'))
        );
      }
    });

    // Warn on edits to locked files
    this.editWarner = vscode.workspace.onDidChangeTextDocument((event) => {
      const filePath = event.document.uri.fsPath;

      if (this.lockedFiles.get(filePath) && event.contentChanges.length > 0) {
        vscode.window
          .showWarningMessage(
            "Bridge: This file is locked. Your changes won't be saved until you pass the gate.",
            'View Gate'
          )
          .then((selection) => {
            if (selection === 'View Gate') {
              vscode.commands.executeCommand('bridge.focusSidebar');
            }
          });
      }
    });

    context.subscriptions.push(this.saveBlocker, this.editWarner);
  }

  /**
   * Unlock the current block after user passes evaluation
   */
  async unlockCurrentBlock(): Promise<void> {
    const state = this.sessionManager.getState();
    if (!state || state.pendingGates.length === 0) {
      return;
    }

    const filePath = this.sessionManager.getCurrentGateFilePath();
    if (!filePath) {
      return;
    }

    const blockIndex = this.sessionManager.getCurrentBlockIndex();

    // Find the editor for this file
    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath === filePath
    );

    if (editor) {
      // Remove decoration for this specific block
      unlockSpecificBlock(editor, blockIndex);
      logger.info('Unlocked block', { filePath, blockIndex });
    }

    // Check if more blocks remain
    const allBlocks = this.sessionManager.getAllGatedBlocks();
    const hasMoreBlocks = allBlocks && blockIndex + 1 < allBlocks.length;

    if (!hasMoreBlocks) {
      // All blocks unlocked, unlock the file
      this.lockedFiles.delete(filePath);

      if (editor) {
        clearGateDecorations(editor);
      }

      vscode.window.showInformationMessage('Bridge: All blocks explained. File unlocked!');
      logger.info('File fully unlocked', { filePath });
    }
  }

  /**
   * Manually unlock a file (for cleanup or error recovery)
   */
  unlockFile(filePath: string): void {
    this.lockedFiles.delete(filePath);

    const editor = vscode.window.visibleTextEditors.find(
      (e) => e.document.uri.fsPath === filePath
    );

    if (editor) {
      clearGateDecorations(editor);
    }
  }

  /**
   * Cleanup on dispose
   */
  dispose(): void {
    this.saveBlocker?.dispose();
    this.editWarner?.dispose();
    this.lockedFiles.clear();
  }
}
