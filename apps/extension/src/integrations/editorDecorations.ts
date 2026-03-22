import * as vscode from 'vscode';

// Create a visual "Redacted" style
const blankDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 0, 0, 0.2)', // Light red highlight
  color: 'transparent', // Hides the actual text
  textDecoration: 'line-through solid red',
  isWholeLine: false,
  after: {
    contentText: ' 🔒 [BRIDGE: EXPLAIN TO UNLOCK]',
    color: '#ff4d4d',
    fontWeight: 'bold'
  }
});

let activeBlanks: vscode.Range[] = [];

/**
 * Scans the active editor for Bridge blanking comments and applies the redaction style.
 */
export function updateDecorations(editor: vscode.TextEditor | undefined) {
  if (!editor) { return; }

  const text = editor.document.getText();
  activeBlanks = [];

  // Hackathon MVP: Regex to find code between our custom tags
  const regex = /\/\*\s*BRIDGE_BLANK_START\s*\*\/(.*?)\/\*\s*BRIDGE_BLANK_END\s*\*\//gs;
  let match;

  while ((match = regex.exec(text))) {
    const startPos = editor.document.positionAt(match.index);
    const endPos = editor.document.positionAt(match.index + match[0].length);
    const decoration = { range: new vscode.Range(startPos, endPos) };
    activeBlanks.push(decoration.range);
  }

  // Apply the visual redaction
  editor.setDecorations(blankDecorationType, activeBlanks);
}

/**
 * Removes the visual locks once Person 3's UI receives a passing grade.
 */
export function unlockDecorations(editor: vscode.TextEditor | undefined) {
  if (!editor) { return; }
  // Clear the decorations
  editor.setDecorations(blankDecorationType, []);
  vscode.window.showInformationMessage("Bridge: Concept understood. Code unlocked.");

  // Optional hackathon polish: Automatically delete the placeholder comments now that it's unlocked
}

/**
 * Register the event listeners to keep decorations updated when the user types or switches tabs.
 */
export function registerPatternGating(context: vscode.ExtensionContext) {
  let activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    updateDecorations(activeEditor);
  }

  // Update if they change tabs
  vscode.window.onDidChangeActiveTextEditor(editor => {
    activeEditor = editor;
    if (editor) {
      updateDecorations(editor);
    }
  }, null, context.subscriptions);

  // Update if they type or the AI generates new code
  vscode.workspace.onDidChangeTextDocument(event => {
    if (activeEditor && event.document === activeEditor.document) {
      updateDecorations(activeEditor);
    }
  }, null, context.subscriptions);

  // Command for Person 3's UI to call when the user passes the test
  let unlockCmd = vscode.commands.registerCommand('bridge.unlockCurrentFile', () => {
    unlockDecorations(vscode.window.activeTextEditor);
  });

  context.subscriptions.push(unlockCmd);
}