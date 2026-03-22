import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';
import { buildSidebarHtml } from '../webview/sidebarHtml';

/**
 * Webview provider for the Bridge sidebar — composes HTML from `webview/*` templates.
 */
export class BridgeSidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'bridge.sidebarView';
  private _view?: vscode.WebviewView;
  private _activeTab: string = 'LEARN';

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly sessionManager: SessionManager,
  ) {
    this.sessionManager.onDidChangeSession(() => this.refresh());
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.renderHtml();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'submitAnswer': {
          const result = await this.sessionManager.submitAnswer(message.answer as string);
          webviewView.webview.postMessage({
            type: 'evaluationResult',
            ...result,
          });
          break;
        }
        case 'submitQuiz': {
          const result = await this.sessionManager.submitQuizAnswer(
            message.questionId as string,
            message.selectedIndex as number,
          );
          webviewView.webview.postMessage({
            type: 'evaluationResult',
            ...result,
          });
          break;
        }
        case 'submitBug': {
          const result = await this.sessionManager.submitBugAnswer(
            message.identifiedLine as number,
            message.explanation as string,
          );
          webviewView.webview.postMessage({
            type: 'evaluationResult',
            ...result,
          });
          break;
        }
        case 'requestMentorHint': {
          const result = await this.sessionManager.requestMentorHint(message.question as string);
          webviewView.webview.postMessage({
            type: 'mentorHint',
            ...result,
          });
          break;
        }
        case 'requestStudyRecommendation': {
          const result = await this.sessionManager.requestStudyRecommendation();
          webviewView.webview.postMessage({
            type: 'studyRecommendation',
            ...result,
          });
          break;
        }
        case 'startSession': {
          await this.sessionManager.createSession();
          this.refresh();
          break;
        }
        case 'requestState': {
          webviewView.webview.postMessage({
            type: 'stateUpdate',
            state: this.sessionManager.getState(),
          });
          break;
        }
        case 'switchTab': {
          this._activeTab = message.tab as string;
          this.refresh();
          break;
        }
        default:
          break;
      }
    });
  }

  refresh(): void {
    if (this._view) {
      this._view.webview.html = this.renderHtml();
    }
  }

  private renderHtml(): string {
    return buildSidebarHtml(this.sessionManager.getState(), this._activeTab);
  }
}
