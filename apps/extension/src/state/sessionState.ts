import * as vscode from 'vscode';
import type {
  SessionState,
  BridgeApproval,
  AnalyzeResponse,
  EvaluateResponse,
  EvaluateRequest,
} from '@bridge/contracts';
import { generateId, expiresIn, logger } from '@bridge/shared-utils';

const API_BASE = 'http://localhost:3727/api';

/**
 * Holds session snapshot and forwards requests to the backend.
 * Does not implement grading or policy — responses drive UI updates.
 */
export class SessionManager implements vscode.Disposable {
  private state: SessionState | null = null;
  private readonly context: vscode.ExtensionContext;
  private readonly _onDidChangeSession = new vscode.EventEmitter<SessionState | null>();
  readonly onDidChangeSession = this._onDidChangeSession.event;

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
    try {
      const response = await fetch(`${API_BASE}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = (await response.json()) as { sessionId: string; state: SessionState };
      this.state = data.state;
    } catch {
      logger.warn('API unreachable, creating local placeholder session');
      this.state = {
        sessionId: generateId(),
        isLocked: false,
        activeGate: null,
        pendingGates: [],
        approvals: [],
        currentAttempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
      };
    }

    await this.persist();
    return this.state!;
  }

  async analyzeCode(code: string, filePath: string, language: string): Promise<AnalyzeResponse> {
    if (!this.state) {
      await this.createSession();
    }

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
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

      if (result.suggestedGate !== 'none' && this.state) {
        this.state.isLocked = true;
        this.state.activeGate = result.suggestedGate;
        this.state.pendingGates.push({
          scope: result.suggestedGate,
          analysisId: result.analysisId,
          createdAt: new Date().toISOString(),
          metadata: {
            gatedBlocks: result.gatedBlocks,
            filePath: filePath,
            currentBlockIndex: 0,
          },
        });
        await this.persist();
      }

      return result;
    } catch {
      logger.warn('Using placeholder analysis — locking for UI preview');
      const mock: AnalyzeResponse = {
        analysisId: generateId(),
        complexity: 5,
        concepts: ['placeholder'],
        summary: 'Placeholder analysis — connect API for real results.',
        suggestedGate: 'quiz',
        gatedBlocks: [],
      };
      if (this.state && mock.suggestedGate !== 'none') {
        this.state.isLocked = true;
        this.state.activeGate = mock.suggestedGate;
        this.state.pendingGates.push({
          scope: mock.suggestedGate,
          analysisId: mock.analysisId,
          createdAt: new Date().toISOString(),
          metadata: {
            gatedBlocks: mock.gatedBlocks,
            filePath: filePath,
            currentBlockIndex: 0,
          },
        });
        await this.persist();
      }
      return mock;
    }
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
      payload = {
        sessionId,
        scope: 'blank',
        blankAnswer: { code: answer, blockId: 'placeholder' },
      };
    } else {
      payload = {
        sessionId,
        scope: 'commit',
        commitAnswer: { explanation: answer, diffBlockId: 'placeholder' },
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

    const payload: EvaluateRequest = {
      sessionId: this.state.sessionId,
      scope: 'bug',
      bugAnswer: { identifiedLine, explanation },
    };

    return this.forwardEvaluate(payload);
  }

  async requestMentorHint(): Promise<{ hint: string }> {
    if (!this.state) {
      throw new Error('No active session');
    }

    try {
      const response = await fetch(`${API_BASE}/mentor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.state.sessionId,
          activeGate: this.state.activeGate,
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      const data = (await response.json()) as { hint: string };
      return { hint: data.hint };
    } catch {
      return {
        hint: 'Placeholder: connect POST /mentor for Socratic hints. Ask what invariant the code must keep, or what changes when input is empty.',
      };
    }
  }

  private async forwardEvaluate(payload: EvaluateRequest): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    try {
      const response = await fetch(`${API_BASE}/evaluate`, {
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
    } catch {
      return {
        passed: false,
        feedback: 'Backend unavailable — answer not evaluated. Wire /evaluate to continue.',
        hint: 'The extension only forwards; grading lives on the server.',
      };
    }
  }

  async unlockGate(): Promise<void> {
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
    }

    await this.persist();
  }

  /**
   * Get the current gated block that needs to be explained
   */
  getCurrentGatedBlock(): { startLine: number; endLine: number; reason: string } | null {
    if (!this.state || this.state.pendingGates.length === 0) {
      return null;
    }

    const currentGate = this.state.pendingGates[0];
    const metadata = currentGate.metadata;

    if (!metadata || !metadata.gatedBlocks || metadata.gatedBlocks.length === 0) {
      return null;
    }

    const blockIndex = metadata.currentBlockIndex ?? 0;
    if (blockIndex >= metadata.gatedBlocks.length) {
      return null;
    }

    return metadata.gatedBlocks[blockIndex];
  }

  /**
   * Advance to the next block in the current gate
   * Returns true if more blocks remain, false if all blocks completed
   */
  async advanceToNextBlock(): Promise<boolean> {
    if (!this.state || this.state.pendingGates.length === 0) {
      return false;
    }

    const currentGate = this.state.pendingGates[0];
    const metadata = currentGate.metadata;

    if (!metadata || !metadata.gatedBlocks) {
      return false;
    }

    const currentIndex = metadata.currentBlockIndex ?? 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= metadata.gatedBlocks.length) {
      // All blocks completed
      return false;
    }

    // Advance to next block
    metadata.currentBlockIndex = nextIndex;
    this.state.currentAttempts = 0;
    await this.persist();
    return true;
  }

  /**
   * Get all gated blocks for the current gate
   */
  getAllGatedBlocks(): Array<{ startLine: number; endLine: number; reason: string }> | null {
    if (!this.state || this.state.pendingGates.length === 0) {
      return null;
    }

    const currentGate = this.state.pendingGates[0];
    return currentGate.metadata?.gatedBlocks ?? null;
  }

  /**
   * Get the current block index
   */
  getCurrentBlockIndex(): number {
    if (!this.state || this.state.pendingGates.length === 0) {
      return 0;
    }

    const currentGate = this.state.pendingGates[0];
    return currentGate.metadata?.currentBlockIndex ?? 0;
  }

  /**
   * Get the file path for the current gate
   */
  getCurrentGateFilePath(): string | null {
    if (!this.state || this.state.pendingGates.length === 0) {
      return null;
    }

    const currentGate = this.state.pendingGates[0];
    return currentGate.metadata?.filePath ?? null;
  }

  private async persist(): Promise<void> {
    if (this.state) {
      await this.context.workspaceState.update('bridge.session', this.state);
    }
    this._onDidChangeSession.fire(this.state);
  }
}
