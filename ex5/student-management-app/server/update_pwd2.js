const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({ user: 'postgres', password: '09092002', host: 'localhost', port: 5432, database: 'student_management' });

async function migrate() {
  try {
    await client.connect();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    await client.query(`UPDATE users SET password_hash = $1 WHERE username = 'admin'`, [hash]);
    
    console.log('Password updated for admin');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
migrate();
