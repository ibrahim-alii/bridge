import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
import { SessionManager } from '../state/sessionState';
import { bridgeFetch } from '../config/api';

const exec = promisify(cp.exec);

/**
 * Register a pre-commit hook that checks for Bridge approval.
 */
export function registerGitIntegration(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
): void {
  let disposable = vscode.commands.registerCommand('bridge.commitAndVerify', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage("Bridge: No workspace folder open.");
      return;
    }

    const cwd = workspaceFolders[0].uri.fsPath;

    try {
      // 1. Grab the staged diff
      const diff = await getCurrentDiff(cwd);

      if (!diff) {
        vscode.window.showInformationMessage("Bridge: Nothing staged to commit. Run 'git add' first.");
        return;
      }

      // 2. Prompt the user for comprehension
      const explanation = await vscode.window.showInputBox({
        prompt: "Bridge Gate: Explain the core logic you just staged in plain English.",
        placeHolder: "e.g., 'I added a debounce to the search input to prevent API spam...'",
        ignoreFocusOut: true
      });

      if (!explanation) {
        vscode.window.showWarningMessage("Bridge: Commit cancelled. Explanation required.");
        return; // User bailed
      }

      let session = sessionManager.getState();
      if (!session) {
        session = await sessionManager.createSession();
      }

      // 3. Send to the backend for review
      vscode.window.showInformationMessage("Bridge: Analyzing comprehension...");

      const review = await reviewCommit(session.sessionId, diff, explanation);

      // 4. Evaluate and Act
      if (review.passed) {
        // Ask for the commit message since they proved they understand it
        const commitMsg = await vscode.window.showInputBox({
          prompt: "Comprehension verified! Enter your commit message:",
          ignoreFocusOut: true
        });

        if (commitMsg) {
          await exec(`git commit -m "${commitMsg}"`, { cwd });
          vscode.window.showInformationMessage("Bridge: Commit successful!");
        }
      } else {
        // Deny the commit and show a hint
        vscode.window.showErrorMessage(
          review.hint
            ? `Bridge Error: ${review.feedback}\n\nHint: ${review.hint}`
            : `Bridge Error: ${review.feedback}`,
          { modal: true },
        );
      }

    } catch (error) {
      vscode.window.showErrorMessage(`Bridge Git Error: ${error}`);
    }
  });

  context.subscriptions.push(disposable);
}

/**
 * Get the diff for the current working directory.
 */
export async function getCurrentDiff(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await exec('git diff --cached', { cwd });
    return stdout.trim() || null;
  } catch (error) {
    console.error("Bridge failed to execute git diff", error);
    return null;
  }
}

async function reviewCommit(
  sessionId: string,
  diff: string,
  explanation: string,
): Promise<{ passed: boolean; feedback: string; hint?: string }> {
  const response = await bridgeFetch('/commit/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      diff,
      explanation,
    }),
  });

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }

  return (await response.json()) as { passed: boolean; feedback: string; hint?: string };
}
