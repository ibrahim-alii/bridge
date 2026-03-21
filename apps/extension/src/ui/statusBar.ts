import * as vscode from 'vscode';

/**
 * Bridge status bar item — shows lock/unlock state in the VS Code footer.
 */
export class BridgeStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'bridge.showStatus';
    this.setUnlocked();
    this.item.show();
  }

  setLocked(gateType: string): void {
    this.item.text = `$(lock) Bridge: ${gateType}`;
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.tooltip = `Bridge is locked — complete the ${gateType} gate to continue`;
  }

  setUnlocked(): void {
    this.item.text = '$(unlock) Bridge: Ready';
    this.item.backgroundColor = undefined;
    this.item.tooltip = 'Bridge — no active gates';
  }

  dispose(): void {
    this.item.dispose();
  }
}
