-- Bridge Backend Policy & Evaluation - Supabase Schema
-- Run this in your Supabase SQL editor to create the required tables

-- ═══════════════════════════════════════════════════════════════
-- Sessions Table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  active_gate TEXT CHECK (active_gate IN ('blank', 'quiz', 'bug', 'commit')),
  current_attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Pending Gates Table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pending_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('blank', 'quiz', 'bug', 'commit')),
  analysis_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_gates_session_id ON pending_gates(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_gates_scope ON pending_gates(session_id, scope, created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Approvals Table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS approvals (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('blank', 'quiz', 'bug', 'commit')),
  expires_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_approvals_session_id ON approvals(session_id);
CREATE INDEX IF NOT EXISTS idx_approvals_expires_at ON approvals(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- Enable Row Level Security (Optional - recommended for production)
-- ═══════════════════════════════════════════════════════════════
-- Uncomment these if you want to enable RLS
-- ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pending_gates ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (modify as needed for your use case)
-- CREATE POLICY "Enable read access for service role" ON sessions FOR SELECT USING (true);
-- CREATE POLICY "Enable insert access for service role" ON sessions FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Enable update access for service role" ON sessions FOR UPDATE USING (true);

-- ═══════════════════════════════════════════════════════════════
-- Comments for documentation
-- ═══════════════════════════════════════════════════════════════
COMMENT ON TABLE sessions IS 'Tracks user session state for the Bridge trust layer';
COMMENT ON TABLE pending_gates IS 'Stores pending gates that users must complete, with gate-specific metadata in JSONB';
COMMENT ON TABLE approvals IS 'Stores approval tokens earned by passing gates';

COMMENT ON COLUMN pending_gates.metadata IS 'JSONB field storing gate-specific data: quiz questions, blank references, bug locations, diff contexts';
COMMENT ON COLUMN approvals.expires_at IS 'Approval tokens expire after 1 hour by default';
