# Task 5 — Mini-Project 1: Student Management CRUD App
## Requirements Document

---

## 1. Project Overview

Build a **fully functional Student Management CRUD Application** with a modern full-stack architecture using React (frontend), Node.js/Express (backend), and PostgreSQL (database). The application must support real-world Create, Read, Update, and Delete (CRUD) operations for student records and course programs, bulk CSV imports, CSV exports, and feature a premium, responsive Behance-style "Bento-Box" UI.

---

## 2. Tech Stack

| Layer      | Technology               | Purpose                          |
|------------|--------------------------|----------------------------------|
| Frontend   | React (Vite)             | UI and user interactions         |
| Backend    | Node.js + Express.js     | REST API server                  |
| Database   | PostgreSQL               | Persistent data storage          |
| ORM        | pg / node-postgres       | Raw SQL queries with pg library  |
| Styling    | Tailwind CSS v4            | Utility-first CSS, custom @theme block |
| CSV Parser | PapaParse                | Client-side CSV file parsing     |
| Icons      | lucide-react             | Modern vector iconography        |

---

## 3. Functional Requirements

### 3.1 Entities

#### Student Entity
| Field         | Type        | Constraints                        |
|---------------|-------------|------------------------------------|
| id            | SERIAL INT  | Primary Key, Auto-increment        |
| first_name    | VARCHAR(50) | NOT NULL                           |
| last_name     | VARCHAR(50) | NOT NULL                           |
| email         | VARCHAR(100)| NOT NULL, UNIQUE                   |
| date_of_birth | DATE        | NOT NULL                           |
| course        | VARCHAR(100)| NOT NULL                           |
| enrollment_date | DATE      | Default: current date              |
| gpa           | DECIMAL(3,2)| Optional, range: 0.00 – 5.00       |
| created_at    | TIMESTAMP   | Auto-set on creation               |
| updated_at    | TIMESTAMP   | Auto-updated on modification       |

#### Course Entity
| Field         | Type        | Constraints                        |
|---------------|-------------|------------------------------------|
| id            | SERIAL INT  | Primary Key, Auto-increment        |
| name          | VARCHAR(100)| NOT NULL, UNIQUE                   |
| created_at    | TIMESTAMP   | Auto-set on creation               |

---

### 3.2 Student CRUD Operations
- **CREATE**: Add a New Student with full validation.
- **READ**: View Students in a minimalist table with pill-shaped badges.
- **UPDATE**: Edit a Student, dynamically fetching course dropdowns.
- **DELETE**: Remove a Student with confirmation modals.

### 3.3 Course Management
- **CREATE/UPDATE/DELETE Courses**: Manage available academic programs.
- **Cascade Updates**: Renaming a course must automatically update the course name for all enrolled students.
- **Delete Protection**: Prevent deleting courses that have active student enrollments.

### 3.4 Advanced Features
- **Dashboard Analytics**: Bento-box style dashboard showing total students, average GPA, course breakdown (bar charts), and recent enrollments.
- **Advanced Filtering & Sorting**: Filter by Course, GPA Min/Max, and Enrollment Year. Sort columns dynamically.
- **Bulk CSV Import**: Import hundreds of students at once via CSV drag-and-drop using PapaParse.
- **Export to CSV**: Export the currently filtered list of students to a downloadable CSV.
- **Responsive Layout**: Desktop Left Sidebar navigating down to a Mobile Bottom Tab Bar. Tables dynamically convert into vertical flex cards on smaller screens to prevent horizontal scrolling.

---

## 4. API Routes (REST)

### Students
| Method | Endpoint              | Description                     | Request Body           |
|--------|-----------------------|---------------------------------|------------------------|
| GET    | /api/students         | Get all students                | —                      |
| GET    | /api/students/stats   | Get dashboard statistics        | —                      |
| POST   | /api/students         | Create a new student            | Student JSON object    |
| POST   | /api/students/bulk    | Bulk import multiple students   | Array of Student JSON  |
| PUT    | /api/students/:id     | Update a student by ID          | Updated fields JSON    |
| DELETE | /api/students/:id     | Delete a student by ID          | —                      |

### Courses
| Method | Endpoint              | Description                     | Request Body           |
|--------|-----------------------|---------------------------------|------------------------|
| GET    | /api/courses          | Get all courses                 | —                      |
| POST   | /api/courses          | Create a new course             | { name }               |
| PUT    | /api/courses/:id      | Update course name (cascade)    | { oldName, newName }   |
| DELETE | /api/courses/:id      | Delete a course                 | { name }               |

---

## 5. Non-Functional Requirements

| Category       | Requirement                                                                 |
|----------------|-----------------------------------------------------------------------------|
| UI/UX Aesthetics| Implement a "wow-factor" design using Glassmorphism, Neumorphism, gradients, and soft floating drop shadows (Behance-style). |
| Responsiveness | Must function flawlessly on mobile devices (Bottom Tab Bar, stacked table cards). |
| Security       | Input validation and sanitization on both client and server                 |
| Error Handling | Meaningful HTTP status codes (200, 201, 400, 404, 500) with error messages |

---

*Document Version: 2.0 | Author: Task 5 | Date: 2026-06-09*
