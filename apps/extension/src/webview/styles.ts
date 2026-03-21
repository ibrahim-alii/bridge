/** Shared sidebar webview styles (VS Code theme tokens). */
export const SIDEBAR_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 12px 14px 20px;
    margin: 0;
    font-size: 12px;
    line-height: 1.45;
  }
  h2 { margin: 0; font-size: 15px; font-weight: 600; }
  h3 { margin: 0 0 6px 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.85; }
  p { margin: 0 0 8px 0; opacity: 0.9; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 10px; margin-bottom: 14px; padding-bottom: 10px;
    border-bottom: 1px solid var(--vscode-widget-border);
  }
  .status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.03em;
  }
  .status-locked {
    background: color-mix(in srgb, var(--vscode-errorForeground) 22%, transparent);
    color: var(--vscode-errorForeground);
    border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 40%, transparent);
  }
  .status-unlocked {
    background: color-mix(in srgb, var(--vscode-testing-iconPassed) 22%, transparent);
    color: var(--vscode-testing-iconPassed);
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed) 45%, transparent);
  }
  .card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
  }
  .card-muted {
    background: color-mix(in srgb, var(--vscode-editor-background) 92%, var(--vscode-sideBar-background));
  }
  .gate-label { font-size: 11px; opacity: 0.75; margin-bottom: 4px; }
  .gate-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  textarea, input[type="text"], input[type="number"] {
    width: 100%;
    min-height: 72px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 6px;
    padding: 8px;
    font-family: var(--vscode-editor-font-family);
    font-size: 12px;
    resize: vertical;
  }
  input[type="text"], input[type="number"] { min-height: 32px; resize: none; }
  .option {
    display: flex; align-items: flex-start; gap: 8px;
    padding: 6px 8px; border-radius: 6px; cursor: pointer;
    border: 1px solid transparent;
  }
  .option:hover { background: var(--vscode-list-hoverBackground); }
  .option input { margin-top: 2px; }
  .option span { flex: 1; }
  .option.selected {
    border-color: var(--vscode-focusBorder);
    background: var(--vscode-list-activeSelectionBackground);
  }
  button {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none; padding: 7px 14px; border-radius: 6px;
    cursor: pointer; font-size: 12px; font-weight: 500;
  }
  button:hover { background: var(--vscode-button-hoverBackground); }
  button.secondary {
    background: transparent;
    color: var(--vscode-textLink-foreground);
    border: 1px solid var(--vscode-panel-border);
  }
  button.secondary:hover {
    background: var(--vscode-toolbar-hoverBackground);
  }
  button:disabled { opacity: 0.45; cursor: not-allowed; }
  .feedback { margin-top: 10px; padding: 8px; border-radius: 6px; font-size: 12px; }
  .feedback.ok {
    background: color-mix(in srgb, var(--vscode-testing-iconPassed) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-testing-iconPassed) 35%, transparent);
  }
  .feedback.err {
    background: color-mix(in srgb, var(--vscode-errorForeground) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--vscode-errorForeground) 30%, transparent);
  }
  .hint {
    margin-top: 8px; font-size: 11px; opacity: 0.9;
    border-left: 2px solid var(--vscode-textLink-foreground);
    padding-left: 8px;
  }
  .stats { font-size: 11px; opacity: 0.65; margin-top: 12px; }
  .no-session { text-align: center; padding: 28px 8px; }
  .mentor-box { font-size: 12px; white-space: pre-wrap; }
  .placeholder-tag {
    display: inline-block; font-size: 10px; text-transform: uppercase;
    letter-spacing: 0.06em; opacity: 0.55; margin-bottom: 6px;
  }
`;
