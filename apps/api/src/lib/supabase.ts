import { createClient } from '@supabase/supabase-js';
import { logger } from '@bridge/shared-utils';
import dotenv from 'dotenv';
import path from 'path';

// Ensure env vars are available even when modules are imported before server bootstrap.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env'), override: false });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '..', '.env'), override: false });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  logger.warn('Supabase credentials not configured - some features may not work');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database type definitions
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          session_id: string;
          is_locked: boolean;
          active_gate: string | null;
          current_attempts: number;
          max_attempts: number;
          created_at: string;
        };
        Insert: {
          session_id: string;
          is_locked?: boolean;
          active_gate?: string | null;
          current_attempts?: number;
          max_attempts?: number;
          created_at?: string;
        };
        Update: {
          session_id?: string;
          is_locked?: boolean;
          active_gate?: string | null;
          current_attempts?: number;
          max_attempts?: number;
          created_at?: string;
        };
      };
      pending_gates: {
        Row: {
          id: string;
          session_id: string;
          scope: string;
          analysis_id: string;
          created_at: string;
          metadata: any;
        };
        Insert: {
          id?: string;
          session_id: string;
          scope: string;
          analysis_id: string;
          created_at?: string;
          metadata?: any;
        };
        Update: {
          id?: string;
          session_id?: string;
          scope?: string;
          analysis_id?: string;
          created_at?: string;
          metadata?: any;
        };
      };
      approvals: {
        Row: {
          token: string;
          session_id: string;
          scope: string;
          expires_at: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          token?: string;
          session_id: string;
          scope: string;
          expires_at: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          token?: string;
          session_id?: string;
          scope?: string;
          expires_at?: string;
          reason?: string;
          created_at?: string;
        };
      };
    };
  };
}
