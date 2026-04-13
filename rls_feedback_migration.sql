-- ============================================================
-- RLS + Feedback Migration for QueryGen
-- Run with: psql -U postgres -d main -f rls_feedback_migration.sql
-- ============================================================

-- 1. Row-Level Security policies table
--    Admins define per-role, per-table filters here.
--    When auditor_read queries table "employees", the engine
--    injects: AND "employees"."department" = 'Finance'
CREATE TABLE IF NOT EXISTS row_policies (
    policy_id  SERIAL PRIMARY KEY,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('admin','auditor_read','auditor_write','viewer')),
    table_name VARCHAR(100) NOT NULL,
    filter_col VARCHAR(100) NOT NULL,
    filter_val TEXT NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one filter per (role, table, column) combination
CREATE UNIQUE INDEX IF NOT EXISTS uq_row_policy
    ON row_policies (role, table_name, filter_col);

-- 2. The feedback table already exists in tables.sql, but we need
--    to also link it to a specific executed query (nl_query_history row).
--    Add a user_id so we know who rated it, and a thumbs boolean for simplicity.
--    If feedback table doesn't exist yet, create it:
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id  SERIAL PRIMARY KEY,
    history_id   INT REFERENCES nl_query_history(history_id) ON DELETE CASCADE,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    rating       INT CHECK (rating IN (1, -1)),   -- 1=thumbs up, -1=thumbs down
    comments     TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- If it already exists, just add missing columns safely:
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS rating INT;

-- Drop old CHECK constraint if it exists (5-star scale → thumbs)
-- This is safe to fail if the constraint doesn't exist
DO $$
BEGIN
  ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_rating_check;
  ALTER TABLE feedback ADD CONSTRAINT feedback_rating_check CHECK (rating IN (1, -1));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
