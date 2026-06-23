const pool = require('../config/db');

const logAction = async (entity, entity_id, action, details) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (entity, entity_id, action, details) VALUES ($1, $2, $3, $4)`,
      [entity, entity_id, action, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
};

const getLogs = async () => {
  const result = await pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100`);
  return result.rows;
};

module.exports = { logAction, getLogs };
