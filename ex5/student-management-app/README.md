# 🎓 Student Management CRUD App

A full-stack Student Management application built with **React**, **Node.js/Express**, and **PostgreSQL**.

---

## Tech Stack

| Layer     | Technology           |
|-----------|----------------------|
| Frontend  | React + Vite         |
| Backend   | Node.js + Express.js |
| Database  | PostgreSQL            |
| API Client| Axios                |
| Routing   | React Router DOM     |

---

## Features

- ✅ View all students in a searchable table
- ✅ Add a new student with form validation
- ✅ Edit an existing student record
- ✅ Delete with confirmation modal
- ✅ GPA color-coded badges
- ✅ Avatar initials per student
- ✅ Toast notifications
- ✅ Responsive dark-mode UI

---

## Project Structure

```
student-management-app/
├── client/          # React (Vite) frontend
├── server/          # Node.js + Express backend
│   ├── config/      # DB connection
│   ├── models/      # SQL queries
│   ├── middleware/  # Input validation
│   ├── controllers/ # Route handlers
│   └── routes/      # Express routes
└── database/        # SQL schema
```

---

## Getting Started

### 1. PostgreSQL Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE student_management;"

# Run the schema
psql -U postgres -d student_management -f database/schema.sql
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials
npm install
npm run dev
# Server runs at http://localhost:5000
```

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
# App runs at http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | /api/students         | Get all students     |
| GET    | /api/students/:id     | Get student by ID    |
| POST   | /api/students         | Create new student   |
| PUT    | /api/students/:id     | Update student       |
| DELETE | /api/students/:id     | Delete student       |

---

## Author

Task 5 — Mini-Project 1 | Student Management CRUD App
