// User model — database queries for the users table

const { query } = require('../config/database');

const User = {
  // Add new user
  async create(email, username, passwordHash) {
    const result = await query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash]
    );
    return result.rows[0];
  },

  // Get user by email
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  },

  // Get user by ID
  async findById(id) {
    const result = await query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },
};

module.exports = User;
