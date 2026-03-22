import * as vscode from 'vscode';
import { logger } from '@bridge/shared-utils';

export class WorkspaceManager implements vscode.Disposable {
  private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChangeFile = this._onDidChangeFile.event;
  
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument((doc) => {
        logger.debug('WorkspaceManager: File saved', { file: doc.uri.fsPath });
        this._onDidChangeFile.fire(doc.uri);
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.contentChanges.length > 0) {
          logger.debug('WorkspaceManager: File changed', { file: e.document.uri.fsPath });
          this._onDidChangeFile.fire(e.document.uri);
        }
      })
    );
  }

  async readFileContent(uri: vscode.Uri): Promise<string | undefined> {
    try {
      const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
      if (document) {
        return document.getText();
      }
      
      const content = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(content);
    } catch (err) {
      logger.error('WorkspaceManager: Failed to read file', { uri: uri.fsPath, error: err });
      return undefined;
    }
  }

  dispose() {
    this.disposables.forEach(d => d.dispose());
    this._onDidChangeFile.dispose();
  }
}
