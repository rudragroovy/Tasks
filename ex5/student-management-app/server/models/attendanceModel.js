const pool = require('../config/db');
const { logAction } = require('./auditModel');

const getAttendanceByStudentId = async (studentId) => {
  const result = await pool.query(
    'SELECT * FROM attendance WHERE student_id = $1 ORDER BY date DESC',
    [studentId]
  );
  return result.rows;
};

const addAttendance = async (studentId, data) => {
  const { date, status, notes } = data;
  const result = await pool.query(
    `INSERT INTO attendance (student_id, date, status, notes) 
     VALUES ($1, $2, $3, $4) 
     ON CONFLICT (student_id, date) 
     DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes 
     RETURNING *`,
    [studentId, date, status, notes]
  );
  const record = result.rows[0];
  await logAction('Attendance', studentId, 'RECORDED', `Marked ${status} on ${date}`);
  return record;
};

const deleteAttendance = async (id) => {
  const result = await pool.query('DELETE FROM attendance WHERE id = $1 RETURNING *', [id]);
  const record = result.rows[0];
  if (record) {
    await logAction('Attendance', record.student_id, 'DELETED', `Deleted attendance for ${record.date}`);
  }
  return record;
};

module.exports = {
  getAttendanceByStudentId,
  addAttendance,
  deleteAttendance
};
