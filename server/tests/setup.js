// Need to setup nuspaces_test DB for unit testing

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.DB_NAME = 'nuspaces_test';
process.env.NODE_ENV = 'test';

const { pool } = require('../config/database');

// Run migrations for test database
async function runMigrations() {
  const sqlPath = path.resolve(__dirname, '../../database/001_initial.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Migration file not found: ${sqlPath}`);
  }
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  await pool.query(sql);
}

// Clear data
async function cleanDatabase() {
  await pool.query(`
    DELETE FROM spot_schedule_overrides;
    DELETE FROM spot_schedules;
    DELETE FROM spot_scores;
    DELETE FROM feedback;
    DELETE FROM refresh_tokens;
    DELETE FROM study_spots;
    DELETE FROM users;
  `);
}

// Create test users (admin & regular user)
async function createTestUser(role = 'user') {
  const bcrypt = require('bcrypt');
  const email = role === 'admin' ? 'admin@u.nus.edu' : 'test@u.nus.edu';
  const username = role === 'admin' ? 'adminuser' : 'testuser';
  const hash = await bcrypt.hash('password123', 4);

  const result = await pool.query(
    `INSERT INTO users (email, username, password_hash, role)
     VALUES ($1, $2, $3, $4) RETURNING id, email, username, role`,
    [email, username, hash, role]
  );
  return result.rows[0];
}

// Create a test study spot
async function createTestSpot(overrides = {}) {
  const spot = {
    name: 'Test Spot', building: 'Test Building', faculty: ['Computing'],
    spot_type: 'study_room', latitude: 1.2950, longitude: 103.7740,
    capacity: 50, has_power: true, has_aircon: true,
    description: 'A test study spot.', ...overrides,
  };

  const result = await pool.query(
    `INSERT INTO study_spots
     (name, building, faculty, spot_type, latitude, longitude, capacity, has_power, has_aircon, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [spot.name, spot.building, spot.faculty, spot.spot_type,
     spot.latitude, spot.longitude, spot.capacity,
     spot.has_power, spot.has_aircon, spot.description]
  );

  const created = result.rows[0];
  await pool.query(
    `INSERT INTO spot_scores (spot_id, avg_noise, avg_crowd, quietness_score, report_count, recent_report_count)
     VALUES ($1, 0, 0, 0, 0, 0)`, [created.id]
  );
  return created;
}

// Login agent function
async function loginAs(agent, email = 'test@u.nus.edu', password = 'password123') {
  return agent.post('/api/auth/login').send({ email, password });
}

// Agent to retain user cookies (for testing auth)
function createAgent() {
  const request = require('supertest');
  const app = require('../index');
  return request.agent(app);
}

beforeAll(async () => {
  await runMigrations();
});

afterAll(async () => {
  await pool.end();
});

module.exports = { pool, cleanDatabase, createTestUser, createTestSpot, loginAs, createAgent };
