import { supabase } from '../lib/supabase';
import { generateId, logger } from '@bridge/shared-utils';
import type {
  SessionState,
  BridgeApproval,
  GateScope,
} from '@bridge/contracts';

interface PendingGate {
  scope: GateScope;
  analysisId: string;
  createdAt: string;
  metadata?: any;
}

export const sessionService = {
  /**
   * Creates a new session in Supabase.
   */
  async createSession(workspaceId?: string): Promise<SessionState> {
    const sessionId = generateId();
    const now = new Date().toISOString();

    const state: SessionState = {
      sessionId,
      isLocked: false,
      activeGate: null,
      pendingGates: [],
      approvals: [],
      currentAttempts: 0,
      maxAttempts: 3,
      createdAt: now,
    };

    try {
      const { error } = await supabase.from('sessions').insert({
        session_id: sessionId,
        is_locked: false,
        active_gate: null,
        current_attempts: 0,
        max_attempts: 3,
        created_at: now,
      });

      if (error) {
        logger.error('Failed to create session in Supabase', { error });
        throw new Error(`Supabase error: ${error.message}`);
      }

      logger.info('Session created', { sessionId });
      return state;
    } catch (err) {
      logger.error('Session creation failed', { error: err });
      throw err;
    }
  },

  /**
   * Retrieves a session from Supabase with all related data.
   */
  async getSession(sessionId: string): Promise<SessionState | null> {
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        logger.warn('Session not found', { sessionId, error: sessionError });
        return null;
      }

      // Fetch pending gates
      const { data: gatesData, error: gatesError } = await supabase
        .from('pending_gates')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (gatesError) {
        logger.error('Failed to fetch pending gates', { error: gatesError });
      }

      // Fetch approvals
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('approvals')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (approvalsError) {
        logger.error('Failed to fetch approvals', { error: approvalsError });
      }

      // Map to SessionState
      const state: SessionState = {
        sessionId: sessionData.session_id,
        isLocked: sessionData.is_locked,
        activeGate: sessionData.active_gate as GateScope | null,
        pendingGates:
          gatesData?.map((g) => ({
            scope: g.scope as GateScope,
            analysisId: g.analysis_id,
            createdAt: g.created_at,
            metadata: g.metadata,
          })) || [],
        approvals:
          approvalsData?.map((a) => ({
            token: a.token,
            sessionId: a.session_id,
            scope: a.scope as GateScope,
            expiresAt: a.expires_at,
            reason: a.reason,
          })) || [],
        currentAttempts: sessionData.current_attempts,
        maxAttempts: sessionData.max_attempts,
        createdAt: sessionData.created_at,
      };

      return state;
    } catch (err) {
      logger.error('Failed to get session', { sessionId, error: err });
      return null;
    }
  },

  /**
   * Updates a session's core fields in Supabase.
   */
  async updateSession(
    sessionId: string,
    updates: Partial<{
      isLocked: boolean;
      activeGate: GateScope | null;
      currentAttempts: number;
      maxAttempts: number;
    }>
  ): Promise<SessionState> {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          is_locked: updates.isLocked,
          active_gate: updates.activeGate,
          current_attempts: updates.currentAttempts,
          max_attempts: updates.maxAttempts,
        })
        .eq('session_id', sessionId);

      if (error) {
        logger.error('Failed to update session', { error });
        throw new Error(`Supabase error: ${error.message}`);
      }

      // Fetch and return updated state
      const updated = await this.getSession(sessionId);
      if (!updated) {
        throw new Error('Failed to fetch updated session');
      }

      return updated;
    } catch (err) {
      logger.error('Session update failed', { sessionId, error: err });
      throw err;
    }
  },

  /**
   * Adds a pending gate to the session.
   */
  async addPendingGate(sessionId: string, gate: PendingGate): Promise<void> {
    try {
      const { error } = await supabase.from('pending_gates').insert({
        session_id: sessionId,
        scope: gate.scope,
        analysis_id: gate.analysisId,
        created_at: gate.createdAt,
        metadata: gate.metadata,
      });

      if (error) {
        logger.error('Failed to add pending gate', { error });
        throw new Error(`Supabase error: ${error.message}`);
      }

      logger.debug('Pending gate added', { sessionId, scope: gate.scope });
    } catch (err) {
      logger.error('Failed to add pending gate', { sessionId, error: err });
      throw err;
    }
  },

  /**
   * Removes pending gates for a given scope after the user clears that challenge.
   */
  async removePendingGate(sessionId: string, scope: GateScope): Promise<void> {
    try {
      const { error } = await supabase
        .from('pending_gates')
        .delete()
        .eq('session_id', sessionId)
        .eq('scope', scope);

      if (error) {
        logger.error('Failed to remove pending gate', { error });
        throw new Error(`Supabase error: ${error.message}`);
      }
    } catch (err) {
      logger.error('Failed to remove pending gate', { sessionId, scope, error: err });
      throw err;
    }
  },

  /**
   * Retrieves gate-specific metadata for the most recent gate of a given scope.
   */
  async getGateMetadata(sessionId: string, scope: GateScope): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('pending_gates')
        .select('metadata')
        .eq('session_id', sessionId)
        .eq('scope', scope)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        logger.debug('No gate metadata found', { sessionId, scope });
        return null;
      }

      return data.metadata;
    } catch (err) {
      logger.error('Failed to get gate metadata', { sessionId, scope, error: err });
      return null;
    }
  },

  /**
   * Adds an approval token to the session.
   */
  async addApproval(sessionId: string, approval: BridgeApproval): Promise<void> {
    try {
      const { error } = await supabase.from('approvals').insert({
        token: approval.token,
        session_id: sessionId,
        scope: approval.scope,
        expires_at: approval.expiresAt,
        reason: approval.reason,
      });

      if (error) {
        logger.error('Failed to add approval', { error });
        throw new Error(`Supabase error: ${error.message}`);
      }

      logger.info('Approval added', { sessionId, scope: approval.scope });
    } catch (err) {
      logger.error('Failed to add approval', { sessionId, error: err });
      throw err;
    }
  },

  /**
   * Increments the attempt counter for the current gate.
   */
  async incrementAttempts(sessionId: string): Promise<SessionState> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return this.updateSession(sessionId, {
      currentAttempts: session.currentAttempts + 1,
    });
  },

  /**
   * Resets the attempt counter (after successful gate pass).
   */
  async resetAttempts(sessionId: string): Promise<SessionState> {
    return this.updateSession(sessionId, { currentAttempts: 0 });
  },
};
