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


-- This checks if the record exists regardless of UI glitches
SELECT * FROM nl_query_history;


select * from users;

select * from url_history;


-- Dummy Database
-- =========================
-- 1. Departments Table
-- =========================
CREATE TABLE Departments (
    Dept_ID INT PRIMARY KEY,
    Dept_Name VARCHAR(50),
    Manager_ID INT,
    Location VARCHAR(50)
);

INSERT INTO Departments VALUES
(1,'Human Resources',101,'Mumbai'),
(2,'Finance',102,'Pune'),
(3,'IT',103,'Bangalore'),
(4,'Marketing',105,'Delhi'),
(5,'Sales',107,'Hyderabad'),
(6,'R&D',109,'Chennai'),
(7,'Customer Support',104,'Mumbai'),
(8,'Logistics',106,'Pune'),
(9,'Legal',108,'Delhi'),
(10,'Administration',110,'Bangalore');

-- =========================
-- 2. Employees Table
-- =========================
CREATE TABLE Employees (
    Emp_ID INT PRIMARY KEY,
    First_Name VARCHAR(50),
    Last_Name VARCHAR(50),
    Gender CHAR(1),
    Hire_Date DATE,
    Dept_ID INT,
    Salary INT,
    FOREIGN KEY (Dept_ID) REFERENCES Departments(Dept_ID)
);

INSERT INTO Employees VALUES
(101,'Amit','Sharma','M','2021-01-15',1,60000),
(102,'Priya','Mehta','F','2020-03-10',2,65000),
(103,'Rahul','Verma','M','2019-07-21',3,70000),
(104,'Sneha','Patil','F','2022-02-11',1,55000),
(105,'Karan','Singh','M','2021-11-05',4,72000),
(106,'Pooja','Nair','F','2018-06-19',2,68000),
(107,'Arjun','Kapoor','M','2020-12-01',5,75000),
(108,'Neha','Joshi','F','2023-04-17',3,52000),
(109,'Vikram','Iyer','M','2017-09-29',4,80000),
(110,'Anjali','Desai','F','2021-08-08',5,69000);

-- =========================
-- 3. Projects Table
-- =========================
CREATE TABLE Projects (
    Project_ID INT PRIMARY KEY,
    Project_Name VARCHAR(100),
    Dept_ID INT,
    Start_Date DATE,
    End_Date DATE,
    FOREIGN KEY (Dept_ID) REFERENCES Departments(Dept_ID)
);

INSERT INTO Projects VALUES
(201,'Payroll System',3,'2023-01-01','2023-12-31'),
(202,'Marketing Campaign',4,'2022-06-01','2023-06-01'),
(203,'Recruitment Portal',1,'2023-02-15','2023-10-30'),
(204,'Sales Dashboard',5,'2023-03-10','2023-11-10'),
(205,'Financial Audit',2,'2022-04-01','2022-12-31'),
(206,'Customer App',3,'2023-05-01','2024-01-01'),
(207,'Product Research',6,'2023-07-01','2024-07-01'),
(208,'Support Automation',7,'2023-06-15','2024-02-15'),
(209,'Supply Chain System',8,'2023-08-01','2024-06-01'),
(210,'Legal Compliance Tool',9,'2023-09-01','2024-03-01');

-- =========================
-- 4. Employee_Project Table
-- =========================
CREATE TABLE Employee_Project (
    Emp_ID INT,
    Project_ID INT,
    Role VARCHAR(50),
    PRIMARY KEY (Emp_ID, Project_ID),
    FOREIGN KEY (Emp_ID) REFERENCES Employees(Emp_ID),
    FOREIGN KEY (Project_ID) REFERENCES Projects(Project_ID)
);

INSERT INTO Employee_Project VALUES
(101,203,'HR Analyst'),
(102,205,'Financial Analyst'),
(103,201,'Software Developer'),
(104,203,'Recruiter'),
(105,202,'Marketing Lead'),
(106,205,'Accountant'),
(107,204,'Sales Manager'),
(108,201,'Tester'),
(109,207,'Research Lead'),
(110,210,'Compliance Officer');

-- =========================
-- 5. Attendance Table
-- =========================
CREATE TABLE Attendance (
    Attendance_ID INT PRIMARY KEY,
    Emp_ID INT,
    Date DATE,
    Status VARCHAR(20),
    FOREIGN KEY (Emp_ID) REFERENCES Employees(Emp_ID)
);

INSERT INTO Attendance VALUES
(1,101,'2024-01-01','Present'),
(2,102,'2024-01-01','Present'),
(3,103,'2024-01-01','Absent'),
(4,104,'2024-01-01','Present'),
(5,105,'2024-01-01','Present'),
(6,106,'2024-01-01','Leave'),
(7,107,'2024-01-01','Present'),
(8,108,'2024-01-01','Present'),
(9,109,'2024-01-01','Absent'),
(10,110,'2024-01-01','Present');






