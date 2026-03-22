import * as vscode from 'vscode';
import * as cp from 'child_process';
import { promisify } from 'util';
// If logger isn't fully set up by Person 1 yet, we can fall back to console.log
// import { logger } from '@bridge/shared-utils'; 

const exec = promisify(cp.exec);

/**
 * Register a pre-commit hook that checks for Bridge approval.
 */
export function registerGitIntegration(context: vscode.ExtensionContext): void {
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

      // 3. Send to Mock Backend (Person 2's Contract)
      vscode.window.showInformationMessage("Bridge: Analyzing comprehension...");

      // TODO: Swap this with actual fetch to POST /api/commit/review once Person 2 finishes it
      const reviewPassed = await mockCommitReview(diff, explanation);

      // 4. Evaluate and Act
      if (reviewPassed) {
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
        vscode.window.showErrorMessage("Bridge Error: Explanation failed to capture core logic. Review the diff and try again.", { modal: true });
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

/**
 * Mock evaluation function to keep UI development unblocked.
 */
async function mockCommitReview(diff: string, explanation: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Hacky mock logic: if their explanation is somewhat detailed (over 15 chars), pass them.
      resolve(explanation.length > 15);
    }, 1500); // Fake network delay for dramatic effect
  });
}