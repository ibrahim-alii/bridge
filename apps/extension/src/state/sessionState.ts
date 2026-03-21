import * as vscode from 'vscode';
import type {
  SessionState,
  BridgeApproval,
  AnalyzeResponse,
  EvaluateResponse,
} from '@bridge/contracts';
import { generateId, expiresIn, logger } from '@bridge/shared-utils';

const API_BASE = 'http://localhost:3727/api';

/**
 * Manages Bridge session state and API communication.
 * In mock mode, keeps state in-memory. In live mode, syncs with the API.
 */
export class SessionManager {
  private state: SessionState | null = null;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;

    // Restore session from workspace state
    const saved = context.workspaceState.get<SessionState>('bridge.session');
    if (saved) {
      this.state = saved;
      logger.info('Restored Bridge session', { sessionId: saved.sessionId });
    }
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
      // Fallback to local mock session
      logger.warn('API unreachable, creating local mock session');
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

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = (await response.json()) as AnalyzeResponse;

      // Create gate from analysis
      if (result.suggestedGate !== 'none') {
        this.state!.isLocked = true;
        this.state!.activeGate = result.suggestedGate;
        this.state!.pendingGates.push({
          scope: result.suggestedGate,
          analysisId: result.analysisId,
          createdAt: new Date().toISOString(),
        });
        await this.persist();
      }

      return result;
    } catch {
      // Mock fallback
      logger.warn('Using mock analysis response');
      return {
        analysisId: generateId(),
        complexity: 5,
        concepts: ['mock'],
        summary: 'Mock analysis result.',
        suggestedGate: 'quiz',
        gatedBlocks: [],
      };
    }
  }

  async submitAnswer(answer: string): Promise<EvaluateResponse> {
    if (!this.state) {
      throw new Error('No active session');
    }

    try {
      const response = await fetch(`${API_BASE}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.state.sessionId,
          scope: this.state.activeGate || 'commit',
          commitAnswer: {
            explanation: answer,
            diffBlockId: 'current',
          },
        }),
      });

      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const result = (await response.json()) as EvaluateResponse;

      if (result.passed) {
        await this.unlockGate();
      } else {
        this.state.currentAttempts++;
        await this.persist();
      }

      return result;
    } catch {
      // Mock fallback — always pass
      await this.unlockGate();
      return {
        passed: true,
        feedback: 'Mock: answer accepted.',
      };
    }
  }

  private async unlockGate(): Promise<void> {
    if (!this.state) return;

    const approval: BridgeApproval = {
      token: generateId(),
      sessionId: this.state.sessionId,
      scope: this.state.activeGate || 'commit',
      expiresAt: expiresIn(3600), // 1 hour
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

  private async persist(): Promise<void> {
    if (this.state) {
      await this.context.workspaceState.update('bridge.session', this.state);
    }
  }
}
