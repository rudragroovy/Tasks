// studentModel.js — Raw SQL queries for all student CRUD operations
// Uses parameterized queries ($1, $2...) to prevent SQL injection
const pool = require('../config/db');

// ── READ ALL ────────────────────────────────────────────────
const getAllStudents = async () => {
  const result = await pool.query('SELECT * FROM students ORDER BY created_at DESC');
  return result.rows;
};

// ── READ ONE ────────────────────────────────────────────────
const getStudentById = async (id) => {
  const result = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
  return result.rows[0];
};

// ── CREATE ──────────────────────────────────────────────────
const createStudent = async (studentData) => {
  const { first_name, last_name, email, date_of_birth, course, enrollment_date, gpa } = studentData;
  const result = await pool.query(
    `INSERT INTO students (first_name, last_name, email, date_of_birth, course, enrollment_date, gpa)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [first_name, last_name, email, date_of_birth, course, enrollment_date || null, gpa || null]
  );
  return result.rows[0];
};

// ── UPDATE ──────────────────────────────────────────────────
const updateStudent = async (id, studentData) => {
  const { first_name, last_name, email, date_of_birth, course, enrollment_date, gpa } = studentData;
  const result = await pool.query(
    `UPDATE students
     SET first_name=$1, last_name=$2, email=$3, date_of_birth=$4,
         course=$5, enrollment_date=$6, gpa=$7, updated_at=CURRENT_TIMESTAMP
     WHERE id=$8 RETURNING *`,
    [first_name, last_name, email, date_of_birth, course, enrollment_date || null, gpa || null, id]
  );
  return result.rows[0];
};

// ── DELETE ──────────────────────────────────────────────────
const deleteStudent = async (id) => {
  const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

// ── STATS (Dashboard) ────────────────────────────────────────
// Returns aggregate data: totals, avg GPA, course breakdown, recent enrollments
const getStats = async () => {
  const [totalRes, avgGpaRes, courseRes, monthRes, recentRes] = await Promise.all([
    pool.query('SELECT COUNT(*) AS total FROM students'),
    pool.query('SELECT ROUND(AVG(gpa)::numeric, 2) AS avg_gpa FROM students WHERE gpa IS NOT NULL'),
    pool.query(`
      SELECT course,
             COUNT(*) AS count,
             ROUND(AVG(gpa)::numeric, 2) AS avg_gpa
      FROM students
      GROUP BY course
      ORDER BY count DESC
    `),
    pool.query(`
      SELECT COUNT(*) AS this_month FROM students
      WHERE DATE_TRUNC('month', enrollment_date) = DATE_TRUNC('month', CURRENT_DATE)
    `),
    pool.query(`
      SELECT id, first_name, last_name, course, enrollment_date, gpa
      FROM students ORDER BY created_at DESC LIMIT 5
    `),
  ]);

  return {
    total:      parseInt(totalRes.rows[0].total),
    avg_gpa:    avgGpaRes.rows[0].avg_gpa,
    this_month: parseInt(monthRes.rows[0].this_month),
    courses:    courseRes.rows,
    recent:     recentRes.rows,
  };
};

// ── BULK CREATE (CSV Import) ──────────────────────────────────
// Inserts multiple students, collecting per-row errors without aborting the whole batch
const bulkCreateStudents = async (students) => {
  const client = await pool.connect();
  const results = { inserted: 0, errors: [] };

  try {
    await client.query('BEGIN');

    for (const [i, s] of students.entries()) {
      try {
        await client.query(
          `INSERT INTO students (first_name, last_name, email, date_of_birth, course, enrollment_date, gpa)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [s.first_name, s.last_name, s.email, s.date_of_birth, s.course,
           s.enrollment_date || null, s.gpa || null]
        );
        results.inserted++;
      } catch (err) {
        results.errors.push({ row: i + 1, email: s.email, reason: err.detail || err.message });
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return results;
};

module.exports = {
  getAllStudents, getStudentById, createStudent,
  updateStudent, deleteStudent, getStats, bulkCreateStudents,
};
