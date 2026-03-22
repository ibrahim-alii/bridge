import * as vscode from 'vscode';
import type { SessionState } from '@bridge/contracts';

/**
 * Status bar — reflects session lock state from {@link SessionState} snapshots.
 */
export class BridgeStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'bridge.showStatus';
    this.sync(null);
    this.item.show();
  }

  sync(state: SessionState | null): void {
    if (!state) {
      this.item.text = '$(beaker) Bridge';
      this.item.tooltip = 'Bridge — start a session from the panel or command palette';
      this.item.backgroundColor = undefined;
      return;
    }

    if (state.isLocked && state.activeGate) {
      const label = gateLabel(state.activeGate);
      this.item.text = `$(lock) Bridge: ${label}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.item.tooltip = `Bridge is locked — complete the ${label} gate`;
      return;
    }

    this.item.text = '$(unlock) Bridge: Ready';
    this.item.backgroundColor = undefined;
    this.item.tooltip = 'Bridge — no active gates';
  }

  dispose(): void {
    this.item.dispose();
  }
}

function gateLabel(gate: NonNullable<SessionState['activeGate']>): string {
  switch (gate) {
    case 'blank':
      return 'Blank';
    case 'quiz':
      return 'Quiz';
    case 'bug':
      return 'Bug';
    case 'commit':
      return 'Commit';
    default:
      return gate;
  }
}
