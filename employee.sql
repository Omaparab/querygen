-- =========================
-- 1. departments table
-- =========================
create table departments (
    dept_id int primary key,
    dept_name varchar(50),
    manager_id int,
    location varchar(50)
);

insert into departments values
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
-- 2. employees table
-- =========================
create table employees (
    emp_id int primary key,
    first_name varchar(50),
    last_name varchar(50),
    gender char(1),
    hire_date date,
    dept_id int,
    salary int,
    foreign key (dept_id) references departments(dept_id)
);

insert into employees values
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
-- 3. projects table
-- =========================
create table projects (
    project_id int primary key,
    project_name varchar(100),
    dept_id int,
    start_date date,
    end_date date,
    foreign key (dept_id) references departments(dept_id)
);

insert into projects values
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
-- 4. employee_project table
-- =========================
create table employee_project (
    emp_id int,
    project_id int,
    role varchar(50),
    primary key (emp_id, project_id),
    foreign key (emp_id) references employees(emp_id),
    foreign key (project_id) references projects(project_id)
);

insert into employee_project values
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
-- 5. attendance table
-- =========================
create table attendance (
    attendance_id int primary key,
    emp_id int,
    date date,
    status varchar(20),
    foreign key (emp_id) references employees(emp_id)
);

insert into attendance values
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

SELECT employee_project FROM employee_project WHERE project_id = 205;
