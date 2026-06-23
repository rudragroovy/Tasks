const pool = require('./config/db');

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
          id          SERIAL PRIMARY KEY,
          student_id  INTEGER REFERENCES students(id) ON DELETE CASCADE,
          date        DATE NOT NULL,
          status      VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late')),
          notes       TEXT,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(student_id, date)
      );

      CREATE TABLE IF NOT EXISTS grades (
          id              SERIAL PRIMARY KEY,
          student_id      INTEGER REFERENCES students(id) ON DELETE CASCADE,
          assignment_name VARCHAR(100) NOT NULL,
          score           DECIMAL(5,2) NOT NULL,
          max_score       DECIMAL(5,2) NOT NULL DEFAULT 100.00,
          date            DATE DEFAULT CURRENT_DATE,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tables created successfully.");
  } catch (error) {
    console.error("Error creating tables:", error);
  } finally {
    pool.end();
  }
}

createTables();
