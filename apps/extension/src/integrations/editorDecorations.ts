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

// Store gate decorations per document URI
const gateDecorations = new Map<string, Array<{ range: vscode.Range; reason: string }>>();

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
 * Apply gate decorations based on line ranges from backend analysis
 */
export function applyGateDecorations(
  editor: vscode.TextEditor,
  blocks: Array<{ startLine: number; endLine: number; reason: string }>
): void {
  if (!editor || blocks.length === 0) {
    return;
  }

  const decorations: Array<{ range: vscode.Range; reason: string }> = [];

  for (const block of blocks) {
    // Convert 1-based line numbers to 0-based VSCode positions
    const startPos = new vscode.Position(block.startLine - 1, 0);
    const endPos = new vscode.Position(block.endLine - 1, Number.MAX_SAFE_INTEGER);
    const range = new vscode.Range(startPos, endPos);

    decorations.push({ range, reason: block.reason });
  }

  // Store decorations for this document
  gateDecorations.set(editor.document.uri.toString(), decorations);

  // Apply visual decorations
  const ranges = decorations.map(d => d.range);
  editor.setDecorations(blankDecorationType, ranges);
}

/**
 * Clear all gate decorations for a specific editor
 */
export function clearGateDecorations(editor: vscode.TextEditor): void {
  if (!editor) {
    return;
  }

  gateDecorations.delete(editor.document.uri.toString());
  editor.setDecorations(blankDecorationType, []);
}

/**
 * Unlock a specific block by index (for progressive unlocking)
 */
export function unlockSpecificBlock(editor: vscode.TextEditor, blockIndex: number): void {
  if (!editor) {
    return;
  }

  const uri = editor.document.uri.toString();
  const decorations = gateDecorations.get(uri);

  if (!decorations || blockIndex >= decorations.length) {
    return;
  }

  // Remove the specific block
  decorations.splice(blockIndex, 1);

  if (decorations.length === 0) {
    // All blocks unlocked
    gateDecorations.delete(uri);
    editor.setDecorations(blankDecorationType, []);
  } else {
    // Update with remaining blocks
    const ranges = decorations.map(d => d.range);
    editor.setDecorations(blankDecorationType, ranges);
  }
}

/**
 * Get active gate decorations for a document
 */
export function getGateDecorations(uri: string): Array<{ range: vscode.Range; reason: string }> | undefined {
  return gateDecorations.get(uri);
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