import * as vscode from 'vscode';
import type {
  SessionState,
  BridgeApproval,
  AnalyzeResponse,
  EvaluateResponse,
  EvaluateRequest,
  MentorHintResponse,
  StudyRecommendationResponse,
} from '@bridge/contracts';
import { generateId, expiresIn, logger } from '@bridge/shared-utils';
import { bridgeFetch } from '../config/api';

/**
 * Holds session snapshot and forwards requests to the backend.
 * Does not implement grading or policy — responses drive UI updates.
 */
export class SessionManager implements vscode.Disposable {
  private state: SessionState | null = null;
  private readonly context: vscode.ExtensionContext;
  private readonly _onDidChangeSession = new vscode.EventEmitter<SessionState | null>();
  readonly onDidChangeSession = this._onDidChangeSession.event;
  private readonly _onDidUnlockGate = new vscode.EventEmitter<void>();
  readonly onDidUnlockGate = this._onDidUnlockGate.event;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    const saved = context.workspaceState.get<SessionState>('bridge.session');
    if (saved) {
      this.state = saved;
      logger.info('Restored Bridge session', { sessionId: saved.sessionId });
    }
  }

  dispose(): void {
    this._onDidChangeSession.dispose();
  }

  getState(): SessionState | null {
    return this.state;
  }

  async createSession(): Promise<SessionState> {
    const response = await bridgeFetch('/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = (await response.json()) as { sessionId: string; state: SessionState };
    this.state = data.state;

    await this.persist();
    return this.state!;
  }

  async analyzeCode(code: string, filePath: string, language: string): Promise<AnalyzeResponse> {
    if (!this.state) {
      await this.createSession();
    }

    const response = await bridgeFetch('/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        filePath,
        language,
        sessionId: this.state!.sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const result = (await response.json()) as AnalyzeResponse;

    if (this.state) {
        const initialCoreBlocks = result.gatedBlocks.slice(0, 1);
        const baseMetadata = {
          filePath,
          originalCode: code,
          language,
        };

        const blankResponse = await bridgeFetch('/blank', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            sessionId: this.state.sessionId,
            gatedBlocks: initialCoreBlocks.length > 0 ? initialCoreBlocks : undefined,
          }),
        });
        if (!blankResponse.ok) {
          throw new Error(`Blank API returned ${blankResponse.status}`);
        }
        const blankData = (await blankResponse.json()) as Record<string, unknown>;

        const generatedBlanks = Array.isArray(blankData.blanks) ? blankData.blanks : [];
        const fallbackBlank = generatedBlanks[0] as
          | { startLine: number; endLine: number; hint?: string }
          | undefined;
        const coreBlocks =
          result.gatedBlocks.length > 0
            ? result.gatedBlocks.slice(0, 1)
            : fallbackBlank
              ? [
                  {
                    startLine: fallbackBlank.startLine,
                    endLine: fallbackBlank.endLine,
                    reason: fallbackBlank.hint ?? 'Core implementation block',
                  },
                ]
              : [];

        const quizResponse = await bridgeFetch('/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisId: result.analysisId,
            code,
            sessionId: this.state.sessionId,
          }),
        });
        if (!quizResponse.ok) {
          throw new Error(`Quiz API returned ${quizResponse.status}`);
        }
        const quizData = (await quizResponse.json()) as Record<string, unknown>;

        const bugResponse = await bridgeFetch('/sabotage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            sessionId: this.state.sessionId,
            filePath,
          }),
        });
        if (!bugResponse.ok) {
          throw new Error(`Sabotage API returned ${bugResponse.status}`);
        }
        const bugData = (await bugResponse.json()) as Record<string, unknown>;

        const normalizedResult: AnalyzeResponse = {
          ...result,
          suggestedGate: coreBlocks.length > 0 ? 'blank' : result.suggestedGate,
          gatedBlocks: coreBlocks,
        };

        this.state.isLocked = true;
        this.state.activeGate = 'blank';
        this.state.currentAttempts = 0;
        this.state.pendingGates = [
          {
            scope: 'blank',
            analysisId: result.analysisId,
            createdAt: new Date().toISOString(),
            metadata: {
              ...baseMetadata,
              gatedBlocks: coreBlocks,
              ...blankData,
            } as any,
          },
          {
            scope: 'quiz',
            analysisId: result.analysisId,
            createdAt: new Date().toISOString(),
            metadata: {
              ...baseMetadata,
              gatedBlocks: coreBlocks,
              ...quizData,
            } as any,
          },
          {
            scope: 'bug',
            analysisId: result.analysisId,
            createdAt: new Date().toISOString(),
            metadata: {
              ...baseMetadata,
              gatedBlocks: coreBlocks,
              sabotage: bugData,
            } as any,
          },
        ];
        await this.persist();

        return normalizedResult;
    }

    return result;
  }

  async submitAnswer(answer: string): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    const scope = this.state.activeGate ?? 'commit';
    const sessionId = this.state.sessionId;

    if (scope === 'quiz') {
      return {
        passed: false,
        feedback: 'Use the quiz options for this gate.',
      };
    }
    if (scope === 'bug') {
      return {
        passed: false,
        feedback: 'Use the bug submission form (line + explanation).',
      };
    }

    let payload: EvaluateRequest;
    if (scope === 'blank') {
      const metadata = this.state.pendingGates[0]?.metadata;
      const blank = metadata?.blanks?.[0];
      if (!blank || !metadata?.originalCode) {
        return {
          passed: false,
          feedback: 'Blank metadata is missing. Re-run the analysis to regenerate this challenge.',
        };
      }

      try {
        const response = await bridgeFetch('/blank/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            blankId: `${this.state.pendingGates[0].analysisId}:blank`,
            originalCode: metadata.originalCode,
            startLine: blank.startLine,
            endLine: blank.endLine,
            expectedPattern: blank.expectedPattern,
            userExplanation: answer,
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = (await response.json()) as EvaluateResponse;
        if (result.passed) {
          await this.unlockGate();
        } else {
          this.state.currentAttempts++;
          await this.persist();
        }
        return result;
      } catch (error) {
        throw new Error(`Blank evaluation failed: ${error}`);
      }
    } else {
      payload = {
        sessionId,
        scope: 'commit',
        commitAnswer: { explanation: answer, diffBlockId: 'active-diff' },
      };
    }

    return this.forwardEvaluate(payload);
  }

  async submitQuizAnswer(questionId: string, selectedIndex: number): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    const payload: EvaluateRequest = {
      sessionId: this.state.sessionId,
      scope: 'quiz',
      quizAnswer: { questionId, selectedIndex },
    };

    return this.forwardEvaluate(payload);
  }

  async submitBugAnswer(identifiedLine: number, explanation: string): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    const metadata = this.state.pendingGates[0]?.metadata;
    const sabotage = metadata?.sabotage;
    const editor = vscode.window.activeTextEditor;
    if (!sabotage || !editor) {
      throw new Error('Bug challenge metadata is missing. Re-run the analysis to regenerate this challenge.');
    }

    const response = await bridgeFetch('/sabotage/fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: this.state.sessionId,
        bugId: sabotage.bugId,
        originalCode: metadata.originalCode,
        sabotagedCode: sabotage.sabotagedCode,
        originalLine: sabotage.originalLine,
        originalContent: sabotage.originalContent,
        sabotagedContent: sabotage.sabotagedContent,
        bugType: sabotage.bugType,
        fixedCode: editor.document.getText(),
        identifiedLine,
        explanation,
      }),
    });

    if (!response.ok) {
      throw new Error(`Bug fix evaluation failed: API returned ${response.status}`);
    }

    const result = (await response.json()) as EvaluateResponse;
    if (result.passed) {
      await this.unlockGate();
    } else {
      this.state.currentAttempts++;
      await this.persist();
    }

    return result;
  }

  async requestMentorHint(question: string): Promise<MentorHintResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    try {
      const editor = vscode.window.activeTextEditor;
      const code = editor?.document.getText() || this.state.pendingGates[0]?.metadata?.originalCode;

      if (!code) {
        throw new Error('No active code context available');
      }

      const response = await bridgeFetch('/mentor/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          question,
          language: editor?.document.languageId,
          sessionId: this.state.sessionId,
          attemptNumber: Math.max(1, this.state.currentAttempts + 1),
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      return (await response.json()) as MentorHintResponse;
    } catch (error) {
      throw new Error(`Mentor request failed: ${error}`);
    }
  }

  async requestStudyRecommendation(): Promise<StudyRecommendationResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    const editor = vscode.window.activeTextEditor;
    const code = editor?.document.getText() || this.state.pendingGates[0]?.metadata?.originalCode;
    if (!code) {
      throw new Error('No active code context available');
    }

    try {
      const response = await bridgeFetch('/study/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: editor?.document.languageId,
          sessionId: this.state.sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      return (await response.json()) as StudyRecommendationResponse;
    } catch (error) {
      throw new Error(`Study recommendation failed: ${error}`);
    }
  }

  private async forwardEvaluate(payload: EvaluateRequest): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    try {
      const response = await bridgeFetch('/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const result = (await response.json()) as EvaluateResponse;

      if (result.passed) {
        await this.unlockGate();
      } else {
        this.state.currentAttempts++;
        await this.persist();
      }

      return result;
    } catch (error) {
      throw new Error(`Evaluation failed: ${error}`);
    }
  }

  private async unlockGate(): Promise<void> {
    if (!this.state) {
      return;
    }

    const approval: BridgeApproval = {
      token: generateId(),
      sessionId: this.state.sessionId,
      scope: this.state.activeGate || 'commit',
      expiresAt: expiresIn(3600),
      reason: 'User demonstrated understanding',
    };

    this.state.approvals.push(approval);
    this.state.pendingGates.shift();
    this.state.currentAttempts = 0;

    if (this.state.pendingGates.length === 0) {
      this.state.isLocked = false;
      this.state.activeGate = null;
    } else {
      this.state.activeGate = this.state.pendingGates[0].scope;
      if (this.state.activeGate === 'bug') {
        await this.applyBugChallengeToEditor();
      }
    }

    this._onDidUnlockGate.fire();
    await this.persist();
  }

  private async applyBugChallengeToEditor(): Promise<void> {
    if (!this.state || this.state.activeGate !== 'bug') {
      return;
    }

    const metadata = this.state.pendingGates[0]?.metadata;
    const sabotage = metadata?.sabotage;
    const filePath = metadata?.filePath;
    if (!sabotage?.sabotagedCode || !filePath) {
      return;
    }

    let editor =
      vscode.window.visibleTextEditors.find((candidate) => candidate.document.uri.fsPath === filePath) ??
      null;

    if (!editor) {
      const document = await vscode.workspace.openTextDocument(filePath);
      editor = await vscode.window.showTextDocument(document, { preview: false });
    }

    if (editor.document.getText() === sabotage.sabotagedCode) {
      return;
    }

    const fullRange = new vscode.Range(
      editor.document.positionAt(0),
      editor.document.positionAt(editor.document.getText().length),
    );

    await editor.edit((builder) => {
      builder.replace(fullRange, sabotage.sabotagedCode);
    });

    vscode.window.showWarningMessage('Bridge: A small bug was injected. Fix it to continue.');
  }

  getCurrentGateFilePath(): string | undefined {
    // Try to find file path in the active gate metadata
    if (this.state?.pendingGates.length) {
      return this.state.pendingGates[0].metadata?.filePath;
    }
    return undefined;
  }

  getCurrentBlockIndex(): number {
    // For simplicity, we assume we're always working on the first pending block
    // A more advanced version would track which block is currently focused in the UI
    return 0;
  }

  getAllGatedBlocks(): Array<{ startLine: number; endLine: number; reason: string }> | undefined {
    if (this.state?.pendingGates.length) {
      return this.state.pendingGates[0].metadata?.gatedBlocks;
    }
    return undefined;
  }

  private async persist(): Promise<void> {
    if (this.state) {
      await this.context.workspaceState.update('bridge.session', this.state);
    }
    this._onDidChangeSession.fire(this.state);
  }
}
