import * as vscode from 'vscode';
import { SessionManager } from '../state/sessionState';
import { bridgeFetch } from '../config/api';

export interface ResourceSuggestion {
    topic: string;
    reason: string;
    url: string;
}

export function registerAlgoBridge(
  context: vscode.ExtensionContext,
  sessionManager: SessionManager,
) {
    let disposable = vscode.commands.registerCommand('bridge.getStudyResource', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return null;
        }

        let session = sessionManager.getState();
        if (!session) {
            session = await sessionManager.createSession();
        }

        const response = await bridgeFetch('/study/resources', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: editor.document.getText(),
                language: editor.document.languageId,
                sessionId: session.sessionId,
            }),
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json() as { topic: string; reason: string; recommendation: string };
        const primaryUrl =
            Array.isArray((data as any).resources) && (data as any).resources[0]?.url
                ? String((data as any).resources[0].url)
                : data.recommendation;
        const suggestion: ResourceSuggestion = {
            topic: data.topic,
            reason: data.reason,
            url: primaryUrl,
        };

        vscode.window.showInformationMessage(`Algo-Bridge: ${suggestion.topic} - ${suggestion.reason}`, "Read Docs")
            .then(selection => {
                if (selection === "Read Docs") {
                    const target = suggestion.url.startsWith('http')
                        ? suggestion.url
                        : `https://www.google.com/search?q=${encodeURIComponent(suggestion.url)}`;
                    vscode.env.openExternal(vscode.Uri.parse(target));
                }
            });

        return suggestion;
    });

    context.subscriptions.push(disposable);
}
