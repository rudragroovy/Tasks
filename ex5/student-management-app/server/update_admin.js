const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: '09092002',
  host: 'localhost',
  port: 5432,
  database: 'student_management'
});

async function updateAdmin() {
  try {
    await client.connect();
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('admin123', salt);
    
    console.log('Generated hash:', hash);
    
    // Use string concatenation to avoid syntax errors with parameterization if any issues exist
    const result = await client.query(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin'`);
    
    console.log('Update result:', result.rowCount);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

updateAdmin();
