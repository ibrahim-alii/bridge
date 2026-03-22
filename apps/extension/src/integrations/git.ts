import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '@bridge/shared-utils';

const execAsync = promisify(exec);

export class GitManager {
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  async getUnstagedDiff(): Promise<string> {
    if (!this.workspaceRoot) return '';
    try {
      const { stdout } = await execAsync('git diff', { cwd: this.workspaceRoot });
      return stdout;
    } catch (err) {
      logger.debug('GitManager: Failed to get unstaged diff', { error: err });
      return '';
    }
  }

  async getStagedDiff(): Promise<string> {
    if (!this.workspaceRoot) return '';
    try {
      const { stdout } = await execAsync('git diff --cached', { cwd: this.workspaceRoot });
      return stdout;
    } catch (err) {
      logger.debug('GitManager: Failed to get staged diff', { error: err });
      return '';
    }
  }

  extractTargetBlockFromDiff(diffText: string): { filePath: string; block: string } | null {
    if (!diffText.trim()) return null;

    const lines = diffText.split('\n');
    let currentFile = '';
    let currentBlock: string[] = [];
    let largestBlock: { filePath: string; block: string } | null = null;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentBlock.length > 0 && currentFile) {
          const currentText = currentBlock.join('\n');
          if (!largestBlock || currentText.length > largestBlock.block.length) {
            largestBlock = { filePath: currentFile, block: currentText };
          }
        }
        
        const parts = line.split(' ');
        currentFile = parts[parts.length - 1].replace(/^b\//, '');
        currentBlock = [];
        inHunk = false;
        continue;
      }

      if (line.startsWith('@@ ')) {
        inHunk = true;
        continue;
      }

      if (inHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentBlock.push(line.substring(1));
        } else if (line.startsWith(' ') || line.startsWith('-')) {
          if (line.startsWith(' ')) {
             currentBlock.push(line.substring(1));
          }
        }
      }
    }

    if (currentBlock.length > 0 && currentFile) {
      const currentText = currentBlock.join('\n');
      if (!largestBlock || currentText.length > largestBlock.block.length) {
        largestBlock = { filePath: currentFile, block: currentText };
      }
    }

    return largestBlock;
  }
}
