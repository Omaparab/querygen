-- The Master Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL
);


-- Sessions (Deleted if user is deleted)
CREATE TABLE query_sessions (
    session_id VARCHAR(100) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, 
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- Natural Language History (Deleted if user is deleted)
CREATE TABLE nl_query_history (
    history_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE, 
    query_text TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SQL results (Deleted if the parent history item is deleted)
CREATE TABLE generated_sql (
    sql_id SERIAL PRIMARY KEY,
    history_id INT REFERENCES nl_query_history(history_id) ON DELETE CASCADE,
    sql_text TEXT,
    is_valid BOOLEAN,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed BOOLEAN DEFAULT FALSE
);

-- Approvals (Deleted if user OR the SQL is deleted)
CREATE TABLE sql_approvals (
    approval_id SERIAL PRIMARY KEY,
    sql_id INT REFERENCES generated_sql(sql_id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    approval_status VARCHAR(20) CHECK (approval_status IN ('approved', 'rejected', 'pending')),
    approved_at TIMESTAMP
);

-- Audit Logs (Deleted if user is deleted)
CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    history_id INT REFERENCES nl_query_history(history_id) ON DELETE SET NULL, -- Keep log text, but remove link to history
    generated_sql TEXT,
    approval_status VARCHAR(20),
    execution_status VARCHAR(20),
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback (Deleted if history is deleted)
CREATE TABLE feedback (
    feedback_id SERIAL PRIMARY KEY,
    history_id INT REFERENCES nl_query_history(history_id) ON DELETE CASCADE,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metadata (Static table, no foreign keys)
CREATE TABLE schema_metadata (
    table_name VARCHAR(100),
    column_name VARCHAR(100),
    data_type VARCHAR(50),
    is_primary_key BOOLEAN,
    is_foreign_key BOOLEAN
);

-- Performance Metrics (Static table, no foreign keys)
CREATE TABLE performance_metrics (
    metric_id SERIAL PRIMARY KEY,
    exact_match_accuracy FLOAT,
    logical_accuracy FLOAT,
    execution_accuracy FLOAT,
    precision FLOAT,
    recall FLOAT,
    f1_score FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- User URLs for database 
CREATE TABLE url_history (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    database_url TEXT PRIMARY KEY
);









