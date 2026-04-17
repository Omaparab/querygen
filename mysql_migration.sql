-- ============================================================
-- QueryGen MySQL Migration (Full Setup)
-- Run with: mysql -u root -paditya test < mysql_migration.sql
-- ============================================================
create schema querygen;
use querygen;
-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role  VARCHAR(20) NOT NULL DEFAULT 'viewer',
    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'auditor_read', 'auditor_write', 'viewer'))
);


-- 2. Query Sessions
CREATE TABLE IF NOT EXISTS query_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id    INT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at   TIMESTAMP NULL,
    CONSTRAINT fk_qs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Natural Language Query History
CREATE TABLE IF NOT EXISTS nl_query_history (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    query_text TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_nlh_user    FOREIGN KEY (user_id)    REFERENCES users(id)           ON DELETE CASCADE,
    CONSTRAINT fk_nlh_session FOREIGN KEY (session_id) REFERENCES query_sessions(session_id) ON DELETE SET NULL
);

-- 4. Generated SQL
CREATE TABLE IF NOT EXISTS generated_sql (
    sql_id       INT AUTO_INCREMENT PRIMARY KEY,
    history_id   INT,
    sql_text     TEXT,
    is_valid     TINYINT(1),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed     TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_gs_history FOREIGN KEY (history_id) REFERENCES nl_query_history(history_id) ON DELETE CASCADE
);

-- 5. SQL Approvals
CREATE TABLE IF NOT EXISTS sql_approvals (
    approval_id     INT AUTO_INCREMENT PRIMARY KEY,
    sql_id          INT,
    user_id         INT,
    approval_status VARCHAR(20),
    approved_at     TIMESTAMP NULL,
    CONSTRAINT chk_approval_status CHECK (approval_status IN ('approved', 'rejected', 'pending')),
    CONSTRAINT fk_sa_sql  FOREIGN KEY (sql_id)  REFERENCES generated_sql(sql_id) ON DELETE CASCADE,
    CONSTRAINT fk_sa_user FOREIGN KEY (user_id) REFERENCES users(id)             ON DELETE CASCADE
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT,
    history_id       INT,
    generated_sql    TEXT,
    approval_status  VARCHAR(20),
    execution_status VARCHAR(20),
    logged_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_al_user    FOREIGN KEY (user_id)    REFERENCES users(id)                   ON DELETE CASCADE,
    CONSTRAINT fk_al_history FOREIGN KEY (history_id) REFERENCES nl_query_history(history_id) ON DELETE SET NULL
);

-- 7. Feedback
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id  INT AUTO_INCREMENT PRIMARY KEY,
    history_id   INT,
    user_id      INT,
    rating       INT,
    comments     TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_feedback_rating CHECK (rating IN (1, -1)),
    CONSTRAINT uq_feedback_user_history UNIQUE (history_id, user_id),
    CONSTRAINT fk_fb_history FOREIGN KEY (history_id) REFERENCES nl_query_history(history_id) ON DELETE CASCADE,
    CONSTRAINT fk_fb_user    FOREIGN KEY (user_id)    REFERENCES users(id)                    ON DELETE CASCADE
);

-- 8. Schema Metadata
CREATE TABLE IF NOT EXISTS schema_metadata (
    table_name     VARCHAR(100),
    column_name    VARCHAR(100),
    data_type      VARCHAR(50),
    is_primary_key TINYINT(1),
    is_foreign_key TINYINT(1)
);

-- 9. Performance Metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    metric_id          INT AUTO_INCREMENT PRIMARY KEY,
    exact_match_accuracy FLOAT,
    logical_accuracy     FLOAT,
    execution_accuracy   FLOAT,
    `precision`          FLOAT,
    recall               FLOAT,
    f1_score             FLOAT,
    recorded_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. URL History
CREATE TABLE IF NOT EXISTS url_history (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT,
    database_url TEXT NOT NULL,
    CONSTRAINT fk_uh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Execution Logs (RBAC)
CREATE TABLE IF NOT EXISTS execution_logs (
    log_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT,
    sql_text      TEXT NOT NULL,
    query_type    VARCHAR(10),
    exec_status   VARCHAR(10),
    error_msg     TEXT,
    rows_affected INT,
    executed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_exec_query_type  CHECK (query_type  IN ('SELECT', 'WRITE')),
    CONSTRAINT chk_exec_status      CHECK (exec_status IN ('success', 'denied', 'error')),
    CONSTRAINT fk_el_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Row Policies (RLS)
CREATE TABLE IF NOT EXISTS row_policies (
    policy_id  INT AUTO_INCREMENT PRIMARY KEY,
    role       VARCHAR(20) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    filter_col VARCHAR(100) NOT NULL,
    filter_val TEXT NOT NULL,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rp_role CHECK (role IN ('admin', 'auditor_read', 'auditor_write', 'viewer')),
    CONSTRAINT uq_row_policy UNIQUE (role, table_name, filter_col),
    CONSTRAINT fk_rp_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- SEED: Set yourself as admin (replace email as needed)
-- UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================
