import * as vscode from 'vscode';
import * as fs from 'fs/promises';
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
  private originalModes = new Map<string, number>();
  private saveBlocker: vscode.Disposable | null = null;
  private editWarner: vscode.Disposable | null = null;

  constructor(private sessionManager: SessionManager) {}

  /**
   * Handle file save event - trigger analysis and gating if appropriate
   */
  async handleFileSave(document: vscode.TextDocument): Promise<void> {
    const filePath = document.uri.fsPath;

    if (document.isDirty) {
      logger.debug('Skipping gating for unsaved document', { filePath });
      return;
    }

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
      await this.makeFileReadOnly(filePath);

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

  async syncFromSession(): Promise<void> {
    const state = this.sessionManager.getState();
    const activeFilePath = this.sessionManager.getCurrentGateFilePath();
    const shouldHardLock = !!state?.isLocked && state.activeGate === 'blank' && !!activeFilePath;

    for (const filePath of [...this.lockedFiles.keys()]) {
      if (!shouldHardLock || filePath !== activeFilePath) {
        await this.releaseFileLock(filePath);
      }
    }

    if (!shouldHardLock || !activeFilePath) {
      return;
    }

    this.lockedFiles.set(activeFilePath, true);
    await this.makeFileReadOnly(activeFilePath);

    const editor = vscode.window.visibleTextEditors.find(
      (candidate) => candidate.document.uri.fsPath === activeFilePath,
    );
    const gatedBlocks = state?.pendingGates[0]?.metadata?.gatedBlocks;
    if (editor && Array.isArray(gatedBlocks) && gatedBlocks.length > 0) {
      applyGateDecorations(editor, gatedBlocks);
    }
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
      await this.releaseFileLock(filePath);

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
    void this.releaseFileLock(filePath);

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
    for (const filePath of [...this.lockedFiles.keys()]) {
      void this.releaseFileLock(filePath);
    }
  }

  private async makeFileReadOnly(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      const currentMode = stats.mode & 0o777;

      if (!this.originalModes.has(filePath)) {
        this.originalModes.set(filePath, currentMode);
      }

      const readOnlyMode = currentMode & ~0o222;
      if (readOnlyMode !== currentMode) {
        await fs.chmod(filePath, readOnlyMode);
      }
    } catch (error) {
      logger.warn('Failed to apply OS-level lock for Claude Code', { filePath, error });
    }
  }

  private async releaseFileLock(filePath: string): Promise<void> {
    try {
      const originalMode = this.originalModes.get(filePath);
      if (originalMode !== undefined) {
        await fs.chmod(filePath, originalMode);
        this.originalModes.delete(filePath);
      }
    } catch (error) {
      logger.warn('Failed to release OS-level lock for Claude Code', { filePath, error });
    } finally {
      this.lockedFiles.delete(filePath);
    }
  }
}
