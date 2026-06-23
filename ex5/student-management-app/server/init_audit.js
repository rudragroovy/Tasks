const pool = require('./config/db');

async function createAuditTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
          id          SERIAL PRIMARY KEY,
          entity      VARCHAR(50) NOT NULL,
          entity_id   INTEGER,
          action      VARCHAR(50) NOT NULL,
          details     TEXT,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Audit log table created successfully.");
  } catch (error) {
    console.error("Error creating audit log table:", error);
  } finally {
    pool.end();
  }
}

createAuditTable();
