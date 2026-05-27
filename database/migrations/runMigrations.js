// Database Migration

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { pool } = require('../../server/config/database');

async function runMigrations() {
  const migrationDir = path.resolve(__dirname);
  const files = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`Migration applied: ${file}`);
    } catch (error) {
      console.error(`Migration failed: ${file}`, error.message);
      process.exit(1);
    }
  }

  console.log('All migrations applied successfully.');
  await pool.end();
}

runMigrations();
