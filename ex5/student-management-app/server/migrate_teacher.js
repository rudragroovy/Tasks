const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({ user: 'postgres', password: '09092002', host: 'localhost', port: 5432, database: 'student_management' });

async function migrate() {
  try {
    await client.connect();
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS teacher_courses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_name VARCHAR(100) NOT NULL,
        UNIQUE(user_id, course_name)
      );
    `);
    console.log('teacher_courses table created');

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('teacher123', salt);
    
    const userRes = await client.query(`
      INSERT INTO users (username, password_hash, role)
      VALUES ('teacher_john', $1, 'Teacher')
      ON CONFLICT (username) DO UPDATE SET role = 'Teacher'
      RETURNING id;
    `, [hash]);
    
    const teacherId = userRes.rows[0].id;
    
    await client.query(`
      INSERT INTO teacher_courses (user_id, course_name)
      VALUES ($1, 'Computer Science')
      ON CONFLICT DO NOTHING;
    `, [teacherId]);
    
    console.log('Mock teacher john created and assigned to Computer Science');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
migrate();
