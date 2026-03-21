/**
 * Editor decorations for Bridge.
 *
 * Responsibilities:
 * - Highlight gated code blocks with visual indicators
 * - Show inline lock/unlock icons
 * - Dim or blank out code that requires comprehension
 */

import * as vscode from 'vscode';

/** Decoration type for gated (locked) code blocks */
export const gatedBlockDecoration = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255, 165, 0, 0.1)',
  border: '1px solid rgba(255, 165, 0, 0.3)',
  borderRadius: '3px',
  isWholeLine: true,
  overviewRulerColor: 'orange',
  overviewRulerLane: vscode.OverviewRulerLane.Left,
});

/** Decoration type for blanked-out code */
export const blankedBlockDecoration = vscode.window.createTextEditorDecorationType({
  opacity: '0.15',
  after: {
    contentText: ' 🔒 Complete the Bridge gate to reveal this code',
    color: 'rgba(255, 165, 0, 0.7)',
    fontStyle: 'italic',
  },
});

/**
 * Apply gated block decorations to the active editor.
 */
export function applyGatedDecorations(
  editor: vscode.TextEditor,
  blocks: Array<{ startLine: number; endLine: number }>,
): void {
  const ranges = blocks.map(
    (b) => new vscode.Range(b.startLine - 1, 0, b.endLine - 1, Number.MAX_SAFE_INTEGER),
  );
  editor.setDecorations(gatedBlockDecoration, ranges);
}
