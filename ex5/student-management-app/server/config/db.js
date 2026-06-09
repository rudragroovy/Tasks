// db.js — PostgreSQL connection pool
// Uses the `pg` library's Pool for efficient connection reuse
const { Pool } = require('pg');
require('dotenv').config();

// Create a pool of connections using environment variables
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release(); // return client back to pool after test
  }
});

module.exports = pool;
