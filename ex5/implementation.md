# Task 5 — Student Management CRUD App
## Implementation Details

This document outlines the architecture, setup, and key implementations of the completed application.

---

## 1. Project Setup & Tech Stack

- **Frontend**: React (Vite)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL with `pg` driver
- **Styling**: Tailwind CSS v4 (Utility classes + custom `@theme` configuration)
- **Icons**: `lucide-react`
- **CSV Handling**: `papaparse` for importing, custom Blob construction for exporting.

---

## 2. Database Implementation

### Schema (`database/schema.sql`)
The PostgreSQL database consists of two primary tables:

```sql
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    course VARCHAR(100) NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    gpa DECIMAL(3,2) CHECK (gpa >= 0.00 AND gpa <= 5.00),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Backend Architecture

Located in `server/`, the backend follows the strict MVC (Model-View-Controller) design pattern.

### Models
- `studentModel.js`: Executes queries for students, including `getStats` for the dashboard and `bulkCreateStudents` for CSV imports.
- `courseModel.js`: Manages courses and handles cascading course name updates onto enrolled students to maintain referential integrity.

### Controllers
- `studentController.js`: Maps requests to student model operations.
- `courseController.js`: Manages course CRUD routes.

### Routing & Middleware
- All routes are mounted in `server.js` under `/api/students` and `/api/courses`.
- `validateStudent.js` middleware ensures standard CRUD inputs meet requirements before querying the DB.
- CORS is configured to allow `localhost:5173`.

---

## 4. Frontend Architecture

Located in `client/`, the Vite React application implements a responsive, premium "Bento-Box" UI.

### Services (`client/src/services/`)
- `studentService.js`: Wraps `fetch` calls to `/api/students`.
- `courseService.js`: Wraps `fetch` calls to `/api/courses`.

### Pages (`client/src/pages/`)
1. **HomePage.jsx**: 
   - A complex dashboard rendering analytical Bento boxes (Stats).
   - An advanced Filter/Search bar for text searching, Course filtering, and GPA ranging.
   - An interactive, responsive data table showing students.
2. **AddStudentPage.jsx** / **EditStudentPage.jsx**: Wrappers around the `StudentForm.jsx` component.
3. **CourseManagementPage.jsx**: A specialized dashboard with Modals for Creating, Updating, and Deleting course programs.

### Components (`client/src/components/`)
- **StudentForm.jsx**: Dynamically fetches active courses to populate a dropdown. Implements client-side regex and bound validation.
- **Navbar.jsx**: A responsive sidebar on Desktop that collapses into a bottom Tab bar with pure iconography on Mobile screens (< 768px).
- **BulkImportModal.jsx**: Allows drag-and-drop CSV importing, passing chunked data to the backend.

---

## 5. UI/UX Design System

The application was fully migrated to **Tailwind CSS v4** for its global design system:
- **Tailwind v4 Theme**: Custom colors (`bg-base`, `text-text-primary`), gradients, and shadows (`shadow-neu-in`, `shadow-neu-out`) are natively mapped into utility classes using the new `@theme` directive in `index.css`.
- **Glassmorphism**: Modals and cards use `backdrop-blur-md`, `bg-white/5` semi-transparent backgrounds, and `border-white/10` to look like frosted glass.
- **Neumorphism**: Elements utilize soft inner and outer box-shadow utilities to simulate physical depth.
- **Color Palette**: A stark, premium monochrome base offset by subtle accent colors for success/error/warning states.
- **Responsiveness**: Mobile layouts are handled natively via `md:` and `sm:` prefixes. The main data table collapses from a standard `table` display into stacked vertical flex cards (`flex-col`) on small screens, preventing any horizontal scrolling.

---

## 6. Deployment Instructions

1. Ensure PostgreSQL is running.
2. Create `.env` in `server/` with `DB_USER` and `DB_PASSWORD`.
3. Terminal 1: `cd server && npm install && npm start`
4. Terminal 2: `cd client && npm install && npm run dev`
5. Open `http://localhost:5173`.
