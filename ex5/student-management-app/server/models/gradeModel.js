const pool = require('../config/db');
const { logAction } = require('./auditModel');

const getGradesByStudentId = async (studentId) => {
  const result = await pool.query(
    'SELECT * FROM grades WHERE student_id = $1 ORDER BY date DESC',
    [studentId]
  );
  return result.rows;
};

const addGrade = async (studentId, data) => {
  const { assignment_name, score, max_score, date } = data;
  const result = await pool.query(
    `INSERT INTO grades (student_id, assignment_name, score, max_score, date) 
     VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE)) 
     RETURNING *`,
    [studentId, assignment_name, score, max_score || 100.0, date]
  );
  
  const record = result.rows[0];
  await logAction('Grade', studentId, 'RECORDED', `Added grade: ${score}/${max_score || 100} for ${assignment_name}`);
  return record;
};

const deleteGrade = async (id) => {
  const result = await pool.query('DELETE FROM grades WHERE id = $1 RETURNING *', [id]);
  const record = result.rows[0];
  if (record) {
    await logAction('Grade', record.student_id, 'DELETED', `Deleted grade for ${record.assignment_name}`);
  }
  return record;
};

module.exports = {
  getGradesByStudentId,
  addGrade,
  deleteGrade
};
