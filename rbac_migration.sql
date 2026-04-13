-- ============================================================
-- RBAC Migration for QueryGen
-- Run with: psql -U postgres -d main -f rbac_migration.sql
-- ============================================================

-- 1. Add role column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'viewer'
  CHECK (role IN ('admin', 'auditor_read', 'auditor_write', 'viewer'));

-- 2. Execution audit log table
CREATE TABLE IF NOT EXISTS execution_logs (
    log_id       SERIAL PRIMARY KEY,
    user_id      INT REFERENCES users(id) ON DELETE CASCADE,
    sql_text     TEXT NOT NULL,
    query_type   VARCHAR(10) CHECK (query_type IN ('SELECT', 'WRITE')),
    exec_status  VARCHAR(10) CHECK (exec_status IN ('success', 'denied', 'error')),
    error_msg    TEXT,
    rows_affected INT,
    executed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED: Set the first admin (replace with your actual email)
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================
