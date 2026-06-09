-- ============================================================
-- schema.sql — Student Management App Database Schema
-- Run: psql -U <user> -d student_management -f schema.sql
-- ============================================================

-- Drop existing table for clean re-runs during development
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS courses;

-- Create the courses table
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the students table
CREATE TABLE students (
    id               SERIAL PRIMARY KEY,
    first_name       VARCHAR(50)   NOT NULL,
    last_name        VARCHAR(50)   NOT NULL,
    email            VARCHAR(100)  NOT NULL UNIQUE,
    date_of_birth    DATE          NOT NULL,
    course           VARCHAR(100)  NOT NULL,
    enrollment_date  DATE          DEFAULT CURRENT_DATE,
    gpa              DECIMAL(3,2)  CHECK (gpa >= 0.00 AND gpa <= 5.00),
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Seed some sample data for testing
INSERT INTO courses (name)
VALUES
  ('Computer Science'),
  ('Data Science'),
  ('Web Development'),
  ('Software Engineering'),
  ('Cybersecurity'),
  ('Artificial Intelligence'),
  ('Cloud Computing'),
  ('Mobile Development');

-- Seed some sample data for testing
INSERT INTO students (first_name, last_name, email, date_of_birth, course, enrollment_date, gpa)
VALUES
  ('Alice',   'Johnson', 'alice.johnson@example.com',   '2002-04-15', 'Computer Science',   '2021-08-01', 3.85),
  ('Bob',     'Smith',   'bob.smith@example.com',       '2001-09-22', 'Data Science',       '2020-08-01', 3.40),
  ('Charlie', 'Brown',   'charlie.brown@example.com',   '2003-01-10', 'Web Development',    '2022-01-15', 3.60),
  ('Diana',   'Prince',  'diana.prince@example.com',    '2002-07-04', 'Software Engineering','2021-01-10', 3.90),
  ('Ethan',   'Hunt',    'ethan.hunt@example.com',      '2001-11-30', 'Cybersecurity',      '2020-08-01', 3.20);
