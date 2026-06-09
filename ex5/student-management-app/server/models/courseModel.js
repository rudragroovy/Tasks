const pool = require('../config/db');

const createCourse = async (name) => {
  const result = await pool.query(
    'INSERT INTO courses (name) VALUES ($1) RETURNING *',
    [name]
  );
  return result.rows[0];
};

const getAllCourses = async () => {
  const result = await pool.query('SELECT * FROM courses ORDER BY name ASC');
  return result.rows;
};

const updateCourse = async (id, oldName, newName) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      'UPDATE courses SET name = $1 WHERE id = $2 RETURNING *',
      [newName, id]
    );
    if (oldName && newName && oldName !== newName) {
      await client.query(
        'UPDATE students SET course = $1 WHERE course = $2',
        [newName, oldName]
      );
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteCourse = async (id, name) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const check = await client.query('SELECT COUNT(*) FROM students WHERE course = $1', [name]);
    const count = parseInt(check.rows[0].count, 10);
    if (count > 0) {
      throw new Error(`Cannot delete course. ${count} students are currently enrolled.`);
    }
    const result = await client.query('DELETE FROM courses WHERE id = $1 RETURNING *', [id]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { createCourse, getAllCourses, updateCourse, deleteCourse };
