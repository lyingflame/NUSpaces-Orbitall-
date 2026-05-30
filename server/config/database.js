// PostgreSQL connection

const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('PostgreSQL connected:', result.rows[0].now);
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    process.exit(1);
  }
}

module.exports = { pool, query, testConnection };
